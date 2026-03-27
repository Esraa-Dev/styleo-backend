const mongoose = require("mongoose");
const Cart = require("../models/Cart");
const Product = require("../models/Product");
const AppError = require("../utils/AppError");
const catchAsync = require("../utils/catchAsync");
const logger = require("../utils/logger");
const env = require("../config/environment");

const SHIPPING = env.shippingCost;

const emptyCart = (shipping) => ({
  items: [],
  itemCount: 0,
  subtotal: 0,
  shipping,
  total: shipping,
  priceChanges: false,
});

const validateProduct = async (productId, qty) => {
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    throw new AppError("Invalid product ID", 400);
  }

  const product = await Product.findOne({ _id: productId, deleted: false });

  if (!product) throw new AppError("Product not available", 404);
  if (product.stock === 0) throw new AppError("Product out of stock", 400);
  if (qty > product.stock) {
    throw new AppError(`Not enough stock for "${product.title}"`, 400);
  }

  return product;
};

const buildProductMap = async (cartItems) => {
  const products = await Product.find({
    _id: { $in: cartItems.map((i) => i.product) },
    deleted: false,
  }).lean();

  return new Map(products.map((p) => [p._id.toString(), p]));
};

const enrichItems = (cartItems, productMap) => {
  const enriched = [];
  const invalid = new Set();

  for (const item of cartItems) {
    const product = productMap.get(item.product.toString());

    if (!product) {
      invalid.add(item.product.toString());
      continue;
    }

    enriched.push({
      product: {
        id: product._id.toString(),
        name: product.title,
        image: product.image,
        price: product.price,
        stock: product.stock,
      },
      quantity: item.quantity,
      priceAtAdd: item.priceAtAdd,
      priceChanged: item.priceAtAdd !== product.price,
      currentPrice: product.price,
      subtotal: product.price * item.quantity,
    });
  }

  return { enriched, invalid };
};

const removeInvalid = async (cart, invalidIds) => {
  cart.items = cart.items.filter(
    (item) => !invalidIds.has(item.product.toString())
  );
  await cart.save();
};

const buildSummary = (items, shipping) => {
  const subtotal = items.reduce((sum, i) => sum + i.subtotal, 0);

  return {
    items,
    itemCount: items.reduce((sum, i) => sum + i.quantity, 0),
    subtotal,
    shipping,
    total: subtotal + shipping,
    priceChanges: items.some((i) => i.priceChanged),
  };
};

const getEnrichedCart = async (userId, shipping) => {
  const cart = await Cart.findOne({ user: userId });
  if (!cart || cart.items.length === 0) return emptyCart(shipping);

  const productMap = await buildProductMap(cart.items);
  const { enriched, invalid } = enrichItems(cart.items, productMap);

  if (invalid.size > 0) await removeInvalid(cart, invalid);

  return buildSummary(enriched, shipping);
};

const getCart = catchAsync(async (req, res) => {
  const data = await getEnrichedCart(req.user._id.toString(), SHIPPING);

  res.status(200).json({
    success: true,
    message: "Cart retrieved",
    data,
  });
});

const addItem = catchAsync(async (req, res) => {
  const { productId, quantity } = req.body;
  const userId = req.user._id.toString();

  const product = await validateProduct(productId, quantity);
  let cart = await Cart.findOne({ user: userId });

  if (!cart) {
    cart = await Cart.create({
      user: userId,
      items: [{ product: productId, quantity, priceAtAdd: product.price }],
    });
  } else {
    const index = cart.items.findIndex(
      (i) => i.product.toString() === productId
    );

    if (index >= 0) {
      const newQty = cart.items[index].quantity + quantity;
      if (newQty > product.stock) {
        throw new AppError("Not enough stock available", 400);
      }
      cart.items[index].quantity = newQty;
      cart.items[index].priceAtAdd = product.price;
    } else {
      cart.items.push({
        product: new mongoose.Types.ObjectId(productId),
        quantity,
        priceAtAdd: product.price,
      });
    }
    await cart.save();
  }

  logger.info("Item added to cart", { userId, productId, quantity });

  const data = await getEnrichedCart(userId, SHIPPING);

  res.status(201).json({
    success: true,
    message: "Item added",
    data,
  });
});

const updateItem = catchAsync(async (req, res) => {
  const { productId } = req.params;
  const { quantity } = req.body;
  const userId = req.user._id.toString();

  const product = await validateProduct(productId, quantity);
  const cart = await Cart.findOne({ user: userId });

  if (!cart) throw new AppError("Cart not found", 404);

  const index = cart.items.findIndex((i) => i.product.toString() === productId);
  if (index === -1) throw new AppError("Item not in cart", 404);

  cart.items[index].quantity = quantity;
  cart.items[index].priceAtAdd = product.price;
  await cart.save();

  logger.info("Cart item updated", { userId, productId, quantity });

  const data = await getEnrichedCart(userId, SHIPPING);

  res.status(200).json({
    success: true,
    message: "Cart updated",
    data,
  });
});

const removeItem = catchAsync(async (req, res) => {
  const { productId } = req.params;
  const userId = req.user._id.toString();

  const cart = await Cart.findOne({ user: userId });
  if (!cart) throw new AppError("Cart not found", 404);

  const before = cart.items.length;
  cart.items = cart.items.filter((i) => i.product.toString() !== productId);
  if (cart.items.length === before) throw new AppError("Item not in cart", 404);

  await cart.save();

  logger.info("Cart item removed", { userId, productId });

  const data = await getEnrichedCart(userId, SHIPPING);

  res.status(200).json({
    success: true,
    message: "Item removed",
    data,
  });
});

const clearCart = catchAsync(async (req, res) => {
  const userId = req.user._id.toString();

  await Cart.findOneAndUpdate({ user: userId }, { $set: { items: [] } });

  logger.info("Cart cleared", { userId });

  res.status(200).json({
    success: true,
    message: "Cart cleared",
  });
});

const mergeCart = catchAsync(async (req, res) => {
  const userId = req.user._id.toString();
  const guestItems = req.body.items;

  if (!Array.isArray(guestItems)) throw new AppError("Items must be an array", 400);

  if (!guestItems.length) {
    const data = await getEnrichedCart(userId, SHIPPING);
    return res.status(200).json({
      success: true,
      message: "Cart merged",
      data,
    });
  }

  const isValid = guestItems.every(
    (item) => item.productId && Number.isInteger(item.quantity) && item.quantity >= 1
  );

  if (!isValid) {
    throw new AppError(
      "Each item must have a valid productId and positive quantity",
      400
    );
  }

  const products = await Product.find({
    _id: { $in: guestItems.map((item) => item.productId) },
    deleted: false,
    stock: { $gt: 0 },
  }).lean();

  const productMap = new Map(
    products.map((p) => [p._id.toString(), p])
  );

  let cart = await Cart.findOne({ user: userId });
  if (!cart) cart = new Cart({ user: userId, items: [] });

  const cartItemMap = new Map(
    cart.items.map((item) => [item.product.toString(), item])
  );

  for (const guest of guestItems) {
    const product = productMap.get(guest.productId);
    if (!product) continue;

    const existing = cartItemMap.get(guest.productId);

    if (existing) {
      existing.quantity = Math.min(
        Math.max(existing.quantity, guest.quantity),
        product.stock
      );
      existing.priceAtAdd = product.price;
      continue;
    }

    const newItem = {
      product: new mongoose.Types.ObjectId(guest.productId),
      quantity: Math.min(guest.quantity, product.stock),
      priceAtAdd: product.price,
    };

    cart.items.push(newItem);
    cartItemMap.set(guest.productId, newItem);
  }

  await cart.save();

  logger.info("Guest cart merged", { userId, count: guestItems.length });

  const data = await getEnrichedCart(userId, SHIPPING);

  res.status(200).json({
    success: true,
    message: "Cart merged",
    data,
  });
});

const confirmPrice = catchAsync(async (req, res) => {
  const userId = req.user._id.toString();
  const productId = req.params.productId || "all";

  const cart = await Cart.findOne({ user: userId });
  if (!cart) throw new AppError("Cart not found", 404);

  if (productId === "all") {
    const products = await Product.find({
      _id: { $in: cart.items.map((i) => i.product) },
    }).lean();

    const productMap = new Map(products.map((p) => [p._id.toString(), p]));

    cart.items.forEach((item) => {
      const p = productMap.get(item.product.toString());
      if (p) item.priceAtAdd = p.price;
    });
  } else {
    const product = await Product.findById(productId).lean();
    if (!product) throw new AppError("Product not found", 404);

    const item = cart.items.find((i) => i.product.toString() === productId);
    if (!item) throw new AppError("Item not in cart", 404);

    item.priceAtAdd = product.price;
  }

  await cart.save();

  logger.info("Price confirmed", { userId, productId });

  const data = await getEnrichedCart(userId, SHIPPING);

  res.status(200).json({
    success: true,
    message: "Price confirmed",
    data,
  });
});

module.exports = {
  getCart,
  addItem,
  updateItem,
  removeItem,
  clearCart,
  mergeCart,
  confirmPrice,
};