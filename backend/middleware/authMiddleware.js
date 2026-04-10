const jwt = require("jsonwebtoken");
const User = require("../models/User");

module.exports = async function (req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: "No token provided" });
  }

  const token = authHeader.startsWith("Bearer ")
    ? authHeader.split(" ")[1]
    : null;

  if (!token) {
    return res.status(401).json({ message: "Invalid authorization header" });
  }

  if (!process.env.JWT_SECRET) {
    console.error("JWT_SECRET is missing in environment variables");
    return res.status(500).json({ message: "Server configuration error" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const dbUser = await User.findById(decoded.userId).select(
      "_id name email role isActive"
    );

    if (!dbUser) {
      return res.status(401).json({ message: "User not found" });
    }

    if (dbUser.isActive === false) {
      return res.status(403).json({
        message: "Your account has been deactivated",
      });
    }

    req.user = {
      userId: dbUser._id.toString(),
      name: dbUser.name,
      email: dbUser.email,
      role: dbUser.role,
      isActive: dbUser.isActive,
    };

    return next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
};