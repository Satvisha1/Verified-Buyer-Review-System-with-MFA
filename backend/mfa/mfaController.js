const User = require("../models/User");
const Otp = require("../models/Otp");
const { generateOTP, sendOTPEmail } = require("./mfaUtils");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

// Generate OTP and send via email
exports.requestOTP = async (req, res) => {
  let { email } = req.body;
  email = email?.trim().toLowerCase();

  if (!email || !email.includes("@")) {
    return res.status(400).json({ message: "Valid email required" });
  }

  try {
    const existingUser = await User.findOne({ email });
    if (!existingUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const existingOtp = await Otp.findOne({ email });

    if (existingOtp) {
      if (existingOtp.expiresAt > new Date()) {
        return res.status(200).json({
          message: "OTP already sent. Please check Ethereal preview URL in backend console.",
        });
      }

      await Otp.deleteOne({ _id: existingOtp._id });
    }

    const otp = generateOTP();
    const otpHash = await bcrypt.hash(otp, 10);

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await Otp.create({
      email,
      otpHash,
      attempts: 0,
      expiresAt,
    });

    await sendOTPEmail(email, otp);

    return res.status(200).json({
      message: "OTP sent (check Ethereal preview URL in backend console)",
    });
  } catch (err) {
    console.error("Error sending OTP:", err);
    return res.status(500).json({ message: "Failed to send OTP" });
  }
};

// Verify OTP
exports.verifyOTP = async (req, res) => {
  let { email, otp } = req.body;
  email = email?.trim().toLowerCase();

  if (!email || !otp) {
    return res.status(400).json({ message: "Email and OTP required" });
  }

  if (!process.env.JWT_SECRET) {
    return res.status(500).json({ message: "JWT_SECRET is missing" });
  }

  try {
    const otpRecord = await Otp.findOne({ email });

    if (!otpRecord) {
      return res.status(400).json({ message: "OTP not found or expired" });
    }

    if (otpRecord.expiresAt < new Date()) {
      await Otp.deleteOne({ _id: otpRecord._id });
      return res.status(400).json({ message: "OTP expired" });
    }

    if (otpRecord.attempts >= 5) {
      await Otp.deleteOne({ _id: otpRecord._id });
      return res.status(400).json({ message: "Too many invalid attempts. Request a new OTP." });
    }

    const isMatch = await bcrypt.compare(otp, otpRecord.otpHash);

    if (!isMatch) {
      otpRecord.attempts += 1;
      await otpRecord.save();
      return res.status(400).json({ message: "Invalid OTP" });
    }

    await Otp.deleteOne({ _id: otpRecord._id });

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    return res.status(200).json({
      message: "OTP verified successfully",
      token,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("Error during OTP verification:", err);
    return res.status(500).json({ message: "Server error during verification" });
  }
};