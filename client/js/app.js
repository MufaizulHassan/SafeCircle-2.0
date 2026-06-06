


// console.log("SafeCircle app.js loaded (stable version)");

// // const socket = io("http://localhost:4000");

// // temporarily disconnected the backend

//   // ===== REAL RESPONDERS =====

//   // store real responding volunteers
//   let realResponders = [];


//   // global flag to track emergency state

//   let map;
//   let volunteerMarkers = {};
//   let userLat = null;
//   let userLon = null;

//   let emergencyActive = false;
//   let animationTimers = [];

//   // SOCKET CONNECTION
//   const socket = io();

//   socket.on("connect", () => {
//     console.log("🔗 Connected to SafeCircle server:", socket.id);
//   });

//   socket.on("connect_error", () => {
//     console.warn("⚠️ Socket server offline — running in demo mode");
//   });

//   // Server confirmed alert was sent to volunteers
//   socket.on("alert-confirmed", (data) => {
//     addSystemEvent(`✅ Alert sent to ${data.notified} volunteer(s) nearby`);
//   });

//   // // A volunteer accepted and is responding
//   // socket.on("volunteer-accepted", (data) => {
//   //   addSystemEvent(`🙋 ${data.volunteerName} is on the way!`);
//   //   addVolunteerUpdate(`${data.volunteerName} accepted your alert`);
//   // });


//   socket.on("volunteer-accepted", (data) => {


//     // clear dummy volunteers from list on first real response
//     if (realResponders.length === 0) {
//       document.getElementById("volunteerList").innerHTML = "";
//       addSystemEvent("🔄 Switching to real volunteer response");
//     }

    
//     addSystemEvent(`🙋 ${data.volunteerName} is on the way!`);
//     addVolunteerUpdate(`${data.volunteerName} accepted your alert`);

//     // add real volunteer to map
//     realResponders.push(data);

//     const dist = calculateDistance(userLat, userLon, data.lat, data.lon);
//     const eta = calculateETA(dist, "bike");

//     // add to volunteer list UI
//     const list = document.getElementById("volunteerList");
//     const row = document.createElement("div");
//     row.className = "vol-row";
//     row.style.border = "1px solid rgba(34, 197, 94, 0.5)";
//     row.id = `real-vol-${data.volunteerName}`;
//     row.innerHTML = `
//       <span class="vol-name" style="color:#4ade80;">
//         ✅ ${data.volunteerName} (REAL · responding)
//       </span>
//       <span class="vol-distance" id="real-dist-${data.volunteerName}">
//         ${dist.toFixed(2)} km · ETA ${eta} min
//       </span>
//     `;
//     list.prepend(row);

//     // animate real volunteer on map
//     const marker = L.marker([data.lat, data.lon], { icon: volunteerIcon })
//       .addTo(map)
//       .bindPopup(`🙋 ${data.volunteerName} is coming!`)
//       .openPopup();

//     const distEl = document.getElementById(`real-dist-${data.volunteerName}`);
//     distEl.dataset.eta = eta;

//     getRoute(data.lat, data.lon, userLat, userLon).then((route) => {
//       if (!route) route = fallbackRoute(data.lat, data.lon, userLat, userLon);
//       animateVolunteer(
//         { name: data.volunteerName, id: data.volunteerName },
//         marker,
//         route,
//         distEl
//       );
//     });
//   });




console.log("SafeCircle app.js loaded (stable version)");

// ===== GLOBALS =====
let map;
let volunteerMarkers = {};
let userLat = null;
let userLon = null;
let emergencyActive = false;
let animationTimers = [];
let realResponders = [];

// ===== RECORDING GLOBALS =====
let mediaRecorder;
let recordedChunks = [];
let emergencyRecording = false;

// ===== CONSTANTS =====
const EMERGENCY_STOP_PASSWORD = "1234";
let ANIMATION_INTERVAL = 40;
let STEP_SIZE = 1;

// ===== MAP ICONS =====
const userIcon = L.icon({
  iconUrl: "icons/marker-icon-red.png",
  shadowUrl: "icons/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const volunteerIcon = L.icon({
  iconUrl: "icons/marker-icon-green.png",
  shadowUrl: "icons/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// ===== SOCKET CONNECTION =====
const socket = io();

socket.on("connect", () => {
  console.log("🔗 Connected to SafeCircle server:", socket.id);
});

socket.on("connect_error", () => {
  console.warn("⚠️ Socket server offline — running in demo mode");
});

socket.on("alert-confirmed", (data) => {
  addSystemEvent(`✅ Alert sent to ${data.notified} volunteer(s) nearby`);
});

socket.on("volunteer-accepted", (data) => {
  if (realResponders.length === 0) {
    document.getElementById("volunteerList").innerHTML = "";
    addSystemEvent("🔄 Switching to real volunteer response");
  }

  addSystemEvent(`🙋 ${data.volunteerName} is on the way!`);
  addVolunteerUpdate(`${data.volunteerName} accepted your alert`);

  realResponders.push(data);

  const dist = calculateDistance(userLat, userLon, data.lat, data.lon);
  const eta = calculateETA(dist, "bike");

  const list = document.getElementById("volunteerList");
  const row = document.createElement("div");
  row.className = "vol-row";
  row.style.border = "1px solid rgba(34, 197, 94, 0.5)";
  row.id = `real-vol-${data.volunteerName}`;
  row.innerHTML = `
    <span class="vol-name" style="color:#4ade80;">
      ✅ ${data.volunteerName} (REAL · responding)
    </span>
    <span class="vol-distance" id="real-dist-${data.volunteerName}">
      ${dist.toFixed(2)} km · ETA ${eta} min
    </span>
  `;
  list.prepend(row);

  const marker = L.marker([data.lat, data.lon], { icon: volunteerIcon })
    .addTo(map)
    .bindPopup(`🙋 ${data.volunteerName} is coming!`)
    .openPopup();

  const distEl = document.getElementById(`real-dist-${data.volunteerName}`);
  distEl.dataset.eta = eta;

  getRoute(data.lat, data.lon, userLat, userLon).then((route) => {
    if (!route) route = fallbackRoute(data.lat, data.lon, userLat, userLon);
    animateVolunteer(
      { name: data.volunteerName, id: data.volunteerName },
      marker,
      route,
      distEl
    );
  });
});





// // ===== ROUTE ANIMATION SPEED CONTROL =====
// let ANIMATION_INTERVAL = 40;
// let STEP_SIZE = 1;

// // ===== EMERGENCY RECORDING GLOBALS =====
// let mediaRecorder;
// let recordedChunks = [];
// let emergencyRecording = false;

// // USER SECRET STOP PASSWORD (demo)
// const EMERGENCY_STOP_PASSWORD = "1234";

// // GLOBALS
// let map;
// let volunteerMarkers = {};
// let userLat = null;
// let userLon = null;


// // ===== MAP ICONS  =====

// const userIcon = L.icon({
//   iconUrl: "icons/marker-icon-red.png",
//   shadowUrl: "icons/marker-shadow.png",
//   iconSize: [25, 41],
//   iconAnchor: [12, 41],
//   popupAnchor: [1, -34],
//   shadowSize: [41, 41]
// });

// const volunteerIcon = L.icon({
//   iconUrl: "icons/marker-icon-green.png",
//   shadowUrl: "icons/marker-shadow.png",
//   iconSize: [25, 41],
//   iconAnchor: [12, 41],
//   popupAnchor: [1, -34],
//   shadowSize: [41, 41]
// });



/* -----------------------------------------------------
   ETA CALCULATION (ADDED)
----------------------------------------------------- */
function calculateETA(distanceKm, mode) {
  const speeds = {
    walking: 5,
    bike: 25,
    car: 40,
  };

  const speed = speeds[mode] || 20;
  const hours = distanceKm / speed;
  return Math.ceil(hours * 60);
}

/* -----------------------------------------------------
   INITIALIZE MAP
----------------------------------------------------- */
function initMap() {
  map = L.map("liveMap").setView([28.61, 77.20], 13);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
  }).addTo(map);
}

/* -----------------------------------------------------
   STATUS HELPERS
----------------------------------------------------- */
function addSystemEvent(msg) {
  const b = document.getElementById("systemEvents");
  if (!b) return;
  const d = document.createElement("div");
  d.className = "status-entry info";
  d.textContent = msg;
  b.prepend(d);
}

function addVolunteerUpdate(msg) {
  const b = document.getElementById("volunteerUpdates");
  if (!b) return;
  const d = document.createElement("div");
  d.className = "status-entry success";
  d.textContent = msg;
  b.prepend(d);
}

function addPoliceEvent(msg) {
  const b = document.getElementById("contactUpdates");
  if (!b) return;
  const d = document.createElement("div");
  d.className = "status-entry warning";
  d.textContent = msg;
  b.prepend(d);
}


/* -----------------------------------------------------
   ORS ROUTE FETCHER 
----------------------------------------------------- */
async function getRoute(lat1, lon1, lat2, lon2) {
  const url = "https://api.openrouteservice.org/v2/directions/driving-car/geojson";

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjhlNTE5ZDNiNzQwMTQ4NTM4MjZiODIwYmZkNzFmYTZiIiwiaCI6Im11cm11cjY0In0=",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        coordinates: [
          [lon1, lat1],
          [lon2, lat2],
        ],
      }),
    });

    const data = await res.json();
    if (!data.features || !data.features[0]) return null;

    return data.features[0].geometry.coordinates.map(c => [c[1], c[0]]);
  } catch {
    return null;
  }
}

/* -----------------------------------------------------
   FALLBACK ROUTE
----------------------------------------------------- */
function fallbackRoute(sLat, sLon, eLat, eLon) {
  let path = [];
  for (let i = 0; i <= 40; i++) {
    let t = i / 40;
    path.push([
      sLat + (eLat - sLat) * t,
      sLon + (eLon - sLon) * t,
    ]);
  }
  return path;
}

/* -----------------------------------------------------
   MARKER ANIMATION
----------------------------------------------------- */
function animateVolunteer(vol, marker, route, distEl) {
  let idx = 0;
  const total = route.length;

  const timer = setInterval(() => {
    if (idx >= total) {
      marker.setLatLng([userLat, userLon]);
      distEl.textContent = "Arrived ✔";
      addVolunteerUpdate(`ARRIVED → ${vol.name}`);
      clearInterval(timer);
      return;
    }

    marker.setLatLng(route[idx]);
    const eta = distEl.dataset.eta;
    distEl.textContent = `${total - idx} steps · ETA ${eta} min`;

    idx += STEP_SIZE;
  }, ANIMATION_INTERVAL);

  // store timer so force stop can clear it
  animationTimers.push(timer);
}

// /* -----------------------------------------------------
//    EMERGENCY RECORDING (UNCHANGED)
// ----------------------------------------------------- */
// async function startEmergencyRecording() {
//   try {
//     const stream = await navigator.mediaDevices.getUserMedia({
//       video: true,
//       audio: true,
//     });

//     mediaRecorder = new MediaRecorder(stream);
//     recordedChunks = [];

//     mediaRecorder.ondataavailable = (e) => {
//       if (e.data.size > 0) recordedChunks.push(e.data);
//     };

//     mediaRecorder.onstop = saveRecordingToIndexedDB;
//     mediaRecorder.start(1000);
//     emergencyRecording = true;

//     addSystemEvent("📹 Emergency recording started");
//   } catch {
//     addSystemEvent("❌ Camera/Mic permission denied");
//   }
// }

// /* -----------------------------------------------------
//    INDEXED DB STORAGE
// ----------------------------------------------------- */
// function saveRecordingToIndexedDB() {

//   console.log("Chunks length:", recordedChunks.length);

//   if (recordedChunks.length === 0) {
//   console.warn("❌ No video data captured");
//   addSystemEvent("❌ Recording failed (no data)");
//   return;
// }



//   console.log("🔥 saveRecordingToIndexedDB CALLED");


//   const blob = new Blob(recordedChunks, { type: "video/webm" });
//   const request = indexedDB.open("SafeCircleEvidenceDB", 1);

//   request.onupgradeneeded = (e) => {
//     e.target.result.createObjectStore("videos", { autoIncrement: true });
//   };

//   request.onsuccess = (e) => {
//     const db = e.target.result;
//     const tx = db.transaction("videos", "readwrite");
//     tx.objectStore("videos").add({
//       time: new Date().toISOString(),
//       video: blob,
//     });
//     addSystemEvent("🔒 Evidence saved securely");
//   };
// }


// updated version

/* -----------------------------------------------------
   EMERGENCY RECORDING (FIXED)
----------------------------------------------------- */
async function startEmergencyRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });

    mediaRecorder = new MediaRecorder(stream);
    recordedChunks = [];
    saveRecordingToIndexedDB._called = false; // reset guard for new recording

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        recordedChunks.push(e.data);
      }
      // final chunk arrives here BEFORE onstop fires
      // so we save from here once recorder is inactive
      if (mediaRecorder.state === "inactive") {
        saveRecordingToIndexedDB();
      }
    };

    mediaRecorder.onstop = () => {
      // intentionally empty — saving handled in ondataavailable
    };

    mediaRecorder.start(1000);
    emergencyRecording = true;

    addSystemEvent("📹 Emergency recording started");
  } catch {
    addSystemEvent("❌ Camera/Mic permission denied");
  }
}

/* -----------------------------------------------------
   INDEXED DB STORAGE (FIXED)
----------------------------------------------------- */
function saveRecordingToIndexedDB() {

  // prevent double-save
  if (saveRecordingToIndexedDB._called) return;
  saveRecordingToIndexedDB._called = true;

  if (recordedChunks.length === 0) {
    console.warn("No video data captured");
    addSystemEvent("❌ Recording failed (no data)");
    return;
  }

  console.log("Chunks:", recordedChunks.length);
  console.log("saveRecordingToIndexedDB CALLED");

  const blob = new Blob(recordedChunks, { type: "video/webm" });
  const request = indexedDB.open("SafeCircleEvidenceDB", 1);

  request.onupgradeneeded = (e) => {
    e.target.result.createObjectStore("videos", { autoIncrement: true });
  };

  request.onsuccess = (e) => {
    const db = e.target.result;
    const tx = db.transaction("videos", "readwrite");
    tx.objectStore("videos").add({
      time: new Date().toISOString(),
      video: blob,
    });
    tx.oncomplete = () => {
      addSystemEvent("🔒 Evidence saved securely");
      console.log("Video saved to IndexedDB ✔");
    };
    tx.onerror = (err) => {
      addSystemEvent("❌ Failed to save evidence");
      console.error("IndexedDB transaction error:", err);
    };
  };

  request.onerror = (err) => {
    addSystemEvent("❌ IndexedDB failed to open");
    console.error("IndexedDB open error:", err);
  };
}

/* -----------------------------------------------------
   MAIN ALERT PROCESS
----------------------------------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  initMap();

  const alertBtn = document.getElementById("alertButton");
  const statusText = document.getElementById("statusText");
  const volunteerList = document.getElementById("volunteerList");

  // alertBtn.addEventListener("click", async () => {

  //   startEmergencyRecording();

  //   document.getElementById("forceStopBox").style.display = "block";

  //   addSystemEvent("Getting your realtime GPS…");
  //   statusText.textContent = "Acquiring GPS…";

  //   await new Promise((resolve) => {
  //     navigator.geolocation.getCurrentPosition(
  //       (pos) => {
  //         userLat = pos.coords.latitude;
  //         userLon = pos.coords.longitude;
  //         map.setView([userLat, userLon], 14);
  //         // L.marker([userLat, userLon]).addTo(map).bindPopup("YOU ARE HERE");
  //         L.marker([userLat, userLon], { icon: userIcon }).addTo(map).bindPopup("🚨 YOU NEED HELP");

  //         resolve();
  //       },
  //       () => {
  //         userLat = 28.61;
  //         userLon = 77.20;
  //         resolve();
  //       }
  //     );
  //   });

  //   let nearest = await findNearestVolunteers(userLat, userLon, 5);
  //   volunteerList.innerHTML = "";

  //   nearest.forEach((vol) => {
  //     const eta = calculateETA(vol.distance, vol.mode);

  //     volunteerList.innerHTML += `
  //       <div class="vol-row">
  //         <span class="vol-name">${vol.name} (${vol.mode})</span>
  //         <span class="vol-distance" id="dist-${vol.id}">
  //           ${vol.distance.toFixed(2)} km · ETA ${eta} min
  //         </span>
  //       </div>
  //     `;
  //   });

  //   nearest.forEach(async (vol) => {
  //     const el = document.getElementById(`dist-${vol.id}`);
  //     // const marker = L.marker([vol.lat, vol.lon]).addTo(map);

  //     const marker = L.marker([vol.lat, vol.lon],{ icon: volunteerIcon }).addTo(map);

  //     let route = await getRoute(vol.lat, vol.lon, userLat, userLon);
  //     if (!route) route = fallbackRoute(vol.lat, vol.lon, userLat, userLon);
  //     animateVolunteer(vol, marker, route, el);
  //   });

  //   statusText.textContent = "Emergency alert sent.";
  // });

  alertBtn.addEventListener("click", async () => {

    startEmergencyRecording();
    document.getElementById("forceStopBox").style.display = "block";
    addSystemEvent("Getting your realtime GPS…");
    statusText.textContent = "Acquiring GPS…";

    await new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          userLat = pos.coords.latitude;
          userLon = pos.coords.longitude;
          map.setView([userLat, userLon], 14);
          L.marker([userLat, userLon], { icon: userIcon })
            .addTo(map)
            .bindPopup("🚨 YOU NEED HELP");
          resolve();
        },
        () => {
          userLat = 28.61;
          userLon = 77.20;
          resolve();
        }
      );
    });

    // EMIT SOS TO SERVER
    socket.emit("sos-alert", {
      lat: userLat,
      lon: userLon,
      time: new Date().toISOString()
    });
    addSystemEvent("🚨 SOS alert broadcasted to nearby volunteers");

    let nearest = await findNearestVolunteers(userLat, userLon, 5);
    volunteerList.innerHTML = "";

    nearest.forEach((vol) => {
      const eta = calculateETA(vol.distance, vol.mode);
      volunteerList.innerHTML += `
        <div class="vol-row">
          <span class="vol-name">${vol.name} (${vol.mode})</span>
          <span class="vol-distance" id="dist-${vol.id}">
            ${vol.distance.toFixed(2)} km · ETA ${eta} min
          </span>
        </div>
      `;
    });

    nearest.forEach(async (vol) => {
      const el = document.getElementById(`dist-${vol.id}`);
      const marker = L.marker([vol.lat, vol.lon], { icon: volunteerIcon }).addTo(map);
      let route = await getRoute(vol.lat, vol.lon, userLat, userLon);
      if (!route) route = fallbackRoute(vol.lat, vol.lon, userLat, userLon);
      animateVolunteer(vol, marker, route, el);
    });

    statusText.textContent = "Emergency alert sent.";
    emergencyActive = true;
    });
});

// ---------------- FORCE STOP LOGIC ----------------
document.addEventListener("DOMContentLoaded", () => {
  const forceStopBtn = document.getElementById("forceStopBtn");
  const forceStopBox = document.getElementById("forceStopBox");

  if (!forceStopBtn) return;

  forceStopBtn.addEventListener("click", () => {
    const pass = prompt("Enter emergency stop password:");

    if (pass !== EMERGENCY_STOP_PASSWORD) {
      alert("❌ Incorrect password. Recording continues.");
      return;
    }

    if (mediaRecorder && emergencyRecording) {
      mediaRecorder.stop();
      emergencyRecording = false;
      emergencyActive = false;

      // stop all volunteer animations
      animationTimers.forEach(timer => clearInterval(timer));
      animationTimers = [];

      // emit to server — tell volunteers emergency is over
      socket.emit("emergency-ended", {
        lat: userLat,
        lon: userLon,
        time: new Date().toISOString()
      });

      addSystemEvent("🛑 Emergency recording force-stopped");
      addSystemEvent("✅ Volunteers have been notified — emergency ended");
      document.getElementById("forceStopBox").style.display = "none";
    }
  });
});
