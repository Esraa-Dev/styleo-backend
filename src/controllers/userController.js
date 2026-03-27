const User = require("../models/User");
const AppError = require("../utils/AppError");
const catchAsync = require("../utils/catchAsync");
const logger = require("../utils/logger");

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getProfile = catchAsync(async (req, res) => {
  const user = await User.findById(req.user._id).select("-password").lean();

  if (!user) throw new AppError("User not found", 404);

  res.status(200).json({
    success: true,
    message: "Profile retrieved",
    data: user,
  });
});

const updateProfile = catchAsync(async (req, res) => {
  const { name, email, mobile, address } = req.body;

  const updates = {};

  if (name?.trim()) updates.name = name.trim();
  if (email?.trim()) updates.email = email.trim().toLowerCase();
  if (mobile?.trim()) updates.mobile = mobile.trim();
  if (address?.trim()) updates.address = address.trim();

  if (Object.keys(updates).length === 0) {
    throw new AppError("No fields to update", 400);
  }

  const user = await User.findByIdAndUpdate(req.user._id, updates, {
    new: true,
    runValidators: true,
  })
    .select("-password")
    .lean();

  if (!user) throw new AppError("User not found", 404);

  logger.info("Profile updated", {
    userId: req.user._id,
    fields: Object.keys(updates),
  });

  res.status(200).json({
    success: true,
    message: "Profile updated",
    data: user,
  });
});

const changePassword = catchAsync(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id).select("+password");

  const isValid = user && (await user.verifyPassword(currentPassword));
  if (!user || !isValid) throw new AppError("Invalid credentials", 401);

  user.password = newPassword;
  await user.save();

  logger.info("Password changed", { userId: user._id });

  res.status(200).json({
    success: true,
    message: "Password changed successfully",
  });
});

const getAllUsers = catchAsync(async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
  const skip = (page - 1) * limit;

  const filter = { role: "user" };

  if (req.query.active !== undefined) {
    filter.active = req.query.active === "true";
  }

  if (req.query.search?.trim()) {
    const escaped = escapeRegex(req.query.search.trim());
    filter.$or = [
      { name: { $regex: escaped, $options: "i" } },
      { email: { $regex: escaped, $options: "i" } },
      { mobile: { $regex: escaped, $options: "i" } },
    ];
  }

  const [users, total] = await Promise.all([
    User.find(filter)
      .select("-password")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    message: "Users retrieved",
    data: users,
    meta: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1,
    },
  });
});

const toggleUserStatus = catchAsync(async (req, res) => {
  const user = await User.findOneAndUpdate(
    { _id: req.params.id, role: "user" },
    [{ $set: { active: { $not: "$active" } } }],
    { new: true, updatePipeline: true }
  )
    .select("-password")
    .lean();

  if (!user) throw new AppError("User not found", 404);

  logger.info("User status toggled", {
    userId: user._id,
    active: user.active,
  });

  res.status(200).json({
    success: true,
    message: user.active ? "User activated" : "User deactivated",
    data: user,
  });
});

module.exports = {
  getProfile,
  updateProfile,
  changePassword,
  getAllUsers,
  toggleUserStatus,
};