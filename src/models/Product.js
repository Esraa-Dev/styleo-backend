const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Product title is required"],
      trim: true,
      minlength: 2,
    },
    slug: { type: String, required: true, unique: true, lowercase: true },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price cannot be negative"],
    },
    image: { type: String, required: [true, "Product image is required"] },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    subcategory: { type: mongoose.Schema.Types.ObjectId, ref: "Subcategory" },
    stock: {
      type: Number,
      required: true,
      default: 0,
      min: [0, "Stock cannot be negative"],
    },
    deleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

productSchema.index({ category: 1, deleted: 1 });
productSchema.index({ title: "text", description: "text" });

module.exports = mongoose.model("Product", productSchema);