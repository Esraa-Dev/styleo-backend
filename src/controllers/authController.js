const jwt = require("jsonwebtoken");
const User = require("../models/User");
const AppError = require("../utils/AppError");
const catchAsync = require("../utils/catchAsync");
const logger = require("../utils/logger");
const env = require("../config/environment");

const generateToken = (userId) =>
  jwt.sign({ id: userId }, env.jwtSecret, { expiresIn: env.jwtExpiry });

const formatUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  mobile: user.mobile,
  gender: user.gender,
  address: user.address,
  role: user.role,
});

const register = catchAsync(async (req, res) => {
  const { name, email, password, mobile, gender, address } = req.body;

  const user = await User.create({
    name,
    email,
    password,
    mobile,
    gender,
    address,
  });

  const token = generateToken(user._id.toString());

  logger.info("User registered", { userId: user._id, email: user.email });

  res.status(201).json({
    success: true,
    message: "Registration successful",
    data: { user: formatUser(user), token },
  });
});

const login = catchAsync(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new AppError("Email and password are required", 400);
  }

  const user = await User.findOne({ email: email.toLowerCase() }).select(
    "+password"
  );

  if (!user) throw new AppError("Invalid credentials", 401);

  if (!user.active) {
    throw new AppError("Account is suspended. Contact support.", 403);
  }

  const isValid = await user.verifyPassword(password);
  if (!isValid) throw new AppError("Invalid credentials", 401);

  const token = generateToken(user._id.toString());

  logger.info("User logged in", { userId: user._id, email: user.email });

  res.status(200).json({
    success: true,
    message: "Login successful",
    data: { user: formatUser(user), token },
  });
});

const logout = catchAsync(async (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Logout successful",
  });
});

module.exports = { register, login, logout };