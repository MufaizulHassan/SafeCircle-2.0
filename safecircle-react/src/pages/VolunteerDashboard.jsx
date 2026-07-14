

// import { useState, useEffect, useRef } from "react";
// import L from "leaflet";
// import "leaflet/dist/leaflet.css";
// import { socket } from "../socket";

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
//       const res = await fetch("/api/route", {
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
//       setLiveAlerts((prev) => [{ ...data, id: Date.now(), severity: null, emotion: null }, ...prev]);
//       addLog(`🚨 New alert received — ${data.distance} km away`);
//     });

//     // Live NLP severity — attach to the most recent alert
//     socket.on("sos-severity-update", (data) => {
//       setLiveAlerts((prev) =>
//         prev.map((alert, i) =>
//           i === 0
//             ? { ...alert, severity: data.severity, emotion: data.emotion, intensity: data.intensity, lastText: data.text }
//             : alert
//         )
//       );
//       addLog(`🧠 AI: ${data.emotion?.toUpperCase()} — severity ${data.severity?.toUpperCase()}`);
//     });

//     socket.on("victim-location-update", (data) => {
//       if (victimMarker.current) {
//         victimMarker.current.setLatLng([data.lat, data.lon]);
//       }
//       drawRoute(data.lat, data.lon);
//       if (userLocation.current.lat) {
//         setActiveDistance(haversineKm(data.lat, data.lon, userLocation.current.lat, userLocation.current.lon).toFixed(2));
//       }
//       addLog("📍 Victim location updated");
//     });

//     socket.on("admin-emergency-ended", () => {
//       setLiveAlerts([]);
//       setActiveDistance(null);
//       victimSocketId.current = null;
//       if (liveUpdateInterval.current) clearInterval(liveUpdateInterval.current);
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
//     if (!volunteerName.trim()) {
//       alert("Please enter your name first.");
//       return;
//     }
//     if (!userLocation.current.lat) {
//       alert("Waiting for your location, try again in a moment.");
//       return;
//     }
//     setIsOnline(true);
//     socket.emit("volunteer-online", {
//       name: volunteerName,
//       lat: userLocation.current.lat,
//       lon: userLocation.current.lon,
//     });
//     addLog(`✅ You are now online as "${volunteerName}"`);
//   };

//   const goOffline = () => {
//     setIsOnline(false);
//     socket.emit("volunteer-offline");
//     addLog("🔴 You are now offline");
//   };

//   const acceptAlert = async (alert) => {
//     victimSocketId.current = alert.victimSocketId;
//     socket.emit("volunteer-responding", {
//       victimSocketId: alert.victimSocketId,
//       volunteerName,
//       lat: userLocation.current.lat,
//       lon: userLocation.current.lon,
//     });
//     addLog(`🙋 You accepted an alert ${alert.distance} km away`);
//     setLiveAlerts((prev) => prev.filter((a) => a.id !== alert.id));
//     setActiveDistance(alert.distance);

//     if (mapInstance.current && alert.lat && alert.lon) {
//       if (victimMarker.current) mapInstance.current.removeLayer(victimMarker.current);
//       victimMarker.current = L.marker([alert.lat, alert.lon]).addTo(mapInstance.current).bindPopup("🚨 Victim location");
//       await drawRoute(alert.lat, alert.lon);
//       addLog("🗺️ Shortest route calculated to victim");
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

//   const getSeverityStyle = (severity) => {
//     const map = {
//       low:      { background: "rgba(34,197,94,0.15)",  color: "#4ade80", border: "1px solid #22c55e" },
//       medium:   { background: "rgba(234,179,8,0.15)",  color: "#facc15", border: "1px solid #eab308" },
//       high:     { background: "rgba(249,115,22,0.15)", color: "#fb923c", border: "1px solid #f97316" },
//       critical: { background: "rgba(239,68,68,0.20)",  color: "#f87171", border: "1px solid #ef4444" },
//     };
//     return map[severity] || {};
//   };

//   return (
//     <div className="home-page">
//       <div className="card vol-setup-card">
//         <div className="card-header">
//           <h1>Volunteer Dashboard</h1>
//           <span className={`status-badge ${isOnline ? "status-success" : "status-offline"}`}>
//             {isOnline ? "● Online" : "● Offline"}
//           </span>
//         </div>
//         <p>Go online to start receiving emergency alerts near you.</p>

//         <div className="form-row" style={{ marginTop: "12px" }}>
//           <label>Your Name</label>
//           <input
//             value={volunteerName}
//             onChange={(e) => setVolunteerName(e.target.value)}
//             placeholder="Enter your name"
//             disabled={isOnline}
//           />
//         </div>

//         {isOnline ? (
//           <button className="go-offline-btn" onClick={goOffline}>🔴 Go Offline</button>
//         ) : (
//           <button className="go-online-btn" onClick={goOnline}>🟢 Go Online — Start Receiving Alerts</button>
//         )}

//         {activeDistance !== null && (
//           <div className="status-message-box" style={{ marginTop: "12px" }}>
//             📍 Victim is <strong>{activeDistance} km</strong> away — updating live
//           </div>
//         )}
//       </div>

//       <div className="dashboard-grid">
//         <div className="card">
//           <h2>🚨 Live Alerts</h2>
//           {liveAlerts.length === 0 ? (
//             <p className="status-note">No active alerts nearby. Stay on standby.</p>
//           ) : (
//             liveAlerts.map((alert) => (
//               <div key={alert.id} className="status-item" style={{ flexDirection: "column", gap: "8px" }}>
//                 <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
//                   <span className="status-message">🚨 Alert — {alert.distance} km away</span>
//                   <button className="accept-btn" onClick={() => acceptAlert(alert)}>Accept</button>
//                 </div>
//                 {alert.severity && (
//                   <div style={{ padding: "8px 12px", borderRadius: "8px", fontSize: "0.85rem", fontWeight: 600, ...getSeverityStyle(alert.severity) }}>
//                     🧠 {alert.severity.toUpperCase()} — {alert.emotion?.toUpperCase()} ({(alert.intensity * 100).toFixed(0)}% intensity)
//                     {alert.lastText && <div style={{ fontWeight: 400, marginTop: "4px", opacity: 0.85 }}>"{alert.lastText}"</div>}
//                   </div>
//                 )}
//               </div>
//             ))
//           )}
//         </div>

//         <div className="card">
//           <h2>📋 Activity Log</h2>
//           {activityLog.map((log, i) => (
//             <div key={i} className="status-item">
//               <span className="status-message">{log.message}</span>
//               <span className="status-time">{log.time}</span>
//             </div>
//           ))}
//         </div>
//       </div>

//       <div className="card" style={{ marginTop: "20px" }}>
//         <h2>Live Alert Map</h2>
//         <div id="liveMap" ref={mapRef} style={{ height: "360px", borderRadius: "12px" }}></div>
//       </div>
//     </div>
//   );
// }



import { useState, useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { socket } from "../socket";

function haversineKm(lat1, lon1, lat2, lon2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function VolunteerDashboard() {
  const [isOnline, setIsOnline] = useState(false);
  const [volunteerName, setVolunteerName] = useState("");
  const [activityLog, setActivityLog] = useState([]);
  const [liveAlerts, setLiveAlerts] = useState([]);
  const [activeDistance, setActiveDistance] = useState(null);
  // liveAI — latest NLP result. Replaces on every new chunk, never stacks.
  // Only shown when an active alert exists.
  const [liveAI, setLiveAI] = useState(null);

  const userLocation = useRef({ lat: null, lon: null });
  const victimSocketId = useRef(null);
  const liveUpdateInterval = useRef(null);

  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const userMarker = useRef(null);
  const victimMarker = useRef(null);
  const routeLine = useRef(null);

  const addLog = (message) => {
    const time = new Date().toLocaleTimeString();
    setActivityLog((prev) => [{ message, time }, ...prev]);
  };

  const drawRoute = async (victimLat, victimLon) => {
    if (!mapInstance.current || !userLocation.current.lat) return;
    try {
      const res = await fetch("/api/route", {
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

  useEffect(() => {
    if (mapInstance.current) return;
    mapInstance.current = L.map(mapRef.current).setView([28.6139, 77.209], 12);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(mapInstance.current);
    return () => {
      mapInstance.current?.remove();
      mapInstance.current = null;
    };
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
      },
      (err) => console.warn("Location error:", err),
      { enableHighAccuracy: true }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  useEffect(() => {
    addLog("Connected to SafeCircle server");

    socket.on("incoming-alert", (data) => {
      setLiveAlerts((prev) => [{ ...data, id: Date.now() }, ...prev]);
      addLog(`🚨 New alert received — ${data.distance} km away`);
    });

    socket.on("sos-severity-update", (data) => {
      // Replace the liveAI state entirely — latest vocal replaces previous
      setLiveAI({
        text: data.text,
        emotion: data.emotion,
        intensity: data.intensity,
        severity: data.severity,
        keyword_triggered: data.keyword_triggered,
      });
      addLog(`🧠 AI: ${data.emotion?.toUpperCase()} — ${data.severity?.toUpperCase()}`);
    });

    socket.on("victim-location-update", (data) => {
      if (victimMarker.current) {
        victimMarker.current.setLatLng([data.lat, data.lon]);
      }
      drawRoute(data.lat, data.lon);
      if (userLocation.current.lat) {
        setActiveDistance(haversineKm(data.lat, data.lon, userLocation.current.lat, userLocation.current.lon).toFixed(2));
      }
      addLog("📍 Victim location updated");
    });

    socket.on("admin-emergency-ended", () => {
      setLiveAlerts([]);
      setActiveDistance(null);
      setLiveAI(null); // clear monitor when emergency ends
      victimSocketId.current = null;
      clearInterval(liveUpdateInterval.current);
      liveUpdateInterval.current = null;
    });

    return () => {
      socket.off("incoming-alert");
      socket.off("sos-severity-update");
      socket.off("victim-location-update");
      socket.off("admin-emergency-ended");
      if (liveUpdateInterval.current) clearInterval(liveUpdateInterval.current);
    };
  }, []);

  const goOnline = () => {
    if (!volunteerName.trim()) { alert("Please enter your name first."); return; }
    if (!userLocation.current.lat) { alert("Waiting for your location, try again in a moment."); return; }
    setIsOnline(true);
    socket.emit("volunteer-online", { name: volunteerName, lat: userLocation.current.lat, lon: userLocation.current.lon });
    addLog(`✅ You are now online as "${volunteerName}"`);
  };

  const goOffline = () => {
    setIsOnline(false);
    socket.emit("volunteer-offline");
    addLog("🔴 You are now offline");
  };

  const acceptAlert = async (alert) => {
    victimSocketId.current = alert.victimSocketId;
    socket.emit("volunteer-responding", {
      victimSocketId: alert.victimSocketId,
      volunteerName,
      lat: userLocation.current.lat,
      lon: userLocation.current.lon,
    });
    addLog(`🙋 You accepted an alert ${alert.distance} km away`);
    setLiveAlerts((prev) => prev.filter((a) => a.id !== alert.id));
    setActiveDistance(alert.distance);

    if (mapInstance.current && alert.lat && alert.lon) {
      if (victimMarker.current) mapInstance.current.removeLayer(victimMarker.current);
      victimMarker.current = L.marker([alert.lat, alert.lon]).addTo(mapInstance.current).bindPopup("🚨 Victim location");
      await drawRoute(alert.lat, alert.lon);
      addLog("🗺️ Shortest route calculated to victim");
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

  return (
    <div className="home-page">
      <div className="card vol-setup-card">
        <div className="card-header">
          <h1>Volunteer Dashboard</h1>
          <span className={`status-badge ${isOnline ? "status-success" : "status-offline"}`}>
            {isOnline ? "● Online" : "● Offline"}
          </span>
        </div>
        <p>Go online to start receiving emergency alerts near you.</p>

        <div className="form-row" style={{ marginTop: "12px" }}>
          <label>Your Name</label>
          <input value={volunteerName} onChange={(e) => setVolunteerName(e.target.value)} placeholder="Enter your name" disabled={isOnline} />
        </div>

        {isOnline ? (
          <button className="go-offline-btn" onClick={goOffline}>🔴 Go Offline</button>
        ) : (
          <button className="go-online-btn" onClick={goOnline}>🟢 Go Online — Start Receiving Alerts</button>
        )}

        {activeDistance !== null && (
          <div className="status-message-box" style={{ marginTop: "12px" }}>
            📍 Victim is <strong>{activeDistance} km</strong> away — updating live
          </div>
        )}
      </div>

      {/* ===== LIVE AI MONITOR — only when an alert is active ===== */}
      {liveAlerts.length > 0 && (
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

              {/* Emotion + intensity */}
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
                {/* Intensity bar */}
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
            <p className="status-note">Listening for speech... speak clearly to trigger AI analysis.</p>
          )}
        </div>
      )}

      <div className="dashboard-grid">
        <div className="card">
          <h2>🚨 Live Alerts</h2>
          {liveAlerts.length === 0 ? (
            <p className="status-note">No active alerts nearby. Stay on standby.</p>
          ) : (
            liveAlerts.map((alert) => (
              <div key={alert.id} className="status-item" style={{ flexDirection: "column", gap: "8px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span className="status-message">🚨 Alert — {alert.distance} km away</span>
                  <button className="accept-btn" onClick={() => acceptAlert(alert)}>Accept</button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="card">
          <h2>📋 Activity Log</h2>
          {activityLog.map((log, i) => (
            <div key={i} className="status-item">
              <span className="status-message">{log.message}</span>
              <span className="status-time">{log.time}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{ marginTop: "20px" }}>
        <h2>Live Alert Map</h2>
        <div id="liveMap" ref={mapRef} style={{ height: "360px", borderRadius: "12px" }}></div>
      </div>
    </div>
  );
}
