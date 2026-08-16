// import { useState, useEffect, useRef } from "react";
// import L from "leaflet";
// import "leaflet/dist/leaflet.css";
// import { socket } from "../socket";
// import { apiFetch } from "../api/fetch";

// function haversineKm(lat1, lon1, lat2, lon2) {
//   const toRad = (d) => (d * Math.PI) / 180;
//   const R = 6371;
//   const dLat = toRad(lat2 - lat1);
//   const dLon = toRad(lon2 - lon1);
//   const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
//   return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
// }

// export default function VolunteerDashboard() {
//   const [isOnline, setIsOnline] = useState(false);
//   const [volunteerName, setVolunteerName] = useState("");
//   const [activityLog, setActivityLog] = useState([]);
//   const [liveAlerts, setLiveAlerts] = useState([]);
//   const [activeDistance, setActiveDistance] = useState(null);
//   // liveAI â€” latest NLP result. Replaces on every new chunk, never stacks.
//   // Only shown when an active alert exists.
//   const [liveAI, setLiveAI] = useState(null);
//   // Track severity per victim for per-alert badges
//   const [alertSeverities, setAlertSeverities] = useState({});

//   const userLocation = useRef({ lat: null, lon: null });
//   const victimSocketId = useRef(null);
//   const liveUpdateInterval = useRef(null);

//   const mapRef = useRef(null);
//   const mapInstance = useRef(null);
//   const userMarker = useRef(null);
//   const victimMarker = useRef(null);
//   const routeLine = useRef(null);

//   const addLog = (message) => {
//     const time = new Date().toLocaleTimeString();
//     setActivityLog((prev) => [{ message, time }, ...prev]);
//   };

//   const drawRoute = async (victimLat, victimLon) => {
//     if (!mapInstance.current || !userLocation.current.lat) return;
//     try {
//       const res = await apiFetch("/api/route", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           lat1: userLocation.current.lat,
//           lon1: userLocation.current.lon,
//           lat2: victimLat,
//           lon2: victimLon,
//         }),
//       });
//       const routeData = await res.json();
//       if (routeData.route) {
//         if (routeLine.current) mapInstance.current.removeLayer(routeLine.current);
//         routeLine.current = L.polyline(routeData.route, { color: "#ef4444", weight: 4 }).addTo(mapInstance.current);
//         mapInstance.current.fitBounds(routeLine.current.getBounds());
//       }
//     } catch (err) {
//       console.warn("Route fetch failed:", err);
//     }
//   };

//   useEffect(() => {
//     if (mapInstance.current) return;
//     mapInstance.current = L.map(mapRef.current).setView([28.6139, 77.209], 12);
//     L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
//       attribution: "&copy; OpenStreetMap contributors",
//     }).addTo(mapInstance.current);
//     return () => {
//       mapInstance.current?.remove();
//       mapInstance.current = null;
//     };
//   }, []);

//   useEffect(() => {
//     if (!navigator.geolocation) return;
//     const watchId = navigator.geolocation.watchPosition(
//       (pos) => {
//         const { latitude, longitude } = pos.coords;
//         userLocation.current = { lat: latitude, lon: longitude };
//         if (mapInstance.current) {
//           if (!userMarker.current) {
//             userMarker.current = L.marker([latitude, longitude]).addTo(mapInstance.current).bindPopup("Your Location");
//             mapInstance.current.setView([latitude, longitude], 14);
//           } else {
//             userMarker.current.setLatLng([latitude, longitude]);
//           }
//         }
//       },
//       (err) => console.warn("Location error:", err),
//       { enableHighAccuracy: true }
//     );
//     return () => navigator.geolocation.clearWatch(watchId);
//   }, []);

//   useEffect(() => {
//     addLog("Connected to SafeCircle server");

//     socket.on("incoming-alert", (data) => {
//       setLiveAlerts((prev) => [{ ...data, id: Date.now() }, ...prev]);
//       addLog(`ðŸš¨ New alert received â€” ${data.distance} km away`);
//     });

//     socket.on("sos-severity-update", (data) => {
//       // Replace the liveAI state entirely â€” latest vocal replaces previous
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
//       addLog(`ðŸ§  AI: ${data.emotion?.toUpperCase()} â€” ${data.severity?.toUpperCase()}`);
//     });

//     socket.on("victim-location-update", (data) => {
//       if (victimMarker.current) {
//         victimMarker.current.setLatLng([data.lat, data.lon]);
//       }
//       drawRoute(data.lat, data.lon);
//       if (userLocation.current.lat) {
//         setActiveDistance(haversineKm(data.lat, data.lon, userLocation.current.lat, userLocation.current.lon).toFixed(2));
//       }
//       addLog("ðŸ“ Victim location updated");
//     });

//     socket.on("admin-emergency-ended", () => {
//       setLiveAlerts([]);
//       setActiveDistance(null);
//       setLiveAI(null); // clear monitor when emergency ends
//       setAlertSeverities({});
//       victimSocketId.current = null;
//       clearInterval(liveUpdateInterval.current);
//       liveUpdateInterval.current = null;
//     });

//     return () => {
//       socket.off("incoming-alert");
//       socket.off("sos-severity-update");
//       socket.off("victim-location-update");
//       socket.off("admin-emergency-ended");
//       if (liveUpdateInterval.current) clearInterval(liveUpdateInterval.current);
//     };
//   }, []);

//   const goOnline = () => {
//     if (!volunteerName.trim()) { alert("Please enter your name first."); return; }
//     if (!userLocation.current.lat) { alert("Waiting for your location, try again in a moment."); return; }
//     setIsOnline(true);
//     socket.emit("volunteer-online", { name: volunteerName, lat: userLocation.current.lat, lon: userLocation.current.lon });
//     addLog(`âœ… You are now online as "${volunteerName}"`);
//   };

//   const goOffline = () => {
//     setIsOnline(false);
//     socket.emit("volunteer-offline");
//     addLog("ðŸ”´ You are now offline");
//   };

//   const acceptAlert = async (alert) => {
//     victimSocketId.current = alert.victimSocketId;
//     socket.emit("volunteer-responding", {
//       victimSocketId: alert.victimSocketId,
//       volunteerName,
//       lat: userLocation.current.lat,
//       lon: userLocation.current.lon,
//     });
//     addLog(`ðŸ™‹ You accepted an alert ${alert.distance} km away`);
//     setLiveAlerts((prev) => prev.filter((a) => a.id !== alert.id));
//     setActiveDistance(alert.distance);

//     if (mapInstance.current && alert.lat && alert.lon) {
//       if (victimMarker.current) mapInstance.current.removeLayer(victimMarker.current);
//       victimMarker.current = L.marker([alert.lat, alert.lon]).addTo(mapInstance.current).bindPopup("ðŸš¨ Victim location");
//       await drawRoute(alert.lat, alert.lon);
//       addLog("ðŸ—ºï¸ Shortest route calculated to victim");
//     }

//     if (liveUpdateInterval.current) clearInterval(liveUpdateInterval.current);
//     liveUpdateInterval.current = setInterval(() => {
//       if (victimSocketId.current && userLocation.current.lat) {
//         socket.emit("volunteer-location-update", {
//           victimSocketId: victimSocketId.current,
//           lat: userLocation.current.lat,
//           lon: userLocation.current.lon,
//         });
//       }
//     }, 8000);
//   };

//   const SEVERITY_COLORS = {
//     low:      { bg: "rgba(34,197,94,0.12)",  color: "#4ade80", border: "#22c55e" },
//     medium:   { bg: "rgba(234,179,8,0.12)",  color: "#facc15", border: "#eab308" },
//     high:     { bg: "rgba(249,115,22,0.12)", color: "#fb923c", border: "#f97316" },
//     critical: { bg: "rgba(239,68,68,0.18)",  color: "#f87171", border: "#ef4444" },
//   };

//   const getEmotionIcon = (emotion) => {
//     switch (emotion) {
//       case "fear": return "ðŸ˜¨";
//       case "anger": return "ðŸ˜¡";
//       case "sadness": return "ðŸ˜¢";
//       case "surprise": return "ðŸ˜²";
//       case "joy": return "ðŸ˜Š";
//       default: return "â¤ï¸";
//     }
//   };

//   // Get severity for a specific alert â€” per-victim if available, fallback to global liveAI
//   const getAlertSeverity = (alert) => {
//     if (alert.victimSocketId && alertSeverities[alert.victimSocketId]) {
//       return alertSeverities[alert.victimSocketId];
//     }
//     return liveAI;
//   };

//   const getSeverityLabel = (sev) => {
//     if (!sev) return null;
//     return sev.severity;
//   };

//   return (
//     <div className="home-page vd-page">

//       {/* ===== HEADER CARD ===== */}
//       <div className="card vd-header-card">
//         <div className="vd-header-top">
//           <div className="vd-header-left">
//             <div className="vd-header-icon">
//               {isOnline ? "ðŸŸ¢" : "ðŸ”´"}
//             </div>
//             <div>
//               <h1 className="vd-title">Volunteer Dashboard</h1>
//               <p className="vd-subtitle">
//                 {isOnline
//                   ? `Online as ${volunteerName} â€” receiving emergency alerts`
//                   : "Go online to start receiving emergency alerts near you"}
//               </p>
//             </div>
//           </div>
//           <div className={`vd-status-pill ${isOnline ? "vd-status-pill--online" : "vd-status-pill--offline"}`}>
//             <span className="vd-status-dot"></span>
//             {isOnline ? "ONLINE" : "OFFLINE"}
//           </div>
//         </div>

//         {/* Setup section */}
//         <div className="vd-setup-section">
//           <div className="vd-name-row">
//             <div className="vd-input-group">
//               <label className="vd-label">Your Name</label>
//               <input
//                 className="vd-input"
//                 value={volunteerName}
//                 onChange={(e) => setVolunteerName(e.target.value)}
//                 placeholder="Enter your name to go online"
//                 disabled={isOnline}
//               />
//             </div>
//             {isOnline ? (
//               <button className="go-offline-btn vd-toggle-btn" onClick={goOffline}>ðŸ”´ Go Offline</button>
//             ) : (
//               <button className="go-online-btn vd-toggle-btn" onClick={goOnline}>ðŸŸ¢ Go Online</button>
//             )}
//           </div>
//         </div>

//         {/* Active mission distance */}
//         {activeDistance !== null && (
//           <div className="vd-active-mission">
//             <span className="vd-mission-pulse"></span>
//             <div className="vd-mission-info">
//               <span className="vd-mission-label">ACTIVE MISSION</span>
//               <span className="vd-mission-distance">
//                 ðŸ“ Victim is <strong>{activeDistance} km</strong> away â€” updating live
//               </span>
//             </div>
//           </div>
//         )}
//       </div>

//       {/* ===== STAT CARDS ===== */}
//       <div className="vd-stats-row">
//         <div className="admin-stat-card">
//           <div className="admin-stat-icon admin-stat-icon--alerts">ðŸš¨</div>
//           <div className="admin-stat-info">
//             <div className="admin-stat-value">{liveAlerts.length}</div>
//             <div className="admin-stat-label">Incoming Alerts</div>
//           </div>
//         </div>
//         <div className="admin-stat-card">
//           <div className="admin-stat-icon admin-stat-icon--volunteers">ðŸ“‹</div>
//           <div className="admin-stat-info">
//             <div className="admin-stat-value">{activityLog.length}</div>
//             <div className="admin-stat-label">Events Logged</div>
//           </div>
//         </div>
//         <div className="admin-stat-card">
//           <div className="admin-stat-icon admin-stat-icon--users">ðŸ“</div>
//           <div className="admin-stat-info">
//             <div className="admin-stat-value">{activeDistance ? `${activeDistance}km` : "â€”"}</div>
//             <div className="admin-stat-label">Distance to Victim</div>
//           </div>
//         </div>
//       </div>

//       {/* ===== LIVE AI MONITOR â€” only when an alert is active ===== */}
//       {(liveAlerts.length > 0 || activeDistance !== null) && liveAI && (
//         <div className="card admin-ai-card">
//           <div className="admin-ai-header">
//             <div className="admin-ai-title-row">
//               <span className="admin-ai-beacon"></span>
//               <h2>ðŸ§  LIVE AI MONITOR</h2>
//             </div>
//             <span className="status-badge status-badge--danger">ANALYZING</span>
//           </div>

//           <div className="admin-ai-body">
//             {/* Transcript */}
//             <div className="admin-ai-transcript">
//               <span className="admin-ai-mic">ðŸŽ™ï¸</span>
//               <span className="admin-ai-text">"{liveAI.text}"</span>
//             </div>

//             {/* Emotion + Intensity */}
//             <div className="admin-ai-emotion-row">
//               <div className="admin-ai-emotion-badge">
//                 <span className="admin-ai-emoji">{getEmotionIcon(liveAI.emotion)}</span>
//                 <div>
//                   <div className="admin-ai-emotion-label">{liveAI.emotion?.toUpperCase()}</div>
//                   <div className="admin-ai-intensity-text">
//                     {(liveAI.intensity * 100).toFixed(0)}% intensity
//                     {liveAI.keyword_triggered && <span className="admin-ai-keyword-flag">âš ï¸ keyword detected</span>}
//                   </div>
//                 </div>
//               </div>
//               <div className="admin-ai-bar-track">
//                 <div
//                   className="admin-ai-bar-fill"
//                   style={{
//                     width: `${(liveAI.intensity * 100).toFixed(0)}%`,
//                     background: SEVERITY_COLORS[liveAI.severity]?.color || "#fff",
//                   }}
//                 />
//               </div>
//             </div>

//             {/* Severity */}
//             <div
//               className="admin-ai-severity"
//               style={{
//                 background: SEVERITY_COLORS[liveAI.severity]?.bg,
//                 color: SEVERITY_COLORS[liveAI.severity]?.color,
//                 borderColor: SEVERITY_COLORS[liveAI.severity]?.border,
//                 animation: liveAI.severity === "critical" ? "pulse-red 1s infinite" : "none",
//               }}
//             >
//               {liveAI.severity === "critical" && "ðŸ”´ "}
//               {liveAI.severity === "high" && "ðŸŸ  "}
//               {liveAI.severity === "medium" && "ðŸŸ¡ "}
//               {liveAI.severity === "low" && "ðŸŸ¢ "}
//               SEVERITY: {liveAI.severity?.toUpperCase()}
//             </div>
//           </div>
//         </div>
//       )}

//       {/* ===== ALERTS + ACTIVITY LOG ===== */}
//       <div className="dashboard-grid">

//         {/* Live Alerts */}
//         <div className="card admin-section-card">
//           <div className="admin-section-header">
//             <h2>ðŸš¨ Incoming Alerts</h2>
//             <span className="admin-section-count">{liveAlerts.length}</span>
//           </div>
//           <div className="admin-section-body scrollable-feed">
//             {liveAlerts.length === 0 ? (
//               <div className="admin-empty-state">
//                 <span className="admin-empty-icon">ðŸ“¡</span>
//                 <p>{isOnline ? "No active alerts nearby. Stay on standby." : "Go online to receive alerts."}</p>
//               </div>
//             ) : (
//               liveAlerts.map((al) => {
//                 const sev = getAlertSeverity(al);
//                 const sevLevel = getSeverityLabel(sev);
//                 const sevStyle = sevLevel ? SEVERITY_COLORS[sevLevel] : null;
//                 return (
//                   <div key={al.id} className="vd-alert-card">
//                     <div className="vd-alert-top">
//                       <div className="vd-alert-left">
//                         <span className="admin-alert-pulse"></span>
//                         <div>
//                           <div className="vd-alert-title">ðŸš¨ Emergency Alert</div>
//                           <div className="vd-alert-meta">
//                             <span>ðŸ“ {al.distance} km away</span>
//                             {al.lat && <span> Â· {Number(al.lat).toFixed(3)}Â°N, {Number(al.lon).toFixed(3)}Â°E</span>}
//                           </div>
//                         </div>
//                       </div>
//                       {/* Severity badge per alert */}
//                       {sevLevel && (
//                         <div
//                           className="vd-alert-severity"
//                           style={{
//                             background: sevStyle?.bg,
//                             color: sevStyle?.color,
//                             borderColor: sevStyle?.border,
//                             animation: sevLevel === "critical" ? "pulse-red 1.5s infinite" : "none",
//                           }}
//                         >
//                           {sevLevel === "critical" && "ðŸ”´ "}
//                           {sevLevel === "high" && "ðŸŸ  "}
//                           {sevLevel === "medium" && "ðŸŸ¡ "}
//                           {sevLevel === "low" && "ðŸŸ¢ "}
//                           {sevLevel.toUpperCase()}
//                         </div>
//                       )}
//                     </div>
//                     {/* Emotion detail if available */}
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
//                         {sev.keyword_triggered && <span className="vd-ai-strip-kw">âš ï¸</span>}
//                       </div>
//                     )}
//                     <button className="vd-accept-btn" onClick={() => acceptAlert(al)}>
//                       âœ… Accept & Respond
//                     </button>
//                   </div>
//                 );
//               })
//             )}
//           </div>
//         </div>

//         {/* Activity Log */}
//         <div className="card admin-section-card">
//           <div className="admin-section-header">
//             <h2>ðŸ“‹ Activity Log</h2>
//             <span className="admin-section-count admin-section-count--green">{activityLog.length}</span>
//           </div>
//           <div className="admin-section-body scrollable-feed">
//             {activityLog.length === 0 ? (
//               <div className="admin-empty-state">
//                 <span className="admin-empty-icon">ðŸ“</span>
//                 <p>Activity will appear here</p>
//               </div>
//             ) : (
//               activityLog.map((log, i) => (
//                 <div key={i} className="status-item">
//                   <span className="status-message">{log.message}</span>
//                   <span className="status-time">{log.time}</span>
//                 </div>
//               ))
//             )}
//           </div>
//         </div>
//       </div>

//       {/* ===== MAP ===== */}
//       <div className="card admin-map-card">
//         <div className="admin-section-header">
//           <h2>ðŸ—ºï¸ Live Navigation Map</h2>
//           <div className="admin-map-legend">
//             <span className="admin-legend-item"><span className="admin-legend-dot admin-legend-dot--green"></span>You</span>
//             <span className="admin-legend-item"><span className="admin-legend-dot admin-legend-dot--red"></span>Victim</span>
//           </div>
//         </div>
//         <div id="liveMap" ref={mapRef}></div>
//       </div>
//     </div>
//   );
// }


import { useEffect, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { socket } from "../socket";
import { apiFetch } from "../api/fetch";
import {
  setOnline,
  setVolunteerName,
  addActivityLog,
  addLiveAlert,
  removeLiveAlert,
  setActiveDistance,
  setLiveAI,
  setAlertSeverity,
  setActiveMission,
  clearMission,
} from "../redux/slices/volunteerLiveSlice";

function haversineKm(lat1, lon1, lat2, lon2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function VolunteerDashboard() {
  const dispatch = useDispatch();
  // ===== LIVE STATE NOW LIVES IN REDUX =====
  // These used to be useState here, which meant navigating to another
  // page (Evidence, Profile, etc.) unmounted this component and wiped
  // everything. Redux state lives outside the component tree, so it
  // survives navigation â€” coming back here shows exactly what you left.
  const {
    isOnline,
    volunteerName,
    activityLog,
    liveAlerts,
    activeDistance,
    liveAI,
    alertSeverities,
    activeMission,
  } = useSelector((state) => state.volunteerLive);

  const userLocation = useRef({ lat: null, lon: null });
  const victimSocketId = useRef(activeMission?.victimSocketId || null);
  const liveUpdateInterval = useRef(null);

  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const userMarker = useRef(null);
  const victimMarker = useRef(null);
  const routeLine = useRef(null);

  const addLog = (message) => {
    const time = new Date().toLocaleTimeString();
    dispatch(addActivityLog({ message, time }));
  };

  const drawRoute = async (victimLat, victimLon) => {
    if (!mapInstance.current || !userLocation.current.lat) return;
    try {
      const res = await apiFetch("/api/route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lat1: userLocation.current.lat,
          lon1: userLocation.current.lon,
          lat2: victimLat,
          lon2: victimLon,
        }),
      });
      const routeData = await res.json();
      if (routeData.route) {
        if (routeLine.current) mapInstance.current.removeLayer(routeLine.current);
        routeLine.current = L.polyline(routeData.route, { color: "#ef4444", weight: 4 }).addTo(mapInstance.current);
        mapInstance.current.fitBounds(routeLine.current.getBounds());
      }
    } catch (err) {
      console.warn("Route fetch failed:", err);
    }
  };

  // ===== MAP INIT =====
  // The map itself (a Leaflet instance tied to a DOM node) can't survive
  // unmount â€” that DOM node is gone. So we still recreate it on mount,
  // but now we redraw the victim marker from Redux's activeMission if
  // one exists, so an in-progress mission doesn't visually vanish just
  // because you navigated away and back.
  useEffect(() => {
    if (mapInstance.current) return;
    mapInstance.current = L.map(mapRef.current).setView([28.6139, 77.209], 12);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(mapInstance.current);

    if (activeMission?.lat && activeMission?.lon) {
      victimMarker.current = L.marker([activeMission.lat, activeMission.lon])
        .addTo(mapInstance.current)
        .bindPopup("ðŸš¨ Victim location");
    }

    return () => {
      mapInstance.current?.remove();
      mapInstance.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        userLocation.current = { lat: latitude, lon: longitude };
        if (mapInstance.current) {
          if (!userMarker.current) {
            userMarker.current = L.marker([latitude, longitude]).addTo(mapInstance.current).bindPopup("Your Location");
            mapInstance.current.setView([latitude, longitude], 14);
          } else {
            userMarker.current.setLatLng([latitude, longitude]);
          }
        }
        // If we came back mid-mission, re-draw the route now that we
        // have our own location again.
        if (activeMission?.lat && activeMission?.lon && !routeLine.current) {
          drawRoute(activeMission.lat, activeMission.lon);
        }
      },
      (err) => console.warn("Location error:", err),
      { enableHighAccuracy: true }
    );
    return () => navigator.geolocation.clearWatch(watchId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    addLog("Connected to SafeCircle server");

    socket.on("incoming-alert", (data) => {
      dispatch(addLiveAlert({ ...data, id: Date.now() }));
      addLog(`ðŸš¨ New alert received â€” ${data.distance} km away`);
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
      addLog(`ðŸ§  AI: ${data.emotion?.toUpperCase()} â€” ${data.severity?.toUpperCase()}`);
    });

    socket.on("victim-location-update", (data) => {
      if (victimMarker.current) {
        victimMarker.current.setLatLng([data.lat, data.lon]);
      }
      drawRoute(data.lat, data.lon);
      if (userLocation.current.lat) {
        dispatch(
          setActiveDistance(
            haversineKm(data.lat, data.lon, userLocation.current.lat, userLocation.current.lon).toFixed(2)
          )
        );
      }
      // Keep activeMission's stored coordinates fresh so a future
      // remount redraws the marker at the victim's latest position.
      if (victimSocketId.current) {
        dispatch(setActiveMission({ victimSocketId: victimSocketId.current, lat: data.lat, lon: data.lon }));
      }
      addLog("ðŸ“ Victim location updated");
    });

    socket.on("admin-emergency-ended", () => {
      dispatch(clearMission());
      victimSocketId.current = null;
      clearInterval(liveUpdateInterval.current);
      liveUpdateInterval.current = null;
      if (victimMarker.current && mapInstance.current) {
        mapInstance.current.removeLayer(victimMarker.current);
        victimMarker.current = null;
      }
      if (routeLine.current && mapInstance.current) {
        mapInstance.current.removeLayer(routeLine.current);
        routeLine.current = null;
      }
    });

    return () => {
      socket.off("incoming-alert");
      socket.off("sos-severity-update");
      socket.off("victim-location-update");
      socket.off("admin-emergency-ended");
      if (liveUpdateInterval.current) clearInterval(liveUpdateInterval.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ===== RESUME LOCATION-SHARING INTERVAL IF WE CAME BACK MID-MISSION =====
  // Before this fix, navigating away during an active mission silently
  // stopped sending your location to the victim (the interval was killed
  // on unmount and nothing restarted it). This restarts it automatically
  // if Redux still shows an active mission when the component mounts.
  useEffect(() => {
    if (activeMission?.victimSocketId && !liveUpdateInterval.current) {
      victimSocketId.current = activeMission.victimSocketId;
      liveUpdateInterval.current = setInterval(() => {
        if (victimSocketId.current && userLocation.current.lat) {
          socket.emit("volunteer-location-update", {
            victimSocketId: victimSocketId.current,
            lat: userLocation.current.lat,
            lon: userLocation.current.lon,
          });
        }
      }, 8000);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goOnline = () => {
    if (!volunteerName.trim()) { alert("Please enter your name first."); return; }
    if (!userLocation.current.lat) { alert("Waiting for your location, try again in a moment."); return; }
    dispatch(setOnline(true));
    socket.emit("volunteer-online", { name: volunteerName, lat: userLocation.current.lat, lon: userLocation.current.lon });
    addLog(`âœ… You are now online as "${volunteerName}"`);
  };

  const goOffline = () => {
    dispatch(setOnline(false));
    socket.emit("volunteer-offline");
    addLog("ðŸ”´ You are now offline");
  };

  const acceptAlert = async (alert) => {
    victimSocketId.current = alert.victimSocketId;
    dispatch(setActiveMission({ victimSocketId: alert.victimSocketId, lat: alert.lat, lon: alert.lon }));
    socket.emit("volunteer-responding", {
      victimSocketId: alert.victimSocketId,
      volunteerName,
      lat: userLocation.current.lat,
      lon: userLocation.current.lon,
    });
    addLog(`ðŸ™‹ You accepted an alert ${alert.distance} km away`);
    dispatch(removeLiveAlert(alert.id));
    dispatch(setActiveDistance(alert.distance));

    if (mapInstance.current && alert.lat && alert.lon) {
      if (victimMarker.current) mapInstance.current.removeLayer(victimMarker.current);
      victimMarker.current = L.marker([alert.lat, alert.lon]).addTo(mapInstance.current).bindPopup("ðŸš¨ Victim location");
      await drawRoute(alert.lat, alert.lon);
      addLog("ðŸ—ºï¸ Shortest route calculated to victim");
    }

    if (liveUpdateInterval.current) clearInterval(liveUpdateInterval.current);
    liveUpdateInterval.current = setInterval(() => {
      if (victimSocketId.current && userLocation.current.lat) {
        socket.emit("volunteer-location-update", {
          victimSocketId: victimSocketId.current,
          lat: userLocation.current.lat,
          lon: userLocation.current.lon,
        });
      }
    }, 8000);
  };

  const SEVERITY_COLORS = {
    low:      { bg: "rgba(34,197,94,0.12)",  color: "#4ade80", border: "#22c55e" },
    medium:   { bg: "rgba(234,179,8,0.12)",  color: "#facc15", border: "#eab308" },
    high:     { bg: "rgba(249,115,22,0.12)", color: "#fb923c", border: "#f97316" },
    critical: { bg: "rgba(239,68,68,0.18)",  color: "#f87171", border: "#ef4444" },
  };

  const getEmotionIcon = (emotion) => {
    switch (emotion) {
      case "fear": return "ðŸ˜¨";
      case "anger": return "ðŸ˜¡";
      case "sadness": return "ðŸ˜¢";
      case "surprise": return "ðŸ˜²";
      case "joy": return "ðŸ˜Š";
      default: return "â¤ï¸";
    }
  };

  const getAlertSeverity = (alert) => {
    if (alert.victimSocketId && alertSeverities[alert.victimSocketId]) {
      return alertSeverities[alert.victimSocketId];
    }
    return liveAI;
  };

  const getSeverityLabel = (sev) => {
    if (!sev) return null;
    return sev.severity;
  };

  return (
    <div className="home-page vd-page">

      {/* ===== HEADER CARD ===== */}
      <div className={`card vd-header-card ${isOnline ? "vd-header-card--online" : ""}`}>
        <div className="vd-header-top">
          <div className="vd-header-left">
            <div className={`vd-header-icon ${isOnline ? "vd-header-icon--online" : ""}`}>
              {isOnline ? "âš¡" : "ðŸ›¡ï¸"}
            </div>
            <div>
              <h1 className="vd-title">Volunteer Command</h1>
              <p className="vd-subtitle">
                {isOnline
                  ? `Responding as ${volunteerName} Â· receiving emergency alerts`
                  : "Go online to start receiving emergency alerts near you"}
              </p>
            </div>
          </div>
          <div className={`vd-status-pill ${isOnline ? "vd-status-pill--online" : "vd-status-pill--offline"}`}>
            <span className="vd-status-dot"></span>
            {isOnline ? "LIVE" : "OFFLINE"}
          </div>
        </div>

        {/* Setup section */}
        <div className="vd-setup-section">
          <div className="vd-name-row">
            <div className="vd-input-group">
              <label className="vd-label">Your Name</label>
              <div className="vd-input-wrapper">
                <span className="vd-input-icon">ðŸ‘¤</span>
                <input
                  className="vd-input"
                  value={volunteerName}
                  onChange={(e) => dispatch(setVolunteerName(e.target.value))}
                  placeholder="Enter your name to go online"
                  disabled={isOnline}
                />
              </div>
            </div>
            <div className="vd-toggle-wrapper">
              {isOnline ? (
                <button className="vd-power-btn vd-power-btn--off" onClick={goOffline}>
                  <span className="vd-power-icon">â»</span>
                  <span>Go Offline</span>
                </button>
              ) : (
                <button className="vd-power-btn vd-power-btn--on" onClick={goOnline}>
                  <span className="vd-power-icon">â»</span>
                  <span>Go Online</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Active mission distance */}
        {activeDistance !== null && (
          <div className="vd-active-mission">
            <span className="vd-mission-pulse"></span>
            <div className="vd-mission-info">
              <span className="vd-mission-label">ACTIVE MISSION</span>
              <span className="vd-mission-distance">
                ðŸ“ Victim is <strong>{activeDistance} km</strong> away â€” updating live
              </span>
            </div>
            <span className="vd-mission-badge">RESPONDING</span>
          </div>
        )}
      </div>

      {/* ===== STAT CARDS ===== */}
      <div className="vd-stats-row">
        <div className={`admin-stat-card ${liveAlerts.length > 0 ? "vd-stat-card--pulse" : ""}`}>
          <div className="admin-stat-icon admin-stat-icon--alerts">ðŸš¨</div>
          <div className="admin-stat-info">
            <div className="admin-stat-value">{liveAlerts.length}</div>
            <div className="admin-stat-label">Incoming Alerts</div>
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon admin-stat-icon--volunteers">ðŸ“‹</div>
          <div className="admin-stat-info">
            <div className="admin-stat-value">{activityLog.length}</div>
            <div className="admin-stat-label">Events Logged</div>
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon admin-stat-icon--users">ðŸ“</div>
          <div className="admin-stat-info">
            <div className="admin-stat-value">{activeDistance ? `${activeDistance}km` : "â€”"}</div>
            <div className="admin-stat-label">Distance to Victim</div>
          </div>
        </div>
      </div>

      {/* ===== LIVE AI MONITOR â€” only when an alert is active ===== */}
      {(liveAlerts.length > 0 || activeDistance !== null) && liveAI && (
        <div className="card admin-ai-card">
          <div className="admin-ai-header">
            <div className="admin-ai-title-row">
              <span className="admin-ai-beacon"></span>
              <h2>ðŸ§  LIVE AI MONITOR</h2>
            </div>
            <span className="status-badge status-badge--danger">ANALYZING</span>
          </div>

          <div className="admin-ai-body">
            <div className="admin-ai-transcript">
              <span className="admin-ai-mic">ðŸŽ™ï¸</span>
              <span className="admin-ai-text">"{liveAI.text}"</span>
            </div>

            <div className="admin-ai-emotion-row">
              <div className="admin-ai-emotion-badge">
                <span className="admin-ai-emoji">{getEmotionIcon(liveAI.emotion)}</span>
                <div>
                  <div className="admin-ai-emotion-label">{liveAI.emotion?.toUpperCase()}</div>
                  <div className="admin-ai-intensity-text">
                    {(liveAI.intensity * 100).toFixed(0)}% intensity
                    {liveAI.keyword_triggered && <span className="admin-ai-keyword-flag">âš ï¸ keyword detected</span>}
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

            <div
              className="admin-ai-severity"
              style={{
                background: SEVERITY_COLORS[liveAI.severity]?.bg,
                color: SEVERITY_COLORS[liveAI.severity]?.color,
                borderColor: SEVERITY_COLORS[liveAI.severity]?.border,
                animation: liveAI.severity === "critical" ? "pulse-red 1s infinite" : "none",
              }}
            >
              {liveAI.severity === "critical" && "ðŸ”´ "}
              {liveAI.severity === "high" && "ðŸŸ  "}
              {liveAI.severity === "medium" && "ðŸŸ¡ "}
              {liveAI.severity === "low" && "ðŸŸ¢ "}
              SEVERITY: {liveAI.severity?.toUpperCase()}
            </div>
          </div>
        </div>
      )}

      {/* ===== ALERTS + ACTIVITY LOG ===== */}
      <div className="dashboard-grid">

        {/* Live Alerts */}
        <div className="card admin-section-card">
          <div className="admin-section-header">
            <h2>ðŸš¨ Incoming Alerts</h2>
            <span className="admin-section-count">{liveAlerts.length}</span>
          </div>
          <div className="admin-section-body scrollable-feed">
            {liveAlerts.length === 0 ? (
              <div className="admin-empty-state">
                <span className="admin-empty-icon">{isOnline ? "ðŸ“¡" : "ðŸ”Œ"}</span>
                <p>{isOnline ? "No active alerts nearby. Stay on standby." : "Go online to receive alerts."}</p>
              </div>
            ) : (
              liveAlerts.map((al) => {
                const sev = getAlertSeverity(al);
                const sevLevel = getSeverityLabel(sev);
                const sevStyle = sevLevel ? SEVERITY_COLORS[sevLevel] : null;
                return (
                  <div key={al.id} className="vd-alert-card">
                    <div className="vd-alert-top">
                      <div className="vd-alert-left">
                        <span className="admin-alert-pulse"></span>
                        <div>
                          <div className="vd-alert-title">ðŸš¨ Emergency Alert</div>
                          <div className="vd-alert-meta">
                            <span>ðŸ“ {al.distance} km away</span>
                            {al.lat && <span> Â· {Number(al.lat).toFixed(3)}Â°N, {Number(al.lon).toFixed(3)}Â°E</span>}
                          </div>
                        </div>
                      </div>
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
                          {sevLevel === "critical" && "ðŸ”´ "}
                          {sevLevel === "high" && "ðŸŸ  "}
                          {sevLevel === "medium" && "ðŸŸ¡ "}
                          {sevLevel === "low" && "ðŸŸ¢ "}
                          {sevLevel.toUpperCase()}
                        </div>
                      )}
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
                        {sev.keyword_triggered && <span className="vd-ai-strip-kw">âš ï¸</span>}
                      </div>
                    )}
                    <button className="vd-accept-btn" onClick={() => acceptAlert(al)}>
                      âœ… Accept & Respond
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Activity Log */}
        <div className="card admin-section-card">
          <div className="admin-section-header">
            <h2>ðŸ“‹ Activity Log</h2>
            <span className="admin-section-count admin-section-count--green">{activityLog.length}</span>
          </div>
          <div className="admin-section-body scrollable-feed">
            {activityLog.length === 0 ? (
              <div className="admin-empty-state">
                <span className="admin-empty-icon">ðŸ“</span>
                <p>Activity will appear here</p>
              </div>
            ) : (
              activityLog.map((log, i) => (
                <div key={i} className="vd-log-item">
                  <span className="vd-log-dot"></span>
                  <span className="vd-log-message">{log.message}</span>
                  <span className="vd-log-time">{log.time}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ===== MAP ===== */}
      <div className="card admin-map-card">
        <div className="admin-section-header">
          <h2>ðŸ—ºï¸ Live Navigation Map</h2>
          <div className="admin-map-legend">
            <span className="admin-legend-item"><span className="admin-legend-dot admin-legend-dot--green"></span>You</span>
            <span className="admin-legend-item"><span className="admin-legend-dot admin-legend-dot--red"></span>Victim</span>
          </div>
        </div>
        <div id="liveMap" ref={mapRef}></div>
      </div>
    </div>
  );
            <div>
}

