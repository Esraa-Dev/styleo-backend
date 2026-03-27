const express = require("express");
const path = require("path");
const cors = require("cors");
const connectDB = require("./src/config/database");
const env = require("./src/config/environment");
const errorHandler = require("./src/middleware/errorHandler");
const rateLimiter = require("./src/middleware/rateLimiter");

const authRoutes = require("./src/routes/authRoutes");
const userRoutes = require("./src/routes/userRoutes");
const productRoutes = require("./src/routes/productRoutes");
const categoryRoutes = require("./src/routes/categoryRoutes");
const cartRoutes = require("./src/routes/cartRoutes");
const orderRoutes = require("./src/routes/orderRoutes");
const reviewRoutes = require("./src/routes/reviewRoutes");
const pageRoutes = require("./src/routes/pageRoutes");

const app = express();

const start = async () => {
  try {
    await connectDB();

    app.use(cors({
      origin: (origin, cb) => {
        if (!origin || env.allowedOrigins.includes(origin)) {
          cb(null, true);
        } else {
          cb(new Error("Origin not allowed"));
        }
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    }));

    app.use("/api", rateLimiter);
    app.use(express.json({ limit: "10kb" }));
    app.use("/uploads", express.static(path.join(__dirname, "uploads")));

    app.use("/api/v1/auth", authRoutes);
    app.use("/api/v1/users", userRoutes);
    app.use("/api/v1/products", productRoutes);
    app.use("/api/v1/categories", categoryRoutes);
    app.use("/api/v1/cart", cartRoutes);
    app.use("/api/v1/orders", orderRoutes);
    app.use("/api/v1/reviews", reviewRoutes);
    app.use("/api/v1/pages", pageRoutes);

    app.use(errorHandler);

    app.listen(env.port, () => {
      console.log(`Server running on port ${env.port}`);
    });
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

start();