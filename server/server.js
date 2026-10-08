// // server.js

// const express = require("express");
// const path = require("path");
// const helmet = require("helmet");
// const cors = require("cors");
// require("dotenv").config();

// // fetch is built-in on Node 18+; for older versions fall back to node-fetch
// const fetch = globalThis.fetch ?? require("node-fetch");



// const app = express();
// const http = require("http").createServer(app);
// const io = require("socket.io")(http, {
//   cors: { origin: "*" }
// });
// app.set("io", io);

// app.use(helmet());
// app.use(cors({ origin: process.env.CLIENT_URL || "*" }));

// // ===== DB CONNECTION =====
// const connectDB = require("./db");
// connectDB();

// // ===== MIDDLEWARE =====
// app.use(express.json({ limit: "20mb" }));

// // ===== ROUTES =====
// const authRoutes = require("./routes/auth");
// app.use("/api/auth", authRoutes);

// const routeRoutes = require("./routes/route");
// const systemRoutes = require("./routes/system");
// const evidenceRoutes = require("./routes/evidence");

// app.use("/api/route", routeRoutes);
// app.use("/api/system", systemRoutes);
// app.use("/api/evidence", evidenceRoutes);

// // ===== STATIC FILES =====
// app.use(express.static(path.join(__dirname, "../client")));
// app.get("/", (req, res) => {
//   res.sendFile(path.join(__dirname, "../client/index.html"));
// });

// // ===== VOLUNTEERS STORE =====
// const connectedVolunteers = {};

// // ===== HAVERSINE DISTANCE =====
// function getDistance(lat1, lon1, lat2, lon2) {
//   const toRad = (d) => (d * Math.PI) / 180;
//   const R = 6371;
//   const dLat = toRad(lat2 - lat1);
//   const dLon = toRad(lon2 - lon1);
//   const a =
//     Math.sin(dLat / 2) ** 2 +
//     Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
//     Math.sin(dLon / 2) ** 2;
//   return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
// }

// // ===== NLP SEVERITY CLASSIFIER =====
// // Calls the local Python FastAPI service (main.py) which runs your
// // trained XLM-RoBERTa model. Returns severity + emotion + intensity.
// // If the service is down, fails silently so the SOS alert still works.
// async function classifyTranscript(text) {
//   try {
//     const res = await fetch("http://localhost:8000/classify", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({ text }),
//     });
//     return await res.json();
//   } catch (err) {
//     console.warn("⚠️ NLP service unavailable:", err.message);
//     return null;
//   }
// }

// // ===== SOCKET.IO =====
// io.on("connection", (socket) => {
//   console.log("🔗 Connected:", socket.id);

//   // IDENTIFY — joins a private room so we can push events to this exact user
//   // (e.g. "your volunteer application was approved") regardless of which
//   // page/socket they currently have open.
//   socket.on("identify", (userId) => {
//     if (!userId) return;
//     socket.join(`user:${userId}`);
//   });

//   // ADMIN ONLINE
//   socket.on("admin-online", () => {
//     socket.join("admins");
//     console.log("👑 Admin connected:", socket.id);
//     Object.values(connectedVolunteers).forEach((vol) => {
//       socket.emit("admin-volunteer-online", vol);
//     });
//   });

//   // VOLUNTEER ONLINE
//   socket.on("volunteer-online", (data) => {
//     connectedVolunteers[socket.id] = { ...data, socketId: socket.id };
//     console.log(`✅ Volunteer online: ${data.name}`);
//     io.to("admins").emit("admin-volunteer-online", {
//       ...data,
//       socketId: socket.id
//     });
//   });

//   // VOLUNTEER OFFLINE — explicit "Go Offline" toggle (not a disconnect)
//   function takeVolunteerOffline() {
//     if (connectedVolunteers[socket.id]) {
//       console.log(`🔴 Volunteer offline: ${connectedVolunteers[socket.id].name}`);
//       io.to("admins").emit("admin-volunteer-offline", {
//         socketId: socket.id
//       });
//       delete connectedVolunteers[socket.id];
//     }
//   }
//   socket.on("volunteer-offline", takeVolunteerOffline);

//   // SOS ALERT
//   socket.on("sos-alert", (data) => {
//     console.log("🚨 SOS ALERT received:", data);
//     const RADIUS_KM = 5;
//     let notified = 0;

//     Object.values(connectedVolunteers).forEach((vol) => {
//       const dist = getDistance(data.lat, data.lon, vol.lat, vol.lon);
//       if (dist <= RADIUS_KM) {
//         io.to(vol.socketId).emit("incoming-alert", {
//           victimSocketId: socket.id,
//           lat: data.lat,
//           lon: data.lon,
//           distance: dist.toFixed(2),
//           time: data.time
//         });
//         notified++;
//         console.log(`📢 Notified: ${vol.name} (${dist.toFixed(2)} km away)`);
//       }
//     });

//     console.log(`Total volunteers notified: ${notified}`);
//     socket.emit("alert-confirmed", { notified });
//     io.to("admins").emit("admin-new-alert", {
//       lat: data.lat,
//       lon: data.lon,
//       time: data.time,
//       notified
//     });
//   });

//   // SOS TRANSCRIPT CHUNK — live speech from the victim during an alert.
//   // Each chunk (a sentence or phrase) gets classified by the NLP model,
//   // and the result is broadcast to volunteers + admins so they can see
//   // the severity escalate in real time as more speech comes in.

//   socket.on("sos-transcript-chunk", async (data) => {
//     const { text, victimSocketId } = data;
//     if (!text || !text.trim()) return;

//     console.log(`🎙️ Transcript chunk received: "${text}"`);
//     const result = await classifyTranscript(text);
//     if (!result) return;

//     const payload = {
//       text,
//       emotion: result.emotion,
//       intensity: result.intensity,
//       severity: result.severity,
//       severity_score: result.severity_score,
//       confidence_profile: result.confidence_profile,
//       victimSocketId: victimSocketId || socket.id,
//       time: new Date().toISOString(),
//     };

//     console.log(`🧠 NLP result: ${result.emotion} | severity: ${result.severity} | intensity: ${result.intensity}`);

//     // Push to the victim themselves so their badge updates
//     socket.emit("sos-severity-update", payload);

//     // Push to all volunteers currently handling this alert and admin dashboard
//     Object.values(connectedVolunteers).forEach((vol) => {
//       io.to(vol.socketId).emit("sos-severity-update", payload);
//     });
//     io.to("admins").emit("sos-severity-update", payload);
//   });

//   // VOLUNTEER RESPONDING — targeted to that specific victim only
//   socket.on("volunteer-responding", (data) => {
//     console.log(`🙋 ${data.volunteerName} is responding`);
//     io.to(data.victimSocketId).emit("volunteer-accepted", {
//       ...data,
//       volunteerSocketId: socket.id,
//     });
//   });

//   // LIVE LOCATION RELAY — both sides ping each other every few seconds
//   socket.on("victim-location-update", (data) => {
//     if (data.volunteerSocketId) {
//       io.to(data.volunteerSocketId).emit("victim-location-update", { lat: data.lat, lon: data.lon });
//     }
//   });

//   socket.on("volunteer-location-update", (data) => {
//     if (data.victimSocketId) {
//       io.to(data.victimSocketId).emit("volunteer-location-update", { lat: data.lat, lon: data.lon });
//     }
//   });

//   // EMERGENCY ENDED
//   socket.on("emergency-ended", (data) => {
//     console.log("✅ Emergency ended by user");
//     io.emit("emergency-stopped", { time: data.time });
//     io.to("admins").emit("admin-emergency-ended", { time: data.time });
//   });

//   // DISCONNECT
//   socket.on("disconnect", () => {
//     takeVolunteerOffline();
//     console.log("❌ Disconnected:", socket.id);
//   });
// });

// // ===== START SERVER =====
// http.listen(process.env.PORT || 3000, () => {
//   console.log(`🚀 Server running at http://localhost:${process.env.PORT || 3000}`);
// });


// server.js

const express = require("express");
const path = require("path");
const helmet = require("helmet");
const cors = require("cors");
require("dotenv").config();

// fetch is built-in on Node 18+; for older versions fall back to node-fetch
const fetch = globalThis.fetch ?? require("node-fetch");
const jwt = require("jsonwebtoken");
const User = require("./models/User");
const Emergency = require("./models/Emergency");



const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http, {
  cors: { origin: "*" }
});
app.set("io", io);

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || "*" }));

// ===== DB CONNECTION =====
const connectDB = require("./db");
connectDB();

// ===== MIDDLEWARE =====
app.use(express.json({ limit: "20mb" }));

// express-mongo-sanitize is INCOMPATIBLE with Express 5 — it crashes on
// req.query which is a read-only getter in Express 5. We use a lightweight
// manual sanitizer instead that only touches req.body and req.params.
function sanitizeMongo(obj) {
  if (obj === null || typeof obj !== "object") return obj;
  for (const key of Object.keys(obj)) {
    if (key.startsWith("$") || key.includes(".")) {
      delete obj[key];
    } else if (typeof obj[key] === "object") {
      sanitizeMongo(obj[key]);
    }
  }
  return obj;
}
app.use((req, _res, next) => {
  if (req.body) sanitizeMongo(req.body);
  if (req.params) sanitizeMongo(req.params);
  next();
});

// ===== ROUTES =====
const authRoutes = require("./routes/auth");
app.use("/api/auth", authRoutes);

const routeRoutes = require("./routes/route");
const systemRoutes = require("./routes/system");
const evidenceRoutes = require("./routes/evidence");

app.use("/api/route", routeRoutes);
app.use("/api/system", systemRoutes);
app.use("/api/evidence", evidenceRoutes);

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

// // ===== NLP SEVERITY CLASSIFIER =====
// // Calls the local Python FastAPI service (main.py) which runs your
// // trained XLM-RoBERTa model. Returns severity + emotion + intensity.
// // If the service is down, fails silently so the SOS alert still works.
// async function classifyTranscript(text) {
//   try {
//     const res = await fetch("http://localhost:8000/classify", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({ text }),
//     });
//     return await res.json();
//   } catch (err) {
//     console.warn("⚠️ NLP service unavailable:", err.message);
//     return null;
//   }
// }

// ===== NLP SEVERITY CLASSIFIER =====
const NLP_SERVICE_URL = process.env.NLP_SERVICE_URL || "http://localhost:8000/classify";

async function classifyTranscript(text) {
  try {
    const res = await fetch(NLP_SERVICE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.warn(`⚠️ NLP service responded ${res.status}: ${body.slice(0, 200)}`);
      return null;
    }

    return await res.json();
  } catch (err) {
    console.warn(`⚠️ NLP service unreachable at ${NLP_SERVICE_URL}:`, err.message);
    return null;
  }
}



// ===== SOCKET.IO AUTH MIDDLEWARE =====
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Authentication required"));
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const freshUser = await User.findById(decoded.id).select("-password");
    if (!freshUser) return next(new Error("User not found"));
    socket.user = { id: freshUser._id.toString(), name: freshUser.name, email: freshUser.email, role: freshUser.role };
    next();
  } catch (err) {
    next(new Error("Invalid or expired token"));
  }
});

// ===== SOCKET.IO =====
// FIND VOLUNTEERS HELPER (Phase 5)
async function findVolunteers(emergencyId, io) {
  const emergency = await Emergency.findById(emergencyId);
  if (!emergency || emergency.status !== "SEARCHING") return;

  const RADIUS_KM = emergency.currentRadius;
  let notifiedCount = 0;

  const eligibleVolunteers = [];
  for (const volSocketId of Object.keys(connectedVolunteers)) {
    const vol = connectedVolunteers[volSocketId];
    if (vol.isBusy) continue;
    if (emergency.notifiedVolunteerIds.includes(vol.userId)) continue;
    
    const dist = getDistance(emergency.lat, emergency.lon, vol.lat, vol.lon);
    if (dist <= RADIUS_KM) {
      eligibleVolunteers.push({ ...vol, distance: dist.toFixed(2) });
    }
  }

  for (const vol of eligibleVolunteers) {
    emergency.notifiedVolunteerIds.push(vol.userId);
    emergency.responders.push({ userId: vol.userId, status: "PENDING" });
    
    io.to(vol.socketId).emit("incoming-alert", {
      emergencyId: emergency._id.toString(),
      victimSocketId: emergency.userId.toString(),
      lat: emergency.lat,
      lon: emergency.lon,
      distance: vol.distance,
      time: new Date()
    });
    notifiedCount++;
    console.log(`📢 Notified: ${vol.name} (${vol.distance} km away)`);
  }

  await emergency.save();
  
  io.to(`emergency_${emergency._id}`).emit("alert-confirmed", { 
    emergencyId: emergency._id.toString(),
    notified: emergency.notifiedVolunteerIds.length 
  });

  setTimeout(async () => {
    const em = await Emergency.findById(emergencyId);
    if (!em || em.status !== "SEARCHING") return;
    
    const activeCount = em.responders.filter(r => r.status === "ACCEPTED").length;
    if (activeCount < 5) {
      if (em.currentRadius < 15) {
        em.currentRadius += 5;
        em.searchRound += 1;
        await em.save();
        console.log(`⏳ Timeout. Expanding radius to ${em.currentRadius}km for ${emergencyId}`);
        findVolunteers(em._id, io);
      } else {
        console.log(`⏳ Timeout. Max radius reached for ${emergencyId}`);
      }
    }
  }, 30000); // 30 seconds
}

io.on("connection", (socket) => {
  console.log(`🔗 Connected: ${socket.id} (${socket.user.name}, ${socket.user.role})`);

  socket.on("identify", (userId) => {
    if (!userId) return;
    if (userId !== socket.user.id) return;
    socket.join(`user:${userId}`);
  });

  socket.on("admin-online", () => {
    if (socket.user.role !== "admin") return;
    socket.join("admins");
    console.log("👑 Admin connected:", socket.id);
    Object.values(connectedVolunteers).forEach((vol) => {
      socket.emit("admin-volunteer-online", vol);
    });
  });

  socket.on("volunteer-online", async (data) => {
    if (socket.user.role !== "volunteer" && socket.user.role !== "admin") return;
    
    const user = await User.findById(socket.user.id);
    const isBusy = user ? user.volunteerAvailability === "BUSY" : false;

    const volData = { 
      ...data, 
      name: socket.user.name, 
      socketId: socket.id,
      userId: socket.user.id,
      isBusy 
    };
    connectedVolunteers[socket.id] = volData;
    console.log(`✅ Volunteer online: ${socket.user.name}`);
    io.to("admins").emit("admin-volunteer-online", {
      ...volData,
      socketId: socket.id
    });
  });

  function takeVolunteerOffline() {
    if (connectedVolunteers[socket.id]) {
      console.log(`🔴 Volunteer offline: ${connectedVolunteers[socket.id].name}`);
      io.to("admins").emit("admin-volunteer-offline", {
        socketId: socket.id
      });
      delete connectedVolunteers[socket.id];
    }
  }
  socket.on("volunteer-offline", takeVolunteerOffline);

  socket.on("sos-alert", async (data) => {
    console.log("🚨 SOS ALERT received:", data);
    
    let emergency = await Emergency.findOne({ 
      userId: socket.user.id, 
      status: { $in: ["SEARCHING", "ACTIVE"] } 
    });

    if (emergency) {
      console.log("⚠️ Existing active emergency found for user. Restoring session.");
      socket.join(`emergency_${emergency._id}`);
      socket.emit("existing-emergency-restored", { emergencyId: emergency._id.toString() });
      return;
    }

    emergency = new Emergency({
      userId: socket.user.id,
      lat: data.lat,
      lon: data.lon,
      status: "SEARCHING",
      currentRadius: 5
    });
    await emergency.save();

    socket.join(`emergency_${emergency._id}`);
    socket.emit("alert-confirmed", { emergencyId: emergency._id.toString(), notified: 0 });
    
    io.to("admins").emit("admin-new-alert", {
      emergencyId: emergency._id.toString(),
      lat: data.lat,
      lon: data.lon,
      time: data.time || new Date().toISOString(),
      notified: 0
    });

    findVolunteers(emergency._id, io);
  });

  socket.on("sos-transcript-chunk", async (data) => {
    const { text, victimSocketId, emergencyId } = data;
    if (!text || !text.trim()) return;

    console.log(`🎙️ Transcript chunk received: "${text}"`);
    // NOTE: assuming classifyTranscript exists
    const result = await classifyTranscript(text);
    if (!result) return;

    const DISTRESS_KEYWORDS = [
      "help", "please", "scared", "fear", "danger", "run",
      "following", "hurry", "emergency", "stop", "leave me",
      "bachao", "darr", "madad", "chod", "ruk", "mat",
      "chhod", "bhago", "koi hai", "koi", "please",
      "ayuda", "socorro", "au secours", "aidez", "por favor",
      "hilfe", "aiuto", "pomoc",
    ];

    const lowerText = text.toLowerCase();
    const keywordHit = DISTRESS_KEYWORDS.some((kw) => lowerText.includes(kw));

    const SEVERITY_ORDER = { low: 0, medium: 1, high: 2, critical: 3 };
    const keywordSeverity = keywordHit ? "high" : "low";
    const finalSeverity = SEVERITY_ORDER[result.severity] >= SEVERITY_ORDER[keywordSeverity]
        ? result.severity : keywordSeverity;

    const payload = {
      text,
      emotion: result.emotion,
      intensity: result.intensity,
      severity: finalSeverity,
      severity_score: result.severity_score,
      confidence_profile: result.confidence_profile,
      keyword_triggered: keywordHit && finalSeverity !== result.severity,
      victimSocketId: victimSocketId || socket.user.id,
      emergencyId,
      time: new Date().toISOString(),
    };

    if (emergencyId) {
      io.to(`emergency_${emergencyId}`).emit("sos-severity-update", payload);
    } else {
      socket.emit("sos-severity-update", payload);
      Object.values(connectedVolunteers).forEach((vol) => {
        io.to(vol.socketId).emit("sos-severity-update", payload);
      });
    }
    io.to("admins").emit("sos-severity-update", payload);
  });

  socket.on("volunteer-responding", async (data) => {
    console.log(`🙋 ${socket.user.name} is responding`);
    
    let emergency;
    if (data.emergencyId) {
       emergency = await Emergency.findById(data.emergencyId);
    } else if (data.victimSocketId) {
       emergency = await Emergency.findOne({ userId: data.victimSocketId, status: { $in: ["SEARCHING", "ACTIVE"] } });
    }

    if (!emergency || (emergency.status !== "SEARCHING" && emergency.status !== "ACTIVE")) {
       socket.emit("emergency-error", { message: "Emergency is no longer active" });
       return;
    }

    const activeCount = emergency.responders.filter(r => r.status === "ACCEPTED").length;
    if (activeCount >= 5) {
       socket.emit("emergency-error", { message: "Emergency already has enough responders" });
       return;
    }

    let responder = emergency.responders.find(r => r.userId.toString() === socket.user.id);
    if (responder) {
       responder.status = "ACCEPTED";
       responder.respondedAt = new Date();
    } else {
       emergency.responders.push({ userId: socket.user.id, status: "ACCEPTED", respondedAt: new Date() });
    }

    if (activeCount + 1 >= 5) {
       emergency.status = "ACTIVE";
    }

    await emergency.save();

    if (connectedVolunteers[socket.id]) {
       connectedVolunteers[socket.id].isBusy = true;
    }
    await User.findByIdAndUpdate(socket.user.id, { volunteerAvailability: "BUSY" });

    socket.join(`emergency_${emergency._id}`);

    io.to(`emergency_${emergency._id}`).emit("volunteer-accepted", {
      emergencyId: emergency._id.toString(),
      volunteerName: socket.user.name,
      volunteerSocketId: socket.id,
      lat: data.lat,
      lon: data.lon,
    });
  });

  socket.on("victim-location-update", async (data) => {
    if (data.emergencyId) {
       io.to(`emergency_${data.emergencyId}`).emit("victim-location-update", { lat: data.lat, lon: data.lon });
    } else if (data.volunteerSocketId) {
       io.to(data.volunteerSocketId).emit("victim-location-update", { lat: data.lat, lon: data.lon });
    }
  });

  socket.on("volunteer-location-update", (data) => {
    if (data.emergencyId) {
       io.to(`emergency_${data.emergencyId}`).emit("volunteer-location-update", { lat: data.lat, lon: data.lon });
    } else if (data.victimSocketId) {
       io.to(`user:${data.victimSocketId}`).emit("volunteer-location-update", { lat: data.lat, lon: data.lon });
    }
  });

  socket.on("emergency-ended", async (data) => {
    console.log(`✅ Emergency ended by ${socket.user.name} (${socket.user.role})`);
    
    let emergency;
    if (data.emergencyId) {
       emergency = await Emergency.findById(data.emergencyId);
    } else {
       emergency = await Emergency.findOne({ userId: socket.user.id, status: { $in: ["SEARCHING", "ACTIVE"] } });
    }

    if (!emergency) return;
    
    if (emergency.userId.toString() !== socket.user.id && socket.user.role !== "admin") {
       return;
    }

    emergency.status = "COMPLETED";
    emergency.completedAt = new Date();
    
    for (const resp of emergency.responders) {
       if (resp.status === "ACCEPTED") {
           await User.findByIdAndUpdate(resp.userId, { volunteerAvailability: "AVAILABLE" });
           for (const vol of Object.values(connectedVolunteers)) {
               if (vol.userId === resp.userId.toString()) {
                   vol.isBusy = false;
               }
           }
       }
    }

    await emergency.save();

    io.to(`emergency_${emergency._id}`).emit("emergency-stopped", { time: data.time || new Date().toISOString(), emergencyId: emergency._id.toString() });
    io.to("admins").emit("admin-emergency-ended", { time: data.time || new Date().toISOString(), emergencyId: emergency._id.toString() });

    io.in(`emergency_${emergency._id}`).socketsLeave(`emergency_${emergency._id}`);
  });

  socket.on("disconnect", async () => {
    console.log("❌ Disconnected:", socket.id);
    
    if (connectedVolunteers[socket.id]) {
      const vol = connectedVolunteers[socket.id];
      if (vol.isBusy) {
         const emergencies = await Emergency.find({ 
           "responders.userId": vol.userId, 
           "responders.status": "ACCEPTED",
           status: { $in: ["SEARCHING", "ACTIVE"] }
         });

         for (const em of emergencies) {
            const responder = em.responders.find(r => r.userId.toString() === vol.userId.toString());
            if (responder) {
                responder.status = "CANCELLED";
            }
            const activeCount = em.responders.filter(r => r.status === "ACCEPTED").length;
            if (activeCount < 5 && em.status === "ACTIVE") {
                em.status = "SEARCHING";
                console.log(`⚠️ Volunteer dropped off. Resuming search for ${em._id}`);
                findVolunteers(em._id, io);
            }
            await em.save();
         }
         await User.findByIdAndUpdate(vol.userId, { volunteerAvailability: "AVAILABLE" });
      }
      takeVolunteerOffline();
    }
  });
});

// ===== START SERVER =====
http.listen(process.env.PORT || 3000, () => {
  console.log(`🚀 Server running at http://localhost:${process.env.PORT || 3000}`);
});