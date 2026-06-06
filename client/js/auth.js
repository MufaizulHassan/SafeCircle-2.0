// js/auth.js
console.log("auth.js loaded");

// ================== TRUSTED CONTACTS SAVE HELPER ==================
function saveTrustedContacts(userId, contacts) {
  let all = JSON.parse(localStorage.getItem("safe_circle_contacts") || "{}");
  all[userId] = contacts;
  localStorage.setItem("safe_circle_contacts", JSON.stringify(all));
  console.log("Saved contacts for:", userId, contacts);
}

// ================== SIGNUP FORM (USER) ==================
document.addEventListener("DOMContentLoaded", () => {
  const signupForm = document.getElementById("signupForm");
  const signupStatus = document.getElementById("signupStatus");

  if (signupForm && signupStatus) {
    signupForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const name = document.getElementById("fullName").value.trim();
      const email = document.getElementById("email").value.trim();
      const phone = document.getElementById("phone").value.trim();
      const pass = document.getElementById("password").value.trim();
      const cpass = document.getElementById("confirmPassword").value.trim();

      // trusted contacts
      const c1n = document.getElementById("contactName1")?.value.trim();
      const c1p = document.getElementById("contactPhone1")?.value.trim();
      const c2n = document.getElementById("contactName2")?.value.trim();
      const c2p = document.getElementById("contactPhone2")?.value.trim();

      const contacts = [];
      if (c1n && c1p) contacts.push({ name: c1n, phone: c1p });
      if (c2n && c2p) contacts.push({ name: c2n, phone: c2p });

      signupStatus.style.color = "#ff9aa2";

      // validation
      if (!name || !email || !phone || !pass || !cpass) {
        signupStatus.textContent = "Please fill all required fields.";
        return;
      }

      if (pass !== cpass) {
        signupStatus.textContent = "Passwords do not match.";
        return;
      }

      signupStatus.style.color = "#ffffff";
      signupStatus.textContent = "Creating account...";

      try {
        const res = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            email,
            phone,
            password: pass,
            trustedContacts: contacts
          })
        });

        const data = await res.json();

        if (data.success) {
          // save token and user info
          localStorage.setItem("sc_token", data.token);
          localStorage.setItem("sc_user", JSON.stringify(data.user));

          signupStatus.style.color = "#9fffba";
          signupStatus.textContent = "Account created successfully! Redirecting...";

          setTimeout(() => {
            window.location.href = "index.html";
          }, 1200);

        } else {
          signupStatus.style.color = "#ff9aa2";
          signupStatus.textContent = data.message || "Signup failed.";
        }

      } catch (err) {
        signupStatus.style.color = "#ff9aa2";
        signupStatus.textContent = "Server error. Please try again.";
        console.error("Signup error:", err);
      }
    });
  }

  // ================== LOGIN FORM ==================
  const loginForm = document.getElementById("loginForm");

  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const email = document.getElementById("loginEmail").value.trim();
      const password = document.getElementById("loginPassword").value.trim();

      if (!email || !password) {
        alert("Please enter both email and password.");
        return;
      }

      // show loading
      const loginBtn = loginForm.querySelector("button[type='submit']");
      loginBtn.textContent = "Logging in...";
      loginBtn.disabled = true;

      try {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password })
        });

        const data = await res.json();

        if (data.success) {
          // save token and user
          localStorage.setItem("sc_token", data.token);
          localStorage.setItem("sc_user", JSON.stringify(data.user));

          window.location.href = "index.html";

        } else {
          loginBtn.textContent = "Log in";
          loginBtn.disabled = false;
          alert(data.message || "Login failed.");
        }

      } catch (err) {
        loginBtn.textContent = "Log in";
        loginBtn.disabled = false;
        alert("Server error. Please try again.");
        console.error("Login error:", err);
      }
    });
  }

  // ================== VOLUNTEER FORM ==================
  const volunteerForm = document.getElementById("volunteerForm");
  const volunteerStatus = document.getElementById("volunteerStatus");

  if (volunteerForm && volunteerStatus) {
    volunteerForm.addEventListener("submit", (e) => {
      e.preventDefault();

      const name = document.getElementById("volName").value.trim();
      const email = document.getElementById("volEmail").value.trim();
      const phone = document.getElementById("volPhone").value.trim();
      const city = document.getElementById("volCity").value.trim();
      const age = document.getElementById("volAge").value.trim();
      const availability = document.getElementById("volAvailability").value;
      const agree = document.getElementById("volAgree").checked;

      volunteerStatus.style.color = "#ff9aa2";

      if (!name || !email || !phone || !city || !age || !availability) {
        volunteerStatus.textContent = "Please complete all required fields.";
        return;
      }

      if (!agree) {
        volunteerStatus.textContent =
          "Please agree to the guidelines before submitting.";
        return;
      }

      volunteerStatus.textContent =
        "Thank you for volunteering! Your demo application has been recorded.";
      volunteerStatus.style.color = "#9fffba";

      volunteerForm.reset();
    });
  }
});
