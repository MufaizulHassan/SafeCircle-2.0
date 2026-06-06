// server/routes/auth.js
const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

// ===== SIGNUP =====
router.post("/signup", async (req, res) => {
  try {
    const { name, email, phone, password, trustedContacts } = req.body;

    // check if user already exists
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ success: false, message: "Email already registered" });
    }

    // hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // create user
    const user = new User({
      name,
      email,
      phone,
      password: hashedPassword,
      trustedContacts: trustedContacts || []
    });

    await user.save();

    // create token
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
        role: user.role
      }
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

    // find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ success: false, message: "Invalid email or password" });
    }

    // check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Invalid email or password" });
    }

    // create token
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
        role: user.role
      }
    });

  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ===== GET PROFILE =====
router.get("/profile", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ success: false, message: "No token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.json({ success: true, user });

  } catch (err) {
    console.error("Profile error:", err);
    res.status(401).json({ success: false, message: "Invalid token" });
  }
});



// ===== UPDATE PROFILE =====
router.put("/update-profile", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ success: false, message: "No token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const { name, phone, trustedContacts } = req.body;

    const updatedUser = await User.findByIdAndUpdate(
      decoded.id,
      {
        name,
        phone,
        trustedContacts: trustedContacts || []
      },
      { new: true }
    ).select("-password");

    if (!updatedUser) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // update token with new name
    const newToken = jwt.sign(
      { id: updatedUser._id, email: updatedUser.email, name: updatedUser.name },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // update localStorage data
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
        trustedContacts: updatedUser.trustedContacts
      }
    });

  } catch (err) {
    console.error("Update profile error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ===== CHANGE PASSWORD =====
router.put("/change-password", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ success: false, message: "No token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Current password is incorrect" });
    }

    // hash new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.json({ success: true, message: "Password changed successfully" });

  } catch (err) {
    console.error("Change password error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;