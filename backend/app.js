require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const rateLimit = require("express-rate-limit");

const authRoutes = require("./routes/auth");
const orderRoutes = require("./routes/orders");
const reviewRoutes = require("./routes/reviews");
const mfaRoutes = require("./mfa/mfaRoutes");
const adminRoutes = require("./routes/admin");
const blockchainRoutes = require("./routes/blockchainRoutes");
const productRoutes = require("./routes/products");
const subAdminRoutes = require("./routes/subAdmin");

const app = express();

// Rate limiter for login, signup and OTP-related endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: {
    message: "Too many login or OTP attempts. Please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Allow frontend to access backend
app.use(
  cors({
    origin: "http://localhost:3000",
  })
);

// Read JSON request body from frontend
app.use(express.json());

// Static file serving for uploaded product images
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/mfa", authLimiter, mfaRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/blockchain", blockchainRoutes);
app.use("/api/products", productRoutes);
app.use("/api/sub-admin", subAdminRoutes);

// Test route
app.get("/", (req, res) => {
  res.send("Backend is running");
});

// API 404 handler - always return JSON for unknown API routes
app.use("/api", (req, res) => {
  return res.status(404).json({
    message: `API route not found: ${req.method} ${req.originalUrl}`,
  });
});

// Global error handler - always return JSON for API errors
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);

  if (req.originalUrl && req.originalUrl.startsWith("/api")) {
    return res.status(err.status || 500).json({
      message: err.message || "Internal server error",
    });
  }

  next(err);
});

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");
    app.listen(process.env.PORT || 5000, () => {
      console.log(`Server running on port ${process.env.PORT || 5000}`);
    });
  })
  .catch((err) => console.error("MongoDB connection error:", err));