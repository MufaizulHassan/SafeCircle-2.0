// js/dashboard.js
console.log("dashboard.js loaded");

const socket = io();

let dashMap;
let volunteerMarker;
let alertMarkers = [];
let isOnline = false;
let volName = "";
let volLat = null;
let volLon = null;

// ===== MAP ICONS =====
const alertIcon = L.icon({
  iconUrl: "icons/marker-icon-red.png",
  shadowUrl: "icons/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const volIcon = L.icon({
  iconUrl: "icons/marker-icon-green.png",
  shadowUrl: "icons/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// ===== HELPERS =====
function addLog(msg, type = "info") {
  const log = document.getElementById("activityLog");
  if (!log) return;
  const div = document.createElement("div");
  div.className = `status-entry ${type}`;
  div.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
  log.prepend(div);
}

function setbadge(online) {
  const badge = document.getElementById("statusBadge");
  if (!badge) return;
  if (online) {
    badge.className = "online-badge";
    badge.textContent = "● Online";
  } else {
    badge.className = "offline-badge";
    badge.textContent = "● Offline";
  }
}

// ===== INIT MAP =====
function initDashMap(lat, lon) {
  dashMap = L.map("dashMap").setView([lat, lon], 14);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19
  }).addTo(dashMap);

  // show volunteer's own position
  volunteerMarker = L.marker([lat, lon], { icon: volIcon })
    .addTo(dashMap)
    .bindPopup("📍 Your Location")
    .openPopup();
}

// ===== SHOW ALERT ON MAP =====
function showAlertOnMap(lat, lon, distance) {
  if (!dashMap) return;

  const marker = L.marker([lat, lon], { icon: alertIcon })
    .addTo(dashMap)
    .bindPopup(`🚨 Person needs help — ${distance} km away`)
    .openPopup();

  alertMarkers.push(marker);
  dashMap.setView([lat, lon], 14);
}

// ===== SHOW ALERT CARD =====
function showAlertCard(data) {
  const feed = document.getElementById("alertFeed");
  if (!feed) return;

  // clear no-alerts message
  feed.innerHTML = "";

  const card = document.createElement("div");
  card.className = "alert-card";
  card.id = "alert-" + Date.now();

  card.innerHTML = `
    <h3>🚨 Emergency Alert Nearby</h3>
    <p>📍 Distance: <strong>${data.distance} km</strong></p>
    <p>🕐 Time: ${new Date(data.time).toLocaleTimeString()}</p>
    <p>📌 Coordinates: ${data.lat.toFixed(4)}, ${data.lon.toFixed(4)}</p>
    <br/>
    <button class="respond-btn" id="respondBtn-${card.id}">
      ✅ I am Responding
    </button>
    <button class="dismiss-btn" id="dismissBtn-${card.id}">
      ✖ Dismiss
    </button>
  `;

  feed.prepend(card);

  // respond button
  card.querySelector(`#respondBtn-${card.id}`).addEventListener("click", () => {
    socket.emit("volunteer-responding", {
      volunteerName: volName,
      lat: volLat,
      lon: volLon
    });
    addLog(`✅ You responded to the alert`, "success");
    card.querySelector(`#respondBtn-${card.id}`).disabled = true;
    card.querySelector(`#respondBtn-${card.id}`).textContent = "✅ Responding";
    card.style.borderColor = "rgba(34, 197, 94, 0.5)";
  });

  // dismiss button
  card.querySelector(`#dismissBtn-${card.id}`).addEventListener("click", () => {
    card.remove();
    addLog("✖ Alert dismissed", "warning");
    if (feed.children.length === 0) {
      feed.innerHTML = `<p class="no-alerts">No active alerts nearby. Stay on standby.</p>`;
    }
  });
}

// ===== BROWSER NOTIFICATION =====
function sendBrowserNotification(distance) {
  if (!("Notification" in window)) return;

  if (Notification.permission === "granted") {
    new Notification("🚨 SafeCircle Alert", {
      body: `Someone needs help ${distance} km from you. Open dashboard to respond.`,
      icon: "icons/marker-icon-red.png"
    });
  } else if (Notification.permission !== "denied") {
    Notification.requestPermission().then((perm) => {
      if (perm === "granted") {
        new Notification("🚨 SafeCircle Alert", {
          body: `Someone needs help ${distance} km from you.`,
          icon: "icons/marker-icon-red.png"
        });
      }
    });
  }
}

// ===== SOCKET EVENTS =====
socket.on("connect", () => {
  console.log("🔗 Dashboard connected:", socket.id);
  addLog("Connected to SafeCircle server");
});

socket.on("connect_error", () => {
  addLog("⚠️ Server offline — running in demo mode", "warning");
});

// INCOMING ALERT FROM SERVER
socket.on("incoming-alert", (data) => {
  console.log("🚨 Incoming alert:", data);
  addLog(`🚨 Alert received — ${data.distance} km away`, "warning");

  // show on map
  showAlertOnMap(data.lat, data.lon, data.distance);

  // show alert card
  showAlertCard(data);

  // browser notification
  sendBrowserNotification(data.distance);
});


// Emergency ended by user
socket.on("emergency-stopped", (data) => {
  console.log("✅ Emergency stopped:", data);

  // clear all alert cards
  const feed = document.getElementById("alertFeed");
  feed.innerHTML = `
    <div class="status-entry success" style="padding:14px; border-radius:12px; border: 1px solid rgba(34,197,94,0.4); background: rgba(34,197,94,0.08);">
      <p style="color:#22c55e; font-weight:600; margin:0;">✅ Emergency Resolved</p>
      <p style="font-size:0.8rem; color:#9ca3af; margin:4px 0 0;">
        User ended the emergency at ${new Date(data.time).toLocaleTimeString()}
      </p>
    </div>
  `;

  // clear alert markers from map
  alertMarkers.forEach(m => dashMap.removeLayer(m));
  alertMarkers = [];

  addLog("✅ Emergency ended by user", "success");

  // browser notification
  if (Notification.permission === "granted") {
    new Notification("✅ SafeCircle — Emergency Resolved", {
      body: "The user has ended the emergency. Thank you for being on standby.",
      icon: "icons/marker-icon-green.png"
    });
  }
});

// ===== GO ONLINE / OFFLINE =====
document.addEventListener("DOMContentLoaded", () => {
  const goOnlineBtn = document.getElementById("goOnlineBtn");
  const goOfflineBtn = document.getElementById("goOfflineBtn");
  const nameInput = document.getElementById("volName");

  // Request notification permission on load
  if ("Notification" in window && Notification.permission !== "granted") {
    Notification.requestPermission();
  }

  goOnlineBtn.addEventListener("click", () => {
    volName = nameInput.value.trim();

    if (!volName) {
      alert("Please enter your name first.");
      return;
    }

    // get volunteer GPS
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        volLat = pos.coords.latitude;
        volLon = pos.coords.longitude;

        // init map
        initDashMap(volLat, volLon);

        // register with server
        socket.emit("volunteer-online", {
          name: volName,
          lat: volLat,
          lon: volLon
        });

        isOnline = true;
        setbadge(true);
        goOnlineBtn.style.display = "none";
        goOfflineBtn.style.display = "block";
        nameInput.disabled = true;

        addLog(`✅ You are now online as "${volName}"`, "success");
      },
      () => {
        // fallback to Dwarka if GPS denied
        volLat = 28.61;
        volLon = 77.20;
        initDashMap(volLat, volLon);

        socket.emit("volunteer-online", {
          name: volName,
          lat: volLat,
          lon: volLon
        });

        isOnline = true;
        setbadge(true);
        goOnlineBtn.style.display = "none";
        goOfflineBtn.style.display = "block";
        nameInput.disabled = true;

        addLog(`✅ Online as "${volName}" (demo location)`, "success");
      }
    );
  });

  goOfflineBtn.addEventListener("click", () => {
    isOnline = false;
    setbadge(false);
    goOnlineBtn.style.display = "block";
    goOfflineBtn.style.display = "none";
    nameInput.disabled = false;
    addLog("🔴 You are now offline", "warning");

    // clear alert markers
    alertMarkers.forEach(m => dashMap.removeLayer(m));
    alertMarkers = [];

    document.getElementById("alertFeed").innerHTML =
      `<p class="no-alerts">No active alerts nearby. Stay on standby.</p>`;
  });
});