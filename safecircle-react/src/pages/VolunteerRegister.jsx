import { useState } from "react";
import { useSelector } from "react-redux";

export default function VolunteerRegister() {
  const { token, user } = useSelector((state) => state.auth);

  const [form, setForm] = useState({
    fullName: user?.name || "", email: user?.email || "", otp: "",
    phone: user?.phone || "", city: "", age: "", availability: "",
    transport: "No vehicle", languages: "", note: "",
    emergencyContactName: "", emergencyContactPhone: "", idProof: "", agree: false,
  });

  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpMessage, setOtpMessage] = useState("");
  const [status, setStatus] = useState(user?.volunteerStatus || "none");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({ ...form, [name]: type === "checkbox" ? checked : value });
  };

  const handleSendOtp = async () => {
    if (!form.email) return setOtpMessage("Enter an email first");
    try {
      const res = await fetch("/api/auth/send-volunteer-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email: form.email }),
      });
      const data = await res.json();
      setOtpSent(true);
      setOtpMessage(data.message);
    } catch {
      setOtpMessage("Could not send OTP — server offline");
    }
  };

  const handleVerifyOtp = async () => {
    try {
      const res = await fetch("/api/auth/verify-volunteer-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email: form.email, otp: form.otp }),
      });
      const data = await res.json();
      if (data.valid) {
        setOtpVerified(true);
        setOtpMessage("✅ Email verified");
      } else {
        setOtpMessage("❌ Incorrect or expired OTP");
      }
    } catch {
      setOtpMessage("Could not verify OTP — server offline");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    if (!form.agree) return setMessage("Please agree to the SafeCircle guidelines");

    setLoading(true);
    try {
      const res = await fetch("/api/auth/apply-volunteer", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        setStatus("pending");
        setMessage("✅ Application submitted! Admin will review it shortly.");
      } else {
        setMessage(data.message || "Submission failed");
      }
    } catch {
      setMessage("⚠️ Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  if (user?.role === "volunteer" || user?.role === "admin") {
    return (
      <div className="home-page">
        <div className="card" style={{ textAlign: "left" }}>
          <h1>🙋 Become a Volunteer</h1>
          <div className="status-message-box">✅ You're already an approved volunteer!</div>
        </div>
      </div>
    );
  }

  if (status === "pending") {
    return (
      <div className="home-page">
        <div className="card" style={{ textAlign: "left" }}>
          <h1>🙋 Become a Volunteer</h1>
          <div className="status-message-box">⏳ Your application is pending admin approval.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="home-page">
      <div className="card" style={{ textAlign: "left" }}>
        <h1>Volunteer Registration</h1>
        <p>Help your community. Fill the form to register as a verified volunteer.</p>

        <form className="auth-card" onSubmit={handleSubmit} style={{ background: "transparent", padding: 0, marginTop: "16px" }}>
          {message && <p className="auth-error">{message}</p>}

          <label>Full name *</label>
          <input name="fullName" value={form.fullName} onChange={handleChange} required />

          <label>Email</label>
          <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="you@example.com" required />

          <div className="otp-row">
            <input name="otp" value={form.otp} onChange={handleChange} placeholder="6-digit OTP" maxLength={6} disabled={otpVerified} />
            {otpVerified ? (
              <button type="button" className="otp-btn otp-verified" disabled>✅ Verified</button>
            ) : otpSent ? (
              <button type="button" className="otp-btn" onClick={handleVerifyOtp}>Verify OTP</button>
            ) : (
              <button type="button" className="otp-btn" onClick={handleSendOtp}>Send OTP</button>
            )}
          </div>
          {otpMessage && <p className="status-note" style={{ margin: "4px 0 0" }}>{otpMessage}</p>}

          <label>Phone *</label>
          <input name="phone" value={form.phone} onChange={handleChange} required />

          <label>City / Area *</label>
          <input name="city" value={form.city} onChange={handleChange} required />

          <label>Age</label>
          <input name="age" type="number" value={form.age} onChange={handleChange} />

          <label>Availability *</label>
          <select name="availability" value={form.availability} onChange={handleChange} required>
            <option value="">Select availability</option>
            <option value="Weekdays">Weekdays</option>
            <option value="Weekends">Weekends</option>
            <option value="Evenings">Evenings</option>
            <option value="Anytime">Anytime</option>
          </select>

          <label>Transport</label>
          <select name="transport" value={form.transport} onChange={handleChange}>
            <option>No vehicle</option>
            <option>Bike</option>
            <option>Car</option>
            <option>Public transport</option>
          </select>

          <label>Languages</label>
          <input name="languages" value={form.languages} onChange={handleChange} placeholder="Hindi, English" />

          <label>Short note (optional)</label>
          <textarea name="note" value={form.note} onChange={handleChange} rows={3}></textarea>

          <label>Emergency contact name</label>
          <input name="emergencyContactName" value={form.emergencyContactName} onChange={handleChange} />

          <label>Emergency contact phone</label>
          <input name="emergencyContactPhone" value={form.emergencyContactPhone} onChange={handleChange} />

          <label>ID (optional)</label>
          <input name="idProof" value={form.idProof} onChange={handleChange} placeholder="Aadhar / DL" />

          <label className="auth-checkbox" style={{ marginTop: "10px" }}>
            <input type="checkbox" name="agree" checked={form.agree} onChange={handleChange} />
            I agree to the SafeCircle guidelines.
          </label>

          <button type="submit" disabled={loading}>
            {loading ? "Submitting..." : "Register as Volunteer"}
          </button>
        </form>
      </div>

      <div className="card" style={{ textAlign: "left", marginTop: "16px" }}>
        <h3 className="auth-section-title">What happens next:</h3>
        <ul>
          <li>Your application is sent to the admin for review.</li>
          <li>Admin verifies your details before approving.</li>
          <li>You'll receive alerts only once approved.</li>
        </ul>
      </div>
    </div>
  );
}