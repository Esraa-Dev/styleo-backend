const express = require("express");
const { protect, authorize } = require("../middleware/auth");
const {
  getAllCategories,
  getAllCategoriesAdmin,
  createCategory,
  updateCategory,
  deleteCategory,
  createSubcategory,
  updateSubcategory,
  deleteSubcategory,
} = require("../controllers/categoryController");

const router = express.Router();

router.get("/", getAllCategories);
router.get("/admin", protect, authorize("admin"), getAllCategoriesAdmin);

router.post("/", protect, authorize("admin"), createCategory);
router.put("/:id", protect, authorize("admin"), updateCategory);
router.delete("/:id", protect, authorize("admin"), deleteCategory);

router.post("/:id/subcategories", protect, authorize("admin"), createSubcategory);
router.put("/:id/subcategories/:subId", protect, authorize("admin"), updateSubcategory);
router.delete("/:id/subcategories/:subId", protect, authorize("admin"), deleteSubcategory);

module.exports = router;