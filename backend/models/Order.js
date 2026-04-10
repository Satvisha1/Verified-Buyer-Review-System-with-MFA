const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    products: [
      {
        productId: { type: String, required: true },
        name: { type: String, required: true },
        price: { type: Number, required: true }
      }
    ],

    totalAmount: Number,
    paymentStatus: { type: String, default: "pending" }, // pending, completed, verified
    deliveryCode: { type: String, unique: true, sparse: true },
    createdAt: { type: Date, default: Date.now },

    // Delivery status
    deliveryStatus: {
      type: String,
      enum: [
        "pending",
        "delivery_pending",
        "shipped",
        "out_for_delivery",
        "delivered"
      ],
      default: "pending"
    },

    // Legacy delivery flag
    isDelivered: {
      type: Boolean,
      default: false
    },
  },
  {
    timestamps: true
  }
);

// Utility funtion to generate SDC
orderSchema.methods.generateDeliveryCode = async function () {
  const crypto = require("crypto");
  let code;
  let exists = true;

  while (exists) {
    code = crypto.randomBytes(4).toString("hex").toUpperCase();
    const existing = await this.constructor.findOne({ deliveryCode: code });
    if (!existing) exists = false;
  }

  this.deliveryCode = code;
  return code;
};

module.exports = mongoose.model("Order", orderSchema);