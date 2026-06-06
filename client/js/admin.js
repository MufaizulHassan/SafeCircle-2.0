// js/admin.js
console.log("admin.js loaded");

const socket = io();

let adminMap;
let totalAlertsCount = 0;
let resolvedCount = 0;
let activeAlertsCount = 0;
let alertMarkers = {};
let volunteerMarkers = {};

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

// ===== INIT MAP =====
function initAdminMap() {
  adminMap = L.map("adminMap").setView([28.61, 77.20], 13);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19
  }).addTo(adminMap);
}

// ===== UPDATE STATS =====
function updateStats() {
  document.getElementById("totalAlerts").textContent = totalAlertsCount;
  document.getElementById("resolvedAlerts").textContent = resolvedCount;
  document.getElementById("activeAlerts").textContent = activeAlertsCount;
}

// ===== ADD ALERT TO UI =====
function addAlertToUI(data) {
  const list = document.getElementById("alertsList");

  // remove empty message
  const empty = list.querySelector(".empty-msg");
  if (empty) empty.remove();

  const id = "alert-" + Date.now();
  const div = document.createElement("div");
  div.className = "alert-row";
  div.id = id;

  div.innerHTML = `
    <div class="alert-row-header">
      <span class="alert-row-title">🚨 SOS Alert</span>
      <span class="alert-row-time">${new Date(data.time).toLocaleTimeString()}</span>
    </div>
    <p>📍 Lat: ${data.lat.toFixed(4)}, Lon: ${data.lon.toFixed(4)}</p>
    <p>👥 Notified: ${data.notified} volunteer(s)</p>
    <button class="resolve-btn" data-id="${id}">✅ Mark Resolved</button>
  `;

  // resolve button
  div.querySelector(".resolve-btn").addEventListener("click", (e) => {
    const cardId = e.target.dataset.id;
    resolveAlert(cardId);
  });

  list.prepend(div);

  // add to map
  if (adminMap) {
    const marker = L.marker([data.lat, data.lon], { icon: alertIcon })
      .addTo(adminMap)
      .bindPopup(`🚨 SOS at ${new Date(data.time).toLocaleTimeString()}`)
      .openPopup();
    alertMarkers[id] = marker;
    adminMap.setView([data.lat, data.lon], 14);
  }
}

// ===== RESOLVE ALERT =====
function resolveAlert(id) {
  const card = document.getElementById(id);
  if (!card) return;

  card.style.borderColor = "rgba(34, 197, 94, 0.4)";
  card.style.background = "rgba(34, 197, 94, 0.06)";
  card.querySelector(".alert-row-title").textContent = "✅ Resolved";
  card.querySelector(".resolve-btn").remove();

  resolvedCount++;
  activeAlertsCount = Math.max(0, activeAlertsCount - 1);
  updateStats();

  // remove marker from map
  if (alertMarkers[id] && adminMap) {
    adminMap.removeLayer(alertMarkers[id]);
    delete alertMarkers[id];
  }
}

// ===== ADD VOLUNTEER TO UI =====
function addVolunteerToUI(data) {
  const list = document.getElementById("volunteersList");

  const empty = list.querySelector(".empty-msg");
  if (empty) empty.remove();

  // avoid duplicates
  const existing = document.getElementById(`vol-${data.socketId}`);
  if (existing) return;

  const div = document.createElement("div");
  div.className = "volunteer-row";
  div.id = `vol-${data.socketId}`;

  div.innerHTML = `
    <div>
      <div class="volunteer-row-name">
        <span class="online-dot"></span>${data.name}
      </div>
      <div class="volunteer-row-info">
        📍 ${data.lat.toFixed(4)}, ${data.lon.toFixed(4)}
      </div>
    </div>
    <div style="font-size:0.75rem; color:#6b7280;">Online</div>
  `;

  list.appendChild(div);

  // add to map
  if (adminMap) {
    const marker = L.marker([data.lat, data.lon], { icon: volIcon })
      .addTo(adminMap)
      .bindPopup(`🟢 ${data.name} (online)`);
    volunteerMarkers[data.socketId] = marker;
  }

  // update count
  document.getElementById("onlineVolunteers").textContent =
    Object.keys(volunteerMarkers).length;
}

// ===== REMOVE VOLUNTEER FROM UI =====
function removeVolunteerFromUI(socketId) {
  const el = document.getElementById(`vol-${socketId}`);
  if (el) el.remove();

  if (volunteerMarkers[socketId] && adminMap) {
    adminMap.removeLayer(volunteerMarkers[socketId]);
    delete volunteerMarkers[socketId];
  }

  document.getElementById("onlineVolunteers").textContent =
    Object.keys(volunteerMarkers).length;

  const list = document.getElementById("volunteersList");
  if (list.children.length === 0) {
    list.innerHTML = `<p class="empty-msg">No volunteers online right now.</p>`;
  }
}

// ===== SOCKET EVENTS =====
socket.on("connect", () => {
  console.log("🔗 Admin connected:", socket.id);
  // register as admin
  socket.emit("admin-online");
});

socket.on("connect_error", () => {
  console.warn("⚠️ Server offline");
});

// new SOS alert
socket.on("admin-new-alert", (data) => {
  totalAlertsCount++;
  activeAlertsCount++;
  updateStats();
  addAlertToUI(data);
});





// Emergency ended
socket.on("admin-emergency-ended", (data) => {
  console.log("✅ Emergency ended:", data);

  // update stats
  resolvedCount++;
  activeAlertsCount = Math.max(0, activeAlertsCount - 1);
  updateStats();

  // clear alert markers from map
  Object.keys(alertMarkers).forEach(id => {
    if (adminMap) adminMap.removeLayer(alertMarkers[id]);
    delete alertMarkers[id];
  });

  // update alerts list
  const list = document.getElementById("alertsList");
  const activeAlerts = list.querySelectorAll(".alert-row:not(.resolved-item)");
  activeAlerts.forEach(alert => {
    alert.style.borderColor = "rgba(34, 197, 94, 0.4)";
    alert.style.background = "rgba(34, 197, 94, 0.06)";
    const title = alert.querySelector(".alert-row-title");
    if (title) title.textContent = "✅ Resolved";
    const btn = alert.querySelector(".resolve-btn");
    if (btn) btn.remove();
  });

  // add to activity
  const endMsg = document.createElement("div");
  endMsg.className = "alert-row";
  endMsg.style.borderColor = "rgba(34, 197, 94, 0.4)";
  endMsg.style.background = "rgba(34, 197, 94, 0.06)";
  endMsg.innerHTML = `
    <div class="alert-row-header">
      <span class="alert-row-title" style="color:#22c55e;">✅ Emergency Ended</span>
      <span class="alert-row-time">${new Date(data.time).toLocaleTimeString()}</span>
    </div>
    <p style="color:#22c55e;">User manually ended the emergency</p>
  `;
  list.prepend(endMsg);
});




// volunteer came online
socket.on("admin-volunteer-online", (data) => {
  addVolunteerToUI(data);
});

// volunteer went offline
socket.on("admin-volunteer-offline", (data) => {
  removeVolunteerFromUI(data.socketId);
});

// ===== INIT =====
document.addEventListener("DOMContentLoaded", () => {
  initAdminMap();
});