const multer = require("multer");
const path = require("path");
const { randomUUID } = require("crypto");
const AppError = require("../utils/AppError");

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, "uploads/products"),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${randomUUID()}${ext}`);
  },
});

const filter = (_req, file, cb) => {
  const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError("Only JPEG, PNG, and WebP images are allowed", 400));
  }
};

const upload = multer({
  storage,
  filter,
  limits: { fileSize: 2 * 1024 * 1024 },
}).single("image");

module.exports = upload;