const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    productName: { type: String, required: true },
    productImage: { type: String, required: true },
    unitPrice: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    subtotal: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true, unique: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    items: {
      type: [orderItemSchema],
      validate: {
        validator: (items) => items.length > 0,
        message: "Order must have at least one item",
      },
    },
    phone: {
      type: String,
      required: [true, "Delivery phone is required"],
      trim: true,
    },
    address: {
      type: String,
      required: [true, "Delivery address is required"],
      trim: true,
    },
    shippingCost: { type: Number, required: true, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    paymentMethod: { type: String, enum: ["COD"], default: "COD" },
    status: {
      type: String,
      enum: [
        "Pending",
        "Prepared",
        "Shipped",
        "Delivered",
        "CancelledByUser",
        "CancelledByAdmin",
        "Rejected",
      ],
      default: "Pending",
    },
    cancelledBy: { type: String, enum: ["user", "admin"] },
    cancelReason: { type: String, trim: true },
  },
  { timestamps: true, versionKey: false }
);

orderSchema.index({ user: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Order", orderSchema);