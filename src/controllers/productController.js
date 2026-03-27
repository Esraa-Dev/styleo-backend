const Product = require("../models/Product");
const { Category, Subcategory } = require("../models/Category");
const AppError = require("../utils/AppError");
const catchAsync = require("../utils/catchAsync");
const logger = require("../utils/logger");
const generateSlug = require("../utils/slugGenerator");
const fs = require("fs");
const path = require("path");

const sortOptions = {
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  name_asc: { title: 1 },
  name_desc: { title: -1 },
  price_asc: { price: 1 },
  price_desc: { price: -1 },
};

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const buildSearchFilter = (search) => {
  const words = search.trim().split(/\s+/).filter(Boolean);

  if (words.length === 1) {
    const regex = { $regex: escapeRegex(words[0]), $options: "i" };
    return {
      $or: [{ title: regex }, { description: regex }],
    };
  }

  return {
    $and: words.map((word) => ({
      $or: [
        { title: { $regex: escapeRegex(word), $options: "i" } },
        { description: { $regex: escapeRegex(word), $options: "i" } },
      ],
    })),
  };
};

const checkExists = async (model, filter, message = "Not found") => {
  const exists = await model.exists(filter);
  if (!exists) throw new AppError(message, 404);
};

const deleteImage = (filename) => {
  if (!filename) return;

  const filepath = path.join(process.cwd(), "uploads", "products", filename);

  fs.unlink(filepath, (err) => {
    if (!err) {
      logger.info("Image deleted", { filename });
      return;
    }

    if (err.code === "ENOENT") {
      logger.warn("Image not found", { filename });
      return;
    }

    logger.error("Failed to delete image", {
      filename,
      error: err.message,
    });
  });
};

const getProducts = catchAsync(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    category,
    subcategory,
    search,
    sort,
  } = req.query;

  const pageNum = Number(page);
  const limitNum = Number(limit);
  const skip = (pageNum - 1) * limitNum;

  const filter = { deleted: false };
  if (category) filter.category = category;
  if (subcategory) filter.subcategory = subcategory;
  if (search?.trim()) Object.assign(filter, buildSearchFilter(search));

  const order = sortOptions[sort] || sortOptions.newest;

  const [products, total] = await Promise.all([
    Product.find(filter)
      .sort(order)
      .skip(skip)
      .limit(limitNum)
      .populate("category", "name slug")
      .populate("subcategory", "name slug")
      .lean(),
    Product.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    products,
    meta: {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum),
    },
  });
});

const getProductBySlug = catchAsync(async (req, res) => {
  const product = await Product.findOne({
    slug: req.params.slug,
    deleted: false,
  })
    .populate("category", "name slug")
    .populate("subcategory", "name slug")
    .lean();

  if (!product) throw new AppError("Product not found", 404);

  res.status(200).json({
    success: true,
    message: "Product retrieved",
    data: product,
  });
});

const getProductsAdmin = catchAsync(async (req, res) => {
  const { page = 1, limit = 10, category, search } = req.query;

  const pageNum = Number(page);
  const limitNum = Number(limit);
  const skip = (pageNum - 1) * limitNum;

  const filter = {};
  if (category) filter.category = category;
  if (search?.trim()) Object.assign(filter, buildSearchFilter(search));

  const [products, total] = await Promise.all([
    Product.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate("category", "name")
      .populate("subcategory", "name")
      .lean(),
    Product.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    products,
    meta: {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum),
    },
  });
});

const createProduct = catchAsync(async (req, res) => {
  const { title, description, price, category, subcategory, stock } = req.body;

  if (!req.file) throw new AppError("Product image is required", 400);

  await checkExists(Category, { _id: category }, "Category not found");

  if (subcategory) {
    await checkExists(
      Subcategory,
      { _id: subcategory, category },
      "Subcategory not found or doesn't belong to category"
    );
  }

  const product = await Product.create({
    title,
    slug: generateSlug(title),
    description,
    price,
    category,
    subcategory: subcategory || undefined,
    stock: stock ?? 0,
    image: req.file.filename,
  });

  logger.info("Product created", {
    productId: product._id,
    title: product.title,
  });

  res.status(201).json({
    success: true,
    message: "Product created",
    data: product,
  });
});

const updateProduct = catchAsync(async (req, res) => {
  const { title, description, price, category, subcategory, stock } = req.body;

  const data = {
    ...(title?.trim() && { title }),
    ...(description?.trim() && { description }),
    ...(price != null && { price }),
    ...(category && { category }),
    ...(stock != null && { stock }),
  };

  if (req.file) data.image = req.file.filename;

  const product = await Product.findOne({
    _id: req.params.id,
    deleted: false,
  });

  if (!product) throw new AppError("Product not found", 404);

  if (data.title) data.slug = generateSlug(data.title);

  if (data.category) {
    await checkExists(Category, { _id: data.category }, "Category not found");
  }

  if (subcategory === null || subcategory === "") {
    product.subcategory = undefined;
  } else if (subcategory) {
    await checkExists(
      Subcategory,
      { _id: subcategory, category: data.category || product.category },
      "Subcategory not found or doesn't belong to category"
    );
    data.subcategory = subcategory;
  }

  const oldImage = product.image;

  Object.assign(product, data);
  await product.save();

  if (data.image && oldImage) {
    deleteImage(oldImage);
  }

  logger.info("Product updated", {
    productId: product._id,
    fields: Object.keys(data),
  });

  res.status(200).json({
    success: true,
    message: "Product updated",
    data: product,
  });
});

const deleteProduct = catchAsync(async (req, res) => {
  const product = await Product.findOne({
    _id: req.params.id,
    deleted: false,
  });

  if (!product) throw new AppError("Product not found", 404);

  product.deleted = true;
  await product.save();

  logger.info("Product deleted", { productId: product._id, title: product.title });

  res.status(200).json({
    success: true,
    message: "Product deleted",
  });
});

module.exports = {
  getProducts,
  getProductBySlug,
  getProductsAdmin,
  createProduct,
  updateProduct,
  deleteProduct,
};