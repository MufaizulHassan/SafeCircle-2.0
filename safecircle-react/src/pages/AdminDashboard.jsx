// import { useState, useEffect, useRef } from "react";
// import { useSelector } from "react-redux";
// import L from "leaflet";
// import "leaflet/dist/leaflet.css";
// import { socket } from "../socket";
// import { apiFetch } from "../api/fetch";

// export default function AdminDashboard() {
//   const { token } = useSelector((state) => state.auth);
//   const [alerts, setAlerts] = useState([]);
//   const [onlineVolunteers, setOnlineVolunteers] = useState([]);
//   const [users, setUsers] = useState([]);
//   const [usersLoading, setUsersLoading] = useState(true);
//   // liveAI — latest NLP result. Replaces on every new chunk, never stacks.
//   const [liveAI, setLiveAI] = useState(null);
//   // Track severity per victim for per-alert badges
//   const [alertSeverities, setAlertSeverities] = useState({});

//   const mapRef = useRef(null);
//   const mapInstance = useRef(null);
//   const alertMarkers = useRef({});
//   const volunteerMarkers = useRef({});

//   useEffect(() => {
//     if (mapInstance.current) return;
//     mapInstance.current = L.map(mapRef.current).setView([28.6139, 77.209], 11);
//     L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
//       attribution: "&copy; OpenStreetMap contributors",
//     }).addTo(mapInstance.current);
//     return () => {
//       mapInstance.current?.remove();
//       mapInstance.current = null;
//     };
//   }, []);

//   useEffect(() => {
//     socket.emit("admin-online");

//     socket.on("admin-new-alert", (data) => {
//       const id = Date.now();
//       setAlerts((prev) => [{ ...data, id }, ...prev]);
//       if (mapInstance.current) {
//         const marker = L.marker([data.lat, data.lon])
//           .addTo(mapInstance.current)
//           .bindPopup(`🚨 Alert — ${data.notified} notified`);
//         alertMarkers.current[id] = marker;
//         mapInstance.current.setView([data.lat, data.lon], 13);
//       }
//     });

//     socket.on("sos-severity-update", (data) => {
//       // Replace liveAI entirely — latest vocal replaces previous
//       setLiveAI({
//         text: data.text,
//         emotion: data.emotion,
//         intensity: data.intensity,
//         severity: data.severity,
//         keyword_triggered: data.keyword_triggered,
//       });
//       // Also store severity keyed by victimSocketId for per-alert badges
//       if (data.victimSocketId) {
//         setAlertSeverities((prev) => ({
//           ...prev,
//           [data.victimSocketId]: {
//             severity: data.severity,
//             emotion: data.emotion,
//             intensity: data.intensity,
//             keyword_triggered: data.keyword_triggered,
//           },
//         }));
//       }
//     });

//     socket.on("admin-emergency-ended", () => {
//       setAlerts([]);
//       setLiveAI(null); // clear monitor when emergency ends
//       setAlertSeverities({});
//       Object.values(alertMarkers.current).forEach((m) => mapInstance.current?.removeLayer(m));
//       alertMarkers.current = {};
//     });

//     socket.on("admin-volunteer-online", (data) => {
//       setOnlineVolunteers((prev) =>
//         prev.find((v) => v.socketId === data.socketId) ? prev : [...prev, data]
//       );
//       if (mapInstance.current && data.lat && data.lon) {
//         const marker = L.circleMarker([data.lat, data.lon], { color: "#22c55e", radius: 8 })
//           .addTo(mapInstance.current)
//           .bindPopup(data.name);
//         volunteerMarkers.current[data.socketId] = marker;
//       }
//     });

//     socket.on("admin-volunteer-offline", (data) => {
//       setOnlineVolunteers((prev) => prev.filter((v) => v.socketId !== data.socketId));
//       const marker = volunteerMarkers.current[data.socketId];
//       if (marker) {
//         mapInstance.current?.removeLayer(marker);
//         delete volunteerMarkers.current[data.socketId];
//       }
//     });

//     return () => {
//       socket.off("admin-new-alert");
//       socket.off("sos-severity-update");
//       socket.off("admin-emergency-ended");
//       socket.off("admin-volunteer-online");
//       socket.off("admin-volunteer-offline");
//     };
//   }, []);

//   useEffect(() => {
//     const loadUsers = async () => {
//       try {
//         const res = await apiFetch("/api/auth/users", { headers: { Authorization: `Bearer ${token}` } });
//         const data = await res.json();
//         if (data.success) setUsers(data.users);
//       } catch (err) {
//         console.warn("Failed to load users:", err);
//       } finally {
//         setUsersLoading(false);
//       }
//     };
//     if (token) loadUsers();
//   }, [token]);

//   const handleRoleChange = async (userId, newRole) => {
//     try {
//       await apiFetch(`/api/auth/users/${userId}/role`, {
//         method: "PUT",
//         headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
//         body: JSON.stringify({ role: newRole }),
//       });
//       setUsers((prev) => prev.map((u) => (u._id === userId ? { ...u, role: newRole } : u)));
//     } catch (err) {
//       console.warn("Role update failed:", err);
//     }
//   };

//   const SEVERITY_COLORS = {
//     low:      { bg: "rgba(34,197,94,0.12)",  color: "#4ade80", border: "#22c55e" },
//     medium:   { bg: "rgba(234,179,8,0.12)",  color: "#facc15", border: "#eab308" },
//     high:     { bg: "rgba(249,115,22,0.12)", color: "#fb923c", border: "#f97316" },
//     critical: { bg: "rgba(239,68,68,0.18)",  color: "#f87171", border: "#ef4444" },
//   };

//   const getEmotionIcon = (emotion) => {
//     switch (emotion) {
//       case "fear": return "😨";
//       case "anger": return "😡";
//       case "sadness": return "😢";
//       case "surprise": return "😲";
//       case "joy": return "😊";
//       default: return "❤️";
//     }
//   };

//   // Get severity for a specific alert — per-victim if available, fallback to global liveAI
//   const getAlertSeverity = (alert) => {
//     if (alert.victimSocketId && alertSeverities[alert.victimSocketId]) {
//       return alertSeverities[alert.victimSocketId];
//     }
//     return liveAI;
//   };

//   const totalUsers = users.length;
//   const volunteerCount = users.filter(u => u.role === "volunteer").length;
//   const adminCount = users.filter(u => u.role === "admin").length;
//   const pendingApps = users.filter(u => u.volunteerStatus === "pending").length;

//   return (
//     <div className="home-page admin-dashboard">

//       {/* ===== HEADER ===== */}
//       <div className="card admin-header-card">
//         <div className="admin-header-top">
//           <div>
//             <h1 className="admin-title">🛡️ Command Center</h1>
//             <p className="admin-subtitle">Real-time incident monitoring, volunteer coordination & user management</p>
//           </div>
//           <div className="admin-header-status">
//             <span className={`admin-live-dot ${alerts.length > 0 ? "admin-live-dot--active" : ""}`}></span>
//             {alerts.length > 0 ? "ACTIVE INCIDENT" : "ALL CLEAR"}
//           </div>
//         </div>
//       </div>

//       {/* ===== STAT CARDS ROW ===== */}
//       <div className="admin-stats-row">
//         <div className="admin-stat-card">
//           <div className="admin-stat-icon admin-stat-icon--alerts">🚨</div>
//           <div className="admin-stat-info">
//             <div className="admin-stat-value">{alerts.length}</div>
//             <div className="admin-stat-label">Active Alerts</div>
//           </div>
//         </div>
//         <div className="admin-stat-card">
//           <div className="admin-stat-icon admin-stat-icon--volunteers">🟢</div>
//           <div className="admin-stat-info">
//             <div className="admin-stat-value">{onlineVolunteers.length}</div>
//             <div className="admin-stat-label">Volunteers Online</div>
//           </div>
//         </div>
//         <div className="admin-stat-card">
//           <div className="admin-stat-icon admin-stat-icon--users">👥</div>
//           <div className="admin-stat-info">
//             <div className="admin-stat-value">{totalUsers}</div>
//             <div className="admin-stat-label">Total Users</div>
//           </div>
//         </div>
//         <div className="admin-stat-card">
//           <div className="admin-stat-icon admin-stat-icon--pending">📋</div>
//           <div className="admin-stat-info">
//             <div className="admin-stat-value">{pendingApps}</div>
//             <div className="admin-stat-label">Pending Apps</div>
//           </div>
//         </div>
//       </div>

//       {/* ===== ACTIVE ALERTS + ONLINE VOLUNTEERS ===== */}
//       <div className="dashboard-grid">
//         <div className="card admin-section-card">
//           <div className="admin-section-header">
//             <h2>🚨 Active Alerts</h2>
//             <span className="admin-section-count">{alerts.length}</span>
//           </div>
//           <div className="admin-section-body scrollable-feed">
//             {alerts.length === 0 ? (
//               <div className="admin-empty-state">
//                 <span className="admin-empty-icon">✅</span>
//                 <p>No active alerts — all clear</p>
//               </div>
//             ) : (
//               alerts.map((alert) => {
//                 const sev = getAlertSeverity(alert);
//                 const sevLevel = sev?.severity;
//                 const sevStyle = sevLevel ? SEVERITY_COLORS[sevLevel] : null;
//                 return (
//                   <div key={alert.id} className="vd-alert-card">
//                     <div className="vd-alert-top">
//                       <div className="vd-alert-left">
//                         <span className="admin-alert-pulse"></span>
//                         <div>
//                           <div className="vd-alert-title">🚨 Emergency Alert</div>
//                           <div className="vd-alert-meta">
//                             {alert.notified} volunteer(s) notified · Lat {alert.lat?.toFixed(4)}, Lon {alert.lon?.toFixed(4)}
//                           </div>
//                         </div>
//                       </div>
//                       <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
//                         {sevLevel && (
//                           <div
//                             className="vd-alert-severity"
//                             style={{
//                               background: sevStyle?.bg,
//                               color: sevStyle?.color,
//                               borderColor: sevStyle?.border,
//                               animation: sevLevel === "critical" ? "pulse-red 1.5s infinite" : "none",
//                             }}
//                           >
//                             {sevLevel === "critical" && "🔴 "}
//                             {sevLevel === "high" && "🟠 "}
//                             {sevLevel === "medium" && "🟡 "}
//                             {sevLevel === "low" && "🟢 "}
//                             {sevLevel.toUpperCase()}
//                           </div>
//                         )}
//                         <span className="status-time">{new Date(alert.time).toLocaleTimeString()}</span>
//                       </div>
//                     </div>
//                     {sev && sev.emotion && (
//                       <div className="vd-alert-ai-strip">
//                         <span className="vd-ai-strip-emoji">{getEmotionIcon(sev.emotion)}</span>
//                         <span className="vd-ai-strip-text">{sev.emotion?.toUpperCase()}</span>
//                         <div className="vd-ai-strip-bar">
//                           <div
//                             className="vd-ai-strip-fill"
//                             style={{
//                               width: `${(sev.intensity * 100).toFixed(0)}%`,
//                               background: sevStyle?.color || "#fff",
//                             }}
//                           />
//                         </div>
//                         <span className="vd-ai-strip-pct">{(sev.intensity * 100).toFixed(0)}%</span>
//                         {sev.keyword_triggered && <span className="vd-ai-strip-kw">⚠️</span>}
//                       </div>
//                     )}
//                   </div>
//                 );
//               })
//             )}
//           </div>
//         </div>

//         <div className="card admin-section-card">
//           <div className="admin-section-header">
//             <h2>🟢 Online Volunteers</h2>
//             <span className="admin-section-count admin-section-count--green">{onlineVolunteers.length}</span>
//           </div>
//           <div className="admin-section-body scrollable-feed">
//             {onlineVolunteers.length === 0 ? (
//               <div className="admin-empty-state">
//                 <span className="admin-empty-icon">📡</span>
//                 <p>No volunteers online right now</p>
//               </div>
//             ) : (
//               onlineVolunteers.map((v) => (
//                 <div key={v.socketId} className="admin-volunteer-item">
//                   <div className="admin-vol-avatar">{v.name?.[0]?.toUpperCase() || "V"}</div>
//                   <div className="admin-vol-info">
//                     <div className="admin-vol-name">{v.name}</div>
//                     <div className="admin-vol-status">
//                       <span className="admin-online-dot"></span> Connected
//                     </div>
//                   </div>
//                 </div>
//               ))
//             )}
//           </div>
//         </div>
//       </div>

//       {/* ===== LIVE AI MONITOR — only when an alert is active ===== */}
//       {alerts.length > 0 && (
//         <div className="card admin-ai-card">
//           <div className="admin-ai-header">
//             <div className="admin-ai-title-row">
//               <span className="admin-ai-beacon"></span>
//               <h2>🧠 LIVE AI MONITOR</h2>
//             </div>
//             <span className="status-badge status-badge--danger">ANALYZING</span>
//           </div>

//           {liveAI ? (
//             <div className="admin-ai-body">
//               {/* Transcript */}
//               <div className="admin-ai-transcript">
//                 <span className="admin-ai-mic">🎙️</span>
//                 <span className="admin-ai-text">"{liveAI.text}"</span>
//               </div>

//               {/* Emotion + Intensity */}
//               <div className="admin-ai-emotion-row">
//                 <div className="admin-ai-emotion-badge">
//                   <span className="admin-ai-emoji">{getEmotionIcon(liveAI.emotion)}</span>
//                   <div>
//                     <div className="admin-ai-emotion-label">{liveAI.emotion?.toUpperCase()}</div>
//                     <div className="admin-ai-intensity-text">
//                       {(liveAI.intensity * 100).toFixed(0)}% intensity
//                       {liveAI.keyword_triggered && <span className="admin-ai-keyword-flag">⚠️ keyword detected</span>}
//                     </div>
//                   </div>
//                 </div>
//                 <div className="admin-ai-bar-track">
//                   <div
//                     className="admin-ai-bar-fill"
//                     style={{
//                       width: `${(liveAI.intensity * 100).toFixed(0)}%`,
//                       background: SEVERITY_COLORS[liveAI.severity]?.color || "#fff",
//                     }}
//                   />
//                 </div>
//               </div>

//               {/* Severity */}
//               <div
//                 className={`admin-ai-severity admin-ai-severity--${liveAI.severity}`}
//                 style={{
//                   background: SEVERITY_COLORS[liveAI.severity]?.bg,
//                   color: SEVERITY_COLORS[liveAI.severity]?.color,
//                   borderColor: SEVERITY_COLORS[liveAI.severity]?.border,
//                   animation: liveAI.severity === "critical" ? "pulse-red 1s infinite" : "none",
//                 }}
//               >
//                 {liveAI.severity === "critical" && "🔴 "}
//                 {liveAI.severity === "high" && "🟠 "}
//                 {liveAI.severity === "medium" && "🟡 "}
//                 {liveAI.severity === "low" && "🟢 "}
//                 SEVERITY: {liveAI.severity?.toUpperCase()}
//               </div>
//             </div>
//           ) : (
//             <div className="admin-ai-waiting">
//               <div className="admin-ai-waiting-pulse"></div>
//               <p>Alert active — waiting for victim speech to analyze...</p>
//             </div>
//           )}
//         </div>
//       )}

//       {/* ===== LIVE MAP ===== */}
//       <div className="card admin-map-card">
//         <div className="admin-section-header">
//           <h2>🗺️ Live Incident Map</h2>
//           <div className="admin-map-legend">
//             <span className="admin-legend-item"><span className="admin-legend-dot admin-legend-dot--red"></span>Alerts</span>
//             <span className="admin-legend-item"><span className="admin-legend-dot admin-legend-dot--green"></span>Volunteers</span>
//           </div>
//         </div>
//         <div id="liveMap" ref={mapRef}></div>
//       </div>

//       {/* ===== USER MANAGEMENT ===== */}
//       <div className="card admin-users-card">
//         <div className="admin-section-header">
//           <h2>👥 User Management</h2>
//           <div className="admin-users-meta">
//             <span className="admin-meta-chip">{totalUsers} total</span>
//             <span className="admin-meta-chip admin-meta-chip--blue">{volunteerCount} volunteers</span>
//             <span className="admin-meta-chip admin-meta-chip--red">{adminCount} admins</span>
//           </div>
//         </div>
//         <div className="admin-users-body">
//           {usersLoading ? (
//             <div className="admin-empty-state">
//               <span className="admin-empty-icon">⏳</span>
//               <p>Loading users...</p>
//             </div>
//           ) : users.length === 0 ? (
//             <div className="admin-empty-state">
//               <span className="admin-empty-icon">📭</span>
//               <p>No registered users yet</p>
//             </div>
//           ) : (
//             <div className="admin-users-list">
//               {users.map((u) => (
//                 <div key={u._id} className="admin-user-row">
//                   <div className="admin-user-main">
//                     <div className="admin-user-avatar">{u.name?.[0]?.toUpperCase() || "U"}</div>
//                     <div className="admin-user-info">
//                       <div className="admin-user-name">{u.name}</div>
//                       <div className="admin-user-email">{u.email}</div>
//                     </div>
//                     <select value={u.role} onChange={(e) => handleRoleChange(u._id, e.target.value)} className="role-select">
//                       <option value="user">user</option>
//                       <option value="volunteer">volunteer</option>
//                       <option value="admin">admin</option>
//                     </select>
//                   </div>
//                   {u.volunteerStatus === "pending" && u.volunteerApplication && (
//                     <div className="admin-application-box">
//                       <div className="admin-app-badge">📋 PENDING APPLICATION</div>
//                       <div className="admin-app-grid">
//                         <div className="admin-app-field"><span>📍 City</span><strong>{u.volunteerApplication.city}</strong></div>
//                         <div className="admin-app-field"><span>🎂 Age</span><strong>{u.volunteerApplication.age || "—"}</strong></div>
//                         <div className="admin-app-field"><span>🕐 Availability</span><strong>{u.volunteerApplication.availability}</strong></div>
//                         <div className="admin-app-field"><span>🚗 Transport</span><strong>{u.volunteerApplication.transport}</strong></div>
//                         <div className="admin-app-field"><span>🗣️ Languages</span><strong>{u.volunteerApplication.languages || "—"}</strong></div>
//                         <div className="admin-app-field"><span>📞 Emergency</span><strong>{u.volunteerApplication.emergencyContactName} — {u.volunteerApplication.emergencyContactPhone}</strong></div>
//                       </div>
//                       {u.volunteerApplication.idProof && <div className="admin-app-note">🆔 ID: {u.volunteerApplication.idProof}</div>}
//                       {u.volunteerApplication.note && <div className="admin-app-note">📝 Note: {u.volunteerApplication.note}</div>}
//                     </div>
//                   )}
//                 </div>
//               ))}
//             </div>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }



import { useState, useEffect, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { socket } from "../socket";
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
  // ===== LIVE STATE NOW LIVES IN REDUX =====
  // Same fix as VolunteerDashboard — this used to be useState, which
  // reset to empty every time you navigated away and back. Redux state
  // lives outside the component tree and survives that.
  const { alerts, onlineVolunteers, liveAI, alertSeverities } = useSelector((state) => state.adminLive);
  // users/usersLoading stay local — they're refetched from the DB fresh
  // on every mount anyway, so there's nothing "live" to lose here.
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

    // Redraw markers from Redux — the map itself is a fresh Leaflet
    // instance every mount (it's tied to a DOM node that got destroyed),
    // but the underlying alert/volunteer data survived in Redux, so we
    // just need to re-paint it onto the new map.
    alerts.forEach((data) => {
      if (data.lat && data.lon) {
        const marker = L.marker([data.lat, data.lon])
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
    socket.emit("admin-online");

    socket.on("admin-new-alert", (data) => {
      const id = Date.now();
      dispatch(addAlert({ ...data, id }));
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
      dispatch(
        setLiveAI({
          text: data.text,
          emotion: data.emotion,
          intensity: data.intensity,
          severity: data.severity,
          keyword_triggered: data.keyword_triggered,
        })
      );
      // Also store severity keyed by victimSocketId for per-alert badges
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
        const res = await apiFetch("/api/auth/users", { headers: { Authorization: `Bearer ${token}` } });
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
    low:      { bg: "rgba(34,197,94,0.12)",  color: "#4ade80", border: "#22c55e" },
    medium:   { bg: "rgba(234,179,8,0.12)",  color: "#facc15", border: "#eab308" },
    high:     { bg: "rgba(249,115,22,0.12)", color: "#fb923c", border: "#f97316" },
    critical: { bg: "rgba(239,68,68,0.18)",  color: "#f87171", border: "#ef4444" },
  };

  const getEmotionIcon = (emotion) => {
    switch (emotion) {
      case "fear": return "😨";
      case "anger": return "😡";
      case "sadness": return "😢";
      case "surprise": return "😲";
      case "joy": return "😊";
      default: return "❤️";
    }
  };

  // Get severity for a specific alert — per-victim if available, fallback to global liveAI
  const getAlertSeverity = (alert) => {
    if (alert.victimSocketId && alertSeverities[alert.victimSocketId]) {
      return alertSeverities[alert.victimSocketId];
    }
    return liveAI;
  };

  const totalUsers = users.length;
  const volunteerCount = users.filter(u => u.role === "volunteer").length;
  const adminCount = users.filter(u => u.role === "admin").length;
  const pendingApps = users.filter(u => u.volunteerStatus === "pending").length;

  return (
    <div className="home-page admin-dashboard">

      {/* ===== HEADER ===== */}
      <div className="card admin-header-card">
        <div className="admin-header-top">
          <div>
            <h1 className="admin-title">🛡️ Command Center</h1>
            <p className="admin-subtitle">Real-time incident monitoring, volunteer coordination & user management</p>
          </div>
          <div className="admin-header-status">
            <span className={`admin-live-dot ${alerts.length > 0 ? "admin-live-dot--active" : ""}`}></span>
            {alerts.length > 0 ? "ACTIVE INCIDENT" : "ALL CLEAR"}
          </div>
        </div>
      </div>

      {/* ===== STAT CARDS ROW ===== */}
      <div className="admin-stats-row">
        <div className="admin-stat-card">
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
            <div className="admin-stat-label">Total Users</div>
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon admin-stat-icon--pending">📋</div>
          <div className="admin-stat-info">
            <div className="admin-stat-value">{pendingApps}</div>
            <div className="admin-stat-label">Pending Apps</div>
          </div>
        </div>
      </div>

      {/* ===== ACTIVE ALERTS + ONLINE VOLUNTEERS ===== */}
      <div className="dashboard-grid">
        <div className="card admin-section-card">
          <div className="admin-section-header">
            <h2>🚨 Active Alerts</h2>
            <span className="admin-section-count">{alerts.length}</span>
          </div>
          <div className="admin-section-body scrollable-feed">
            {alerts.length === 0 ? (
              <div className="admin-empty-state">
                <span className="admin-empty-icon">✅</span>
                <p>No active alerts — all clear</p>
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
                          <div className="vd-alert-title">🚨 Emergency Alert</div>
                          <div className="vd-alert-meta">
                            {alert.notified} volunteer(s) notified · Lat {alert.lat?.toFixed(4)}, Lon {alert.lon?.toFixed(4)}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
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
                        <span className="status-time">{new Date(alert.time).toLocaleTimeString()}</span>
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
                        {sev.keyword_triggered && <span className="vd-ai-strip-kw">⚠️</span>}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="card admin-section-card">
          <div className="admin-section-header">
            <h2>🟢 Online Volunteers</h2>
            <span className="admin-section-count admin-section-count--green">{onlineVolunteers.length}</span>
          </div>
          <div className="admin-section-body scrollable-feed">
            {onlineVolunteers.length === 0 ? (
              <div className="admin-empty-state">
                <span className="admin-empty-icon">📡</span>
                <p>No volunteers online right now</p>
              </div>
            ) : (
              onlineVolunteers.map((v) => (
                <div key={v.socketId} className="admin-volunteer-item">
                  <div className="admin-vol-avatar">{v.name?.[0]?.toUpperCase() || "V"}</div>
                  <div className="admin-vol-info">
                    <div className="admin-vol-name">{v.name}</div>
                    <div className="admin-vol-status">
                      <span className="admin-online-dot"></span> Connected
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ===== LIVE AI MONITOR — only when an alert is active ===== */}
      {alerts.length > 0 && (
        <div className="card admin-ai-card">
          <div className="admin-ai-header">
            <div className="admin-ai-title-row">
              <span className="admin-ai-beacon"></span>
              <h2>🧠 LIVE AI MONITOR</h2>
            </div>
            <span className="status-badge status-badge--danger">ANALYZING</span>
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
                      {(liveAI.intensity * 100).toFixed(0)}% intensity
                      {liveAI.keyword_triggered && <span className="admin-ai-keyword-flag">⚠️ keyword detected</span>}
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
                SEVERITY: {liveAI.severity?.toUpperCase()}
              </div>
            </div>
          ) : (
            <div className="admin-ai-waiting">
              <div className="admin-ai-waiting-pulse"></div>
              <p>Alert active — waiting for victim speech to analyze...</p>
            </div>
          )}
        </div>
      )}

      {/* ===== LIVE MAP ===== */}
      <div className="card admin-map-card">
        <div className="admin-section-header">
          <h2>🗺️ Live Incident Map</h2>
          <div className="admin-map-legend">
            <span className="admin-legend-item"><span className="admin-legend-dot admin-legend-dot--red"></span>Alerts</span>
            <span className="admin-legend-item"><span className="admin-legend-dot admin-legend-dot--green"></span>Volunteers</span>
          </div>
        </div>
        <div id="liveMap" ref={mapRef}></div>
      </div>

      {/* ===== USER MANAGEMENT ===== */}
      <div className="card admin-users-card">
        <div className="admin-section-header">
          <h2>👥 User Management</h2>
          <div className="admin-users-meta">
            <span className="admin-meta-chip">{totalUsers} total</span>
            <span className="admin-meta-chip admin-meta-chip--blue">{volunteerCount} volunteers</span>
            <span className="admin-meta-chip admin-meta-chip--red">{adminCount} admins</span>
          </div>
        </div>
        <div className="admin-users-body">
          {usersLoading ? (
            <div className="admin-empty-state">
              <span className="admin-empty-icon">⏳</span>
              <p>Loading users...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="admin-empty-state">
              <span className="admin-empty-icon">📭</span>
              <p>No registered users yet</p>
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
                    <select value={u.role} onChange={(e) => handleRoleChange(u._id, e.target.value)} className="role-select">
                      <option value="user">user</option>
                      <option value="volunteer">volunteer</option>
                      <option value="admin">admin</option>
                    </select>
                  </div>
                  {u.volunteerStatus === "pending" && u.volunteerApplication && (
                    <div className="admin-application-box">
                      <div className="admin-app-badge">📋 PENDING APPLICATION</div>
                      <div className="admin-app-grid">
                        <div className="admin-app-field"><span>📍 City</span><strong>{u.volunteerApplication.city}</strong></div>
                        <div className="admin-app-field"><span>🎂 Age</span><strong>{u.volunteerApplication.age || "—"}</strong></div>
                        <div className="admin-app-field"><span>🕐 Availability</span><strong>{u.volunteerApplication.availability}</strong></div>
                        <div className="admin-app-field"><span>🚗 Transport</span><strong>{u.volunteerApplication.transport}</strong></div>
                        <div className="admin-app-field"><span>🗣️ Languages</span><strong>{u.volunteerApplication.languages || "—"}</strong></div>
                        <div className="admin-app-field"><span>📞 Emergency</span><strong>{u.volunteerApplication.emergencyContactName} — {u.volunteerApplication.emergencyContactPhone}</strong></div>
                      </div>
                      {u.volunteerApplication.idProof && <div className="admin-app-note">🆔 ID: {u.volunteerApplication.idProof}</div>}
                      {u.volunteerApplication.note && <div className="admin-app-note">📝 Note: {u.volunteerApplication.note}</div>}
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
