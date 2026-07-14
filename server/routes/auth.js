// server/routes/auth.js

const rateLimit = require("express-rate-limit");

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { success: false, message: "Too many attempts, please try again later." },
});

const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  message: { success: false, message: "Too many OTP requests, try again later." },
});


const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { protect, requireRole } = require("../middleware/auth");

const otpStore = {}; // demo only — resets on server restart

const nodemailer = require("nodemailer");

// const transporter = nodemailer.createTransport({
//   service: "gmail",
//   auth: {
//     user: process.env.GMAIL_USER,
//     pass: process.env.GMAIL_APP_PASSWORD,
//   },
// });

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

// If a signup email matches ADMIN_EMAILS (comma-separated in .env),
// that account is created as an admin automatically. This solves the
// "how does the very first admin get created" bootstrap problem.
function getInitialRole(email) {
  const adminEmails = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return adminEmails.includes(email.toLowerCase()) ? "admin" : "user";
}

// ===== SIGNUP =====
router.post("/signup", async (req, res) => {
  try {
    const { name, email, phone, password, trustedContacts } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ success: false, message: "Email already registered" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = new User({
      name,
      email,
      phone,
      password: hashedPassword,
      trustedContacts: trustedContacts || [],
      role: getInitialRole(email),
    });

    await user.save();

    const token = jwt.sign(
      { id: user._id, email: user.email, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
      message: "Account created successfully",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ===== LOGIN =====
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ success: false, message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Invalid email or password" });
    }

    const token = jwt.sign(
      { id: user._id, email: user.email, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        // volunteerStatus: user.volunteerStatus,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ===== GET PROFILE =====
router.get("/profile", protect, async (req, res) => {
  res.json({ success: true, user: req.user });
});

// ===== UPDATE PROFILE =====
router.put("/update-profile", protect, async (req, res) => {
  try {
    const { name, phone, trustedContacts } = req.body;

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { name, phone, trustedContacts: trustedContacts || [] },
      { new: true }
    ).select("-password");

    const newToken = jwt.sign(
      { id: updatedUser._id, email: updatedUser.email, name: updatedUser.name },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
      message: "Profile updated successfully",
      token: newToken,
      user: {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        role: updatedUser.role,
        trustedContacts: updatedUser.trustedContacts,
      },
    });
  } catch (err) {
    console.error("Update profile error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ===== CHANGE PASSWORD =====
router.put("/change-password", protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Current password is incorrect" });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.json({ success: true, message: "Password changed successfully" });
  } catch (err) {
    console.error("Change password error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ===== LIST USERS (admin only — powers the Manage Users panel) =====
router.get("/users", protect, requireRole("admin"), async (req, res) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    res.json({ success: true, users });
  } catch (err) {
    console.error("List users error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ===== UPDATE A USER'S ROLE (admin only) =====
router.put("/users/:id/role", protect, requireRole("admin"), async (req, res) => {
  try {
    const { role } = req.body;

    if (!["user", "volunteer", "admin"].includes(role)) {
      return res.status(400).json({ success: false, message: "Invalid role" });
    }

    const updated = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    ).select("-password");

    if (!updated) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.json({ success: true, user: updated });
  } catch (err) {
    console.error("Update role error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});


// ===== VERIFY PASSWORD =====
router.post("/verify-password", protect, async (req, res) => {
  try {
    const { password } = req.body;

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    const valid = await bcrypt.compare(password, user.password);

    res.json({
      success: true,
      valid
    });

  } catch (err) {
    console.error("Verify password error:", err);

    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
});

// // ===== APPLY TO BECOME A VOLUNTEER =====
// router.post("/apply-volunteer", protect, async (req, res) => {
//   try {
//     req.user.volunteerStatus = "pending";
//     await req.user.save();
//     res.json({ success: true, volunteerStatus: "pending" });
//   } catch (err) {
//     console.error("Apply volunteer error:", err);
//     res.status(500).json({ success: false, message: "Server error" });
//   }
// });

// // ===== SEND VOLUNTEER OTP (demo mode — logs to server console) =====
// router.post("/send-volunteer-otp", protect, async (req, res) => {
//   const { email } = req.body;
//   if (!email) return res.status(400).json({ success: false, message: "Email required" });

//   const otp = Math.floor(100000 + Math.random() * 900000).toString();
//   otpStore[email] = { otp, expiresAt: Date.now() + 5 * 60 * 1000 };

//   console.log(`📩 [DEMO MODE] OTP for ${email}: ${otp}`);

//   res.json({ success: true, message: "OTP sent (demo mode — check server console)" });
// });

router.post("/send-volunteer-otp", protect, async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ success: false, message: "Email required" });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  otpStore[email] = { otp, expiresAt: Date.now() + 5 * 60 * 1000 };

  try {
    await transporter.sendMail({
      from: `"SafeCircle" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: "Your SafeCircle Volunteer Verification Code",
      html: `<p>Your OTP for volunteer registration is:</p><h2>${otp}</h2><p>This code expires in 5 minutes.</p>`,
    });
    res.json({ success: true, message: "OTP sent to your email — check inbox" });
  } catch (err) {
    console.error("Email send error:", err);
    console.log(`📩 [FALLBACK] OTP for ${email}: ${otp}`);
    res.json({ success: true, message: "Email failed — check server console for OTP (fallback)" });
  }
});



// ===== VERIFY VOLUNTEER OTP =====
router.post("/verify-volunteer-otp", protect, (req, res) => {
  const { email, otp } = req.body;
  const record = otpStore[email];

  if (!record || record.expiresAt < Date.now()) {
    return res.json({ success: true, valid: false, message: "OTP expired or not found" });
  }

  const valid = record.otp === otp;
  if (valid) delete otpStore[email];

  res.json({ success: true, valid });
});

// ===== APPLY TO BECOME A VOLUNTEER (full form) =====
router.post("/apply-volunteer", protect, async (req, res) => {
  try {
    const {
      fullName, city, age, availability, transport, languages, note,
      emergencyContactName, emergencyContactPhone, idProof,
    } = req.body;

    req.user.volunteerStatus = "pending";
    req.user.volunteerApplication = {
      fullName, city, age, availability, transport, languages, note,
      emergencyContactName, emergencyContactPhone, idProof,
      submittedAt: new Date(),
    };
    await req.user.save();

    res.json({ success: true, volunteerStatus: "pending" });
  } catch (err) {
    console.error("Apply volunteer error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});



module.exports = router;