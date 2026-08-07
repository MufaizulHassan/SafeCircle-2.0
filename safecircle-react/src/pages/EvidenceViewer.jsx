import { useState, useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { apiFetch } from "../api/fetch";

export default function EvidenceViewer() {
  const { token, user } = useSelector((state) => state.auth);
  const [evidence, setEvidence] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const videoRef = useRef(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await apiFetch("/api/evidence", { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        if (data.success) {
          setEvidence(data.evidence);
          if (data.evidence.length > 0) setSelected(data.evidence[0]);
        }
      } catch (err) {
        console.warn("Failed to load evidence:", err);
      } finally {
        setLoading(false);
      }
    };
    if (token) load();
  }, [token]);

  const handleDelete = async (id) => {
    if (!confirm("Delete this recording permanently?")) return;
    await apiFetch(`/api/evidence/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    setEvidence((prev) => prev.filter((e) => e._id !== id));
    if (selected?._id === id) {
      const remaining = evidence.filter((e) => e._id !== id);
      setSelected(remaining.length > 0 ? remaining[0] : null);
    }
  };

  const handleSelect = (item) => {
    setSelected(item);
    if (videoRef.current) {
      videoRef.current.load();
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const formatTime = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  };

  const formatCoords = (lat, lon) => {
    if (!lat || !lon) return "Unknown location";
    return `${Number(lat).toFixed(4)}°N, ${Number(lon).toFixed(4)}°E`;
  };

  const getRelativeTime = (dateStr) => {
    const now = new Date();
    const then = new Date(dateStr);
    const diffMs = now - then;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDate(dateStr);
  };

  if (loading) {
    return (
      <div className="home-page">
        <div className="ev-loading">
          <div className="ev-loading-spinner"></div>
          <p>Loading evidence vault...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="home-page ev-page">

      {/* ===== HEADER ===== */}
      <div className="card ev-header">
        <div className="ev-header-left">
          <div className="ev-header-icon">🔒</div>
          <div>
            <h1 className="ev-title">Evidence Vault</h1>
            <p className="ev-subtitle">
              {user?.role === "admin"
                ? `${evidence.length} recording${evidence.length !== 1 ? "s" : ""} from all users`
                : `${evidence.length} synced recording${evidence.length !== 1 ? "s" : ""}`}
            </p>
          </div>
        </div>
        <div className="ev-header-badges">
          <span className="ev-badge ev-badge--secure">🛡️ Encrypted</span>
          <span className="ev-badge ev-badge--count">{evidence.length} files</span>
        </div>
      </div>

      {evidence.length === 0 ? (
        <div className="card ev-empty">
          <div className="ev-empty-icon">📁</div>
          <h2>No Evidence Recorded</h2>
          <p>Recordings from SOS alerts will appear here automatically.<br />All evidence is encrypted and securely stored.</p>
        </div>
      ) : (
        <div className="ev-layout">

          {/* ===== MAIN PLAYER ===== */}
          <div className="ev-player-col">
            <div className="ev-player-wrapper">
              <div className="ev-player-container">
                <video
                  ref={videoRef}
                  key={selected?._id}
                  src={selected ? `/api/evidence/${selected._id}/file?token=${token}` : ""}
                  controls
                  className="ev-video"
                  playsInline
                />
              </div>

              {/* Player info bar */}
              {selected && (
                <div className="ev-player-info">
                  <div className="ev-player-details">
                    <h2 className="ev-player-title">
                      Evidence Recording
                      <span className="ev-player-id">#{selected._id?.slice(-6).toUpperCase()}</span>
                    </h2>
                    <div className="ev-player-meta-row">
                      <span className="ev-meta-tag">
                        <span className="ev-meta-icon">👤</span>
                        {selected.user ? selected.user.name : "Anonymous"}
                      </span>
                      <span className="ev-meta-tag">
                        <span className="ev-meta-icon">📅</span>
                        {formatDate(selected.recordedAt)}
                      </span>
                      <span className="ev-meta-tag">
                        <span className="ev-meta-icon">🕐</span>
                        {formatTime(selected.recordedAt)}
                      </span>
                      <span className="ev-meta-tag">
                        <span className="ev-meta-icon">📍</span>
                        {formatCoords(selected.lat, selected.lon)}
                      </span>
                    </div>
                  </div>
                  <div className="ev-player-actions">
                    <a
                      href={`/api/evidence/${selected._id}/file?token=${token}`}
                      download
                      className="ev-action-btn ev-action-btn--download"
                    >
                      ⬇️ Download
                    </a>
                    <button
                      className="ev-action-btn ev-action-btn--delete"
                      onClick={() => handleDelete(selected._id)}
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ===== SIDEBAR PLAYLIST ===== */}
          <div className="ev-sidebar">
            <div className="ev-sidebar-header">
              <h3>📋 All Recordings</h3>
              <span className="ev-sidebar-count">{evidence.length}</span>
            </div>
            <div className="ev-sidebar-list">
              {evidence.map((item, index) => {
                const isActive = selected?._id === item._id;
                return (
                  <div
                    key={item._id}
                    className={`ev-sidebar-item ${isActive ? "ev-sidebar-item--active" : ""}`}
                    onClick={() => handleSelect(item)}
                  >
                    <div className="ev-sidebar-index">
                      {isActive ? (
                        <span className="ev-playing-icon">▶</span>
                      ) : (
                        <span>{index + 1}</span>
                      )}
                    </div>
                    <div className="ev-sidebar-thumb">
                      <span className="ev-thumb-play">▶</span>
                    </div>
                    <div className="ev-sidebar-info">
                      <div className="ev-sidebar-name">
                        Recording #{item._id?.slice(-6).toUpperCase()}
                      </div>
                      <div className="ev-sidebar-detail">
                        <span>{item.user ? item.user.name : "Anonymous"}</span>
                        <span className="ev-sidebar-dot">·</span>
                        <span>{getRelativeTime(item.recordedAt)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}