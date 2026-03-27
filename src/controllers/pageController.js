const Page = require("../models/Page");
const AppError = require("../utils/AppError");
const catchAsync = require("../utils/catchAsync");
const logger = require("../utils/logger");

const VALID_KEYS = ["about_us", "faq", "contact_us"];

const getPage = catchAsync(async (req, res) => {
  const { key } = req.params;

  if (!VALID_KEYS.includes(key)) throw new AppError("Invalid page key", 400);

  const page = await Page.findOne({ key });
  if (!page) throw new AppError("Page not found", 404);

  res.status(200).json({
    success: true,
    message: "Page retrieved",
    data: page,
  });
});

const updateAbout = catchAsync(async (req, res) => {
  const { title, body } = req.body;

  const data = await Page.findOneAndUpdate(
    { key: "about_us" },
    { content: { title, body } },
    { new: true, upsert: true }
  );

  logger.info("About Us updated");
  res.status(200).json({ success: true, message: "About Us updated", data });
});

const updateFaq = catchAsync(async (req, res) => {
  const { items } = req.body;

  const data = await Page.findOneAndUpdate(
    { key: "faq" },
    { content: items },
    { new: true, upsert: true }
  );

  logger.info("FAQ updated");
  res.status(200).json({ success: true, message: "FAQ updated", data });
});

const updateContact = catchAsync(async (req, res) => {
  const { phone, email, address, hours, social } = req.body;

  const data = await Page.findOneAndUpdate(
    { key: "contact_us" },
    { content: { phone, email, address, hours, social } },
    { new: true, upsert: true }
  );

  logger.info("Contact Us updated");
  res.status(200).json({ success: true, message: "Contact Us updated", data });
});

module.exports = {
  getPage,
  updateAbout,
  updateFaq,
  updateContact,
};