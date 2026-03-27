const { Router } = require("express");
const { protect } = require("../middleware/auth");
const {
  getCart,
  addItem,
  updateItem,
  removeItem,
  clearCart,
  mergeCart,
  confirmPrice,
} = require("../controllers/cartController");

const router = Router();

router.use(protect);

router.get("/", getCart);
router.post("/items", addItem);
router.put("/items/:productId", updateItem);
router.delete("/items/:productId", removeItem);
router.delete("/", clearCart);
router.post("/merge", mergeCart);
router.patch("/confirm-price/:productId", confirmPrice);

module.exports = router;