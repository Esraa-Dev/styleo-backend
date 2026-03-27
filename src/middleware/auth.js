const jwt = require("jsonwebtoken");
const User = require("../models/User");
const AppError = require("../utils/AppError");
const env = require("../config/environment");

const protect = async (req, _res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) throw new AppError("Not authenticated. Please login", 401);

    const decoded = jwt.verify(token, env.jwtSecret);

    const user = await User.findById(decoded.id).select("-password");
    if (!user) throw new AppError("User no longer exists", 401);
    if (!user.active) {
      throw new AppError("Account suspended. Contact support", 403);
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};

const authorize = (...roles) => {
  return (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new AppError("Permission denied", 403));
    }
    next();
  };
};

module.exports = { protect, authorize };