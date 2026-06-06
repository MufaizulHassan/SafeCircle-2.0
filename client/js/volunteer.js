// js/volunteer.js
console.log("volunteer.js loaded");

// Backend URL
const BACKEND = "http://localhost:4000";

// ---------------------------------------------
// Helpers
// ---------------------------------------------
function loadVolunteers() {
  try {
    const raw = localStorage.getItem("safe_circle_volunteers_demo");
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveVolunteers(list) {
  localStorage.setItem("safe_circle_volunteers_demo", JSON.stringify(list));
}

function isValidPhone(p) {
  if (!p) return false;
  const digits = p.replace(/\D/g, "");
  return digits.length >= 10;
}

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ---------------------------------------------
// MAIN
// ---------------------------------------------
document.addEventListener("DOMContentLoaded", () => {

  // OTP Button
  const sendVolOtpBtn = document.getElementById("sendVolOtp");
  const otpStatus = document.getElementById("otpStatus");

  if (sendVolOtpBtn) {
    sendVolOtpBtn.addEventListener("click", async () => {
      const email = document.getElementById("vEmail").value.trim();

      if (!email) {
        otpStatus.style.color = "#ff9aa2";
        otpStatus.textContent = "Please enter your email first.";
        return;
      }

      otpStatus.style.color = "#ffffff";
      otpStatus.textContent = "Sending OTP...";

      try {
        const res = await fetch(`${BACKEND}/send-otp`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email })
        });
        const data = await res.json();
        if (data.success) {
          otpStatus.style.color = "#9fffba";
          otpStatus.textContent = "OTP sent ✔ Check your email.";
        } else {
          otpStatus.style.color = "#ff9aa2";
          otpStatus.textContent = "Failed to send OTP ❌";
        }
      } catch {
        // backend offline — demo mode
        otpStatus.style.color = "#facc15";
        otpStatus.textContent = "⚠️ Demo mode — check browser console for OTP.";
        console.warn("⚠️ Backend offline. Demo OTP would be sent here.");
      }
    });
  }

  const volunteerForm = document.getElementById("volunteerForm");
  const volunteerStatus = document.getElementById("volunteerStatus");
  const volClear = document.getElementById("volClear");

  if (!volunteerForm) return;

  volunteerForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    volunteerStatus.textContent = "";
    volunteerStatus.style.color = "#ff9aa2";

    // Collect details
    const v = {
      id: "v_" + Date.now(),
      name: document.getElementById("vName").value.trim(),
      email: document.getElementById("vEmail").value.trim(),
      phone: document.getElementById("vPhone").value.trim(),
      city: document.getElementById("vCity").value.trim(),
      age: document.getElementById("vAge").value.trim(),
      availability: document.getElementById("vAvailability").value,
      transport: document.getElementById("vTransport").value,
      languages: document.getElementById("vLang").value.trim(),
      notes: document.getElementById("vNotes").value.trim(),
      emergencyName: document.getElementById("vEmergencyName").value.trim(),
      emergencyPhone: document.getElementById("vEmergencyPhone").value.trim(),
      proof: document.getElementById("vProof").value.trim(),
      createdAt: new Date().toISOString(),
      verified: false
    };

    // VALIDATION (unchanged)
    if (!v.name || !v.phone || !v.city || !v.availability) {
      volunteerStatus.textContent = "Please complete required fields (*) before submitting.";
      return;
    }
    if (!isValidPhone(v.phone)) {
      volunteerStatus.textContent = "Please provide a valid phone number.";
      return;
    }
    if (v.emergencyPhone && !isValidPhone(v.emergencyPhone)) {
      volunteerStatus.textContent = "Please provide a valid emergency phone number.";
      return;
    }
    if (!document.getElementById("volAgree").checked) {
      volunteerStatus.textContent = "Please agree to the guidelines before submitting.";
      return;
    }

    // ---------------------------------------------------------
    // STEP 1 → Generate OTP
    // ---------------------------------------------------------
    const otp = generateOTP();
    console.log("Generated OTP:", otp);

    // ---------------------------------------------------------
    // STEP 2 → Send OTP Email (with demo fallback)
    let otpDelivered = false;

    try {
      const res = await fetch(`${BACKEND}/send-volunteer-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: v.email, otp, name: v.name })
      });
      const data = await res.json();
      if (data.success) otpDelivered = true;
    } catch (err) {
      // backend down — fall through to demo mode
    }

    if (!otpDelivered) {
      // DEMO MODE — log OTP to console, notify user
      console.warn("⚠️ Backend offline. Demo OTP:", otp);
      volunteerStatus.style.color = "#facc15";
      volunteerStatus.textContent = "⚠️ Demo mode — check browser console for OTP.";
    }

    // ---------------------------------------------------------
    // STEP 3 → Ask Volunteer to Enter OTP
    // ---------------------------------------------------------
    const userOTP = prompt("We sent a verification OTP to your email. Please enter it:");

    if (!userOTP) {
      volunteerStatus.textContent = "OTP verification cancelled.";
      return;
    }

    if (userOTP !== otp) {
      volunteerStatus.textContent = "Incorrect OTP — Please try again.";
      return;
    }

    // VERIFIED ✔
    v.verified = true;

    // ---------------------------------------------------------
    // STEP 4 → Save volunteer locally
    // ---------------------------------------------------------
    const list = loadVolunteers();
    list.push(v);
    saveVolunteers(list);

    volunteerStatus.style.color = "#9fffba";
    volunteerStatus.textContent = "Your volunteer account is verified & registered!";
    volunteerForm.reset();

    // Add to global volunteerDatabase for demo
    try {
      if (window.volunteerDatabase && Array.isArray(window.volunteerDatabase)) {
        const demoLat = 28.561 + Math.random() * 0.02 - 0.01;
        const demoLon = 77.07 + Math.random() * 0.02 - 0.01;
        window.volunteerDatabase.push({
          id: v.id,
          name: v.name,
          lat: demoLat,
          lon: demoLon,
          area: v.city
        });
      }
    } catch (err) {}
  });

  // Reset button
  if (volClear) {
    volClear.addEventListener("click", () => {
      volunteerForm.reset();
      volunteerStatus.textContent = "";
    });
  }
});
