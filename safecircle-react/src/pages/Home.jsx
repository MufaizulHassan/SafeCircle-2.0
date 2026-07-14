
// import { useState, useEffect, useRef } from "react";
// import { useSelector } from "react-redux";
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

// export default function Home() {
//   const token = useSelector((state) => state.auth.token);

//   const [statusMessage, setStatusMessage] = useState("System ready. In real deployment, this will connect to live APIs.");
//   const [alertActive, setAlertActive] = useState(false);
//   const [systemEvents, setSystemEvents] = useState([]);
//   const [respondingVolunteer, setRespondingVolunteer] = useState(null);
//   const [distanceRemaining, setDistanceRemaining] = useState(null);
//   const [severity, setSeverity] = useState(null);
//   const userLocation = useRef({ lat: null, lon: null });
//   const volunteerSocketId = useRef(null);
//   const volunteerLocation = useRef({ lat: null, lon: null });
//   const liveUpdateInterval = useRef(null);

//   const mapRef = useRef(null);
//   const mapInstance = useRef(null);
//   const userMarker = useRef(null);
//   const volunteerMarker = useRef(null);
//   const routeLine = useRef(null);

//   const mediaRecorderRef = useRef(null);
//   const recordedChunksRef = useRef([]);
//   const recognitionRef = useRef(null);
//   const keepListeningRef = useRef(false);

//   const addSystemEvent = (message) => {
//     const time = new Date().toLocaleTimeString();
//     setSystemEvents((prev) => [{ message, time }, ...prev]);
//   };

//   const drawRoute = async (vLat, vLon) => {
//     if (!mapInstance.current) return;
//     try {
//       const res = await fetch("/api/route", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ lat1: vLat, lon1: vLon, lat2: userLocation.current.lat, lon2: userLocation.current.lon }),
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
//     if (!navigator.geolocation) return;
//     const watchId = navigator.geolocation.watchPosition(
//       (pos) => {
//         const { latitude, longitude } = pos.coords;
//         userLocation.current = { lat: latitude, lon: longitude };
//         if (mapInstance.current) {
//           if (!userMarker.current) {
//             userMarker.current = L.marker([latitude, longitude]).addTo(mapInstance.current).bindPopup("You are here");
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
//     socket.on("alert-confirmed", (data) => {
//       setStatusMessage(`Emergency alert sent. ${data.notified} volunteer(s) notified.`);
//       addSystemEvent(`🚨 Alert sent — ${data.notified} volunteer(s) notified`);
//     });

//     socket.on("volunteer-accepted", (data) => {
//       setRespondingVolunteer(data.volunteerName);
//       setStatusMessage(`${data.volunteerName} is on the way!`);
//       addSystemEvent(`🙋 ${data.volunteerName} is responding`);
//       volunteerSocketId.current = data.volunteerSocketId;
//       volunteerLocation.current = { lat: data.lat, lon: data.lon };

//       if (mapInstance.current && data.lat && data.lon) {
//         volunteerMarker.current = L.marker([data.lat, data.lon]).addTo(mapInstance.current).bindPopup(data.volunteerName);
//         drawRoute(data.lat, data.lon);
//         setDistanceRemaining(haversineKm(data.lat, data.lon, userLocation.current.lat, userLocation.current.lon).toFixed(2));
//       }

//       // start live two-way location sharing
//       if (liveUpdateInterval.current) clearInterval(liveUpdateInterval.current);
//       liveUpdateInterval.current = setInterval(() => {
//         if (volunteerSocketId.current && userLocation.current.lat) {
//           socket.emit("victim-location-update", {
//             volunteerSocketId: volunteerSocketId.current,
//             lat: userLocation.current.lat,
//             lon: userLocation.current.lon,
//           });
//         }
//       }, 8000);
//     });

//     socket.on("volunteer-location-update", (data) => {
//       volunteerLocation.current = { lat: data.lat, lon: data.lon };
//       if (volunteerMarker.current) {
//         volunteerMarker.current.setLatLng([data.lat, data.lon]);
//       }
//       drawRoute(data.lat, data.lon);
//       setDistanceRemaining(haversineKm(data.lat, data.lon, userLocation.current.lat, userLocation.current.lon).toFixed(2));
//       addSystemEvent("📍 Volunteer location updated");
//     });

//     socket.on("emergency-stopped", () => {
//       setAlertActive(false);
//       setRespondingVolunteer(null);
//       setDistanceRemaining(null);
//       setSeverity(null);
//       setStatusMessage("Emergency ended. System ready.");
//       addSystemEvent("✅ Emergency ended");
//       if (liveUpdateInterval.current) clearInterval(liveUpdateInterval.current);
//       volunteerSocketId.current = null;
//     });

//     socket.on("sos-severity-update", (data) => {
//       setSeverity(data.severity);
//       addSystemEvent(`🧠 AI: "${data.text}" → ${data.emotion.toUpperCase()} (${data.severity.toUpperCase()})`);
//     });

//     return () => {
//       socket.off("alert-confirmed");
//       socket.off("volunteer-accepted");
//       socket.off("volunteer-location-update");
//       socket.off("emergency-stopped");
//       socket.off("sos-severity-update");
//       if (liveUpdateInterval.current) clearInterval(liveUpdateInterval.current);
//     };
//   }, []);

//   useEffect(() => {
//     return () => stopTranscription();
//   }, []);

//   const blobToBase64 = (blob) =>
//     new Promise((resolve, reject) => {
//       const reader = new FileReader();
//       reader.onloadend = () => resolve(reader.result.split(",")[1]);
//       reader.onerror = reject;
//       reader.readAsDataURL(blob);
//     });

//   const saveAndUploadRecording = async () => {
//     if (recordedChunksRef.current.length === 0) return;
//     const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });

//     const request = indexedDB.open("SafeCircleEvidenceDB", 1);
//     request.onupgradeneeded = (e) => {
//       const db = e.target.result;
//       if (!db.objectStoreNames.contains("recordings")) {
//         db.createObjectStore("recordings", { keyPath: "id", autoIncrement: true });
//       }
//     };
//     request.onsuccess = (e) => {
//       const db = e.target.result;
//       const tx = db.transaction("recordings", "readwrite");
//       tx.objectStore("recordings").add({
//         blob,
//         date: new Date().toISOString(),
//         lat: userLocation.current.lat,
//         lon: userLocation.current.lon,
//       });
//     };

//     try {
//       const videoBase64 = await blobToBase64(blob);
//       await fetch("/api/evidence", {
//         method: "POST",
//         headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
//         body: JSON.stringify({ videoBase64, lat: userLocation.current.lat, lon: userLocation.current.lon, time: new Date().toISOString() }),
//       });
//       addSystemEvent("☁️ Evidence synced to server");
//     } catch (err) {
//       console.warn("Evidence sync failed:", err);
//       addSystemEvent("⚠️ Evidence saved locally only");
//     }

//     recordedChunksRef.current = [];
//   };

//   const startRecording = async () => {
//     try {
//       const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
//       recordedChunksRef.current = [];

//       const recorder = new MediaRecorder(stream, { mimeType: "video/webm" });
//       recorder.ondataavailable = (e) => {
//         if (e.data.size > 0) recordedChunksRef.current.push(e.data);
//       };
//       recorder.onstop = () => {
//         stream.getTracks().forEach((t) => t.stop());
//         saveAndUploadRecording();
//       };

//       mediaRecorderRef.current = recorder;
//       recorder.start();
//       addSystemEvent("🎥 Recording started");
//     } catch (err) {
//       console.warn("Could not start recording:", err);
//       addSystemEvent("⚠️ Camera/mic permission denied — recording skipped");
//     }
//   };

//   const stopRecording = () => {
//     if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
//       mediaRecorderRef.current.stop();
//     }
//   };

//   // Live speech-to-text while an alert is active. Runs entirely in the
//   // browser (Web Speech API) — no server call yet, this step just proves
//   // we can capture what's being said, shown in the System Events feed.
//   const startTranscription = () => {
//     const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
//     if (!SpeechRecognition) {
//       addSystemEvent("⚠️ Live transcript not supported on this browser (try Chrome)");
//       return;
//     }

//     const recognition = new SpeechRecognition();
//     recognition.continuous = true;
//     recognition.interimResults = false;
//     recognition.lang = "en-IN";

//     recognition.onresult = (event) => {
//       const lastResult = event.results[event.results.length - 1];
//       const text = lastResult[0].transcript.trim();
//       if (text) {
//         addSystemEvent(`🎙️ Heard: "${text}"`);
//         // Send to backend → NLP service → severity update broadcast
//         socket.emit("sos-transcript-chunk", {
//           text,
//           victimSocketId: socket.id,
//         });
//       }
//     };

//     recognition.onerror = (event) => {
//       console.warn("Speech recognition error:", event.error);
//       if (event.error === "not-allowed" || event.error === "service-not-allowed") {
//         addSystemEvent("⚠️ Microphone permission denied — live transcript unavailable");
//         keepListeningRef.current = false;
//       }
//     };

//     // Chrome (especially on mobile) auto-stops recognition after a short
//     // pause in speech. As long as the alert is still active, restart it
//     // immediately so listening doesn't silently die mid-emergency.
//     recognition.onend = () => {
//       if (keepListeningRef.current) {
//         try {
//           recognition.start();
//         } catch {
//           // already starting — safe to ignore
//         }
//       }
//     };

//     keepListeningRef.current = true;
//     recognitionRef.current = recognition;
//     try {
//       recognition.start();
//       addSystemEvent("🎙️ Live transcript started");
//     } catch (err) {
//       console.warn("Could not start speech recognition:", err);
//     }
//   };

//   const stopTranscription = () => {
//     keepListeningRef.current = false;
//     if (recognitionRef.current) {
//       recognitionRef.current.stop();
//       recognitionRef.current = null;
//     }
//   };

//   const handleAlert = () => {
//     if (!userLocation.current.lat) {
//       setStatusMessage("⚠️ Waiting for location... try again in a moment.");
//       return;
//     }
//     setAlertActive(true);
//     setStatusMessage("Sending alert...");
//     addSystemEvent("📍 Location captured, sending alert...");
//     socket.emit("sos-alert", { lat: userLocation.current.lat, lon: userLocation.current.lon, time: new Date().toISOString() });
//     startRecording();
//     startTranscription();
//   };

//   const handleForceStop = async () => {
//     if (!token) {
//       alert("⚠️ You need to be logged in to stop an alert with your account password.");
//       return;
//     }
//     const pass = prompt("Enter your account password to stop the alert:");
//     if (!pass) return;

//     let data;
//     try {
//       const res = await fetch("/api/auth/verify-password", {
//         method: "POST",
//         headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
//         body: JSON.stringify({ password: pass }),
//       });
//       data = await res.json();

//       if (!res.ok) {
//         // Token expired/invalid, or some other server-side problem —
//         // NOT the same as "wrong password". Show the real reason and
//         // make the user log back in rather than retrying the password.
//         alert(`⚠️ ${data.message || "Could not verify — please log in again."}`);
//         return;
//       }
//     } catch {
//       alert("⚠️ Could not verify password — server offline.");
//       return;
//     }

//     if (!data.valid) {
//       alert("❌ Incorrect password. Recording continues.");
//       return;
//     }

//     stopRecording();
//     stopTranscription();
//     socket.emit("emergency-ended", { time: new Date().toISOString() });
//   };

//   return (
//     <div className="home-page">
//       <div className="card">
//         <h1>Emergency Safety Button</h1>
//         <p>If you ever feel unsafe, tap this button once. We will alert nearby verified volunteers and your trusted contacts.</p>
//         <button className="alert-button" onClick={handleAlert} disabled={alertActive}>
//           TAP TO ALERT
//         </button>
//         <p>Single tap only. Your location and recording will start automatically.</p>
//         {statusMessage && <div className="status-message-box">{statusMessage}</div>}
//         {severity && (
//           <div className={`severity-badge severity-${severity}`}>
//             🧠 AI Severity: <strong>{severity.toUpperCase()}</strong>
//           </div>
//         )}
//         {distanceRemaining !== null && (
//           <div className="status-message-box" style={{ marginTop: "10px" }}>
//             📍 {respondingVolunteer} is <strong>{distanceRemaining} km</strong> away — updating live
//           </div>
//         )}
//         {alertActive && (
//           <button className="force-stop-btn" onClick={handleForceStop}>
//             🔴 FORCE STOP RECORDING
//           </button>
//         )}
//       </div>

//       <div className="card">
//         <h2>Volunteer Live Location Map</h2>
//         <div id="liveMap" ref={mapRef} style={{ height: "360px", borderRadius: "12px" }}></div>
//       </div>

//       <div className="status-grid">
//         <div className="status-card status-card-volunteers">
//           <div className="status-card-header">🟢 Volunteers Tracking</div>
//           <div className="status-card-body">
//             <p className="status-note">
//               {respondingVolunteer ? `${respondingVolunteer} is responding to your alert.` : "Live volunteer updates will appear here once a volunteer responds."}
//             </p>
//           </div>
//         </div>

//         <div className="status-card status-card-system">
//           <div className="status-card-header">🔵 System Events</div>
//           <div className="status-card-body scrollable-feed">
//             {systemEvents.length === 0 ? (
//               <p className="status-note">No events yet.</p>
//             ) : (
//               systemEvents.map((evt, i) => (
//                 <div key={i} className="status-item">
//                   <span className="status-message">{evt.message}</span>
//                   <span className="status-time">{evt.time}</span>
//                 </div>
//               ))
//             )}
//           </div>
//         </div>

//         <div className="status-card status-card-police full-span">
//           <div className="status-card-header">🚨 Police & Contacts</div>
//           <div className="status-card-body">
//             <p className="status-note">No updates yet.</p>
//           </div>
//         </div>
//       </div>

//       <div className="status-section">
//         <h3 className="status-title">How this SafeCircle works:</h3>
//         <ul>
//           <li>Tap the button — your live location and recording start automatically.</li>
//           <li>Nearby volunteers and your trusted contacts get notified in real time.</li>
//           <li>Recordings are securely synced to the server for evidence review.</li>
//         </ul>
//         <p className="status-note">Future scope: deeper police API integration, cloud-based evidence storage at scale.</p>
//       </div>
//     </div>
//   );
// }




// import { useState, useEffect, useRef } from "react";
// import { useSelector } from "react-redux";
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

// export default function Home() {
//   const token = useSelector((state) => state.auth.token);

//   const [statusMessage, setStatusMessage] = useState("System ready. In real deployment, this will connect to live APIs.");
//   const [alertActive, setAlertActive] = useState(false);
//   const [systemEvents, setSystemEvents] = useState([]);
//   const [respondingVolunteer, setRespondingVolunteer] = useState(null);
//   const [distanceRemaining, setDistanceRemaining] = useState(null);
//   const [severity, setSeverity] = useState(null);
//   const userLocation = useRef({ lat: null, lon: null });
//   const volunteerSocketId = useRef(null);
//   const volunteerLocation = useRef({ lat: null, lon: null });
//   const liveUpdateInterval = useRef(null);

//   const mapRef = useRef(null);
//   const mapInstance = useRef(null);
//   const userMarker = useRef(null);
//   const volunteerMarker = useRef(null);
//   const routeLine = useRef(null);

//   const mediaRecorderRef = useRef(null);
//   const recordedChunksRef = useRef([]);
//   const recognitionRef = useRef(null);
//   const keepListeningRef = useRef(false);

//   const addSystemEvent = (message) => {
//     const time = new Date().toLocaleTimeString();
//     setSystemEvents((prev) => [{ message, time }, ...prev]);
//   };

//   const drawRoute = async (vLat, vLon) => {
//     if (!mapInstance.current) return;
//     try {
//       const res = await fetch("/api/route", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ lat1: vLat, lon1: vLon, lat2: userLocation.current.lat, lon2: userLocation.current.lon }),
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
//     if (!navigator.geolocation) return;
//     const watchId = navigator.geolocation.watchPosition(
//       (pos) => {
//         const { latitude, longitude } = pos.coords;
//         userLocation.current = { lat: latitude, lon: longitude };
//         if (mapInstance.current) {
//           if (!userMarker.current) {
//             userMarker.current = L.marker([latitude, longitude]).addTo(mapInstance.current).bindPopup("You are here");
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
//     socket.on("alert-confirmed", (data) => {
//       setStatusMessage(`Emergency alert sent. ${data.notified} volunteer(s) notified.`);
//       addSystemEvent(`🚨 Alert sent — ${data.notified} volunteer(s) notified`);
//     });

//     socket.on("volunteer-accepted", (data) => {
//       setRespondingVolunteer(data.volunteerName);
//       setStatusMessage(`${data.volunteerName} is on the way!`);
//       addSystemEvent(`🙋 ${data.volunteerName} is responding`);
//       volunteerSocketId.current = data.volunteerSocketId;
//       volunteerLocation.current = { lat: data.lat, lon: data.lon };

//       if (mapInstance.current && data.lat && data.lon) {
//         volunteerMarker.current = L.marker([data.lat, data.lon]).addTo(mapInstance.current).bindPopup(data.volunteerName);
//         drawRoute(data.lat, data.lon);
//         setDistanceRemaining(haversineKm(data.lat, data.lon, userLocation.current.lat, userLocation.current.lon).toFixed(2));
//       }

//       // start live two-way location sharing
//       if (liveUpdateInterval.current) clearInterval(liveUpdateInterval.current);
//       liveUpdateInterval.current = setInterval(() => {
//         if (volunteerSocketId.current && userLocation.current.lat) {
//           socket.emit("victim-location-update", {
//             volunteerSocketId: volunteerSocketId.current,
//             lat: userLocation.current.lat,
//             lon: userLocation.current.lon,
//           });
//         }
//       }, 8000);
//     });

//     socket.on("volunteer-location-update", (data) => {
//       volunteerLocation.current = { lat: data.lat, lon: data.lon };
//       if (volunteerMarker.current) {
//         volunteerMarker.current.setLatLng([data.lat, data.lon]);
//       }
//       drawRoute(data.lat, data.lon);
//       setDistanceRemaining(haversineKm(data.lat, data.lon, userLocation.current.lat, userLocation.current.lon).toFixed(2));
//       addSystemEvent("📍 Volunteer location updated");
//     });

//     socket.on("emergency-stopped", () => {
//       setAlertActive(false);
//       setRespondingVolunteer(null);
//       setDistanceRemaining(null);
//       setSeverity(null);
//       setStatusMessage("Emergency ended. System ready.");
//       addSystemEvent("✅ Emergency ended");
//       // Clear interval AND null it out so no stray location update fires
//       clearInterval(liveUpdateInterval.current);
//       liveUpdateInterval.current = null;
//       volunteerSocketId.current = null;
//       // Stop mic listening if emergency ended from outside (admin/volunteer side)
//       stopTranscription();
//       stopRecording();
//     });

//     socket.on("sos-severity-update", (data) => {
//       setSeverity(data.severity);
//       addSystemEvent(`🧠 AI: "${data.text}" → ${data.emotion.toUpperCase()} (${data.severity.toUpperCase()})`);
//     });

//     return () => {
//       socket.off("alert-confirmed");
//       socket.off("volunteer-accepted");
//       socket.off("volunteer-location-update");
//       socket.off("emergency-stopped");
//       socket.off("sos-severity-update");
//       if (liveUpdateInterval.current) clearInterval(liveUpdateInterval.current);
//     };
//   }, []);

//   useEffect(() => {
//     return () => stopTranscription();
//   }, []);

//   const blobToBase64 = (blob) =>
//     new Promise((resolve, reject) => {
//       const reader = new FileReader();
//       reader.onloadend = () => resolve(reader.result.split(",")[1]);
//       reader.onerror = reject;
//       reader.readAsDataURL(blob);
//     });

//   const saveAndUploadRecording = async () => {
//     if (recordedChunksRef.current.length === 0) return;
//     const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });

//     const request = indexedDB.open("SafeCircleEvidenceDB", 1);
//     request.onupgradeneeded = (e) => {
//       const db = e.target.result;
//       if (!db.objectStoreNames.contains("recordings")) {
//         db.createObjectStore("recordings", { keyPath: "id", autoIncrement: true });
//       }
//     };
//     request.onsuccess = (e) => {
//       const db = e.target.result;
//       const tx = db.transaction("recordings", "readwrite");
//       tx.objectStore("recordings").add({
//         blob,
//         date: new Date().toISOString(),
//         lat: userLocation.current.lat,
//         lon: userLocation.current.lon,
//       });
//     };

//     try {
//       const videoBase64 = await blobToBase64(blob);
//       await fetch("/api/evidence", {
//         method: "POST",
//         headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
//         body: JSON.stringify({ videoBase64, lat: userLocation.current.lat, lon: userLocation.current.lon, time: new Date().toISOString() }),
//       });
//       addSystemEvent("☁️ Evidence synced to server");
//     } catch (err) {
//       console.warn("Evidence sync failed:", err);
//       addSystemEvent("⚠️ Evidence saved locally only");
//     }

//     recordedChunksRef.current = [];
//   };

//   const startRecording = async () => {
//     try {
//       const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
//       recordedChunksRef.current = [];

//       const recorder = new MediaRecorder(stream, { mimeType: "video/webm" });
//       recorder.ondataavailable = (e) => {
//         if (e.data.size > 0) recordedChunksRef.current.push(e.data);
//       };
//       recorder.onstop = () => {
//         stream.getTracks().forEach((t) => t.stop());
//         saveAndUploadRecording();
//       };

//       mediaRecorderRef.current = recorder;
//       recorder.start();
//       addSystemEvent("🎥 Recording started");
//     } catch (err) {
//       console.warn("Could not start recording:", err);
//       addSystemEvent("⚠️ Camera/mic permission denied — recording skipped");
//     }
//   };

//   const stopRecording = () => {
//     if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
//       mediaRecorderRef.current.stop();
//     }
//   };

//   // Live speech-to-text while an alert is active. Runs entirely in the
//   // browser (Web Speech API) — no server call yet, this step just proves
//   // we can capture what's being said, shown in the System Events feed.
//   const startTranscription = () => {
//     const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
//     if (!SpeechRecognition) {
//       addSystemEvent("⚠️ Live transcript not supported on this browser (try Chrome)");
//       return;
//     }

//     const recognition = new SpeechRecognition();
//     recognition.continuous = true;
//     recognition.interimResults = false;
//     recognition.lang = "en-IN";

//     recognition.onresult = (event) => {
//       const lastResult = event.results[event.results.length - 1];
//       const text = lastResult[0].transcript.trim();
//       if (text) {
//         addSystemEvent(`🎙️ Heard: "${text}"`);
//         // Send to backend → NLP service → severity update broadcast
//         socket.emit("sos-transcript-chunk", {
//           text,
//           victimSocketId: socket.id,
//         });
//       }
//     };

//     recognition.onerror = (event) => {
//       console.warn("Speech recognition error:", event.error);
//       if (event.error === "not-allowed" || event.error === "service-not-allowed") {
//         addSystemEvent("⚠️ Microphone permission denied — live transcript unavailable");
//         keepListeningRef.current = false;
//       }
//     };

//     // Chrome (especially on mobile) auto-stops recognition after a short
//     // pause in speech. As long as the alert is still active, restart it
//     // immediately so listening doesn't silently die mid-emergency.
//     recognition.onend = () => {
//       if (keepListeningRef.current) {
//         try {
//           recognition.start();
//         } catch {
//           // already starting — safe to ignore
//         }
//       }
//     };

//     keepListeningRef.current = true;
//     recognitionRef.current = recognition;
//     try {
//       recognition.start();
//       addSystemEvent("🎙️ Live transcript started");
//     } catch (err) {
//       console.warn("Could not start speech recognition:", err);
//     }
//   };

//   const stopTranscription = () => {
//     keepListeningRef.current = false;
//     if (recognitionRef.current) {
//       recognitionRef.current.stop();
//       recognitionRef.current = null;
//     }
//   };

//   const handleAlert = () => {
//     if (!userLocation.current.lat) {
//       setStatusMessage("⚠️ Waiting for location... try again in a moment.");
//       return;
//     }
//     setAlertActive(true);
//     setStatusMessage("Sending alert...");
//     addSystemEvent("📍 Location captured, sending alert...");
//     socket.emit("sos-alert", { lat: userLocation.current.lat, lon: userLocation.current.lon, time: new Date().toISOString() });
//     startRecording();
//     startTranscription();
//   };

//   const handleForceStop = async () => {
//     if (!token) {
//       alert("⚠️ You need to be logged in to stop an alert with your account password.");
//       return;
//     }
//     const pass = prompt("Enter your account password to stop the alert:");
//     if (!pass) return;

//     let data;
//     try {
//       const res = await fetch("/api/auth/verify-password", {
//         method: "POST",
//         headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
//         body: JSON.stringify({ password: pass }),
//       });
//       data = await res.json();

//       if (!res.ok) {
//         // Token expired/invalid, or some other server-side problem —
//         // NOT the same as "wrong password". Show the real reason and
//         // make the user log back in rather than retrying the password.
//         alert(`⚠️ ${data.message || "Could not verify — please log in again."}`);
//         return;
//       }
//     } catch {
//       alert("⚠️ Could not verify password — server offline.");
//       return;
//     }

//     if (!data.valid) {
//       alert("❌ Incorrect password. Recording continues.");
//       return;
//     }

//     stopRecording();
//     stopTranscription();
//     socket.emit("emergency-ended", { time: new Date().toISOString() });
//   };

//   return (
//     <div className="home-page">
//       <div className="card">
//         <h1>Emergency Safety Button</h1>
//         <p>If you ever feel unsafe, tap this button once. We will alert nearby verified volunteers and your trusted contacts.</p>
//         <button className="alert-button" onClick={handleAlert} disabled={alertActive}>
//           TAP TO ALERT
//         </button>
//         <p>Single tap only. Your location and recording will start automatically.</p>
//         {statusMessage && <div className="status-message-box">{statusMessage}</div>}
//         {severity && (
//           <div className={`severity-badge severity-${severity}`}>
//             🧠 AI Severity: <strong>{severity.toUpperCase()}</strong>
//           </div>
//         )}
//         {distanceRemaining !== null && (
//           <div className="status-message-box" style={{ marginTop: "10px" }}>
//             📍 {respondingVolunteer} is <strong>{distanceRemaining} km</strong> away — updating live
//           </div>
//         )}
//         {alertActive && (
//           <button className="force-stop-btn" onClick={handleForceStop}>
//             🔴 FORCE STOP RECORDING
//           </button>
//         )}
//       </div>

//       <div className="card">
//         <h2>Volunteer Live Location Map</h2>
//         <div id="liveMap" ref={mapRef} style={{ height: "360px", borderRadius: "12px" }}></div>
//       </div>

//       <div className="status-grid">
//         <div className="status-card status-card-volunteers">
//           <div className="status-card-header">🟢 Volunteers Tracking</div>
//           <div className="status-card-body">
//             <p className="status-note">
//               {respondingVolunteer ? `${respondingVolunteer} is responding to your alert.` : "Live volunteer updates will appear here once a volunteer responds."}
//             </p>
//           </div>
//         </div>

//         <div className="status-card status-card-system">
//           <div className="status-card-header">🔵 System Events</div>
//           <div className="status-card-body scrollable-feed">
//             {systemEvents.length === 0 ? (
//               <p className="status-note">No events yet.</p>
//             ) : (
//               systemEvents.map((evt, i) => (
//                 <div key={i} className="status-item">
//                   <span className="status-message">{evt.message}</span>
//                   <span className="status-time">{evt.time}</span>
//                 </div>
//               ))
//             )}
//           </div>
//         </div>

//         <div className="status-card status-card-police full-span">
//           <div className="status-card-header">🚨 Police & Contacts</div>
//           <div className="status-card-body">
//             <p className="status-note">No updates yet.</p>
//           </div>
//         </div>
//       </div>

//       <div className="status-section">
//         <h3 className="status-title">How this SafeCircle works:</h3>
//         <ul>
//           <li>Tap the button — your live location and recording start automatically.</li>
//           <li>Nearby volunteers and your trusted contacts get notified in real time.</li>
//           <li>Recordings are securely synced to the server for evidence review.</li>
//         </ul>
//         <p className="status-note">Future scope: deeper police API integration, cloud-based evidence storage at scale.</p>
//       </div>
//     </div>
//   );
// }



import { useState, useEffect, useRef } from "react";
import { useSelector } from "react-redux";
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

export default function Home() {
  const token = useSelector((state) => state.auth.token);

  const [statusMessage, setStatusMessage] = useState("System ready. In real deployment, this will connect to live APIs.");
  const [alertActive, setAlertActive] = useState(false);
  const [systemEvents, setSystemEvents] = useState([]);
  const [respondingVolunteer, setRespondingVolunteer] = useState(null);
  const [distanceRemaining, setDistanceRemaining] = useState(null);
  const [severity, setSeverity] = useState(null);
  const userLocation = useRef({ lat: null, lon: null });
  const volunteerSocketId = useRef(null);
  const volunteerLocation = useRef({ lat: null, lon: null });
  const liveUpdateInterval = useRef(null);

  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const userMarker = useRef(null);
  const volunteerMarker = useRef(null);
  const routeLine = useRef(null);

  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const recognitionRef = useRef(null);
  const keepListeningRef = useRef(false);

  const addSystemEvent = (message) => {
    const time = new Date().toLocaleTimeString();
    setSystemEvents((prev) => [{ message, time }, ...prev]);
  };

  const drawRoute = async (vLat, vLon) => {
    if (!mapInstance.current) return;
    try {
      const res = await fetch("/api/route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat1: vLat, lon1: vLon, lat2: userLocation.current.lat, lon2: userLocation.current.lon }),
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
    if (!navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        userLocation.current = { lat: latitude, lon: longitude };
        if (mapInstance.current) {
          if (!userMarker.current) {
            userMarker.current = L.marker([latitude, longitude]).addTo(mapInstance.current).bindPopup("You are here");
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
    socket.on("alert-confirmed", (data) => {
      setStatusMessage(`Emergency alert sent. ${data.notified} volunteer(s) notified.`);
      addSystemEvent(`🚨 Alert sent — ${data.notified} volunteer(s) notified`);
    });

    socket.on("volunteer-accepted", (data) => {
      setRespondingVolunteer(data.volunteerName);
      setStatusMessage(`${data.volunteerName} is on the way!`);
      addSystemEvent(`🙋 ${data.volunteerName} is responding`);
      volunteerSocketId.current = data.volunteerSocketId;
      volunteerLocation.current = { lat: data.lat, lon: data.lon };

      if (mapInstance.current && data.lat && data.lon) {
        volunteerMarker.current = L.marker([data.lat, data.lon]).addTo(mapInstance.current).bindPopup(data.volunteerName);
        drawRoute(data.lat, data.lon);
        setDistanceRemaining(haversineKm(data.lat, data.lon, userLocation.current.lat, userLocation.current.lon).toFixed(2));
      }

      // start live two-way location sharing
      if (liveUpdateInterval.current) clearInterval(liveUpdateInterval.current);
      liveUpdateInterval.current = setInterval(() => {
        if (volunteerSocketId.current && userLocation.current.lat) {
          socket.emit("victim-location-update", {
            volunteerSocketId: volunteerSocketId.current,
            lat: userLocation.current.lat,
            lon: userLocation.current.lon,
          });
        }
      }, 8000);
    });

    socket.on("volunteer-location-update", (data) => {
      volunteerLocation.current = { lat: data.lat, lon: data.lon };
      if (volunteerMarker.current) {
        volunteerMarker.current.setLatLng([data.lat, data.lon]);
      }
      drawRoute(data.lat, data.lon);
      setDistanceRemaining(haversineKm(data.lat, data.lon, userLocation.current.lat, userLocation.current.lon).toFixed(2));
      addSystemEvent("📍 Volunteer location updated");
    });

    socket.on("emergency-stopped", () => {
      setAlertActive(false);
      setRespondingVolunteer(null);
      setDistanceRemaining(null);
      setSeverity(null);
      setStatusMessage("Emergency ended. System ready.");
      addSystemEvent("✅ Emergency ended");
      // Clear interval AND null it out so no stray location update fires
      clearInterval(liveUpdateInterval.current);
      liveUpdateInterval.current = null;
      volunteerSocketId.current = null;
      // Stop mic listening if emergency ended from outside (admin/volunteer side)
      stopTranscription();
      stopRecording();
    });

    socket.on("sos-severity-update", (data) => {
      setSeverity(data.severity);
      addSystemEvent(`🧠 AI: "${data.text}" → ${data.emotion.toUpperCase()} (${data.severity.toUpperCase()})`);
    });

    return () => {
      socket.off("alert-confirmed");
      socket.off("volunteer-accepted");
      socket.off("volunteer-location-update");
      socket.off("emergency-stopped");
      socket.off("sos-severity-update");
      if (liveUpdateInterval.current) clearInterval(liveUpdateInterval.current);
    };
  }, []);

  useEffect(() => {
    return () => stopTranscription();
  }, []);

  const blobToBase64 = (blob) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result.split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

  const saveAndUploadRecording = async () => {
    if (recordedChunksRef.current.length === 0) return;
    const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });

    const request = indexedDB.open("SafeCircleEvidenceDB", 1);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains("recordings")) {
        db.createObjectStore("recordings", { keyPath: "id", autoIncrement: true });
      }
    };
    request.onsuccess = (e) => {
      const db = e.target.result;
      const tx = db.transaction("recordings", "readwrite");
      tx.objectStore("recordings").add({
        blob,
        date: new Date().toISOString(),
        lat: userLocation.current.lat,
        lon: userLocation.current.lon,
      });
    };

    try {
      const videoBase64 = await blobToBase64(blob);
      await fetch("/api/evidence", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ videoBase64, lat: userLocation.current.lat, lon: userLocation.current.lon, time: new Date().toISOString() }),
      });
      addSystemEvent("☁️ Evidence synced to server");
    } catch (err) {
      console.warn("Evidence sync failed:", err);
      addSystemEvent("⚠️ Evidence saved locally only");
    }

    recordedChunksRef.current = [];
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      recordedChunksRef.current = [];

      const recorder = new MediaRecorder(stream, { mimeType: "video/webm" });
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        saveAndUploadRecording();
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      addSystemEvent("🎥 Recording started");
    } catch (err) {
      console.warn("Could not start recording:", err);
      addSystemEvent("⚠️ Camera/mic permission denied — recording skipped");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  };

  // Live speech-to-text while an alert is active. Runs entirely in the
  // browser (Web Speech API) — no server call yet, this step just proves
  // we can capture what's being said, shown in the System Events feed.
  const startTranscription = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      addSystemEvent("⚠️ Live transcript not supported on this browser (try Chrome)");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    // Use the browser's language automatically so the app works for any user
    // worldwide — Hindi, English, Arabic, French etc. Falls back to hi-IN
    // which also handles Hinglish (Hindi + English mix) well.
    recognition.lang = navigator.language || "hi-IN";

    recognition.onresult = (event) => {
      const lastResult = event.results[event.results.length - 1];
      const text = lastResult[0].transcript.trim();
      if (text) {
        addSystemEvent(`🎙️ Heard: "${text}"`);
        // Send to backend → NLP service → severity update broadcast
        socket.emit("sos-transcript-chunk", {
          text,
          victimSocketId: socket.id,
        });
      }
    };

    recognition.onerror = (event) => {
      console.warn("Speech recognition error:", event.error);
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        addSystemEvent("⚠️ Microphone permission denied — live transcript unavailable");
        keepListeningRef.current = false;
      }
    };

    // Chrome (especially on mobile) auto-stops recognition after a short
    // pause in speech. As long as the alert is still active, restart it
    // immediately so listening doesn't silently die mid-emergency.
    recognition.onend = () => {
      if (keepListeningRef.current) {
        try {
          recognition.start();
        } catch {
          // already starting — safe to ignore
        }
      }
    };

    keepListeningRef.current = true;
    recognitionRef.current = recognition;
    try {
      recognition.start();
      addSystemEvent("🎙️ Live transcript started");
    } catch (err) {
      console.warn("Could not start speech recognition:", err);
    }
  };

  const stopTranscription = () => {
    keepListeningRef.current = false;
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
  };

  const handleAlert = () => {
    if (!userLocation.current.lat) {
      setStatusMessage("⚠️ Waiting for location... try again in a moment.");
      return;
    }
    setAlertActive(true);
    setStatusMessage("Sending alert...");
    addSystemEvent("📍 Location captured, sending alert...");
    socket.emit("sos-alert", { lat: userLocation.current.lat, lon: userLocation.current.lon, time: new Date().toISOString() });
    startRecording();
    startTranscription();
  };

  const handleForceStop = async () => {
    if (!token) {
      alert("⚠️ You need to be logged in to stop an alert with your account password.");
      return;
    }
    const pass = prompt("Enter your account password to stop the alert:");
    if (!pass) return;

    let data;
    try {
      const res = await fetch("/api/auth/verify-password", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ password: pass }),
      });
      data = await res.json();

      if (!res.ok) {
        // Token expired/invalid, or some other server-side problem —
        // NOT the same as "wrong password". Show the real reason and
        // make the user log back in rather than retrying the password.
        alert(`⚠️ ${data.message || "Could not verify — please log in again."}`);
        return;
      }
    } catch {
      alert("⚠️ Could not verify password — server offline.");
      return;
    }

    if (!data.valid) {
      alert("❌ Incorrect password. Recording continues.");
      return;
    }

    stopRecording();
    stopTranscription();
    socket.emit("emergency-ended", { time: new Date().toISOString() });
  };

  return (
    <div className="home-page">
      <div className="card">
        <h1>Emergency Safety Button</h1>
        <p>If you ever feel unsafe, tap this button once. We will alert nearby verified volunteers and your trusted contacts.</p>
        <button className="alert-button" onClick={handleAlert} disabled={alertActive}>
          TAP TO ALERT
        </button>
        <p>Single tap only. Your location and recording will start automatically.</p>
        {statusMessage && <div className="status-message-box">{statusMessage}</div>}
        {severity && (
          <div className={`severity-badge severity-${severity}`}>
            🧠 AI Severity: <strong>{severity.toUpperCase()}</strong>
          </div>
        )}
        {distanceRemaining !== null && (
          <div className="status-message-box" style={{ marginTop: "10px" }}>
            📍 {respondingVolunteer} is <strong>{distanceRemaining} km</strong> away — updating live
          </div>
        )}
        {alertActive && (
          <button className="force-stop-btn" onClick={handleForceStop}>
            🔴 FORCE STOP RECORDING
          </button>
        )}
      </div>

      <div className="card">
        <h2>Volunteer Live Location Map</h2>
        <div id="liveMap" ref={mapRef} style={{ height: "360px", borderRadius: "12px" }}></div>
      </div>

      <div className="status-grid">
        <div className="status-card status-card-volunteers">
          <div className="status-card-header">🟢 Volunteers Tracking</div>
          <div className="status-card-body">
            <p className="status-note">
              {respondingVolunteer ? `${respondingVolunteer} is responding to your alert.` : "Live volunteer updates will appear here once a volunteer responds."}
            </p>
          </div>
        </div>

        <div className="status-card status-card-system">
          <div className="status-card-header">🔵 System Events</div>
          <div className="status-card-body scrollable-feed">
            {systemEvents.length === 0 ? (
              <p className="status-note">No events yet.</p>
            ) : (
              systemEvents.map((evt, i) => (
                <div key={i} className="status-item">
                  <span className="status-message">{evt.message}</span>
                  <span className="status-time">{evt.time}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="status-card status-card-police full-span">
          <div className="status-card-header">🚨 Police & Contacts</div>
          <div className="status-card-body">
            <p className="status-note">No updates yet.</p>
          </div>
        </div>
      </div>

      <div className="status-section">
        <h3 className="status-title">How this SafeCircle works:</h3>
        <ul>
          <li>Tap the button — your live location and recording start automatically.</li>
          <li>Nearby volunteers and your trusted contacts get notified in real time.</li>
          <li>Recordings are securely synced to the server for evidence review.</li>
        </ul>
        <p className="status-note">Future scope: deeper police API integration, cloud-based evidence storage at scale.</p>
      </div>
    </div>
  );
}
