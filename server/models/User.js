// server/models/User.js
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  phone: {
    type: String,
    required: true
  },
  password: {
    type: String,
    required: true
  },
  trustedContacts: [
    {
      name: String,
      phone: String
    }
  ],
  role: {
    type: String,
    enum: ["user", "volunteer", "admin"],
    default: "user"
  },
  volunteerApplication: {
    fullName: String,
    city: String,
    age: Number,
    availability: String,
    transport: String,
    languages: String,
    note: String,
    emergencyContactName: String,
    emergencyContactPhone: String,
    idProof: String,
    submittedAt: Date,
  },
  volunteerStatus: {
    type: String,
    enum: ["none", "pending"],
    default: "none",
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("User", userSchema);