

import { useState, useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { socket } from "../socket";

export default function AdminDashboard() {
  const { token } = useSelector((state) => state.auth);
  const [alerts, setAlerts] = useState([]);
  const [onlineVolunteers, setOnlineVolunteers] = useState([]);
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  // liveAI — latest NLP result. Replaces on every new chunk, never stacks.
  const [liveAI, setLiveAI] = useState(null);

  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const alertMarkers = useRef({});
  const volunteerMarkers = useRef({});

  useEffect(() => {
    if (mapInstance.current) return;
    mapInstance.current = L.map(mapRef.current).setView([28.6139, 77.209], 11);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(mapInstance.current);
    return () => {
      mapInstance.current?.remove();
      mapInstance.current = null;
    };
  }, []);

  useEffect(() => {
    socket.emit("admin-online");

    socket.on("admin-new-alert", (data) => {
      const id = Date.now();
      setAlerts((prev) => [{ ...data, id }, ...prev]);
      if (mapInstance.current) {
        const marker = L.marker([data.lat, data.lon])
          .addTo(mapInstance.current)
          .bindPopup(`🚨 Alert — ${data.notified} notified`);
        alertMarkers.current[id] = marker;
        mapInstance.current.setView([data.lat, data.lon], 13);
      }
    });

    socket.on("sos-severity-update", (data) => {
      // Replace liveAI entirely — latest vocal replaces previous
      setLiveAI({
        text: data.text,
        emotion: data.emotion,
        intensity: data.intensity,
        severity: data.severity,
        keyword_triggered: data.keyword_triggered,
      });
    });

    socket.on("admin-emergency-ended", () => {
      setAlerts([]);
      setLiveAI(null); // clear monitor when emergency ends
      Object.values(alertMarkers.current).forEach((m) => mapInstance.current?.removeLayer(m));
      alertMarkers.current = {};
    });

    socket.on("admin-volunteer-online", (data) => {
      setOnlineVolunteers((prev) =>
        prev.find((v) => v.socketId === data.socketId) ? prev : [...prev, data]
      );
      if (mapInstance.current && data.lat && data.lon) {
        const marker = L.circleMarker([data.lat, data.lon], { color: "#22c55e", radius: 8 })
          .addTo(mapInstance.current)
          .bindPopup(data.name);
        volunteerMarkers.current[data.socketId] = marker;
      }
    });

    socket.on("admin-volunteer-offline", (data) => {
      setOnlineVolunteers((prev) => prev.filter((v) => v.socketId !== data.socketId));
      const marker = volunteerMarkers.current[data.socketId];
      if (marker) {
        mapInstance.current?.removeLayer(marker);
        delete volunteerMarkers.current[data.socketId];
      }
    });

    return () => {
      socket.off("admin-new-alert");
      socket.off("sos-severity-update");
      socket.off("admin-emergency-ended");
      socket.off("admin-volunteer-online");
      socket.off("admin-volunteer-offline");
    };
  }, []);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const res = await fetch("/api/auth/users", { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        if (data.success) setUsers(data.users);
      } catch (err) {
        console.warn("Failed to load users:", err);
      } finally {
        setUsersLoading(false);
      }
    };
    if (token) loadUsers();
  }, [token]);

  const handleRoleChange = async (userId, newRole) => {
    try {
      await fetch(`/api/auth/users/${userId}/role`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ role: newRole }),
      });
      setUsers((prev) => prev.map((u) => (u._id === userId ? { ...u, role: newRole } : u)));
    } catch (err) {
      console.warn("Role update failed:", err);
    }
  };

  const SEVERITY_COLORS = {
    low:      { bg: "rgba(34,197,94,0.12)",  color: "#4ade80", border: "#22c55e" },
    medium:   { bg: "rgba(234,179,8,0.12)",  color: "#facc15", border: "#eab308" },
    high:     { bg: "rgba(249,115,22,0.12)", color: "#fb923c", border: "#f97316" },
    critical: { bg: "rgba(239,68,68,0.18)",  color: "#f87171", border: "#ef4444" },
  };

  return (
    <div className="home-page">
      <div className="card" style={{ textAlign: "left" }}>
        <h1>Admin Dashboard</h1>
        <p>Live alerts, volunteer tracking, and user role management.</p>
      </div>

      <div className="dashboard-grid">
        <div className="card">
          <h2>🚨 Active Alerts</h2>
          {alerts.length === 0 ? (
            <p className="status-note">No active alerts.</p>
          ) : (
            alerts.map((alert) => (
              <div key={alert.id} className="status-item" style={{ flexDirection: "column", gap: "6px" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span className="status-message">🚨 {alert.notified} volunteer(s) notified</span>
                  <span className="status-time">{new Date(alert.time).toLocaleTimeString()}</span>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="card">
          <h2>🟢 Online Volunteers ({onlineVolunteers.length})</h2>
          {onlineVolunteers.length === 0 ? (
            <p className="status-note">No volunteers online right now.</p>
          ) : (
            onlineVolunteers.map((v) => (
              <div key={v.socketId} className="status-item">
                <span className="status-message">{v.name}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ===== LIVE AI MONITOR — only when an alert is active ===== */}
      {alerts.length > 0 && (
        <div className="card" style={{ marginTop: "16px", border: "1px solid rgba(239,68,68,0.3)", background: "rgba(15,5,5,0.95)" }}>
          <h2 style={{ color: "#f87171", marginBottom: "14px", fontSize: "1rem", letterSpacing: "0.05em" }}>
            🧠 LIVE AI MONITOR
          </h2>

          {liveAI ? (
            <>
              {/* Latest vocal — replaces on every new chunk */}
              <div style={{
                padding: "10px 14px", borderRadius: "8px", marginBottom: "12px",
                background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                fontSize: "0.95rem", color: "#e2e8f0", fontStyle: "italic"
              }}>
                🎙️ "{liveAI.text}"
              </div>

              {/* Emotion + intensity bar */}
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                <span style={{ fontSize: "1.5rem" }}>
                  {liveAI.emotion === "fear" ? "😨" : liveAI.emotion === "anger" ? "😡" : liveAI.emotion === "sadness" ? "😢" : liveAI.emotion === "surprise" ? "😲" : liveAI.emotion === "joy" ? "😊" : "❤️"}
                </span>
                <div>
                  <div style={{ fontWeight: 700, color: "#fff", fontSize: "0.95rem" }}>
                    {liveAI.emotion?.toUpperCase()}
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
                    {(liveAI.intensity * 100).toFixed(0)}% intensity
                    {liveAI.keyword_triggered && <span style={{ color: "#f59e0b", marginLeft: "8px" }}>⚠️ keyword detected</span>}
                  </div>
                </div>
                <div style={{ flex: 1, height: "6px", background: "rgba(255,255,255,0.1)", borderRadius: "3px", overflow: "hidden" }}>
                  <div style={{
                    width: `${(liveAI.intensity * 100).toFixed(0)}%`,
                    height: "100%",
                    background: SEVERITY_COLORS[liveAI.severity]?.color || "#fff",
                    borderRadius: "3px",
                    transition: "width 0.4s ease"
                  }} />
                </div>
              </div>

              {/* Severity badge */}
              <div style={{
                padding: "12px 16px", borderRadius: "10px", textAlign: "center",
                fontWeight: 800, fontSize: "1.1rem", letterSpacing: "0.08em",
                background: SEVERITY_COLORS[liveAI.severity]?.bg,
                color: SEVERITY_COLORS[liveAI.severity]?.color,
                border: `1px solid ${SEVERITY_COLORS[liveAI.severity]?.border}`,
                animation: liveAI.severity === "critical" ? "pulse-red 1s infinite" : "none",
              }}>
                {liveAI.severity === "critical" && "🔴 "}
                {liveAI.severity === "high" && "🟠 "}
                {liveAI.severity === "medium" && "🟡 "}
                {liveAI.severity === "low" && "🟢 "}
                {liveAI.severity?.toUpperCase()}
              </div>
            </>
          ) : (
            <p className="status-note">Alert active — waiting for victim speech to analyze...</p>
          )}
        </div>
      )}

      <div className="card" style={{ marginTop: "20px" }}>
        <h2>Live Alert Map</h2>
        <div id="liveMap" ref={mapRef} style={{ height: "360px", borderRadius: "12px" }}></div>
      </div>

      <div className="card" style={{ marginTop: "20px", textAlign: "left" }}>
        <h2>👥 Manage Users</h2>
        {usersLoading ? (
          <p className="status-note">Loading users...</p>
        ) : users.length === 0 ? (
          <p className="status-note">No registered users yet.</p>
        ) : (
          users.map((u) => (
            <div key={u._id} className="status-item" style={{ flexDirection: "column", alignItems: "stretch" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div className="status-message" style={{ fontWeight: 600 }}>{u.name}</div>
                  <div className="status-note" style={{ margin: 0 }}>{u.email}</div>
                </div>
                <select value={u.role} onChange={(e) => handleRoleChange(u._id, e.target.value)} className="role-select">
                  <option value="user">user</option>
                  <option value="volunteer">volunteer</option>
                  <option value="admin">admin</option>
                </select>
              </div>
              {u.volunteerStatus === "pending" && u.volunteerApplication && (
                <div className="volunteer-application-box">
                  <p><strong>📍 City:</strong> {u.volunteerApplication.city} &nbsp; <strong>Age:</strong> {u.volunteerApplication.age || "—"}</p>
                  <p><strong>🕐 Availability:</strong> {u.volunteerApplication.availability} &nbsp; <strong>🚗 Transport:</strong> {u.volunteerApplication.transport}</p>
                  <p><strong>🗣️ Languages:</strong> {u.volunteerApplication.languages || "—"}</p>
                  <p><strong>📞 Emergency Contact:</strong> {u.volunteerApplication.emergencyContactName} — {u.volunteerApplication.emergencyContactPhone}</p>
                  {u.volunteerApplication.idProof && <p><strong>🆔 ID:</strong> {u.volunteerApplication.idProof}</p>}
                  {u.volunteerApplication.note && <p><strong>📝 Note:</strong> {u.volunteerApplication.note}</p>}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
