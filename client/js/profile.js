// client/js/profile.js
console.log("profile.js loaded");

const token = localStorage.getItem("sc_token");
const userRaw = localStorage.getItem("sc_user");

// redirect if not logged in
if (!token || !userRaw) {
  window.location.href = "login.html";
}

const user = JSON.parse(userRaw);

// ===== LOAD PROFILE =====
async function loadProfile() {
  try {
    const res = await fetch("/api/auth/profile", {
      headers: { Authorization: `Bearer ${token}` }
    });

    const data = await res.json();
    if (!data.success) {
      window.location.href = "login.html";
      return;
    }

    const u = data.user;

    // get initials
    const initials = u.name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

    // fill header
    document.getElementById("avatarCircle").textContent = initials;
    document.getElementById("profileName").textContent = u.name;
    document.getElementById("profileEmail").textContent = u.email;
    document.getElementById("profileRole").textContent = u.role;
    document.getElementById("profileJoined").textContent =
      `Member since ${new Date(u.createdAt).toLocaleDateString()}`;

    // fill form
    document.getElementById("editName").value = u.name;
    document.getElementById("editEmail").value = u.email;
    document.getElementById("editPhone").value = u.phone || "";

    // fill trusted contacts
    if (u.trustedContacts && u.trustedContacts[0]) {
      document.getElementById("c1Name").value = u.trustedContacts[0].name || "";
      document.getElementById("c1Phone").value = u.trustedContacts[0].phone || "";
    }
    if (u.trustedContacts && u.trustedContacts[1]) {
      document.getElementById("c2Name").value = u.trustedContacts[1].name || "";
      document.getElementById("c2Phone").value = u.trustedContacts[1].phone || "";
    }

  } catch (err) {
    console.error("Load profile error:", err);
  }
}

// ===== SAVE PROFILE =====
document.getElementById("saveProfileBtn").addEventListener("click", async () => {
  const status = document.getElementById("profileStatus");
  status.style.color = "#ffffff";
  status.textContent = "Saving...";

  const name = document.getElementById("editName").value.trim();
  const phone = document.getElementById("editPhone").value.trim();

  const contacts = [];
  const c1n = document.getElementById("c1Name").value.trim();
  const c1p = document.getElementById("c1Phone").value.trim();
  const c2n = document.getElementById("c2Name").value.trim();
  const c2p = document.getElementById("c2Phone").value.trim();

  if (c1n && c1p) contacts.push({ name: c1n, phone: c1p });
  if (c2n && c2p) contacts.push({ name: c2n, phone: c2p });

  if (!name) {
    status.style.color = "#ff9aa2";
    status.textContent = "Name cannot be empty.";
    return;
  }

  try {
    const res = await fetch("/api/auth/update-profile", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ name, phone, trustedContacts: contacts })
    });

    const data = await res.json();

    if (data.success) {
      // update localStorage
      localStorage.setItem("sc_token", data.token);
      localStorage.setItem("sc_user", JSON.stringify(data.user));

      status.style.color = "#9fffba";
      status.textContent = "✅ Profile updated successfully!";

      // update header
      const initials = data.user.name
        .split(" ")
        .map(n => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
      document.getElementById("avatarCircle").textContent = initials;
      document.getElementById("profileName").textContent = data.user.name;

    } else {
      status.style.color = "#ff9aa2";
      status.textContent = data.message || "Update failed.";
    }

  } catch (err) {
    status.style.color = "#ff9aa2";
    status.textContent = "Server error. Please try again.";
    console.error("Save profile error:", err);
  }
});

// ===== CHANGE PASSWORD =====
document.getElementById("changePassBtn").addEventListener("click", async () => {
  const status = document.getElementById("passStatus");
  status.style.color = "#ffffff";
  status.textContent = "Updating...";

  const currentPassword = document.getElementById("currentPass").value.trim();
  const newPassword = document.getElementById("newPass").value.trim();
  const confirmPassword = document.getElementById("confirmPass").value.trim();

  if (!currentPassword || !newPassword || !confirmPassword) {
    status.style.color = "#ff9aa2";
    status.textContent = "Please fill all password fields.";
    return;
  }

  if (newPassword !== confirmPassword) {
    status.style.color = "#ff9aa2";
    status.textContent = "New passwords do not match.";
    return;
  }

  if (newPassword.length < 6) {
    status.style.color = "#ff9aa2";
    status.textContent = "New password must be at least 6 characters.";
    return;
  }

  try {
    const res = await fetch("/api/auth/change-password", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ currentPassword, newPassword })
    });

    const data = await res.json();

    if (data.success) {
      status.style.color = "#9fffba";
      status.textContent = "✅ Password changed successfully!";
      document.getElementById("currentPass").value = "";
      document.getElementById("newPass").value = "";
      document.getElementById("confirmPass").value = "";
    } else {
      status.style.color = "#ff9aa2";
      status.textContent = data.message || "Failed to change password.";
    }

  } catch (err) {
    status.style.color = "#ff9aa2";
    status.textContent = "Server error. Please try again.";
    console.error("Change password error:", err);
  }
});

// ===== INIT =====
document.addEventListener("DOMContentLoaded", loadProfile);