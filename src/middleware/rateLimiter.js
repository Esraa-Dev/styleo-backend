const rateLimit = require("express-rate-limit");

const MINUTE = 60 * 1000;

const limiter = rateLimit({
  windowMs: 15 * MINUTE,
  max: 100,
  message: {
    success: false,
    message: "Too many requests. Please try again later",
  },
});

module.exports = limiter;