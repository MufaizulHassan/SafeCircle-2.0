// server.js
const express = require("express");
const path = require("path");
require("dotenv").config();

const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http, {
  cors: { origin: "*" }
});

// ===== DB CONNECTION =====
const connectDB = require("./db");
connectDB();

// ===== MIDDLEWARE =====
app.use(express.json());

// ===== ROUTES =====
const authRoutes = require("./routes/auth");
app.use("/api/auth", authRoutes);

// ===== STATIC FILES =====
app.use(express.static(path.join(__dirname, "../client")));
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/index.html"));
});

// ===== VOLUNTEERS STORE =====
const connectedVolunteers = {};

// ===== HAVERSINE DISTANCE =====
function getDistance(lat1, lon1, lat2, lon2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ===== SOCKET.IO =====
io.on("connection", (socket) => {
  console.log("🔗 Connected:", socket.id);

  // ADMIN ONLINE
  socket.on("admin-online", () => {
    socket.join("admins");
    console.log("👑 Admin connected:", socket.id);
    Object.values(connectedVolunteers).forEach((vol) => {
      socket.emit("admin-volunteer-online", vol);
    });
  });

  // VOLUNTEER ONLINE
  socket.on("volunteer-online", (data) => {
    connectedVolunteers[socket.id] = { ...data, socketId: socket.id };
    console.log(`✅ Volunteer online: ${data.name}`);
    io.to("admins").emit("admin-volunteer-online", {
      ...data,
      socketId: socket.id
    });
  });

  // SOS ALERT
  socket.on("sos-alert", (data) => {
    console.log("🚨 SOS ALERT received:", data);
    const RADIUS_KM = 5;
    let notified = 0;

    Object.values(connectedVolunteers).forEach((vol) => {
      const dist = getDistance(data.lat, data.lon, vol.lat, vol.lon);
      if (dist <= RADIUS_KM) {
        io.to(vol.socketId).emit("incoming-alert", {
          lat: data.lat,
          lon: data.lon,
          distance: dist.toFixed(2),
          time: data.time
        });
        notified++;
        console.log(`📢 Notified: ${vol.name} (${dist.toFixed(2)} km away)`);
      }
    });

    console.log(`Total volunteers notified: ${notified}`);
    socket.emit("alert-confirmed", { notified });
    io.to("admins").emit("admin-new-alert", {
      lat: data.lat,
      lon: data.lon,
      time: data.time,
      notified
    });
  });

  // VOLUNTEER RESPONDING
  socket.on("volunteer-responding", (data) => {
    console.log(`🙋 ${data.volunteerName} is responding`);
    io.emit("volunteer-accepted", data);
  });

  // EMERGENCY ENDED
  socket.on("emergency-ended", (data) => {
    console.log("✅ Emergency ended by user");
    io.emit("emergency-stopped", { time: data.time });
    io.to("admins").emit("admin-emergency-ended", { time: data.time });
  });

  // DISCONNECT
  socket.on("disconnect", () => {
    if (connectedVolunteers[socket.id]) {
      console.log(`❌ Volunteer offline: ${connectedVolunteers[socket.id].name}`);
      io.to("admins").emit("admin-volunteer-offline", {
        socketId: socket.id
      });
      delete connectedVolunteers[socket.id];
    }
    console.log("❌ Disconnected:", socket.id);
  });
});

// ===== START SERVER =====
http.listen(process.env.PORT || 3000, () => {
  console.log(`🚀 Server running at http://localhost:${process.env.PORT || 3000}`);
});