const Order = require("../models/Order");
const {
  buildReviewKey,
  authorizeReviewKeyOnChain,
} = require("../blockchain/reviewRegistry");

// Create new order (AUTH REQUIRED)
exports.createOrder = async (req, res) => {
  try {
    const customerId = req.user?.userId;

    if (!customerId) {
      return res.status(401).json({ message: "Unauthorized (no user in token)" });
    }

    const { products } = req.body;

    if (!products || !Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ message: "Products required" });
    }

    for (const product of products) {
      if (!product.productId || !product.name || typeof product.price !== "number") {
        return res.status(400).json({
          message: "Each product must have productId, name, and price (number)",
        });
      }
    }

    const computedTotal = products.reduce((sum, product) => {
      return sum + (Number(product.price) || 0);
    }, 0);

    const newOrder = await Order.create({
      customerId,
      products,
      totalAmount: computedTotal,
      paymentStatus: "pending",
      deliveryStatus: "pending",
      isDelivered: false,
    });

    return res.status(201).json({
      message: "Order created",
      order: newOrder,
    });
  } catch (error) {
    console.error("createOrder error:", error);
    return res.status(400).json({ message: error.message });
  }
};

// Get all orders for the logged-in customer
exports.getMyOrders = async (req, res) => {
  try {
    const customerId = req.user?.userId;

    if (!customerId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const orders = await Order.find({ customerId }).sort({ createdAt: -1 });

    return res.status(200).json({ orders });
  } catch (error) {
    console.error("getMyOrders error:", error);
    return res.status(500).json({ message: error.message });
  }
};

// Mark payment as completed (Admin)
exports.completePayment = async (req, res) => {
  try {
    const { orderId } = req.params;

    if (!orderId) {
      return res.status(400).json({ message: "orderId is required" });
    }

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (order.paymentStatus !== "pending") {
      return res.status(400).json({
        message: "Only pending payments can be marked as completed",
      });
    }

    order.paymentStatus = "completed";
    await order.save();

    return res.status(200).json({
      message: "Payment marked as completed",
      order,
    });
  } catch (error) {
    console.error("completePayment error:", error);
    return res.status(500).json({ message: error.message });
  }
};

// Verify payment (Admin)
exports.verifyPayment = async (req, res) => {
  try {
    const { orderId } = req.params;

    if (!orderId) {
      return res.status(400).json({ message: "orderId is required" });
    }

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (order.paymentStatus !== "completed") {
      return res.status(400).json({
        message: "Only completed payments can be verified",
      });
    }

    order.paymentStatus = "verified";
    await order.save();

    return res.status(200).json({
      message: "Payment verified successfully",
      order,
    });
  } catch (error) {
    console.error("verifyPayment error:", error);
    return res.status(500).json({ message: error.message });
  }
};

// Update delivery status (Admin)
exports.updateDeliveryStatus = async (req, res) => {
  try {
    const { orderId, status } = req.body;

    if (!orderId || !status) {
      return res.status(400).json({ message: "orderId and status required" });
    }

    const normalizedStatus = String(status).toLowerCase();

    const allowedStatuses = [
      "pending",
      "delivery_pending",
      "shipped",
      "out_for_delivery",
      "delivered",
    ];

    if (!allowedStatuses.includes(normalizedStatus)) {
      return res.status(400).json({
        message: `Invalid status. Allowed: ${allowedStatuses.join(", ")}`,
      });
    }

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    order.deliveryStatus = normalizedStatus;
    order.isDelivered = normalizedStatus === "delivered";

    let authorizedReviewKeys = [];

    // Generate delivery code only when payment already verified and delivery becomes delivered
    if (
      order.paymentStatus === "verified" &&
      order.deliveryStatus === "delivered" &&
      !order.deliveryCode
    ) {
      await order.generateDeliveryCode();
    }

    // Save DB changes first so delivery status + delivery code are persisted
    await order.save();

    // Authorize review keys on blockchain only if delivery code exists
    if (
      order.paymentStatus === "verified" &&
      order.deliveryStatus === "delivered" &&
      order.deliveryCode
    ) {
      try {
        for (const product of order.products) {
          const reviewKey = buildReviewKey(order, product.productId);
          await authorizeReviewKeyOnChain(reviewKey);
          authorizedReviewKeys.push(reviewKey);
        }
      } catch (chainError) {
        console.error(
          "Blockchain authorization error in updateDeliveryStatus:",
          chainError
        );

        return res.status(500).json({
          message: "Delivery updated, but blockchain authorization failed",
          error: chainError.message,
          deliveryCode: order.deliveryCode,
          order,
        });
      }
    }

    return res.status(200).json({
      message: `Delivery status updated to ${normalizedStatus}`,
      deliveryCode: order.deliveryCode || null,
      authorizedReviewKeys,
      order,
    });
  } catch (error) {
    console.error("updateDeliveryStatus full error:", error);

    return res.status(500).json({
      message: "Failed to update delivery status",
      error: error.message,
    });
  }
};