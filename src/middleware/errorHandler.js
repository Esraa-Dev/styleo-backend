const AppError = require("../utils/AppError");
const logger = require("../utils/logger");

const errorHandler = (err, req, res, _next) => {
  logger.error({
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
  });

  if (err.code === 11000) {
    return res.status(400).json({
      success: false,
      message: "Duplicate entry. This record already exists",
    });
  }

  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({
      success: false,
      message: "Invalid authentication credentials",
    });
  }

  if (err.name === "TokenExpiredError") {
    return res.status(401).json({
      success: false,
      message: "Session expired. Please login again",
    });
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode || 400).json({
      success: false,
      message: err.message || "Request could not be completed",
    });
  }

  return res.status(500).json({
    success: false,
    message: "Internal server error",
  });
};

module.exports = errorHandler;