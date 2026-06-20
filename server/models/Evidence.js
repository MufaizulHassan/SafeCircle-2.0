// server/models/Evidence.js
const mongoose = require("mongoose");

const evidenceSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  video: {
    type: Buffer,
    required: true,
  },
  mimeType: {
    type: String,
    default: "video/webm",
  },
  lat: Number,
  lon: Number,
  recordedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Evidence", evidenceSchema);