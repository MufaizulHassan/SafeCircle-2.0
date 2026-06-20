// server/routes/evidence.js
const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const Evidence = require("../models/Evidence");
const { protect } = require("../middleware/auth");

const MAX_BASE64_LENGTH = 20 * 1024 * 1024;

// ===== UPLOAD EVIDENCE (works even if not logged in) =====
router.post("/", async (req, res) => {
  try {
    const { videoBase64, lat, lon, time } = req.body;

    if (!videoBase64) {
      return res.status(400).json({ success: false, message: "No video data provided" });
    }
    if (videoBase64.length > MAX_BASE64_LENGTH) {
      return res.status(413).json({ success: false, message: "Recording too large to sync" });
    }

    let userId = null;
    const token = req.headers.authorization?.split(" ")[1];
    if (token) {
      try {
        userId = jwt.verify(token, process.env.JWT_SECRET).id;
      } catch {
        // invalid/expired token — still save anonymously
      }
    }

    const evidence = new Evidence({
      user: userId,
      video: Buffer.from(videoBase64, "base64"),
      lat,
      lon,
      recordedAt: time ? new Date(time) : new Date(),
    });

    await evidence.save();
    res.json({ success: true, id: evidence._id });
  } catch (err) {
    console.error("Evidence upload error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ===== LIST EVIDENCE (metadata only) =====
router.get("/", protect, async (req, res) => {
  try {
    const query = req.user.role === "admin" ? {} : { user: req.user._id };
    const items = await Evidence.find(query)
      .select("-video")
      .populate("user", "name email")
      .sort({ recordedAt: -1 });
    res.json({ success: true, evidence: items });
  } catch (err) {
    console.error("Evidence list error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ===== STREAM ONE VIDEO =====
router.get("/:id/file", protect, async (req, res) => {
  try {
    const item = await Evidence.findById(req.params.id);
    if (!item) return res.status(404).send("Not found");

    const isOwner = item.user && item.user.toString() === req.user._id.toString();
    if (req.user.role !== "admin" && !isOwner) {
      return res.status(403).send("Access denied");
    }

    res.set("Content-Type", item.mimeType || "video/webm");
    res.send(item.video);
  } catch (err) {
    console.error("Evidence file error:", err);
    res.status(500).send("Server error");
  }
});

// ===== DELETE EVIDENCE =====
router.delete("/:id", protect, async (req, res) => {
  try {
    const item = await Evidence.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: "Not found" });

    const isOwner = item.user && item.user.toString() === req.user._id.toString();
    if (req.user.role !== "admin" && !isOwner) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    await item.deleteOne();
    res.json({ success: true });
  } catch (err) {
    console.error("Evidence delete error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;