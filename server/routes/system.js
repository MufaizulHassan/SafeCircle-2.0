// server/routes/system.js
const express = require("express");
const crypto = require("crypto");
const router = express.Router();

// The real password lives only in .env on the server.
// Client sends a guess and gets true/false.
// Uses timing-safe comparison to prevent timing attacks.
router.post("/verify-stop-password", (req, res) => {
  const { password } = req.body;
  const expected = process.env.EMERGENCY_STOP_PASSWORD || "";

  let valid = false;
  if (typeof password === "string" && password.length > 0 && expected.length > 0) {
    const pwBuf = Buffer.from(password);
    const expectedBuf = Buffer.from(expected);
    // timingSafeEqual requires equal-length buffers
    if (pwBuf.length === expectedBuf.length) {
      valid = crypto.timingSafeEqual(pwBuf, expectedBuf);
    }
  }

  res.json({
    success: true,
    valid
  });
});

module.exports = router;