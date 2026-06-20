// server/routes/system.js
const express = require("express");
const router = express.Router();

// The real password lives only in .env on the server.
// Client sends a guess and gets true/false.
router.post("/verify-stop-password", (req, res) => {
  const { password } = req.body;

  const valid =
    !!password &&
    password === process.env.EMERGENCY_STOP_PASSWORD;

  res.json({
    success: true,
    valid
  });
});

module.exports = router;