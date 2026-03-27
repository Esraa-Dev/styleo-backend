const mongoose = require("mongoose");
const Order = require("../models/Order");
const Cart = require("../models/Cart");
const Product = require("../models/Product");
const AppError = require("../utils/AppError");
const catchAsync = require("../utils/catchAsync");
const logger = require("../utils/logger");
const generateOrderNumber = require("../utils/slugGenerator");
const env = require("../config/environment");

const SHIPPING = env.shippingCost;

const TERMINAL = ["Delivered", "CancelledByUser", "CancelledByAdmin", "Rejected"];
const DEDUCT_STOCK = ["Pending", "Prepared", "Shipped", "Delivered"];
const RETURN_STOCK = ["CancelledByAdmin", "Rejected"];

const TRANSITIONS = {
  Pending: ["Prepared", "CancelledByAdmin", "Rejected"],
  Prepared: ["Shipped", "CancelledByAdmin", "Rejected"],
  Shipped: ["Delivered", "CancelledByAdmin", "Rejected"],
  Delivered: [],
  CancelledByUser: [],
  CancelledByAdmin: [],
  Rejected: [],
};

const validateId = (id, label = "ID") => {
  if (!mongoose.Types.ObjectId.isValid(id)) throw new AppError(`Invalid ${label}`, 400);
};

const deductStock = async (order) => {
  const checks = await Promise.all(
    order.items.map(async (item) => {
      const product = await Product.findById(item.productId).select("stock title");
      if (!product) {
        return { ok: false, message: `Product "${item.productName}" not found` };
      }
      if (product.stock < item.quantity) {
        return {
          ok: false,
          message: `Insufficient stock for "${item.productName}". Available: ${product.stock}`,
        };
      }
      return { ok: true };
    })
  );

  const failures = checks.filter((c) => !c.ok);
  if (failures.length > 0) {
    throw new AppError(
      "Cannot prepare order: insufficient stock",
      400,
      failures.map((f) => ({ field: "stock", message: f.message }))
    );
  }

  await Promise.all(
    order.items.map((item) =>
      Product.findByIdAndUpdate(item.productId, {
        $inc: { stock: -item.quantity },
      })
    )
  );
};

const returnStock = async (order) => {
  await Promise.all(
    order.items.map((item) =>
      Product.findByIdAndUpdate(item.productId, {
        $inc: { stock: item.quantity },
      })
    )
  );
};

const createOrder = catchAsync(async (req, res) => {
  const userId = req.user._id.toString();
  const { phone, address } = req.body;

  const cart = await Cart.findOne({ user: userId });
  if (!cart || cart.items.length === 0) {
    throw new AppError("Cart is empty. Add items before ordering", 400);
  }

  const products = await Product.find({
    _id: { $in: cart.items.map((i) => i.product) },
    deleted: false,
  });

  const productMap = new Map(products.map((p) => [p._id.toString(), p]));

  const stockErrors = [];
  for (const item of cart.items) {
    const product = productMap.get(item.product.toString());
    if (!product) {
      stockErrors.push({
        field: item.product.toString(),
        message: "Product no longer available",
      });
    } else if (product.stock === 0) {
      stockErrors.push({
        field: product.title,
        message: `"${product.title}" is out of stock`,
      });
    } else if (item.quantity > product.stock) {
      stockErrors.push({
        field: product.title,
        message: `Not enough stock for "${product.title}"`,
      });
    }
  }

  if (stockErrors.length > 0) {
    throw new AppError("Some items are unavailable or out of stock", 400, stockErrors);
  }

  const orderItems = cart.items.map((item) => {
    const product = productMap.get(item.product.toString());
    return {
      productId: product._id,
      productName: product.title,
      productImage: product.image,
      unitPrice: product.price,
      quantity: item.quantity,
      subtotal: product.price * item.quantity,
    };
  });

  const itemsTotal = orderItems.reduce((sum, i) => sum + i.subtotal, 0);

  const order = await Order.create({
    orderNumber: await generateOrderNumber(),
    user: userId,
    items: orderItems,
    phone,
    address,
    shippingCost: SHIPPING,
    totalAmount: itemsTotal + SHIPPING,
    paymentMethod: "COD",
    status: "Pending",
  });

  await deductStock(order);
  await Cart.findOneAndUpdate({ user: userId }, { $set: { items: [] } });

  logger.info("Order created", {
    orderId: order._id,
    userId,
    total: order.totalAmount,
  });

  res.status(201).json({
    success: true,
    message: "Order placed",
    data: order,
  });
});

const getMyOrders = catchAsync(async (req, res) => {
  const userId = req.user._id.toString();
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const [orders, total] = await Promise.all([
    Order.find({ user: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Order.countDocuments({ user: userId }),
  ]);

  res.status(200).json({
    success: true,
    message: "Orders retrieved",
    data: orders,
    meta: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

const getMyOrderById = catchAsync(async (req, res) => {
  const userId = req.user._id.toString();
  validateId(req.params.id, "order ID");

  const order = await Order.findOne({ _id: req.params.id, user: userId });
  if (!order) throw new AppError("Order not found", 404);

  res.status(200).json({
    success: true,
    message: "Order retrieved",
    data: order,
  });
});

const cancelMyOrder = catchAsync(async (req, res) => {
  const userId = req.user._id.toString();
  const { reason } = req.body;

  validateId(req.params.id, "order ID");

  const order = await Order.findOne({ _id: req.params.id, user: userId });
  if (!order) throw new AppError("Order not found", 404);
  if (order.status !== "Pending") {
    throw new AppError(`Order cannot be cancelled. Status: "${order.status}"`, 400);
  }

  order.status = "CancelledByUser";
  order.cancelledBy = "user";
  if (reason) order.cancelReason = reason;

  await returnStock(order);
  await order.save();

  logger.info("Order cancelled by user", { orderId: order._id, userId });

  res.status(200).json({
    success: true,
    message: "Order cancelled",
    data: order,
  });
});

const getOrdersAdmin = catchAsync(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.userId) filter.user = req.query.userId;
  if (req.query.search) {
    filter.orderNumber = { $regex: req.query.search, $options: "i" };
  }
  if (req.query.dateFrom || req.query.dateTo) {
    filter.createdAt = {};
    if (req.query.dateFrom) filter.createdAt.$gte = new Date(req.query.dateFrom);
    if (req.query.dateTo) filter.createdAt.$lte = new Date(req.query.dateTo);
  }

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("user", "name email mobile")
      .lean(),
    Order.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    message: "Orders retrieved",
    data: orders,
    meta: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

const getOrderByIdAdmin = catchAsync(async (req, res) => {
  validateId(req.params.id, "order ID");

  const order = await Order.findById(req.params.id).populate(
    "user",
    "name email mobile"
  );
  if (!order) throw new AppError("Order not found", 404);

  res.status(200).json({
    success: true,
    message: "Order retrieved",
    data: order,
  });
});

const updateOrderStatus = catchAsync(async (req, res) => {
  const { status, note } = req.body;

  validateId(req.params.id, "order ID");

  const order = await Order.findById(req.params.id);
  if (!order) throw new AppError("Order not found", 404);

  if (TERMINAL.includes(order.status)) {
    throw new AppError(`Order is "${order.status}" and cannot be changed`, 400);
  }

  if (!TRANSITIONS[order.status].includes(status)) {
    throw new AppError(`Cannot move from "${order.status}" to "${status}"`, 400);
  }

  const prevStatus = order.status;

  if (DEDUCT_STOCK.includes(prevStatus) && RETURN_STOCK.includes(status)) {
    await returnStock(order);
  }

  order.status = status;

  if (status === "CancelledByAdmin") {
    order.cancelledBy = "admin";
    if (note) order.cancelReason = note;
  }

  if (status === "Rejected" && note) order.cancelReason = note;

  await order.save();

  logger.info("Order status updated", {
    orderId: order._id,
    from: prevStatus,
    to: status,
  });

  res.status(200).json({
    success: true,
    message: `Order status updated to "${order.status}"`,
    data: order,
  });
});

const getSalesReport = catchAsync(async (req, res) => {
  const from = req.query.dateFrom
    ? new Date(req.query.dateFrom)
    : new Date(new Date().setDate(1));

  const to = req.query.dateTo
    ? new Date(new Date(req.query.dateTo).setHours(23, 59, 59, 999))
    : new Date();

  if (isNaN(from) || isNaN(to)) throw new AppError("Invalid date format", 400);
  if (from > to) throw new AppError("Start date cannot be after end date", 400);

  const match = {
    status: "Delivered",
    createdAt: { $gte: from, $lte: to },
  };

  const [summary, topProducts] = await Promise.all([
    Order.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$totalAmount" },
          totalOrders: { $count: {} },
          averageValue: { $avg: "$totalAmount" },
        },
      },
    ]),
    Order.aggregate([
      { $match: match },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.productId",
          name: { $first: "$items.productName" },
          totalSold: { $sum: "$items.quantity" },
          revenue: { $sum: "$items.subtotal" },
        },
      },
      { $sort: { totalSold: -1 } },
      { $limit: 10 },
    ]),
  ]);

  logger.info("Sales report generated", { from, to });

  res.status(200).json({
    success: true,
    message: "Sales report generated",
    data: {
      period: { from, to },
      summary: summary[0] || {
        totalRevenue: 0,
        totalOrders: 0,
        averageValue: 0,
      },
      topProducts,
    },
  });
});

const getNotifications = catchAsync(async (_req, res) => {
  const [newOrders, outOfStock] = await Promise.all([
    Order.countDocuments({ status: "Pending" }),
    Product.countDocuments({ stock: 0, deleted: false }),
  ]);

  res.status(200).json({
    success: true,
    message: "Notifications retrieved",
    data: { newOrders, outOfStock },
  });
});

module.exports = {
  createOrder,
  getMyOrders,
  getMyOrderById,
  cancelMyOrder,
  getOrdersAdmin,
  getOrderByIdAdmin,
  updateOrderStatus,
  getSalesReport,
  getNotifications,
};