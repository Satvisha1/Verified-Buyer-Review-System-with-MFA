const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");

const {
  createOrder,
  getMyOrders,
  updateDeliveryStatus,
} = require("../controllers/orderController");

// Create order (customer must be logged in)
router.post("/create", authMiddleware, createOrder);

// Get logged-in customer's orders
router.get("/my", authMiddleware, getMyOrders);

// Update delivery status (protect with admin if needed)
router.put("/update-delivery", authMiddleware, adminMiddleware, updateDeliveryStatus);

module.exports = router;