const express = require("express");
const router = express.Router();
const { requestOTP, verifyOTP } = require("./mfaController");

// Request OTP
router.post("/request", requestOTP);

// Verify OTP
router.post("/verify", verifyOTP);

module.exports = router;