const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");
const multer = require("multer");

const Order = require("../models/Order");
const User = require("../models/User");
const Product = require("../models/Product");
const ProductRequest = require("../models/ProductRequest");
const AuditLog = require("../models/AuditLog");

const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");
const logAction = require("../utils/logAction");

const { getAllReviewsAdmin } = require("../controllers/reviewController");
const {
  completePayment,
  verifyPayment,
  updateDeliveryStatus,
} = require("../controllers/orderController");

const uploadDir = path.join(__dirname, "../uploads/products");

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

// =========================
// USER MANAGEMENT
// =========================

router.get("/users", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const users = await User.find(
      {},
      "name email role isActive createdAt"
    ).sort({ createdAt: -1 });

    return res.status(200).json(users);
  } catch (err) {
    console.error("Get users error:", err);
    return res.status(500).json({ message: err.message });
  }
});

router.patch(
  "/users/:id/promote-to-sub-admin",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const user = await User.findById(req.params.id);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (user.role === "admin") {
        return res.status(400).json({
          message: "Admin cannot be changed through this route",
        });
      }

      user.role = "sub-admin";
      await user.save();

      await logAction({
        action: "PROMOTED_TO_SUB_ADMIN",
        performedBy: req.user.userId,
        role: req.user.role,
        targetId: user._id.toString(),
        details: `Promoted ${user.email} to sub-admin`,
      });

      return res.status(200).json({
        message: "Customer promoted to sub-admin successfully",
        user,
      });
    } catch (err) {
      console.error("Promote user error:", err);
      return res.status(500).json({ message: err.message });
    }
  }
);

router.patch(
  "/users/:id/demote-to-customer",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const user = await User.findById(req.params.id);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (user.role === "admin") {
        return res.status(400).json({
          message: "Admin cannot be demoted through this route",
        });
      }

      user.role = "customer";
      await user.save();

      await logAction({
        action: "DEMOTED_TO_CUSTOMER",
        performedBy: req.user.userId,
        role: req.user.role,
        targetId: user._id.toString(),
        details: `Demoted ${user.email} to customer`,
      });

      return res.status(200).json({
        message: "Sub-admin changed to customer successfully",
        user,
      });
    } catch (err) {
      console.error("Demote user error:", err);
      return res.status(500).json({ message: err.message });
    }
  }
);

router.patch(
  "/users/:id/status",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const { isActive } = req.body;

      if (typeof isActive !== "boolean") {
        return res.status(400).json({
          message: "isActive must be true or false",
        });
      }

      const user = await User.findById(req.params.id);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (user.role === "admin") {
        return res.status(400).json({
          message: "Admin status cannot be changed from this route",
        });
      }

      user.isActive = isActive;
      await user.save();

      await logAction({
        action: "USER_STATUS_UPDATE",
        performedBy: req.user.userId,
        role: req.user.role,
        targetId: req.params.id,
        details: `User ${isActive ? "activated" : "deactivated"}`,
      });

      return res.status(200).json({
        message: `User ${isActive ? "activated" : "deactivated"} successfully`,
        user,
      });
    } catch (err) {
      console.error("Update user status error:", err);
      return res.status(500).json({ message: err.message });
    }
  }
);

router.get("/admins", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const admins = await User.find(
      { role: { $in: ["admin", "sub-admin"] } },
      "name email role isActive createdAt"
    ).sort({ createdAt: -1 });

    return res.status(200).json(admins);
  } catch (err) {
    console.error("Get admins error:", err);
    return res.status(500).json({ message: err.message });
  }
});

// PRODUCT REQUEST APPROVALS
router.get(
  "/product-requests",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const requests = await ProductRequest.find()
        .populate("requestedBy", "name email role")
        .populate("productId", "name price imagePath isActive")
        .populate("reviewedBy", "name email role")
        .sort({ createdAt: -1 });

      return res.status(200).json({ requests });
    } catch (err) {
      console.error("Get product requests error:", err);
      return res.status(500).json({ message: err.message });
    }
  }
);

router.post(
  "/product-requests/:id/approve",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const productRequest = await ProductRequest.findById(req.params.id);

      if (!productRequest) {
        return res.status(404).json({ message: "Product request not found" });
      }

      if (productRequest.status !== "pending") {
        return res.status(400).json({
          message: "Only pending requests can be approved",
        });
      }

      let affectedProduct = null;

      if (productRequest.requestType === "create") {
        affectedProduct = await Product.create({
          name: productRequest.name,
          description: productRequest.description,
          price: productRequest.price,
          imagePath: productRequest.imagePath,
          imageOriginalName: productRequest.imageOriginalName,
          createdBy: productRequest.requestedBy,
          isActive: true,
        });
      } else if (productRequest.requestType === "update") {
        const product = await Product.findById(productRequest.productId);

        if (!product) {
          return res.status(404).json({
            message: "Target product not found for update request",
          });
        }

        if (
          productRequest.imagePath &&
          product.imagePath &&
          product.imagePath !== productRequest.imagePath
        ) {
          const cleanPath = product.imagePath.replace(/^\/+/, "");
          const oldPath = path.join(__dirname, "..", cleanPath);

          if (fs.existsSync(oldPath)) {
            fs.unlinkSync(oldPath);
          }
        }

        product.name = productRequest.name;
        product.description = productRequest.description;
        product.price = productRequest.price;

        if (productRequest.imagePath) {
          product.imagePath = productRequest.imagePath;
          product.imageOriginalName = productRequest.imageOriginalName;
        }

        await product.save();
        affectedProduct = product;
      } else if (productRequest.requestType === "delete") {
        const product = await Product.findById(productRequest.productId);

        if (!product) {
          return res.status(404).json({
            message: "Target product not found for delete request",
          });
        }

        if (product.imagePath) {
          const cleanPath = product.imagePath.replace(/^\/+/, "");
          const filePath = path.join(__dirname, "..", cleanPath);

          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        }

        await Product.findByIdAndDelete(product._id);
        affectedProduct = product;
      }

      productRequest.status = "approved";
      productRequest.reviewedBy = req.user.userId;
      productRequest.reviewNote = (req.body.reviewNote || "").trim();
      await productRequest.save();

      await logAction({
        action: "PRODUCT_REQUEST_APPROVED",
        performedBy: req.user.userId,
        role: req.user.role,
        targetId: productRequest._id.toString(),
        details: `Approved ${productRequest.requestType} request`,
      });

      return res.status(200).json({
        message: "Product request approved successfully",
        request: productRequest,
        affectedProduct,
      });
    } catch (err) {
      console.error("Approve product request error:", err);
      return res.status(500).json({ message: err.message });
    }
  }
);

router.post(
  "/product-requests/:id/reject",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const { reviewNote = "" } = req.body;

      const productRequest = await ProductRequest.findById(req.params.id);

      if (!productRequest) {
        return res.status(404).json({ message: "Product request not found" });
      }

      if (productRequest.status !== "pending") {
        return res.status(400).json({
          message: "Only pending requests can be rejected",
        });
      }

      productRequest.status = "rejected";
      productRequest.reviewedBy = req.user.userId;
      productRequest.reviewNote = reviewNote.trim();
      await productRequest.save();

      await logAction({
        action: "PRODUCT_REQUEST_REJECTED",
        performedBy: req.user.userId,
        role: req.user.role,
        targetId: productRequest._id.toString(),
        details: `Rejected ${productRequest.requestType} request`,
      });

      return res.status(200).json({
        message: "Product request rejected successfully",
        request: productRequest,
      });
    } catch (err) {
      console.error("Reject product request error:", err);
      return res.status(500).json({ message: err.message });
    }
  }
);

// ADMIN DIRECT PRODUCT CONTROL
router.get("/products", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const products = await Product.find()
      .populate("createdBy", "name email role")
      .sort({ createdAt: -1 });

    return res.status(200).json(products);
  } catch (err) {
    console.error("Get admin products error:", err);
    return res.status(500).json({ message: err.message });
  }
});

router.post(
  "/products",
  authMiddleware,
  adminMiddleware,
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

      const imagePath = req.file ? `/uploads/products/${req.file.filename}` : "";

      const product = await Product.create({
        name: name.trim(),
        description: description.trim(),
        price: numericPrice,
        imagePath,
        imageOriginalName: req.file?.originalname || "",
        createdBy: req.user.userId,
        isActive: true,
      });

      await logAction({
        action: "PRODUCT_CREATED",
        performedBy: req.user.userId,
        role: req.user.role,
        targetId: product._id.toString(),
        details: `Created product ${product.name}`,
      });

      return res.status(201).json({
        message: "Product created successfully",
        product,
      });
    } catch (err) {
      console.error("Create product error:", err);
      return res.status(500).json({ message: err.message });
    }
  }
);

router.put(
  "/products/:id",
  authMiddleware,
  adminMiddleware,
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

      const existing = await Product.findById(req.params.id);

      if (!existing) {
        return res.status(404).json({ message: "Product not found" });
      }

      let imagePath = existing.imagePath;
      let imageOriginalName = existing.imageOriginalName;

      if (req.file) {
        if (existing.imagePath) {
          const cleanPath = existing.imagePath.replace(/^\/+/, "");
          const oldPath = path.join(__dirname, "..", cleanPath);

          if (fs.existsSync(oldPath)) {
            fs.unlinkSync(oldPath);
          }
        }

        imagePath = `/uploads/products/${req.file.filename}`;
        imageOriginalName = req.file.originalname || "";
      }

      const product = await Product.findByIdAndUpdate(
        req.params.id,
        {
          name: name.trim(),
          description: description.trim(),
          price: numericPrice,
          imagePath,
          imageOriginalName,
        },
        { new: true, runValidators: true }
      );

      await logAction({
        action: "PRODUCT_UPDATED",
        performedBy: req.user.userId,
        role: req.user.role,
        targetId: req.params.id,
        details: `Updated product ${product.name}`,
      });

      return res.status(200).json({
        message: "Product updated successfully",
        product,
      });
    } catch (err) {
      console.error("Update product error:", err);
      return res.status(500).json({ message: err.message });
    }
  }
);

router.delete("/products/:id", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (product.imagePath) {
      const cleanPath = product.imagePath.replace(/^\/+/, "");
      const filePath = path.join(__dirname, "..", cleanPath);

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await logAction({
      action: "PRODUCT_DELETED",
      performedBy: req.user.userId,
      role: req.user.role,
      targetId: req.params.id,
      details: `Deleted product ${product.name}`,
    });

    return res.status(200).json({
      message: "Product deleted successfully",
      product,
    });
  } catch (err) {
    console.error("Delete product error:", err);
    return res.status(500).json({ message: err.message });
  }
});

// ORDER / PAYMENT / DELIVERY CONTROL
router.get("/orders", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const orders = await Order.find().populate("customerId", "name email role");
    return res.json(orders);
  } catch (err) {
    console.error("Admin orders error:", err);
    return res.status(500).json({ error: err.message });
  }
});

router.post(
  "/complete-payment/:orderId",
  authMiddleware,
  adminMiddleware,
  completePayment
);

router.post(
  "/verify-payment/:orderId",
  authMiddleware,
  adminMiddleware,
  verifyPayment
);

router.post(
  "/delivery-status",
  authMiddleware,
  adminMiddleware,
  updateDeliveryStatus
);

// MONITORING
router.get("/reviews", authMiddleware, adminMiddleware, getAllReviewsAdmin);

router.get("/logs", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const logs = await AuditLog.find()
      .populate("performedBy", "name email role")
      .sort({ createdAt: -1 });

    return res.json({ logs });
  } catch (err) {
    console.error("Get logs error:", err);
    return res.status(500).json({ message: err.message });
  }
});

module.exports = router;