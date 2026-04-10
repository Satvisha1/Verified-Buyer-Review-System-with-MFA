const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");

const {
  signupCustomer,
  signupSubAdmin,
  signupAdmin,
  loginCustomer,
  loginSubAdmin,
  loginAdmin,
  getMyRewards,
} = require("../controllers/authController");

// Customer signup and login
router.post("/signup/customer", signupCustomer);
router.post("/login/customer", loginCustomer);

// Sub-admin signup and login
router.post("/signup/sub-admin", signupSubAdmin);
router.post("/login/sub-admin", loginSubAdmin);

// Admin signup and login
router.post("/signup/admin", signupAdmin);
router.post("/login/admin", loginAdmin);

// Authenticated user reward endpoint
router.get("/me/rewards", authMiddleware, getMyRewards);

module.exports = router;