const { Router } = require("express");
const { protect, authorize } = require("../middleware/auth");

const {
  getApprovedReviews,
  createReview,
  getReviewsAdmin,
  updateReviewStatus,
} = require("../controllers/reviewController");

const router = Router();

router.get("/approved", getApprovedReviews);

router.use(protect);

router.post("/", authorize("user"), createReview);

router.use(authorize("admin"));

router.get("/admin", getReviewsAdmin);
router.patch("/admin/:id", updateReviewStatus);

module.exports = router;