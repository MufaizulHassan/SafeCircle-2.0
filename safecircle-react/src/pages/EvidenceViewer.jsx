import { useState, useEffect } from "react";
import { useSelector } from "react-redux";

export default function EvidenceViewer() {
  const { token, user } = useSelector((state) => state.auth);
  const [evidence, setEvidence] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/evidence", { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        if (data.success) setEvidence(data.evidence);
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
    await fetch(`/api/evidence/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    setEvidence((prev) => prev.filter((e) => e._id !== id));
  };

  return (
    <div className="home-page">
      <div className="card" style={{ textAlign: "left" }}>
        <h1>🔒 Evidence Vault</h1>
        <p>
          {user?.role === "admin"
            ? `Showing evidence from all users (${evidence.length} total).`
            : `Showing your own synced recordings (${evidence.length} total).`}
        </p>
      </div>

      <div className="evidence-grid" style={{ marginTop: "20px" }}>
        {loading ? (
          <p className="status-note">Loading evidence...</p>
        ) : evidence.length === 0 ? (
          <p className="status-note">No synced recordings yet.</p>
        ) : (
          evidence.map((item) => {
            const date = new Date(item.recordedAt);
            return (
              <div key={item._id} className="evidence-card">
                <video src={`/api/evidence/${item._id}/file?token=${token}`} controls></video>
                <div className="evidence-meta">
                  <span>📅 {date.toLocaleDateString()}</span>
                  <span>🕐 {date.toLocaleTimeString()}</span>
                  <span>👤 {item.user ? item.user.name : "Anonymous"}</span>
                </div>
                <button className="btn-delete" onClick={() => handleDelete(item._id)}>🗑 Delete</button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}