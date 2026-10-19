import { useState, useEffect, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet default marker icon broken by bundler
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "/icons/marker-icon-red.png",
  iconUrl: "/icons/marker-icon-red.png",
  shadowUrl: "/icons/marker-shadow.png",
});

const alertIcon = L.icon({
  iconUrl: "/icons/marker-icon-red.png",
  shadowUrl: "/icons/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

import { socket, connectSocket } from "../socket";
import { apiFetch } from "../api/fetch";
import {
  addAlert,
  addOnlineVolunteer,
  removeOnlineVolunteer,
  setLiveAI,
  setAlertSeverity,
  clearIncident,
} from "../redux/slices/adminLiveSlice";

export default function AdminDashboard() {
  const { token } = useSelector((state) => state.auth);
  const dispatch = useDispatch();

  const { alerts, onlineVolunteers, liveAI, alertSeverities } = useSelector(
    (state) => state.adminLive
  );

  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);

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

    alerts.forEach((data) => {
      if (data.lat && data.lon) {
        const marker = L.marker([data.lat, data.lon], { icon: alertIcon })
          .addTo(mapInstance.current)
          .bindPopup(`🚨 Alert — ${data.notified} notified`);
        alertMarkers.current[data.id] = marker;
      }
    });

    onlineVolunteers.forEach((v) => {
      if (v.lat && v.lon) {
        const marker = L.circleMarker([v.lat, v.lon], { color: "#22c55e", radius: 8 })
          .addTo(mapInstance.current)
          .bindPopup(v.name);
        volunteerMarkers.current[v.socketId] = marker;
      }
    });

    return () => {
      mapInstance.current?.remove();
      mapInstance.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    connectSocket();
    socket.emit("admin-online");

    socket.on("admin-new-alert", (data) => {
      const id = Date.now();
      dispatch(addAlert({ ...data, id }));
      if (mapInstance.current) {
        const marker = L.marker([data.lat, data.lon], { icon: alertIcon })
          .addTo(mapInstance.current)
          .bindPopup(`🚨 Alert — ${data.notified} notified`);
        alertMarkers.current[id] = marker;
        mapInstance.current.setView([data.lat, data.lon], 13);
      }
    });

    socket.on("sos-severity-update", (data) => {
      dispatch(
        setLiveAI({
          text: data.text,
          emotion: data.emotion,
          intensity: data.intensity,
          severity: data.severity,
          keyword_triggered: data.keyword_triggered,
        })
      );
      if (data.victimSocketId) {
        dispatch(
          setAlertSeverity({
            victimSocketId: data.victimSocketId,
            severity: data.severity,
            emotion: data.emotion,
            intensity: data.intensity,
            keyword_triggered: data.keyword_triggered,
          })
        );
      }
    });

    socket.on("admin-emergency-ended", () => {
      dispatch(clearIncident());
      Object.values(alertMarkers.current).forEach((m) => mapInstance.current?.removeLayer(m));
      alertMarkers.current = {};
    });

    socket.on("admin-volunteer-online", (data) => {
      dispatch(addOnlineVolunteer(data));
      if (mapInstance.current && data.lat && data.lon && !volunteerMarkers.current[data.socketId]) {
        const marker = L.circleMarker([data.lat, data.lon], { color: "#22c55e", radius: 8 })
          .addTo(mapInstance.current)
          .bindPopup(data.name);
        volunteerMarkers.current[data.socketId] = marker;
      }
    });

    socket.on("admin-volunteer-offline", (data) => {
      dispatch(removeOnlineVolunteer(data.socketId));
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const res = await apiFetch("/api/auth/users", {
          headers: { Authorization: `Bearer ${token}` },
        });
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
      await apiFetch(`/api/auth/users/${userId}/role`, {
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
    low: { bg: "rgba(16, 185, 129, 0.15)", color: "#10b981", border: "rgba(16, 185, 129, 0.35)" },
    medium: { bg: "rgba(245, 158, 11, 0.15)", color: "#f59e0b", border: "rgba(245, 158, 11, 0.35)" },
    high: { bg: "rgba(249, 115, 22, 0.15)", color: "#f97316", border: "rgba(249, 115, 22, 0.35)" },
    critical: { bg: "rgba(239, 68, 68, 0.2)", color: "#ef4444", border: "rgba(239, 68, 68, 0.45)" },
  };

  const getEmotionIcon = (emotion) => {
    switch (emotion) {
      case "fear":
        return "😨";
      case "anger":
        return "😡";
      case "sadness":
        return "😢";
      case "surprise":
        return "😲";
      case "joy":
        return "😊";
      default:
        return "❤️";
    }
  };

  const getAlertSeverity = (alert) => {
    if (alert.victimSocketId && alertSeverities[alert.victimSocketId]) {
      return alertSeverities[alert.victimSocketId];
    }
    return liveAI;
  };

  const totalUsers = users.length;
  const volunteerCount = users.filter((u) => u.role === "volunteer").length;
  const adminCount = users.filter((u) => u.role === "admin").length;
  const pendingApps = users.filter((u) => u.volunteerStatus === "pending").length;

  return (
    <div className="home-page admin-dashboard">
      {/* ===== HEADER CARD ===== */}
      <div className="card admin-header-card">
        <div className="admin-header-top">
          <div className="admin-title-group">
            <div className="admin-emblem">🛡️</div>
            <div>
              <h1 className="admin-title">Incident Command Center</h1>
              <p className="admin-subtitle">
                Real-time incident dispatch, volunteer telemetry mesh, and user access management
              </p>
            </div>
          </div>
          <div className="admin-header-status">
            <span
              className={`admin-live-dot ${
                alerts.length > 0 ? "admin-live-dot--active" : ""
              }`}
            ></span>
            <span>{alerts.length > 0 ? "ACTIVE INCIDENT TRANSMITTING" : "ALL SYSTEMS NOMINAL"}</span>
          </div>
        </div>
      </div>

      {/* ===== KPI METRICS ROW ===== */}
      <div className="admin-stats-row">
        <div className={`admin-stat-card ${alerts.length > 0 ? "admin-stat-card--active" : ""}`}>
          <div className="admin-stat-icon admin-stat-icon--alerts">🚨</div>
          <div className="admin-stat-info">
            <div className="admin-stat-value">{alerts.length}</div>
            <div className="admin-stat-label">Active Alerts</div>
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon admin-stat-icon--volunteers">🟢</div>
          <div className="admin-stat-info">
            <div className="admin-stat-value">{onlineVolunteers.length}</div>
            <div className="admin-stat-label">Volunteers Online</div>
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon admin-stat-icon--users">👥</div>
          <div className="admin-stat-info">
            <div className="admin-stat-value">{totalUsers}</div>
            <div className="admin-stat-label">Total Registered Users</div>
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon admin-stat-icon--pending">📋</div>
          <div className="admin-stat-info">
            <div className="admin-stat-value">{pendingApps}</div>
            <div className="admin-stat-label">Pending Applications</div>
          </div>
        </div>
      </div>

      {/* ===== ACTIVE ALERTS + ONLINE VOLUNTEERS ===== */}
      <div className="dashboard-grid">
        {/* Active Alerts List */}
        <div className="card admin-section-card">
          <div className="admin-section-header">
            <div className="admin-header-title-flex">
              <span className="admin-icon">🚨</span>
              <h2>Active Alerts</h2>
            </div>
            <span className="admin-section-count">{alerts.length}</span>
          </div>
          <div className="admin-section-body scrollable-feed">
            {alerts.length === 0 ? (
              <div className="admin-empty-state">
                <span className="admin-empty-icon">✅</span>
                <p>No active alerts — safety perimeter clear</p>
              </div>
            ) : (
              alerts.map((alert) => {
                const sev = getAlertSeverity(alert);
                const sevLevel = sev?.severity;
                const sevStyle = sevLevel ? SEVERITY_COLORS[sevLevel] : null;
                return (
                  <div key={alert.id} className="vd-alert-card">
                    <div className="vd-alert-top">
                      <div className="vd-alert-left">
                        <span className="admin-alert-pulse"></span>
                        <div>
                          <div className="vd-alert-title">🚨 Emergency Incident</div>
                          <div className="vd-alert-meta">
                            {alert.notified} volunteer(s) dispatched · Lat {alert.lat?.toFixed(4)}, Lon {alert.lon?.toFixed(4)}
                          </div>
                        </div>
                      </div>
                      <div className="alert-meta-right">
                        {sevLevel && (
                          <div
                            className="vd-alert-severity"
                            style={{
                              background: sevStyle?.bg,
                              color: sevStyle?.color,
                              borderColor: sevStyle?.border,
                              animation: sevLevel === "critical" ? "pulse-red 1.5s infinite" : "none",
                            }}
                          >
                            {sevLevel === "critical" && "🔴 "}
                            {sevLevel === "high" && "🟠 "}
                            {sevLevel === "medium" && "🟡 "}
                            {sevLevel === "low" && "🟢 "}
                            {sevLevel.toUpperCase()}
                          </div>
                        )}
                        <span className="status-time">
                          {new Date(alert.time).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                    {sev && sev.emotion && (
                      <div className="vd-alert-ai-strip">
                        <span className="vd-ai-strip-emoji">{getEmotionIcon(sev.emotion)}</span>
                        <span className="vd-ai-strip-text">{sev.emotion?.toUpperCase()}</span>
                        <div className="vd-ai-strip-bar">
                          <div
                            className="vd-ai-strip-fill"
                            style={{
                              width: `${(sev.intensity * 100).toFixed(0)}%`,
                              background: sevStyle?.color || "#fff",
                            }}
                          />
                        </div>
                        <span className="vd-ai-strip-pct">{(sev.intensity * 100).toFixed(0)}%</span>
                        {sev.keyword_triggered && (
                          <span className="vd-ai-strip-kw" title="Threat keyword detected">⚠️ KEYWORD</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Online Volunteers List */}
        <div className="card admin-section-card">
          <div className="admin-section-header">
            <div className="admin-header-title-flex">
              <span className="admin-icon">🟢</span>
              <h2>Online Responders</h2>
            </div>
            <span className="admin-section-count admin-section-count--green">
              {onlineVolunteers.length}
            </span>
          </div>
          <div className="admin-section-body scrollable-feed">
            {onlineVolunteers.length === 0 ? (
              <div className="admin-empty-state">
                <span className="admin-empty-icon">📡</span>
                <p>No volunteers currently online in mesh network</p>
              </div>
            ) : (
              onlineVolunteers.map((v) => (
                <div key={v.socketId} className="admin-volunteer-item">
                  <div className="admin-vol-avatar">{v.name?.[0]?.toUpperCase() || "V"}</div>
                  <div className="admin-vol-info">
                    <div className="admin-vol-name">{v.name}</div>
                    <div className="admin-vol-status">
                      <span className="admin-online-dot"></span> Active in Standby Mesh
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ===== LIVE AI SENTIMENT MONITOR ===== */}
      {alerts.length > 0 && (
        <div className="card admin-ai-card">
          <div className="admin-ai-header">
            <div className="admin-ai-title-row">
              <span className="admin-ai-beacon"></span>
              <h2>🧠 LIVE AI VOCAL SENTIMENT MONITOR</h2>
            </div>
            <span className="status-badge status-badge--danger">ANALYZING AUDIO STREAM</span>
          </div>

          {liveAI ? (
            <div className="admin-ai-body">
              {/* Transcript */}
              <div className="admin-ai-transcript">
                <span className="admin-ai-mic">🎙️</span>
                <span className="admin-ai-text">"{liveAI.text}"</span>
              </div>

              {/* Emotion + Intensity */}
              <div className="admin-ai-emotion-row">
                <div className="admin-ai-emotion-badge">
                  <span className="admin-ai-emoji">{getEmotionIcon(liveAI.emotion)}</span>
                  <div>
                    <div className="admin-ai-emotion-label">{liveAI.emotion?.toUpperCase()}</div>
                    <div className="admin-ai-intensity-text">
                      {(liveAI.intensity * 100).toFixed(0)}% distress intensity
                      {liveAI.keyword_triggered && (
                        <span className="admin-ai-keyword-flag">⚠️ keyword detected</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="admin-ai-bar-track">
                  <div
                    className="admin-ai-bar-fill"
                    style={{
                      width: `${(liveAI.intensity * 100).toFixed(0)}%`,
                      background: SEVERITY_COLORS[liveAI.severity]?.color || "#fff",
                    }}
                  />
                </div>
              </div>

              {/* Severity */}
              <div
                className={`admin-ai-severity admin-ai-severity--${liveAI.severity}`}
                style={{
                  background: SEVERITY_COLORS[liveAI.severity]?.bg,
                  color: SEVERITY_COLORS[liveAI.severity]?.color,
                  borderColor: SEVERITY_COLORS[liveAI.severity]?.border,
                  animation: liveAI.severity === "critical" ? "pulse-red 1s infinite" : "none",
                }}
              >
                {liveAI.severity === "critical" && "🔴 "}
                {liveAI.severity === "high" && "🟠 "}
                {liveAI.severity === "medium" && "🟡 "}
                {liveAI.severity === "low" && "🟢 "}
                CLASSIFIED SEVERITY: {liveAI.severity?.toUpperCase()}
              </div>
            </div>
          ) : (
            <div className="admin-ai-waiting">
              <div className="admin-ai-waiting-pulse"></div>
              <p>Alert active — listening for real-time speech telemetry to analyze...</p>
            </div>
          )}
        </div>
      )}

      {/* ===== LIVE MAP CARD ===== */}
      <div className="card admin-map-card">
        <div className="admin-section-header">
          <div className="admin-header-title-flex">
            <span className="admin-icon">🗺️</span>
            <h2>Live Incident & Deployment Map</h2>
          </div>
          <div className="admin-map-legend">
            <span className="admin-legend-item">
              <span className="admin-legend-dot admin-legend-dot--red"></span>Active Incidents
            </span>
            <span className="admin-legend-item">
              <span className="admin-legend-dot admin-legend-dot--green"></span>Active Volunteers
            </span>
          </div>
        </div>
        <div id="liveMap" ref={mapRef} style={{ height: "400px", borderRadius: "14px" }}></div>
      </div>

      {/* ===== USER MANAGEMENT ===== */}
      <div className="card admin-users-card">
        <div className="admin-section-header">
          <div className="admin-header-title-flex">
            <span className="admin-icon">👥</span>
            <h2>User Management & Access Controls</h2>
          </div>
          <div className="admin-users-meta">
            <span className="admin-meta-chip">{totalUsers} Total</span>
            <span className="admin-meta-chip admin-meta-chip--blue">{volunteerCount} Volunteers</span>
            <span className="admin-meta-chip admin-meta-chip--red">{adminCount} Admins</span>
          </div>
        </div>

        <div className="admin-users-body">
          {usersLoading ? (
            <div className="admin-empty-state">
              <span className="admin-empty-icon">⏳</span>
              <p>Loading user database...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="admin-empty-state">
              <span className="admin-empty-icon">📭</span>
              <p>No registered users found</p>
            </div>
          ) : (
            <div className="admin-users-list">
              {users.map((u) => (
                <div key={u._id} className="admin-user-row">
                  <div className="admin-user-main">
                    <div className="admin-user-avatar">{u.name?.[0]?.toUpperCase() || "U"}</div>
                    <div className="admin-user-info">
                      <div className="admin-user-name">{u.name}</div>
                      <div className="admin-user-email">{u.email}</div>
                    </div>
                    <div className="admin-role-select-wrapper">
                      <label htmlFor={`role-${u._id}`} className="sr-only">Role</label>
                      <select
                        id={`role-${u._id}`}
                        value={u.role}
                        onChange={(e) => handleRoleChange(u._id, e.target.value)}
                        className={`role-select role-select--${u.role}`}
                      >
                        <option value="user">User</option>
                        <option value="volunteer">Volunteer</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                  </div>

                  {u.volunteerStatus === "pending" && u.volunteerApplication && (
                    <div className="admin-application-box">
                      <div className="admin-app-badge">📋 PENDING VOLUNTEER APPLICATION</div>
                      <div className="admin-app-grid">
                        <div className="admin-app-field">
                          <span>📍 City</span>
                          <strong>{u.volunteerApplication.city}</strong>
                        </div>
                        <div className="admin-app-field">
                          <span>🎂 Age</span>
                          <strong>{u.volunteerApplication.age || "—"}</strong>
                        </div>
                        <div className="admin-app-field">
                          <span>🕐 Availability</span>
                          <strong>{u.volunteerApplication.availability}</strong>
                        </div>
                        <div className="admin-app-field">
                          <span>🚗 Transport</span>
                          <strong>{u.volunteerApplication.transport}</strong>
                        </div>
                        <div className="admin-app-field">
                          <span>🗣️ Languages</span>
                          <strong>{u.volunteerApplication.languages || "—"}</strong>
                        </div>
                        <div className="admin-app-field">
                          <span>📞 Emergency Contact</span>
                          <strong>
                            {u.volunteerApplication.emergencyContactName} — {u.volunteerApplication.emergencyContactPhone}
                          </strong>
                        </div>
                      </div>
                      {u.volunteerApplication.idProof && (
                        <div className="admin-app-note">
                          <span>🆔 ID Reference:</span> {u.volunteerApplication.idProof}
                        </div>
                      )}
                      {u.volunteerApplication.note && (
                        <div className="admin-app-note">
                          <span>📝 Applicant Note:</span> {u.volunteerApplication.note}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
