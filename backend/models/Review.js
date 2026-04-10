const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },

    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    productId: {
      type: String,
      required: true,
    },

    productName: {
      type: String,
      default: "",
    },

    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },

    comment: {
      type: String,
      required: true,
      trim: true,
    },

    deliveryCode: {
      type: String,
      default: "",
    },

    reviewHash: {
      type: String,
      required: true,
      trim: true,
      minlength: 64, // SHA-256 length
    },

    reviewKey: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    submittedAt: {
      type: Date,
      required: true,
    },

    ipfsCid: {
      type: String,
      default: "",
    },

    ipfsUrl: {
      type: String,
      default: "",
    },

    ipfsProvider: {
      type: String,
      default: "",
    },

    onChainStored: {
      type: Boolean,
      default: false,
    },

    txHash: {
      type: String,
      default: "",
    },

    contractAddress: {
      type: String,
      default: "",
    },

    blockNumber: {
      type: Number,
      default: "",
    },

    blockchainNetwork: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

// One review per order + product
reviewSchema.index({ orderId: 1, productId: 1 }, { unique: true });

// Quickly find reviews by customer
reviewSchema.index({ customerId: 1 });

// Helpful for product review lookup
reviewSchema.index({ productId: 1 });

module.exports = mongoose.model("Review", reviewSchema);
