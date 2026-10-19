import { useState, useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet default marker icon broken by bundler
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "/icons/marker-icon-red.png",
  iconUrl: "/icons/marker-icon-red.png",
  shadowUrl: "/icons/marker-shadow.png",
});

const userIcon = L.icon({
  iconUrl: "/icons/marker-icon-red.png",
  shadowUrl: "/icons/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const volunteerIcon = L.icon({
  iconUrl: "/icons/marker-icon-green.png",
  shadowUrl: "/icons/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

import { socket, connectSocket } from "../socket";
import { apiFetch } from "../api/fetch";

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
  const emergencyIdRef = useRef(null);

  const addSystemEvent = (message) => {
    const time = new Date().toLocaleTimeString();
    setSystemEvents((prev) => [{ message, time }, ...prev]);
  };

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
      await apiFetch("/api/evidence", {
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

  const startTranscription = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      addSystemEvent("⚠️ Live transcript not supported on this browser (try Chrome)");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = navigator.language || "hi-IN";

    recognition.onresult = (event) => {
      const lastResult = event.results[event.results.length - 1];
      const text = lastResult[0].transcript.trim();
      if (text) {
        addSystemEvent(`🎙️ Heard: "${text}"`);
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

    recognition.onend = () => {
      if (keepListeningRef.current) {
        try {
          recognition.start();
        } catch {
          // already starting — safe to ignore
        }
      }
    };

    recognitionRef.current = recognition;
    keepListeningRef.current = true;
    try {
      recognition.start();
      addSystemEvent("🎙️ Live speech listening started");
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

  const drawRoute = async (vLat, vLon) => {
    if (!mapInstance.current) return;
    try {
      const res = await apiFetch("/api/route", {
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
            userMarker.current = L.marker([latitude, longitude], { icon: userIcon }).addTo(mapInstance.current).bindPopup("You are here");
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
    connectSocket();

    socket.on("existing-emergency-restored", (data) => {
      emergencyIdRef.current = data.emergencyId;
      setAlertActive(true);
      setStatusMessage("Existing emergency restored.");
      addSystemEvent("⚠️ Reconnected to active emergency");
      startRecording();
      startTranscription();
    });

    socket.on("alert-confirmed", (data) => {
      if (data.emergencyId) emergencyIdRef.current = data.emergencyId;
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
        volunteerMarker.current = L.marker([data.lat, data.lon], { icon: volunteerIcon }).addTo(mapInstance.current).bindPopup(data.volunteerName);
        drawRoute(data.lat, data.lon);
        setDistanceRemaining(haversineKm(data.lat, data.lon, userLocation.current.lat, userLocation.current.lon).toFixed(2));
      }

      // start live two-way location sharing
      if (liveUpdateInterval.current) clearInterval(liveUpdateInterval.current);
      liveUpdateInterval.current = setInterval(() => {
        if (volunteerSocketId.current && userLocation.current.lat) {
          socket.emit("victim-location-update", {
            volunteerSocketId: volunteerSocketId.current,
            emergencyId: emergencyIdRef.current,
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
      clearInterval(liveUpdateInterval.current);
      liveUpdateInterval.current = null;
      emergencyIdRef.current = null;
      volunteerSocketId.current = null;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => stopTranscription();
  }, []);

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
      const res = await apiFetch("/api/auth/verify-password", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ password: pass }),
      });
      data = await res.json();

      if (!res.ok) {
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
    socket.emit("emergency-ended", { time: new Date().toISOString(), emergencyId: emergencyIdRef.current });
  };

  return (
    <div className="home-page">
      {/* ===== EMERGENCY CARD ===== */}
      <div className={`card main-card ${alertActive ? "main-card--active" : ""}`}>
        <div className="card-top-pill">
          <span className={`status-beacon ${alertActive ? "status-beacon--danger" : "status-beacon--standby"}`}></span>
          <span>{alertActive ? "🚨 EMERGENCY PROTOCOL ACTIVE" : "RAPID RESPONSE NETWORK READY"}</span>
        </div>

        <div className="card-header">
          <h1>Emergency Safety Button</h1>
          <p>
            If you ever feel unsafe, tap the emergency button. SafeCircle will instantly capture your
            live coordinates, stream evidence recording, and notify verified community volunteers.
          </p>
        </div>

        {/* SOS Button With Outer Radar Rings */}
        <div className="button-wrapper">
          <div className={`sos-pulse-layer ${alertActive ? "sos-pulse-layer--active" : ""}`}></div>
          <button
            id="alertButton"
            className={`alert-button ${alertActive ? "alert-button--active" : ""}`}
            onClick={handleAlert}
            disabled={alertActive}
            aria-label="Emergency SOS trigger button"
          >
            <span className="alert-content">
              <span className="alert-icon" aria-hidden="true">🆘</span>
              <span className="alert-text">{alertActive ? "ALERT SENT" : "TAP TO ALERT"}</span>
              <span className="alert-subtext">{alertActive ? "BROADCASTING LIVE" : "ONE-TAP DISPATCH"}</span>
            </span>
          </button>
        </div>

        <div className="emergency-instruction-tag">
          <span className="instruction-dot"></span>
          <span>Single tap activates live GPS tracking, camera/mic evidence capture, and SMS/socket dispatch.</span>
        </div>

        {/* Status Messages & Telemetry */}
        {statusMessage && (
          <div className={`status-message-box ${alertActive ? "status-message-box--active" : ""}`}>
            <span className="status-msg-icon">{alertActive ? "🚨" : "🛡️"}</span>
            <span className="status-msg-text">{statusMessage}</span>
          </div>
        )}

        {/* AI Severity Indicator */}
        {severity && (
          <div className={`severity-badge severity-${severity}`}>
            <span className="severity-icon">🧠</span>
            <span>AI Incident Severity: <strong>{severity.toUpperCase()}</strong></span>
          </div>
        )}

        {/* Responder Distance Banner */}
        {distanceRemaining !== null && (
          <div className="status-message-box status-message-box--responder">
            <span className="status-msg-icon">🏃‍♂️</span>
            <span className="status-msg-text">
              <strong>{respondingVolunteer}</strong> is en route — <strong>{distanceRemaining} km</strong> away
            </span>
            <span className="responder-badge">RESPONDING</span>
          </div>
        )}

        {/* Force Stop Control */}
        {alertActive && (
          <div className="force-stop-wrapper">
            <button className="force-stop-btn" onClick={handleForceStop}>
              <span className="force-stop-icon">🔒</span>
              <span>STOP RECORDING & END ALERT</span>
            </button>
            <p className="force-stop-hint">Requires your secret account password to prevent unauthorized termination.</p>
          </div>
        )}
      </div>

      {/* ===== MAP CARD ===== */}
      <div className="card map-card">
        <div className="map-card-header">
          <div className="map-header-left">
            <span className="map-header-icon">🗺️</span>
            <div>
              <h2>Volunteer Live Location Map</h2>
              <p>Real-time telemetry showing your GPS position and the incoming volunteer's route.</p>
            </div>
          </div>
          <div className="map-legend-pill">
            <span className="legend-marker legend-marker--user"></span> You
            <span className="legend-marker legend-marker--vol"></span> Volunteer
          </div>
        </div>
        <div id="liveMap" ref={mapRef} style={{ height: "380px", borderRadius: "14px" }}></div>
      </div>

      {/* ===== STATUS GRID ===== */}
      <div className="status-grid">
        <div className="status-card status-card-volunteers">
          <div className="status-card-header">
            <span className="status-card-badge status-card-badge--green">🟢</span>
            <span>Volunteers Tracking</span>
          </div>
          <div className="status-card-body">
            {respondingVolunteer ? (
              <div className="volunteer-active-info">
                <div className="volunteer-avatar-pill">
                  <span>{respondingVolunteer?.[0]?.toUpperCase() || "V"}</span>
                </div>
                <div>
                  <div className="volunteer-active-name">{respondingVolunteer}</div>
                  <div className="volunteer-active-status">En route to your coordinates</div>
                </div>
              </div>
            ) : (
              <p className="status-note">
                Live volunteer updates will appear here automatically once a nearby responder accepts.
              </p>
            )}
          </div>
        </div>

        <div className="status-card status-card-system">
          <div className="status-card-header">
            <span className="status-card-badge status-card-badge--blue">🔵</span>
            <span>System Telemetry Events</span>
            {systemEvents.length > 0 && <span className="event-count-chip">{systemEvents.length}</span>}
          </div>
          <div className="status-card-body scrollable-feed">
            {systemEvents.length === 0 ? (
              <p className="status-note">No system events logged yet. Standby mode active.</p>
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
          <div className="status-card-header">
            <span className="status-card-badge status-card-badge--red">🚨</span>
            <span>Police Dispatch & Emergency Services</span>
          </div>
          <div className="status-card-body">
            <div className="police-dispatch-row">
              <span className="police-pill">112 INTEGRATED</span>
              <p className="status-note">
                Emergency broadcast packets are prepared for rapid dispatch to public safety answering points.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ===== HOW IT WORKS SECTION ===== */}
      <div className="status-section">
        <div className="status-section-header">
          <span className="section-step-icon">🛡️</span>
          <div>
            <h3 className="status-title">How SafeCircle Protects You</h3>
            <p className="status-desc">A redundant, multi-tier safety architecture activated in milliseconds.</p>
          </div>
        </div>

        <div className="how-it-works-grid">
          <div className="how-step-card">
            <div className="how-step-num">01</div>
            <h4>Instant Incident Trigger</h4>
            <p>One tap engages camera, microphone, and high-precision GPS positioning without delay.</p>
          </div>

          <div className="how-step-card">
            <div className="how-step-num">02</div>
            <h4>Volunteer & Contact Mesh</h4>
            <p>Verified responders within a 5 km radius receive animated route directions and distance tracking.</p>
          </div>

          <div className="how-step-card">
            <div className="how-step-num">03</div>
            <h4>Tamper-Proof Evidence</h4>
            <p>Audio-visual evidence is mirrored to encrypted storage and can only be dismissed with your password.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
