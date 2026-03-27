const mongoose = require("mongoose");
const env = require("./environment");

const connectDB = async () => {
  try {
    await mongoose.connect(env.mongodbUri);
    console.log("Database connected");
  } catch (err) {
    console.error("Database connection failed", err);
    process.exit(1);
  }
};

module.exports = connectDB;