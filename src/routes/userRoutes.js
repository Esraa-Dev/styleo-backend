const express = require("express");
const {
  getProfile,
  updateProfile,
  changePassword,
  getAllUsers,
  toggleUserStatus,
} = require("../controllers/userController");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

router.get("/me", protect, getProfile);
router.put("/me", protect, updateProfile);
router.post("/me/change-password", protect, changePassword);

router.use(protect, authorize("admin"));
router.get("/", getAllUsers);
router.patch("/:id/toggle", toggleUserStatus);

module.exports = router;