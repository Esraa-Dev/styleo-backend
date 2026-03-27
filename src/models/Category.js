const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Category name is required"],
      trim: true,
      unique: true,
    },
    slug: { type: String, required: true, unique: true, lowercase: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true, versionKey: false }
);

const subcategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Subcategory name is required"],
      trim: true,
    },
    slug: { type: String, required: true, unique: true, lowercase: true },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    active: { type: Boolean, default: true },
  },
  { timestamps: true, versionKey: false }
);

subcategorySchema.index({ category: 1 });

const Category = mongoose.model("Category", categorySchema);
const Subcategory = mongoose.model("Subcategory", subcategorySchema);

module.exports = { Category, Subcategory };