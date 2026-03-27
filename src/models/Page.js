const mongoose = require("mongoose");

const pageSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      enum: ["about_us", "faq", "contact_us"],
      required: true,
      unique: true,
    },
    content: { type: mongoose.Schema.Types.Mixed, required: true },
  },
  { timestamps: true, versionKey: false }
);

module.exports = mongoose.model("Page", pageSchema);