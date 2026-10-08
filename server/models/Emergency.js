// server/models/Emergency.js
const mongoose = require("mongoose");

const responderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  status: {
    type: String,
    enum: ["PENDING", "ACCEPTED", "REJECTED", "EXPIRED", "CANCELLED"],
    default: "PENDING",
  },
  notifiedAt: {
    type: Date,
    default: Date.now,
  },
  respondedAt: Date,
});

const emergencySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["SEARCHING", "ACTIVE", "COMPLETED", "CANCELLED"],
      default: "SEARCHING",
    },
    lat: { type: Number, required: true },
    lon: { type: Number, required: true },

    // Every volunteer request for this emergency
    responders: [responderSchema],

    // Quick-lookup set of volunteer user IDs already contacted
    notifiedVolunteerIds: [{ type: mongoose.Schema.Types.ObjectId }],

    // Search state
    currentRadius: { type: Number, default: 5 },
    searchRound: { type: Number, default: 1 },

    // Timestamps for terminal states
    completedAt: Date,
    cancelledAt: Date,
  },
  { timestamps: true }
);

// Fast lookup: find a user's active emergency
emergencySchema.index({ userId: 1, status: 1 });

module.exports = mongoose.model("Emergency", emergencySchema);
