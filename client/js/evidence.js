// js/evidence.js
console.log("evidence.js loaded");

let db;

// ===== OPEN INDEXEDDB =====
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("SafeCircleEvidenceDB", 1);

    req.onupgradeneeded = (e) => {
      e.target.result.createObjectStore("videos", { autoIncrement: true });
    };

    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e);
  });
}

// ===== LOAD ALL VIDEOS =====
async function loadEvidences() {
  const grid = document.getElementById("evidenceGrid");

  try {
    db = await openDB();
    const tx = db.transaction("videos", "readonly");
    const store = tx.objectStore("videos");

    const allKeys = await new Promise((res) => {
      store.getAllKeys().onsuccess = (e) => res(e.target.result);
    });

    const allVideos = await new Promise((res) => {
      store.getAll().onsuccess = (e) => res(e.target.result);
    });

    if (allVideos.length === 0) {
      grid.innerHTML = `
        <div class="empty-state">
          <h2>No recordings found</h2>
          <p>Emergency recordings will appear here after you trigger an alert.</p>
        </div>
      `;
      updateStats([], 0);
      return;
    }

    // update stats
    const totalSize = allVideos.reduce((acc, v) => acc + (v.video?.size || 0), 0);
    updateStats(allVideos, totalSize);

    // render cards
    grid.innerHTML = "";
    allVideos.forEach((entry, i) => {
      const key = allKeys[i];
      const url = URL.createObjectURL(entry.video);
      const date = new Date(entry.time);
      const sizeKB = ((entry.video?.size || 0) / 1024).toFixed(1);

      const card = document.createElement("div");
      card.className = "evidence-card";
      card.id = `card-${key}`;

      card.innerHTML = `
        <video src="${url}" controls></video>
        <div class="evidence-meta">
          <span>📅 ${date.toLocaleDateString()}</span>
          <span>🕐 ${date.toLocaleTimeString()}</span>
          <span>💾 ${sizeKB} KB</span>
          <span>🔑 ID: ${key}</span>
        </div>
        <div class="evidence-actions">
          <button class="btn-download" data-url="${url}" data-time="${entry.time}">
            ⬇ Download
          </button>
          <button class="btn-delete" data-key="${key}">
            🗑 Delete
          </button>
        </div>
      `;

      // download
      card.querySelector(".btn-download").addEventListener("click", (e) => {
        const a = document.createElement("a");
        a.href = e.target.dataset.url;
        a.download = `evidence_${e.target.dataset.time}.webm`;
        a.click();
      });

      // delete
      card.querySelector(".btn-delete").addEventListener("click", (e) => {
        const k = parseInt(e.target.dataset.key);
        deleteEvidence(k, card);
      });

      grid.appendChild(card);
    });

  } catch (err) {
    console.error("Evidence load error:", err);
    grid.innerHTML = `
      <div class="empty-state">
        <h2>Failed to load evidence</h2>
        <p>Check console for details.</p>
      </div>
    `;
  }
}

// ===== UPDATE STATS =====
function updateStats(videos, totalBytes) {
  document.getElementById("totalCount").textContent = videos.length;
  document.getElementById("totalSize").textContent =
    (totalBytes / (1024 * 1024)).toFixed(2) + " MB";

  if (videos.length > 0) {
    const latest = new Date(videos[videos.length - 1].time);
    document.getElementById("latestDate").textContent =
      latest.toLocaleDateString();
  } else {
    document.getElementById("latestDate").textContent = "—";
  }
}

// ===== DELETE ONE =====
function deleteEvidence(key, cardEl) {
  if (!confirm("Delete this recording permanently?")) return;

  const tx = db.transaction("videos", "readwrite");
  tx.objectStore("videos").delete(key);
  tx.oncomplete = () => {
    cardEl.remove();
    console.log(`Deleted key: ${key}`);

    // reload stats
    loadEvidences();
  };
}

// ===== CLEAR ALL =====
document.addEventListener("DOMContentLoaded", () => {
  loadEvidences();

  document.getElementById("clearAllBtn").addEventListener("click", async () => {
    if (!confirm("Delete ALL recordings permanently? This cannot be undone.")) return;

    const tx = db.transaction("videos", "readwrite");
    tx.objectStore("videos").clear();
    tx.oncomplete = () => {
      console.log("All evidence cleared");
      loadEvidences();
    };
  });
});