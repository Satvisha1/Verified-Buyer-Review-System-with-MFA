const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");
const multer = require("multer");

const Product = require("../models/Product");
const ProductRequest = require("../models/ProductRequest");
const Order = require("../models/Order");

const authMiddleware = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

const logAction = require("../utils/logAction");
const {
  buildReviewKey,
  authorizeReviewKeyOnChain,
  isReviewKeyAuthorizedOnChain,
} = require("../blockchain/reviewRegistry");

const uploadDir = path.join(__dirname, "../uploads/product-requests");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const safeBase = path
      .basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9-_]/g, "_");
    cb(null, `${Date.now()}-${safeBase}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed"));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

const subAdminOnly = [authMiddleware, authorizeRoles("sub-admin")];

const getSubAdminOwnedProductIds = async (userId) => {
  const products = await Product.find(
    { createdBy: userId, isActive: true },
    "_id"
  );
  return products.map((p) => p._id.toString());
};

const orderContainsOwnedProduct = (order, ownedProductIds) => {
  return order.products.some((item) =>
    ownedProductIds.includes(String(item.productId))
  );
};

// OVERVIEW
router.get("/overview", ...subAdminOnly, async (req, res) => {
  try {
    const ownedProductsCount = await Product.countDocuments({
      createdBy: req.user.userId,
      isActive: true,
    });

    const pendingRequestsCount = await ProductRequest.countDocuments({
      requestedBy: req.user.userId,
      status: "pending",
    });

    const ownedProductIds = await getSubAdminOwnedProductIds(req.user.userId);
    const allOrders = await Order.find();

    const relevantOrders = allOrders.filter((order) =>
      orderContainsOwnedProduct(order, ownedProductIds)
    );

    const pendingPaymentCount = relevantOrders.filter(
      (o) => o.paymentStatus === "pending" || o.paymentStatus === "completed"
    ).length;

    const pendingDeliveryCount = relevantOrders.filter(
      (o) => o.deliveryStatus !== "delivered"
    ).length;

    return res.status(200).json({
      overview: {
        ownedProductsCount,
        pendingRequestsCount,
        relevantOrdersCount: relevantOrders.length,
        pendingPaymentCount,
        pendingDeliveryCount,
      },
    });
  } catch (err) {
    console.error("Sub-admin overview error:", err);
    return res.status(500).json({ message: err.message });
  }
});

// APPROVED PRODUCTS
router.get("/approved-products", ...subAdminOnly, async (req, res) => {
  try {
    const products = await Product.find({
      createdBy: req.user.userId,
      isActive: true,
    }).sort({ createdAt: -1 });

    return res.status(200).json({ products });
  } catch (err) {
    console.error("Get approved products error:", err);
    return res.status(500).json({ message: err.message });
  }
});

// PRODUCT REQUEST HISTORY
router.get("/product-requests", ...subAdminOnly, async (req, res) => {
  try {
    const requests = await ProductRequest.find({
      requestedBy: req.user.userId,
    })
      .populate("productId", "name price")
      .populate("reviewedBy", "name email role")
      .sort({ createdAt: -1 });

    return res.status(200).json({ requests });
  } catch (err) {
    console.error("Get product requests error:", err);
    return res.status(500).json({ message: err.message });
  }
});

// CREATE PRODUCT REQUEST
router.post(
  "/product-requests/create",
  ...subAdminOnly,
  upload.single("image"),
  async (req, res) => {
    try {
      const { name, description, price } = req.body;

      if (!name || !description || price === undefined || price === null) {
        return res.status(400).json({
          message: "Name, description, and price are required",
        });
      }

      const numericPrice = Number(price);

      if (Number.isNaN(numericPrice) || numericPrice < 0) {
        return res.status(400).json({
          message: "Price must be a valid non-negative number",
        });
      }

      const productRequest = await ProductRequest.create({
        requestType: "create",
        requestedBy: req.user.userId,
        name: name.trim(),
        description: description.trim(),
        price: numericPrice,
        imagePath: req.file ? `/uploads/product-requests/${req.file.filename}` : "",
        imageOriginalName: req.file?.originalname || "",
      });

      await logAction({
        action: "PRODUCT_CREATE_REQUESTED",
        performedBy: req.user.userId,
        role: req.user.role,
        targetId: productRequest._id.toString(),
        details: `Create request submitted for product ${name}`,
      });

      return res.status(201).json({
        message: "Product creation request submitted for admin approval",
        request: productRequest,
      });
    } catch (err) {
      console.error("Create product request error:", err);
      return res.status(500).json({ message: err.message });
    }
  }
);

// UPDATE PRODUCT REQUEST
router.post(
  "/product-requests/update/:productId",
  ...subAdminOnly,
  upload.single("image"),
  async (req, res) => {
    try {
      const { name, description, price } = req.body;

      if (!name || !description || price === undefined || price === null) {
        return res.status(400).json({
          message: "Name, description, and price are required",
        });
      }

      const numericPrice = Number(price);

      if (Number.isNaN(numericPrice) || numericPrice < 0) {
        return res.status(400).json({
          message: "Price must be a valid non-negative number",
        });
      }

      const product = await Product.findById(req.params.productId);

      if (!product || !product.isActive) {
        return res.status(404).json({ message: "Product not found" });
      }

      if (String(product.createdBy) !== String(req.user.userId)) {
        return res.status(403).json({
          message: "You can only request updates for your own products",
        });
      }

      const existingPending = await ProductRequest.findOne({
        requestType: "update",
        productId: product._id,
        requestedBy: req.user.userId,
        status: "pending",
      });

      if (existingPending) {
        return res.status(400).json({
          message: "A pending update request already exists for this product",
        });
      }

      const productRequest = await ProductRequest.create({
        requestType: "update",
        productId: product._id,
        requestedBy: req.user.userId,
        name: name.trim(),
        description: description.trim(),
        price: numericPrice,
        imagePath: req.file ? `/uploads/product-requests/${req.file.filename}` : "",
        imageOriginalName: req.file?.originalname || "",
      });

      await logAction({
        action: "PRODUCT_UPDATE_REQUESTED",
        performedBy: req.user.userId,
        role: req.user.role,
        targetId: product._id.toString(),
        details: `Update request submitted for product ${product.name}`,
      });

      return res.status(201).json({
        message: "Product update request submitted for admin approval",
        request: productRequest,
      });
    } catch (err) {
      console.error("Update product request error:", err);
      return res.status(500).json({ message: err.message });
    }
  }
);

// DELETE PRODUCT REQUEST
router.post(
  "/product-requests/delete/:productId",
  ...subAdminOnly,
  async (req, res) => {
    try {
      const product = await Product.findById(req.params.productId);

      if (!product || !product.isActive) {
        return res.status(404).json({ message: "Product not found" });
      }

      if (String(product.createdBy) !== String(req.user.userId)) {
        return res.status(403).json({
          message: "You can only request deletion for your own products",
        });
      }

      const existingPending = await ProductRequest.findOne({
        requestType: "delete",
        productId: product._id,
        requestedBy: req.user.userId,
        status: "pending",
      });

      if (existingPending) {
        return res.status(400).json({
          message: "A pending delete request already exists for this product",
        });
      }

      const productRequest = await ProductRequest.create({
        requestType: "delete",
        productId: product._id,
        requestedBy: req.user.userId,
        name: product.name,
        description: product.description,
        price: product.price,
        imagePath: product.imagePath || "",
        imageOriginalName: product.imageOriginalName || "",
      });

      await logAction({
        action: "PRODUCT_DELETE_REQUESTED",
        performedBy: req.user.userId,
        role: req.user.role,
        targetId: product._id.toString(),
        details: `Delete request submitted for product ${product.name}`,
      });

      return res.status(201).json({
        message: "Product deletion request submitted for admin approval",
        request: productRequest,
      });
    } catch (err) {
      console.error("Delete product request error:", err);
      return res.status(500).json({ message: err.message });
    }
  }
);

// RELEVANT ORDERS
router.get("/orders", ...subAdminOnly, async (req, res) => {
  try {
    const ownedProductIds = await getSubAdminOwnedProductIds(req.user.userId);

    const orders = await Order.find()
      .populate("customerId", "name email")
      .sort({ createdAt: -1 });

    const relevantOrders = orders.filter((order) =>
      orderContainsOwnedProduct(order, ownedProductIds)
    );

    return res.status(200).json({ orders: relevantOrders });
  } catch (err) {
    console.error("Get sub-admin orders error:", err);
    return res.status(500).json({ message: err.message });
  }
});

// COMPLETE PAYMENT
router.post(
  "/orders/complete-payment/:orderId",
  ...subAdminOnly,
  async (req, res) => {
    try {
      const ownedProductIds = await getSubAdminOwnedProductIds(req.user.userId);
      const order = await Order.findById(req.params.orderId);

      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      if (!orderContainsOwnedProduct(order, ownedProductIds)) {
        return res.status(403).json({
          message: "You can only manage orders containing your own products",
        });
      }

      if (order.paymentStatus !== "pending") {
        return res.status(400).json({ message: "Payment already processed" });
      }

      order.paymentStatus = "completed";
      await order.save();

      await logAction({
        action: "SUBADMIN_PAYMENT_COMPLETED",
        performedBy: req.user.userId,
        role: req.user.role,
        targetId: order._id.toString(),
        details: "Payment marked as completed by sub-admin",
      });

      return res.status(200).json({
        message: "Payment marked as completed",
        order,
      });
    } catch (err) {
      console.error("Sub-admin complete payment error:", err);
      return res.status(500).json({ message: err.message });
    }
  }
);

// VERIFY PAYMENT
router.post(
  "/orders/verify-payment/:orderId",
  ...subAdminOnly,
  async (req, res) => {
    try {
      const ownedProductIds = await getSubAdminOwnedProductIds(req.user.userId);
      const order = await Order.findById(req.params.orderId);

      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      if (!orderContainsOwnedProduct(order, ownedProductIds)) {
        return res.status(403).json({
          message: "You can only manage orders containing your own products",
        });
      }

      if (order.paymentStatus === "verified") {
        return res.status(400).json({ message: "Payment already verified" });
      }

      if (order.paymentStatus !== "completed") {
        return res.status(400).json({ message: "Payment not completed yet" });
      }

      order.paymentStatus = "verified";
      await order.save();

      await logAction({
        action: "SUBADMIN_PAYMENT_VERIFIED",
        performedBy: req.user.userId,
        role: req.user.role,
        targetId: order._id.toString(),
        details: "Payment verified by sub-admin",
      });

      return res.status(200).json({
        message: "Payment verified successfully",
        order,
      });
    } catch (err) {
      console.error("Sub-admin verify payment error:", err);
      return res.status(500).json({ message: err.message });
    }
  }
);

// UPDATE DELIVERY STATUS
router.post(
  "/orders/delivery-status/:orderId",
  ...subAdminOnly,
  async (req, res) => {
    try {
      const { deliveryStatus } = req.body;

      const allowedStatuses = [
        "pending",
        "delivery_pending",
        "shipped",
        "out_for_delivery",
        "delivered",
      ];

      if (!allowedStatuses.includes(deliveryStatus)) {
        return res.status(400).json({
          message: "Invalid delivery status",
        });
      }

      const ownedProductIds = await getSubAdminOwnedProductIds(req.user.userId);
      const order = await Order.findById(req.params.orderId);

      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      if (!orderContainsOwnedProduct(order, ownedProductIds)) {
        return res.status(403).json({
          message: "You can only manage orders containing your own products",
        });
      }

      if (order.paymentStatus !== "verified") {
        return res.status(400).json({
          message: "Delivery workflow can only continue after payment is verified",
        });
      }

      if (order.deliveryStatus === "delivered") {
        return res.status(400).json({
          message: "This order has already been delivered",
        });
      }

      const validTransitions = {
        pending: ["shipped"],
        shipped: ["out_for_delivery"],
        out_for_delivery: ["delivered"],
      };

      const currentStatus = order.deliveryStatus || "pending";
      const nextAllowedStatuses = validTransitions[currentStatus] || [];

      if (!nextAllowedStatuses.includes(deliveryStatus)) {
        return res.status(400).json({
          message: `Invalid delivery transition from ${currentStatus} to ${deliveryStatus}`,
        });
      }

      order.deliveryStatus = deliveryStatus;
      order.isDelivered = deliveryStatus === "delivered";

      if (deliveryStatus === "delivered" && !order.deliveryCode) {
        await order.generateDeliveryCode();
      }

      await order.save();

      let authorizedReviewKeys = [];

      if (
        order.paymentStatus === "verified" &&
        order.deliveryStatus === "delivered" &&
        order.isDelivered === true &&
        order.deliveryCode
      ) {
        for (const product of order.products) {
          const reviewKey = buildReviewKey(order, product.productId);

          const alreadyAuthorized = await isReviewKeyAuthorizedOnChain(reviewKey);
          if (!alreadyAuthorized) {
            await authorizeReviewKeyOnChain(reviewKey);
          }

          authorizedReviewKeys.push(reviewKey);
        }
      }

      await logAction({
        action: "SUBADMIN_DELIVERY_STATUS_UPDATED",
        performedBy: req.user.userId,
        role: req.user.role,
        targetId: order._id.toString(),
        details: `Delivery status changed to ${deliveryStatus}`,
      });

      return res.status(200).json({
        message: "Delivery status updated successfully",
        deliveryCode: order.deliveryCode || null,
        authorizedReviewKeys,
        order,
      });
    } catch (err) {
      console.error("Sub-admin delivery status update error:", err);
      return res.status(500).json({ message: err.message });
    }
  }
);

module.exports = router;