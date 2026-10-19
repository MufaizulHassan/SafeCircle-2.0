import { useState } from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { apiFetch } from "../api/fetch";

export default function VolunteerRegister() {
  const { token, user } = useSelector((state) => state.auth);

  const [form, setForm] = useState({
    fullName: user?.name || "",
    email: user?.email || "",
    otp: "",
    phone: user?.phone || "",
    city: "",
    age: "",
    availability: "",
    transport: "No vehicle",
    languages: "",
    note: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    idProof: "",
    agree: false,
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
      const res = await apiFetch("/api/auth/send-volunteer-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email: form.email }),
      });
      const data = await res.json();
      setOtpSent(true);
      setOtpMessage(data.message || "OTP sent to your email");
    } catch {
      setOtpMessage("Could not send OTP — server offline");
    }
  };

  const handleVerifyOtp = async () => {
    try {
      const res = await apiFetch("/api/auth/verify-volunteer-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email: form.email, otp: form.otp }),
      });
      const data = await res.json();
      if (data.valid) {
        setOtpVerified(true);
        setOtpMessage("✅ Email verified successfully");
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
    if (!form.agree) return setMessage("Please agree to the SafeCircle community guidelines");

    setLoading(true);
    try {
      const res = await apiFetch("/api/auth/apply-volunteer", {
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
      setMessage("⚠️ Something went wrong while submitting application");
    } finally {
      setLoading(false);
    }
  };

  if (user?.role === "volunteer" || user?.role === "admin") {
    return (
      <div className="home-page vr-page">
        <div className="card vr-status-card vr-status-card--approved">
          <div className="vr-status-icon">🛡️</div>
          <h2>Verified Community Volunteer</h2>
          <p className="vr-status-desc">
            You are an active, certified responder in the SafeCircle Network.
          </p>
          <div className="vr-status-pill vr-status-pill--active">
            <span className="status-dot-active"></span> READY FOR DISPATCH
          </div>
          <div className="vr-actions-row">
            <Link to="/volunteer-dashboard" className="btn-primary-action">
              ⚡ Open Volunteer Command
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (status === "pending") {
    return (
      <div className="home-page vr-page">
        <div className="card vr-status-card vr-status-card--pending">
          <div className="vr-status-icon">⏳</div>
          <h2>Application Under Review</h2>
          <p className="vr-status-desc">
            Thank you for stepping up to protect your community. Our administrative team is
            reviewing your credentials and background information.
          </p>
          <div className="vr-review-timeline">
            <div className="timeline-step completed">
              <span className="timeline-dot"></span>
              <span className="timeline-label">Application Received</span>
            </div>
            <div className="timeline-step active">
              <span className="timeline-dot"></span>
              <span className="timeline-label">ID & Details Verification</span>
            </div>
            <div className="timeline-step">
              <span className="timeline-dot"></span>
              <span className="timeline-label">Dispatched to Network</span>
            </div>
          </div>
          <p className="status-note" style={{ marginTop: "16px" }}>
            You will receive notification once your profile is verified.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="home-page vr-page">
      {/* Onboarding Header */}
      <div className="card vr-header-card">
        <div className="vr-header-flex">
          <div className="vr-header-badge">
            <span>COMMUNITY DEFENDER INITIATIVE</span>
          </div>
          <h1 className="vr-title">Become a SafeCircle Volunteer</h1>
          <p className="vr-subtitle">
            Stand as the first line of rapid emergency support in your neighborhood. Verified volunteers
            receive real-time dispatch alerts when community members require urgent assistance.
          </p>
        </div>
      </div>

      {/* Main Registration Form */}
      <div className="card vr-form-card">
        <form className="vr-form" onSubmit={handleSubmit}>
          {message && (
            <div
              className={`form-feedback-banner ${
                message.startsWith("✅") ? "feedback-success" : "feedback-error"
              }`}
            >
              {message}
            </div>
          )}

          {/* Section 1: Basic Identity & Contact */}
          <div className="vr-section">
            <div className="vr-section-title-row">
              <span className="vr-section-num">01</span>
              <div>
                <h3>Personal Identity & Verification</h3>
                <p>Ensure your contact details are accurate for secure dispatch coordination.</p>
              </div>
            </div>

            <div className="vr-grid-2">
              <div className="form-group">
                <label htmlFor="vr-name">Full Legal Name *</label>
                <input
                  id="vr-name"
                  name="fullName"
                  value={form.fullName}
                  onChange={handleChange}
                  placeholder="e.g. Priya Sharma"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="vr-phone">Mobile Phone *</label>
                <input
                  id="vr-phone"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="10-digit primary number"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="vr-email">Email Address & Verification *</label>
              <input
                id="vr-email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="you@example.com"
                required
              />

              <div className="vr-otp-group">
                <input
                  name="otp"
                  value={form.otp}
                  onChange={handleChange}
                  placeholder="6-digit verification code"
                  maxLength={6}
                  disabled={otpVerified}
                  className="vr-otp-input"
                />
                {otpVerified ? (
                  <button type="button" className="otp-btn otp-btn--verified" disabled>
                    ✅ Email Verified
                  </button>
                ) : otpSent ? (
                  <button type="button" className="otp-btn otp-btn--verify" onClick={handleVerifyOtp}>
                    Verify OTP
                  </button>
                ) : (
                  <button type="button" className="otp-btn otp-btn--send" onClick={handleSendOtp}>
                    Send OTP Code
                  </button>
                )}
              </div>
              {otpMessage && <p className="vr-otp-feedback">{otpMessage}</p>}
            </div>
          </div>

          {/* Section 2: Deployment & Logistics */}
          <div className="vr-section">
            <div className="vr-section-title-row">
              <span className="vr-section-num">02</span>
              <div>
                <h3>Location & Availability</h3>
                <p>Helps the dispatch engine route nearby alerts based on your real capability.</p>
              </div>
            </div>

            <div className="vr-grid-3">
              <div className="form-group">
                <label htmlFor="vr-city">City / Neighborhood *</label>
                <input
                  id="vr-city"
                  name="city"
                  value={form.city}
                  onChange={handleChange}
                  placeholder="e.g. South Delhi / Saket"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="vr-age">Age</label>
                <input
                  id="vr-age"
                  name="age"
                  type="number"
                  min="18"
                  max="80"
                  value={form.age}
                  onChange={handleChange}
                  placeholder="e.g. 24"
                />
              </div>

              <div className="form-group">
                <label htmlFor="vr-avail">Availability *</label>
                <select
                  id="vr-avail"
                  name="availability"
                  value={form.availability}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select availability</option>
                  <option value="Weekdays">Weekdays</option>
                  <option value="Weekends">Weekends</option>
                  <option value="Evenings">Evenings</option>
                  <option value="Anytime">Anytime / On-Demand</option>
                </select>
              </div>
            </div>

            <div className="vr-grid-2">
              <div className="form-group">
                <label htmlFor="vr-transport">Primary Transport</label>
                <select
                  id="vr-transport"
                  name="transport"
                  value={form.transport}
                  onChange={handleChange}
                >
                  <option value="No vehicle">No vehicle (Foot patrol)</option>
                  <option value="Bike">Two-Wheeler / Bike</option>
                  <option value="Car">Four-Wheeler / Car</option>
                  <option value="Public transport">Public transit</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="vr-lang">Spoken Languages</label>
                <input
                  id="vr-lang"
                  name="languages"
                  value={form.languages}
                  onChange={handleChange}
                  placeholder="e.g. Hindi, English, Punjabi"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="vr-note">Relevant Experience or Skills (Optional)</label>
              <textarea
                id="vr-note"
                name="note"
                value={form.note}
                onChange={handleChange}
                rows={2}
                placeholder="First aid certification, martial arts, security experience, or community background..."
              ></textarea>
            </div>
          </div>

          {/* Section 3: Emergency Contacts & ID */}
          <div className="vr-section">
            <div className="vr-section-title-row">
              <span className="vr-section-num">03</span>
              <div>
                <h3>Emergency Contact & ID Reference</h3>
                <p>Required for volunteer safety and verification audit trails.</p>
              </div>
            </div>

            <div className="vr-grid-2">
              <div className="form-group">
                <label htmlFor="vr-ec-name">Volunteer Emergency Contact Name</label>
                <input
                  id="vr-ec-name"
                  name="emergencyContactName"
                  value={form.emergencyContactName}
                  onChange={handleChange}
                  placeholder="Guardian / Family contact"
                />
              </div>

              <div className="form-group">
                <label htmlFor="vr-ec-phone">Volunteer Emergency Contact Phone</label>
                <input
                  id="vr-ec-phone"
                  name="emergencyContactPhone"
                  value={form.emergencyContactPhone}
                  onChange={handleChange}
                  placeholder="10-digit mobile number"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="vr-idproof">Government ID Number (Optional)</label>
              <input
                id="vr-idproof"
                name="idProof"
                value={form.idProof}
                onChange={handleChange}
                placeholder="Aadhaar / Voter ID / Driver License reference"
              />
            </div>
          </div>

          {/* Guidelines Agreement */}
          <div className="vr-agreement-box">
            <label className="auth-checkbox">
              <input
                type="checkbox"
                name="agree"
                checked={form.agree}
                onChange={handleChange}
                required
              />
              <span>
                I understand that SafeCircle volunteers act as responsible community responders,
                pledge to prioritize victim safety, and agree to follow SafeCircle emergency protocols.
              </span>
            </label>
          </div>

          <button type="submit" className="btn-primary-action vr-submit-btn" disabled={loading}>
            {loading ? "Submitting Application..." : "🤝 Submit Volunteer Application"}
          </button>
        </form>
      </div>

      {/* Process Explainer */}
      <div className="card vr-process-card">
        <h3>What Happens Next</h3>
        <div className="vr-process-grid">
          <div className="vr-process-step">
            <div className="step-badge">1</div>
            <h4>Administrative Review</h4>
            <p>Our safety coordinators review your submitted credentials and contact details.</p>
          </div>
          <div className="vr-process-step">
            <div className="step-badge">2</div>
            <h4>Network Authorization</h4>
            <p>Once approved, your account receives volunteer credentials and command console access.</p>
          </div>
          <div className="vr-process-step">
            <div className="step-badge">3</div>
            <h4>Active Dispatch</h4>
            <p>Toggle your status online whenever you are ready to receive real-time neighborhood alerts.</p>
          </div>
        </div>
      </div>
    </div>
  );
}