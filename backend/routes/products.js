const express = require("express");
const router = express.Router();
const Product = require("../models/Product");

router.get("/", async (req, res) => {
  try {
    const products = await Product.find({ isActive: true })
      .populate("createdBy", "name email role")
      .sort({ createdAt: -1 });

    return res.status(200).json({ products });
  } catch (err) {
    console.error("Get products error:", err);
    return res.status(500).json({ message: err.message });
  }
});

module.exports = router;