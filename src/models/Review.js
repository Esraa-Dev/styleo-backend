const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    userName: { type: String, required: true, trim: true },
    comment: {
      type: String,
      required: [true, "Review text is required"],
      trim: true,
      minlength: 10,
      maxlength: 500,
    },
    rating: {
      type: Number,
      required: [true, "Rating is required"],
      min: 1,
      max: 5,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "ignored"],
      default: "pending",
    },
  },
  { timestamps: true, versionKey: false }
);

reviewSchema.index({ status: 1 });
reviewSchema.index({ user: 1 });

module.exports = mongoose.model("Review", reviewSchema);