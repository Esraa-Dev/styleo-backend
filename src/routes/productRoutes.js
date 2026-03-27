const express = require("express");
const {
  getProducts,
  getProductBySlug,
  getProductsAdmin,
  createProduct,
  updateProduct,
  deleteProduct,
} = require("../controllers/productController");
const { protect, authorize } = require("../middleware/auth");
const upload = require("../config/upload");

const router = express.Router();

router.get("/", getProducts);
router.get("/admin/all", protect, authorize("admin"), getProductsAdmin);
router.get("/:slug", getProductBySlug);

router.use(protect, authorize("admin"));

router.post("/", upload, createProduct);
router.put("/:id", upload, updateProduct);
router.delete("/:id", deleteProduct);

module.exports = router;