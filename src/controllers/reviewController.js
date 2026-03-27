const Review = require("../models/Review");
const AppError = require("../utils/AppError");
const catchAsync = require("../utils/catchAsync");
const logger = require("../utils/logger");

const getApprovedReviews = catchAsync(async (_req, res) => {
  const reviews = await Review.find({ status: "approved" })
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  res.status(200).json({
    success: true,
    message: "Reviews retrieved",
    data: reviews,
  });
});

const createReview = catchAsync(async (req, res) => {
  const userId = req.user._id.toString();
  const { comment, rating } = req.body;

  const existing = await Review.findOne({ user: userId });
  if (existing) throw new AppError("You have already submitted a review", 400);

  const review = await Review.create({
    user: userId,
    userName: req.user.name,
    comment,
    rating,
    status: "pending",
  });

  logger.info("Review submitted", { userId, reviewId: review._id });

  res.status(201).json({
    success: true,
    message: "Review submitted. It will appear after approval",
    data: review,
  });
});

const getReviewsAdmin = catchAsync(async (req, res) => {
  const { status, page: rawPage, limit: rawLimit } = req.query;
  const page = parseInt(rawPage) || 1;
  const limit = parseInt(rawLimit) || 20;
  const skip = (page - 1) * limit;

  const filter = status ? { status } : {};

  const [reviews, total] = await Promise.all([
    Review.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("user", "name email")
      .lean(),
    Review.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    message: "Reviews retrieved",
    data: reviews,
    meta: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

const updateReviewStatus = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const review = await Review.findByIdAndUpdate(id, { status }, { new: true });

  if (!review) throw new AppError("Review not found", 404);

  logger.info("Review status updated", { reviewId: review._id, status });

  res.status(200).json({
    success: true,
    message: `Review ${status}`,
    data: review,
  });
});

module.exports = {
  getApprovedReviews,
  createReview,
  getReviewsAdmin,
  updateReviewStatus,
};