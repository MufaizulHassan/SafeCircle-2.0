// client/js/navbar.js
console.log("navbar.js loaded");

function loadNavbarUser() {
  const userRaw = localStorage.getItem("sc_user");
  if (!userRaw) return;

  const user = JSON.parse(userRaw);

  const navContainer = document.querySelector(".nav-container");
  if (!navContainer) return;

  if (document.getElementById("navProfile")) return;

  const profile = document.createElement("div");
  profile.id = "navProfile";
  profile.style.cssText = `
    display: flex;
    align-items: center;
    gap: 10px;
    position: relative;
  `;

  const initials = user.name
    .split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  profile.innerHTML = `
    <div style="
      width: 34px;
      height: 34px;
      border-radius: 50%;
      background: linear-gradient(135deg, #ff4b5c, #b00020);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.75rem;
      font-weight: 700;
      color: white;
      cursor: pointer;
      border: 2px solid rgba(255,255,255,0.2);
    " id="navAvatar" title="${user.name}">
      ${initials}
    </div>

    <div style="
      position: fixed;
      top: 70px;
      right: 20px;
      background: rgba(10, 15, 35, 0.98);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 14px;
      padding: 16px;
      min-width: 200px;
      display: none;
      z-index: 99999;
      box-shadow: 0 10px 40px rgba(0,0,0,0.6);
    " id="navDropdown">
      <div style="
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 12px;
      ">
        <div style="
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: linear-gradient(135deg, #ff4b5c, #b00020);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.85rem;
          font-weight: 700;
          color: white;
          flex-shrink: 0;
        ">${initials}</div>
        <div>
          <p style="font-weight:700; font-size:0.95rem; margin:0; color:#f9fafb;">${user.name}</p>
          <p style="font-size:0.75rem; color:#9ca3af; margin:2px 0 0;">${user.email}</p>
        </div>
      </div>

      <hr style="border-color: rgba(255,255,255,0.08); margin-bottom:12px;">

      <a href="profile.html" style="
        display: flex;
        align-items: center;
        gap: 8px;
        font-size:0.85rem;
        color:#e0e0ff;
        text-decoration:none;
        padding: 8px 10px;
        border-radius: 8px;
        transition: background 0.15s;
      " onmouseover="this.style.background='rgba(255,255,255,0.07)'"
         onmouseout="this.style.background='transparent'">
        👤 My Profile
      </a>

      <a href="evidence-viewer.html" style="
        display: flex;
        align-items: center;
        gap: 8px;
        font-size:0.85rem;
        color:#e0e0ff;
        text-decoration:none;
        padding: 8px 10px;
        border-radius: 8px;
        transition: background 0.15s;
      " onmouseover="this.style.background='rgba(255,255,255,0.07)'"
         onmouseout="this.style.background='transparent'">
        🔒 Evidence Vault
      </a>

      <a href="volunteer-dashboard.html" style="
        display: flex;
        align-items: center;
        gap: 8px;
        font-size:0.85rem;
        color:#e0e0ff;
        text-decoration:none;
        padding: 8px 10px;
        border-radius: 8px;
        transition: background 0.15s;
      " onmouseover="this.style.background='rgba(255,255,255,0.07)'"
         onmouseout="this.style.background='transparent'">
        🟢 Volunteer Dashboard
      </a>

      <hr style="border-color: rgba(255,255,255,0.08); margin: 10px 0;">

      <button id="logoutBtn" style="
        width:100%;
        padding: 9px;
        background: rgba(255,75,92,0.15);
        border: 1px solid rgba(255,75,92,0.4);
        border-radius: 8px;
        color: #ff4b5c;
        font-size:0.85rem;
        font-weight:600;
        cursor:pointer;
        transition: background 0.15s;
      " onmouseover="this.style.background='rgba(255,75,92,0.25)'"
         onmouseout="this.style.background='rgba(255,75,92,0.15)'">
        🚪 Logout
      </button>
    </div>
  `;

  navContainer.appendChild(profile);

  // toggle dropdown
  document.getElementById("navAvatar").addEventListener("click", (e) => {
    e.stopPropagation();
    const dropdown = document.getElementById("navDropdown");
    dropdown.style.display =
      dropdown.style.display === "none" ? "block" : "none";
  });

  // close dropdown when clicking outside
  document.addEventListener("click", (e) => {
    const dropdown = document.getElementById("navDropdown");
    const avatar = document.getElementById("navAvatar");
    if (dropdown && !dropdown.contains(e.target) && e.target !== avatar) {
      dropdown.style.display = "none";
    }
  });

  // logout
  document.getElementById("logoutBtn").addEventListener("click", () => {
    localStorage.removeItem("sc_token");
    localStorage.removeItem("sc_user");
    window.location.href = "login.html";
  });
}

document.addEventListener("DOMContentLoaded", loadNavbarUser);