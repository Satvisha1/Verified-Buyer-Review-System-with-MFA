const Review = require("../models/Review");
const Order = require("../models/Order");
const User = require("../models/User");
const crypto = require("crypto");
const axios = require("axios");

const {
  buildReviewKey,
  storeReviewOnChain,
  isReviewKeyAuthorizedOnChain,
  getReviewFromChain,
  authorizeReviewKeyOnChain,
} = require("../blockchain/reviewRegistry");

const { uploadJSONToIPFS } = require("../ipfs");

const REWARD_POINTS_PER_VERIFIED_REVIEW = 10;

// Payload builder
function buildReviewPayload({
  orderId,
  customerId,
  productId,
  productName,
  rating,
  comment,
  deliveryCode,
  reviewKey,
}) {
  return {
    orderId: String(orderId),
    customerId: String(customerId),
    productId: String(productId),
    productName: productName || "",
    rating: Number(rating),
    comment: String(comment || "").trim(),
    deliveryCode: String(deliveryCode),
    reviewKey: String(reviewKey),
  };
}

function normalizeReviewPayload(payload) {
  return JSON.parse(JSON.stringify(payload));
}

// Generates a SHA-256 hash of the review payload
function generateReviewHash(reviewPayload) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(reviewPayload))
    .digest("hex");
}

function normalizeHash(hashValue) {
  if (!hashValue) {
    return "";
  }

  const hash = String(hashValue).toLowerCase();
  return hash.startsWith("0x") ? hash : "0x" + hash;
}

// IPFS Verify
async function verifyReviewContentFromIPFS(review) {
  if (!review.ipfsUrl) {
    return {
      ipfsFetched: false,
      ipfsHash: null,
      ipfsMatchesDb: false,
      ipfsMatchesBlockchain: false,
    };
  }

  let ipfsData;

  try {
    const response = await axios.get(review.ipfsUrl);
    ipfsData = response.data;
  } catch (err) {
    return {
      ipfsFetched: false,
      ipfsHash: null,
      ipfsMatchesDb: false,
      ipfsMatchesBlockchain: false,
    };
  }

  const payloadFromIPFS = normalizeReviewPayload(
    buildReviewPayload({
      orderId: ipfsData.orderId,
      customerId: ipfsData.customerId,
      productId: ipfsData.productId,
      productName: ipfsData.productName,
      rating: ipfsData.rating,
      comment: ipfsData.comment,
      deliveryCode: ipfsData.deliveryCode,
      reviewKey: ipfsData.reviewKey,
    })
  );

  const recalculatedHash = normalizeHash(generateReviewHash(payloadFromIPFS));
  const dbHash = normalizeHash(review.reviewHash);

  return {
    ipfsFetched: true,
    ipfsHash: recalculatedHash,
    ipfsMatchesDb: recalculatedHash === dbHash,
    ipfsMatchesBlockchain: false,
  };
}

// Returns all reviews for a given productId
exports.getReviewsByProduct = async (req, res) => {
  try {
    const { productId } = req.params;

    const reviews = await Review.find({ productId: String(productId) }).sort({
      createdAt: -1,
    });

    return res.status(200).json({ reviews });
  } catch (err) {
    console.error("getReviewsByProduct error:", err);
    return res.status(500).json({ message: err.message });
  }
};

// Checks if logged-in customer can review this product
exports.checkEligibility = async (req, res) => {
  try {
    const customerId = req.user.userId;
    const productId = String(req.params.productId);

    const order = await Order.findOne({
      customerId,
      paymentStatus: "verified",
      "products.productId": productId,
      $or: [{ deliveryStatus: "delivered" }, { isDelivered: true }],
    }).sort({ createdAt: -1 });

    if (!order) {
      return res.status(200).json({
        canReview: false,
        alreadyReviewed: false,
        reason: "Order not delivered or product not eligible for review",
      });
    }

    if (!order.deliveryCode) {
      return res.status(200).json({
        canReview: false,
        alreadyReviewed: false,
        orderId: order._id.toString(),
        reason: "Delivery code missing for this completed order",
      });
    }

    const existing = await Review.findOne({
      customerId,
      productId,
      orderId: order._id,
    });

    const reviewKey = buildReviewKey(order, productId);

    let onChainAuthorized = false;
    try {
      onChainAuthorized = await isReviewKeyAuthorizedOnChain(reviewKey);
    } catch (chainErr) {
      console.error(
        "checkEligibility chain authorization error:",
        chainErr.message
      );
    }

    return res.status(200).json({
      canReview: !existing,
      alreadyReviewed: !!existing,
      orderId: order._id.toString(),
      deliveryCode: order.deliveryCode,
      reviewKey: existing?.reviewKey || reviewKey,
      onChainAuthorized,
      reason: existing ? "Already reviewed" : "Eligible",
    });
  } catch (err) {
    console.error("checkEligibility error:", err);
    return res.status(500).json({ message: err.message });
  }
};

// Submit review only if verified buyer and delivered order
exports.submitReviewForProduct = async (req, res) => {
  try {
    const customerId = req.user.userId;
    const productId = String(req.params.productId);
    const { rating, comment } = req.body;

    const numericRating = Number(rating);
    const cleanComment = String(comment || "").trim();

    if (!numericRating || numericRating < 1 || numericRating > 5) {
      return res.status(400).json({
        message: "Rating must be between 1 and 5",
      });
    }

    if (!cleanComment) {
      return res.status(400).json({
        message: "Comment is required",
      });
    }

    const order = await Order.findOne({
      customerId,
      paymentStatus: "verified",
      "products.productId": productId,
      $or: [{ deliveryStatus: "delivered" }, { isDelivered: true }],
    }).sort({ createdAt: -1 });

    if (!order) {
      return res.status(403).json({
        message: "Only verified buyers with delivered orders can review",
      });
    }

    if (!order.deliveryCode) {
      return res.status(400).json({
        message: "Delivery code missing for this order",
      });
    }

    const existing = await Review.findOne({
      customerId,
      productId,
      orderId: order._id,
    });

    if (existing) {
      return res.status(400).json({
        message: "You already reviewed this product for this order",
      });
    }

    const orderedProduct = order.products.find(
      (p) => String(p.productId) === productId
    );

    if (!orderedProduct) {
      return res.status(400).json({
        message: "Product not found in delivered order",
      });
    }

    const submittedAt = new Date();
    const reviewKey = buildReviewKey(order, productId);

    let onChainAuthorized = await isReviewKeyAuthorizedOnChain(reviewKey);

    if (!onChainAuthorized) {
      console.log("Auto-authorizing review key:", reviewKey);

      try {
        await authorizeReviewKeyOnChain(reviewKey);
        onChainAuthorized = await isReviewKeyAuthorizedOnChain(reviewKey);
      } catch (err) {
        console.error("Authorization failed:", err.message);
      }
    }

    if (!onChainAuthorized) {
      return res.status(400).json({
        message:
          "Review key authorization failed. Please try again or contact admin.",
      });
    }

    const existingOnChain = await getReviewFromChain(reviewKey);

    if (existingOnChain.exists) {
      return res.status(400).json({
        message: "Review already stored for this key",
      });
    }

    const reviewPayload = normalizeReviewPayload(
      buildReviewPayload({
        orderId: order._id,
        customerId,
        productId,
        productName: orderedProduct.name,
        rating: numericRating,
        comment: cleanComment,
        deliveryCode: order.deliveryCode,
        reviewKey,
      })
    );

    const reviewHash = normalizeHash(generateReviewHash(reviewPayload));

    const ipfsPayload = reviewPayload;

    const ipfsResult = await uploadJSONToIPFS(ipfsPayload);

    if (!ipfsResult || !ipfsResult.cid) {
      return res.status(500).json({
        message: "IPFS upload failed",
      });
    }

    const chainResult = await storeReviewOnChain(
      reviewKey,
      reviewHash,
      ipfsResult.cid,
      productId,
      numericRating
    );

    if (!chainResult || !chainResult.txHash) {
      return res.status(500).json({
        message: "Blockchain storage failed",
      });
    }

    const newReview = await Review.create({
      orderId: order._id,
      customerId,
      productId,
      productName: orderedProduct.name || "",
      rating: numericRating,
      comment: cleanComment,
      deliveryCode: order.deliveryCode,
      reviewHash,
      reviewKey,
      submittedAt,
      ipfsCid: ipfsResult.cid,
      ipfsUrl: ipfsResult.url || null,
      ipfsProvider: process.env.IPFS_PROVIDER || "pinata",
      onChainStored: !!chainResult?.txHash,
      txHash: chainResult.txHash || null,
      contractAddress: chainResult.contractAddress || null,
      blockNumber: chainResult.blockNumber || null,
      blockchainNetwork: process.env.BLOCKCHAIN_NETWORK || "sepolia",
    });

    const updatedUser = await User.findByIdAndUpdate(
      customerId,
      { $inc: { rewardPoints: REWARD_POINTS_PER_VERIFIED_REVIEW } },
      { new: true, select: "_id rewardPoints" }
    );

    return res.status(201).json({
      message: "Review submitted successfully",
      review: newReview,
      rewards: {
        pointsAwarded: REWARD_POINTS_PER_VERIFIED_REVIEW,
        totalRewardPoints: Number(updatedUser?.rewardPoints || 0),
        reason: "Verified review stored on blockchain",
      },
    });
  } catch (err) {
    console.error("submitReviewForProduct error:", err);

    if (err.code === 11000) {
      return res.status(400).json({
        message: "You already reviewed this product for this order",
      });
    }

    if (err.message === "Review already stored for this key") {
      return res.status(400).json({
        message: "Review already stored for this key",
      });
    }

    return res.status(500).json({
      message: err.message || "Failed to submit review",
    });
  }
};

// Returns all reviews by logged-in customer
exports.getMyReviews = async (req, res) => {
  try {
    const customerId = req.user.userId;
    const reviews = await Review.find({ customerId }).sort({ createdAt: -1 });
    return res.status(200).json({ reviews });
  } catch (err) {
    console.error("getMyReviews error:", err);
    return res.status(500).json({ message: err.message });
  }
};

// Returns all reviews for admin monitoring
exports.getAllReviewsAdmin = async (req, res) => {
  try {
    const reviews = await Review.find()
      .populate("customerId", "name email role")
      .sort({ createdAt: -1 });

    return res.status(200).json({ reviews });
  } catch (err) {
    console.error("getAllReviewsAdmin error:", err);
    return res.status(500).json({ message: err.message });
  }
};

// Verify review hash + CID + IPFS content using MongoDB review _id
exports.verifyReviewIntegrity = async (req, res) => {
  try {
    const { reviewId } = req.params;

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    if (!review.reviewKey) {
      return res.status(400).json({ message: "Review key missing" });
    }

    const chainReview = await getReviewFromChain(review.reviewKey);

    const dbHash = normalizeHash(review.reviewHash);
    const onChainHash = normalizeHash(chainReview.reviewHash);
    const dbCid = review.ipfsCid ? String(review.ipfsCid) : "";
    const onChainCid = chainReview.ipfsCid ? String(chainReview.ipfsCid) : "";

    const dbMatchesBlockchain = dbHash === onChainHash;
    const cidMatches = dbCid === onChainCid;

    let ipfsCheck = {
      ipfsFetched: false,
      ipfsHash: null,
      ipfsMatchesDb: false,
      ipfsMatchesBlockchain: false,
    };

    if (review.ipfsUrl) {
      ipfsCheck = await verifyReviewContentFromIPFS(review);
      ipfsCheck.ipfsMatchesBlockchain = ipfsCheck.ipfsHash === onChainHash;
    }

    const verified =
      chainReview.exists &&
      dbMatchesBlockchain &&
      cidMatches &&
      ipfsCheck.ipfsMatchesDb &&
      ipfsCheck.ipfsMatchesBlockchain;

    return res.status(200).json({
      verified,
      reviewId: review._id,
      reviewKey: review.reviewKey,
      existsOnChain: chainReview.exists,
      dbHash,
      onChainHash,
      dbCid,
      onChainCid,
      dbMatchesBlockchain,
      cidMatches,
      ipfsFetched: ipfsCheck.ipfsFetched,
      ipfsHash: ipfsCheck.ipfsHash,
      ipfsMatchesDb: ipfsCheck.ipfsMatchesDb,
      ipfsMatchesBlockchain: ipfsCheck.ipfsMatchesBlockchain,
      ipfsUrl: review.ipfsUrl,
      ipfsProvider: review.ipfsProvider || "pinata",
      onChainStored: review.onChainStored,
      txHash: review.txHash,
      contractAddress: review.contractAddress,
      blockNumber: review.blockNumber,
    });
  } catch (err) {
    console.error("verifyReviewIntegrity error:", err);
    return res.status(500).json({ message: err.message });
  }
};

// Verify review hash + CID + IPFS content using reviewKey directly
exports.verifyReviewIntegrityByKey = async (req, res) => {
  try {
    const { reviewKey } = req.params;

    const review = await Review.findOne({ reviewKey });
    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    const chainReview = await getReviewFromChain(review.reviewKey);

    const dbHash = normalizeHash(review.reviewHash);
    const onChainHash = normalizeHash(chainReview.reviewHash);
    const dbCid = review.ipfsCid ? String(review.ipfsCid) : "";
    const onChainCid = chainReview.ipfsCid ? String(chainReview.ipfsCid) : "";

    const dbMatchesBlockchain = dbHash === onChainHash;
    const cidMatches = dbCid === onChainCid;

    let ipfsCheck = {
      ipfsFetched: false,
      ipfsHash: null,
      ipfsMatchesDb: false,
      ipfsMatchesBlockchain: false,
    };

    if (review.ipfsUrl) {
      ipfsCheck = await verifyReviewContentFromIPFS(review);
      ipfsCheck.ipfsMatchesBlockchain = ipfsCheck.ipfsHash === onChainHash;
    }

    const verified =
      chainReview.exists &&
      dbMatchesBlockchain &&
      cidMatches &&
      ipfsCheck.ipfsMatchesDb &&
      ipfsCheck.ipfsMatchesBlockchain;

    return res.status(200).json({
      verified,
      reviewKey: review.reviewKey,
      existsOnChain: chainReview.exists,
      dbHash,
      onChainHash,
      dbCid,
      onChainCid,
      dbMatchesBlockchain,
      cidMatches,
      ipfsFetched: ipfsCheck.ipfsFetched,
      ipfsHash: ipfsCheck.ipfsHash,
      ipfsMatchesDb: ipfsCheck.ipfsMatchesDb,
      ipfsMatchesBlockchain: ipfsCheck.ipfsMatchesBlockchain,
      ipfsUrl: review.ipfsUrl,
      ipfsProvider: review.ipfsProvider || "pinata",
      onChainStored: review.onChainStored,
      txHash: review.txHash,
      contractAddress: review.contractAddress,
      blockNumber: review.blockNumber,
    });
  } catch (err) {
    console.error("verifyReviewIntegrityByKey error:", err);
    return res.status(500).json({ message: err.message });
  }
};