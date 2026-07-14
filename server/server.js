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

// ===== NLP SEVERITY CLASSIFIER =====
// Calls the local Python FastAPI service (main.py) which runs your
// trained XLM-RoBERTa model. Returns severity + emotion + intensity.
// If the service is down, fails silently so the SOS alert still works.
async function classifyTranscript(text) {
  try {
    const res = await fetch("http://localhost:8000/classify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    return await res.json();
  } catch (err) {
    console.warn("⚠️ NLP service unavailable:", err.message);
    return null;
  }
}

// ===== SOCKET.IO =====
io.on("connection", (socket) => {
  console.log("🔗 Connected:", socket.id);

  // IDENTIFY — joins a private room so we can push events to this exact user
  // (e.g. "your volunteer application was approved") regardless of which
  // page/socket they currently have open.
  socket.on("identify", (userId) => {
    if (!userId) return;
    socket.join(`user:${userId}`);
  });

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

  // VOLUNTEER OFFLINE — explicit "Go Offline" toggle (not a disconnect)
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

  // SOS ALERT
  socket.on("sos-alert", (data) => {
    console.log("🚨 SOS ALERT received:", data);
    const RADIUS_KM = 5;
    let notified = 0;

    Object.values(connectedVolunteers).forEach((vol) => {
      const dist = getDistance(data.lat, data.lon, vol.lat, vol.lon);
      if (dist <= RADIUS_KM) {
        io.to(vol.socketId).emit("incoming-alert", {
          victimSocketId: socket.id,
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

  // SOS TRANSCRIPT CHUNK — live speech from the victim during an alert.
  // Each chunk (a sentence or phrase) gets classified by the NLP model,
  // and the result is broadcast to volunteers + admins so they can see
  // the severity escalate in real time as more speech comes in.
  socket.on("sos-transcript-chunk", async (data) => {
    const { text, victimSocketId } = data;
    if (!text || !text.trim()) return;

    console.log(`🎙️ Transcript chunk received: "${text}"`);
    const result = await classifyTranscript(text);
    if (!result) return;

    // ===== KEYWORD SAFETY NET =====
    // Agar model galat emotion classify kare (e.g. "help me" → joy),
    // yeh fallback ensure karta hai ki distress words pe severity
    // kabhi bhi LOW nahi rahegi. Model primary hai, yeh backup hai.
    const DISTRESS_KEYWORDS = [
      // English
      "help", "please", "scared", "fear", "danger", "run",
      "following", "hurry", "emergency", "stop", "leave me",
      // Hindi / Hinglish
      "bachao", "darr", "madad", "chod", "ruk", "mat",
      "chhod", "bhago", "koi hai", "koi", "please",
      // Arabic / French / Spanish (common distress)
      "ayuda", "socorro", "au secours", "aidez", "por favor",
      "hilfe", "aiuto", "pomoc",
    ];

    const lowerText = text.toLowerCase();
    const keywordHit = DISTRESS_KEYWORDS.some((kw) => lowerText.includes(kw));

    // Severity order for comparison
    const SEVERITY_ORDER = { low: 0, medium: 1, high: 2, critical: 3 };
    const keywordSeverity = keywordHit ? "high" : "low";
    const finalSeverity =
      SEVERITY_ORDER[result.severity] >= SEVERITY_ORDER[keywordSeverity]
        ? result.severity
        : keywordSeverity;

    if (keywordHit && finalSeverity !== result.severity) {
      console.log(`🛡️ Safety net triggered: model said "${result.severity}" but keyword found → upgraded to "${finalSeverity}"`);
    }

    const payload = {
      text,
      emotion: result.emotion,
      intensity: result.intensity,
      severity: finalSeverity,
      severity_score: result.severity_score,
      confidence_profile: result.confidence_profile,
      keyword_triggered: keywordHit && finalSeverity !== result.severity,
      victimSocketId: victimSocketId || socket.id,
      time: new Date().toISOString(),
    };

    console.log(`🧠 NLP result: ${result.emotion} | model severity: ${result.severity} | final severity: ${finalSeverity} | intensity: ${result.intensity}`);

    // Push to the victim themselves so their badge updates
    socket.emit("sos-severity-update", payload);

    // Push to all volunteers currently handling this alert and admin dashboard
    Object.values(connectedVolunteers).forEach((vol) => {
      io.to(vol.socketId).emit("sos-severity-update", payload);
    });
    io.to("admins").emit("sos-severity-update", payload);
  });

  // VOLUNTEER RESPONDING — targeted to that specific victim only
  socket.on("volunteer-responding", (data) => {
    console.log(`🙋 ${data.volunteerName} is responding`);
    io.to(data.victimSocketId).emit("volunteer-accepted", {
      ...data,
      volunteerSocketId: socket.id,
    });
  });

  // LIVE LOCATION RELAY — both sides ping each other every few seconds
  socket.on("victim-location-update", (data) => {
    if (data.volunteerSocketId) {
      io.to(data.volunteerSocketId).emit("victim-location-update", { lat: data.lat, lon: data.lon });
    }
  });

  socket.on("volunteer-location-update", (data) => {
    if (data.victimSocketId) {
      io.to(data.victimSocketId).emit("volunteer-location-update", { lat: data.lat, lon: data.lon });
    }
  });

  // EMERGENCY ENDED
  socket.on("emergency-ended", (data) => {
    console.log("✅ Emergency ended by user");
    io.emit("emergency-stopped", { time: data.time });
    io.to("admins").emit("admin-emergency-ended", { time: data.time });
  });

  // DISCONNECT
  socket.on("disconnect", () => {
    takeVolunteerOffline();
    console.log("❌ Disconnected:", socket.id);
  });
});

// ===== START SERVER =====
http.listen(process.env.PORT || 3000, () => {
  console.log(`🚀 Server running at http://localhost:${process.env.PORT || 3000}`);
});