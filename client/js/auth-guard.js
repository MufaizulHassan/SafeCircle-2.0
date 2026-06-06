// client/js/auth-guard.js
console.log("auth-guard.js loaded");

function getUser() {
  const raw = localStorage.getItem("sc_user");
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

function getToken() {
  return localStorage.getItem("sc_token");
}

// ===== GUARD FUNCTIONS =====

// only logged in users
function requireLogin() {
  const token = getToken();
  const user = getUser();
  if (!token || !user) {
    alert("Please login to access this page.");
    window.location.href = "login.html";
  }
}

// only admin
function requireAdmin() {
  const token = getToken();
  const user = getUser();
  if (!token || !user) {
    alert("Please login to access this page.");
    window.location.href = "login.html";
    return;
  }
  if (user.role !== "admin") {
    alert("❌ Access denied. Admins only.");
    window.location.href = "index.html";
  }
}

// only volunteers and admin
function requireVolunteer() {
  const token = getToken();
  const user = getUser();
  if (!token || !user) {
    alert("Please login to access this page.");
    window.location.href = "login.html";
    return;
  }
  if (user.role !== "volunteer" && user.role !== "admin") {
    alert("❌ Access denied. Volunteers only.");
    window.location.href = "index.html";
  }
}

// redirect logged in users away from login/signup
function redirectIfLoggedIn() {
  const token = getToken();
  const user = getUser();
  if (token && user) {
    window.location.href = "index.html";
  }
}