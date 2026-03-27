const slugify = require("slugify");
const crypto = require("crypto");

const generateSlug = (text) => {
  const base = slugify(text || "", {
    lower: true,
    strict: true,
    trim: true,
    locale: "ar",
  });

  const suffix = crypto.randomBytes(3).toString("hex");
  return `${base || "item"}-${suffix}`;
};

module.exports = generateSlug;