const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");

const {
  getReviewsByProduct,
  checkEligibility,
  submitReviewForProduct,
  getMyReviews,
  verifyReviewIntegrity,
  verifyReviewIntegrityByKey,
} = require("../controllers/reviewController");

// Public
router.get("/product/:productId", getReviewsByProduct);

// Customer
router.get("/eligibility/:productId", authMiddleware, checkEligibility);
router.post("/product/:productId", authMiddleware, submitReviewForProduct);
router.get("/my", authMiddleware, getMyReviews);
router.get("/verify/:reviewId", authMiddleware, verifyReviewIntegrity);
router.get("/verify-key/:reviewKey", authMiddleware, verifyReviewIntegrityByKey);

module.exports = router;