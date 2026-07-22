const User = require("../models/User");
const bcrypt = require("bcrypt");

// Customer Signup
exports.signupCustomer = async (req, res) => {
  try {
    let { name, email, password } = req.body;

    email = email?.trim().toLowerCase();

    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Customer already exists" });
    }

    const user = await User.create({
      name: name.trim(),
      email,
      password,
      role: "customer",
    });

    return res.status(201).json({
      message: "Customer registered successfully",
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        rewardPoints: user.rewardPoints,
      },
    });
  } catch (error) {
    console.error("Customer signup error:", error);
    return res.status(500).json({
      message: "Server error during customer signup",
      error: error.message,
    });
  }
};

// Sub Admin Signup
exports.signupSubAdmin = async (req, res) => {
  try {
    let { name, email, password } = req.body;

    email = email?.trim().toLowerCase();

    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Sub Admin already exists" });
    }

    const subAdmin = await User.create({
      name: name.trim(),
      email,
      password,
      role: "sub-admin",
    });

    return res.status(201).json({
      message: "Sub Admin registered successfully",
      user: {
        id: subAdmin._id.toString(),
        name: subAdmin.name,
        email: subAdmin.email,
        role: subAdmin.role,
        isActive: subAdmin.isActive,
        rewardPoints: subAdmin.rewardPoints,
      },
    });
  } catch (error) {
    console.error("Sub Admin signup error:", error);
    return res.status(500).json({
      message: "Server error during sub-admin signup",
      error: error.message,
    });
  }
};

// Admin Signup
exports.signupAdmin = async (req, res) => {
  try {
    let { name, email, password } = req.body;

    email = email?.trim().toLowerCase();

    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Admin already exists" });
    }

    const existingAdmin = await User.findOne({ role: "admin" });

    const admin = await User.create({
      name: name.trim(),
      email,
      password,
      role: "admin",
      isActive: existingAdmin ? false : true,
    });

    return res.status(201).json({
      message: existingAdmin
        ? "Admin signup request submitted. Approval required from existing admin."
        : "First admin registered successfully",
      user: {
        id: admin._id.toString(),
        name: admin.name,
        email: admin.email,
        role: admin.role,
        isActive: admin.isActive,
        rewardPoints: admin.rewardPoints,
      },
    });
  } catch (error) {
    console.error("Admin signup error:", error);
    return res.status(500).json({
      message: "Server error during admin signup",
      error: error.message,
    });
  }
};

const loginByRole = async (req, res, expectedRole, roleLabel) => {
  try {
    let { email, password } = req.body;

    email = email?.trim().toLowerCase();

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    const user = await User.findOne({ email });

    if (!user || user.role !== expectedRole) {
      return res.status(400).json({
        message: `Invalid ${roleLabel} credentials`,
      });
    }

    if (!user.password || typeof user.password !== "string") {
      return res.status(500).json({
        message: `Stored ${roleLabel} password is invalid`,
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({
        message: `Invalid ${roleLabel} credentials`,
      });
    }

    if (user.isActive === false) {
      return res.status(403).json({
        message:
          user.role === "admin"
            ? "Admin approval required before login"
            : "Your account has been deactivated by Admin",
      });
    }

    return res.status(200).json({
      message: "Credentials verified. MFA required.",
      email: user.email,
      role: user.role,
    });
  } catch (error) {
    console.error(`${roleLabel} login error:`, error);
    return res.status(500).json({
      message: `Server error during ${roleLabel} login`,
      error: error.message,
    });
  }
};

exports.loginCustomer = async (req, res) =>
  loginByRole(req, res, "customer", "customer");

exports.loginSubAdmin = async (req, res) =>
  loginByRole(req, res, "sub-admin", "sub-admin");

exports.loginAdmin = async (req, res) =>
  loginByRole(req, res, "admin", "admin");

exports.getMyRewards = async (req, res) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await User.findById(userId).select(
      "_id name email role rewardPoints"
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      rewardPoints: Number(user.rewardPoints || 0),
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("getMyRewards error:", error);
    return res.status(500).json({
      message: "Failed to fetch reward points",
      error: error.message,
    });
  }
};