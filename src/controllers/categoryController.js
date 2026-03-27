const { Category, Subcategory } = require("../models/Category");
const Product = require("../models/Product");
const AppError = require("../utils/AppError");
const catchAsync = require("../utils/catchAsync");
const logger = require("../utils/logger");
const generateSlug = require("../utils/slugGenerator");

const getAllCategories = catchAsync(async (_req, res) => {
  const categories = await Category.find({ active: true }).lean();

  const result = await Promise.all(
    categories.map(async (cat) => ({
      ...cat,
      subcategories: await Subcategory.find({
        category: cat._id,
        active: true,
      }).lean(),
    }))
  );

  res.status(200).json({
    success: true,
    message: "Categories retrieved",
    data: result,
  });
});

const getAllCategoriesAdmin = catchAsync(async (_req, res) => {
  const categories = await Category.find().lean();

  const result = await Promise.all(
    categories.map(async (cat) => ({
      ...cat,
      subcategories: await Subcategory.find({ category: cat._id }).lean(),
    }))
  );

  res.status(200).json({
    success: true,
    message: "Categories retrieved",
    data: result,
  });
});

const createCategory = catchAsync(async (req, res) => {
  const { name, active = true } = req.body;

  const category = await Category.create({
    name,
    slug: generateSlug(name),
    active,
  });

  logger.info("Category created", {
    categoryId: category._id,
    name: category.name,
  });

  res.status(201).json({
    success: true,
    message: "Category created",
    data: category,
  });
});

const updateCategory = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;

  const update = {};

  if (name?.trim()) {
    update.name = name.trim();
    update.slug = generateSlug(update.name);
  }

  const category = await Category.findByIdAndUpdate(id, update, {
    new: true,
    runValidators: true,
  });

  if (!category) throw new AppError("Category not found", 404);

  logger.info("Category updated", {
    categoryId: category._id,
    fields: Object.keys(update),
  });

  res.status(200).json({
    success: true,
    message: "Category updated",
    data: category,
  });
});

const deleteCategory = catchAsync(async (req, res) => {
  const { id } = req.params;

  const category = await Category.findById(id);
  if (!category) throw new AppError("Category not found", 404);

  const count = await Product.countDocuments({
    category: id,
    deleted: false,
  });

  if (count > 0) {
    throw new AppError(
      `Cannot delete: ${count} active product(s) use this category`,
      400
    );
  }

  await Subcategory.deleteMany({ category: id });
  await category.deleteOne();

  logger.info("Category deleted", { categoryId: id });

  res.status(200).json({
    success: true,
    message: "Category deleted",
  });
});

const createSubcategory = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { name, active = true } = req.body;

  const category = await Category.findById(id);
  if (!category) throw new AppError("Category not found", 404);

  const subcategory = await Subcategory.create({
    name,
    slug: generateSlug(name),
    category: id,
    active,
  });

  logger.info("Subcategory created", {
    subcategoryId: subcategory._id,
    categoryId: id,
  });

  res.status(201).json({
    success: true,
    message: "Subcategory created",
    data: subcategory,
  });
});

const updateSubcategory = catchAsync(async (req, res) => {
  const { subId } = req.params;
  const { name } = req.body;

  const update = {};

  if (name?.trim()) {
    update.name = name.trim();
    update.slug = generateSlug(update.name);
  }

  const subcategory = await Subcategory.findByIdAndUpdate(subId, update, {
    new: true,
    runValidators: true,
  });

  if (!subcategory) throw new AppError("Subcategory not found", 404);

  logger.info("Subcategory updated", {
    subcategoryId: subId,
    fields: Object.keys(update),
  });

  res.status(200).json({
    success: true,
    message: "Subcategory updated",
    data: subcategory,
  });
});

const deleteSubcategory = catchAsync(async (req, res) => {
  const { subId } = req.params;

  const subcategory = await Subcategory.findById(subId);
  if (!subcategory) throw new AppError("Subcategory not found", 404);

  const count = await Product.countDocuments({
    subcategory: subId,
    deleted: false,
  });

  if (count > 0) {
    throw new AppError(
      `Cannot delete: ${count} active product(s) use this subcategory`,
      400
    );
  }

  await subcategory.deleteOne();

  logger.info("Subcategory deleted", { subcategoryId: subId });

  res.status(200).json({
    success: true,
    message: "Subcategory deleted",
  });
});

module.exports = {
  getAllCategories,
  getAllCategoriesAdmin,
  createCategory,
  updateCategory,
  deleteCategory,
  createSubcategory,
  updateSubcategory,
  deleteSubcategory,
};