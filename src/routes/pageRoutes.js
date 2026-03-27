const { Router } = require("express");
const { protect, authorize } = require("../middleware/auth");
const {
  getPage,
  updateAbout,
  updateFaq,
  updateContact,
} = require("../controllers/pageController");

const router = Router();

router.get("/:key", getPage);

router.use(protect, authorize("admin"));

router.put("/admin/about_us", updateAbout);
router.put("/admin/faq", updateFaq);
router.put("/admin/contact_us", updateContact);

module.exports = router;