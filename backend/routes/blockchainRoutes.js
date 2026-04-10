const express = require("express");
const router = express.Router();

const {
  checkReviewOnBlockchain,
  getProductBlockchainScore,
} = require("../controllers/blockchainController");

// GET /api/blockchain/check/:reviewKey
router.get("/check/:reviewKey", checkReviewOnBlockchain);
router.get("/verify/key/:reviewKey", checkReviewOnBlockchain);

// GET /api/blockchain/product-score/:productId
router.get("/product-score/:productId", getProductBlockchainScore);

module.exports = router;