import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useDispatch } from "react-redux";
import api from "../api/axios";
import { setAuth } from "../redux/slices/authSlice";

export default function Signup() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    contact1Name: "",
    contact1Phone: "",
    contact2Name: "",
    contact2Phone: "",
    agree: false,
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({ ...form, [name]: type === "checkbox" ? checked : value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (!form.agree) {
      setError("Please agree to the safety and privacy policy");
      return;
    }

    setLoading(true);

    const trustedContacts = [];
    if (form.contact1Name && form.contact1Phone) {
      trustedContacts.push({ name: form.contact1Name, phone: form.contact1Phone });
    }
    if (form.contact2Name && form.contact2Phone) {
      trustedContacts.push({ name: form.contact2Name, phone: form.contact2Phone });
    }

    try {
      const res = await api.post("/auth/signup", {
        name: form.name,
        email: form.email,
        phone: form.phone,
        password: form.password,
        trustedContacts,
      });
      if (res.data.success) {
        dispatch(setAuth({ user: res.data.user, token: res.data.token }));
        navigate("/");
      } else {
        setError(res.data.message || "Signup failed");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page auth-page--signup">
      <div className="auth-backdrop-glow"></div>
      <form className="auth-card auth-card--wide" onSubmit={handleSubmit}>
        <div className="auth-brand-badge">
          <span className="auth-shield-dot"></span>
          <span>COMMUNITY PROTECTION NETWORK</span>
        </div>

        <h1 className="auth-title">Create Your SafeCircle Account</h1>
        <p className="auth-subtitle">
          Join a rapid-response community network designed to keep you and your loved ones safe.
        </p>

        {error && (
          <div className="auth-error-banner" role="alert">
            <span className="auth-error-icon">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Section 1: Personal Credentials */}
        <div className="auth-form-section">
          <h2 className="auth-section-heading">
            <span className="auth-step-num">1</span> Account Information
          </h2>

          <div className="auth-grid-2">
            <div className="form-group">
              <label htmlFor="signup-name">Full Name *</label>
              <div className="input-with-icon">
                <span className="input-icon" aria-hidden="true">👤</span>
                <input
                  id="signup-name"
                  name="name"
                  placeholder="e.g. Maya Sharma"
                  value={form.name}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="signup-email">Email Address *</label>
              <div className="input-with-icon">
                <span className="input-icon" aria-hidden="true">✉️</span>
                <input
                  id="signup-email"
                  name="email"
                  type="email"
                  placeholder="maya@example.com"
                  value={form.email}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="signup-phone">Phone Number *</label>
            <div className="input-with-icon">
              <span className="input-icon" aria-hidden="true">📱</span>
              <input
                id="signup-phone"
                name="phone"
                type="tel"
                placeholder="10-digit mobile number"
                value={form.phone}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="auth-grid-2">
            <div className="form-group">
              <label htmlFor="signup-password">Password *</label>
              <div className="input-with-icon">
                <span className="input-icon" aria-hidden="true">🔒</span>
                <input
                  id="signup-password"
                  name="password"
                  type="password"
                  placeholder="At least 6 characters"
                  value={form.password}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="signup-confirm-password">Confirm Password *</label>
              <div className="input-with-icon">
                <span className="input-icon" aria-hidden="true">🛡️</span>
                <input
                  id="signup-confirm-password"
                  name="confirmPassword"
                  type="password"
                  placeholder="Re-enter password"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Trusted Emergency Contacts */}
        <div className="auth-form-section">
          <div className="auth-section-header-row">
            <h2 className="auth-section-heading">
              <span className="auth-step-num">2</span> Trusted Emergency Contacts
            </h2>
            <span className="auth-section-tip">Auto-notified during SOS triggers</span>
          </div>

          <div className="trusted-contacts-container">
            {/* Contact 1 */}
            <div className="trusted-contact-card">
              <div className="contact-card-header">
                <span className="contact-card-tag">Primary Emergency Contact</span>
              </div>
              <div className="auth-grid-2">
                <div className="form-group">
                  <label htmlFor="signup-contact1-name">Contact 1 Name</label>
                  <input
                    id="signup-contact1-name"
                    name="contact1Name"
                    placeholder="Mother / Partner / Friend"
                    value={form.contact1Name}
                    onChange={handleChange}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="signup-contact1-phone">Contact 1 Phone Number</label>
                  <input
                    id="signup-contact1-phone"
                    name="contact1Phone"
                    type="tel"
                    placeholder="Emergency mobile number"
                    value={form.contact1Phone}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>

            {/* Contact 2 */}
            <div className="trusted-contact-card">
              <div className="contact-card-header">
                <span className="contact-card-tag contact-card-tag--secondary">
                  Secondary Contact (Optional)
                </span>
              </div>
              <div className="auth-grid-2">
                <div className="form-group">
                  <label htmlFor="signup-contact2-name">Contact 2 Name</label>
                  <input
                    id="signup-contact2-name"
                    name="contact2Name"
                    placeholder="Father / Colleague / Neighbor"
                    value={form.contact2Name}
                    onChange={handleChange}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="signup-contact2-phone">Contact 2 Phone Number</label>
                  <input
                    id="signup-contact2-phone"
                    name="contact2Phone"
                    type="tel"
                    placeholder="Emergency mobile number"
                    value={form.contact2Phone}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Agreement */}
        <div className="auth-policy-group">
          <label className="auth-checkbox">
            <input
              type="checkbox"
              name="agree"
              checked={form.agree}
              onChange={handleChange}
              required
            />
            <span>
              I agree to the SafeCircle community guidelines, emergency broadcast protocols, and privacy policy.
            </span>
          </label>
        </div>

        <button type="submit" className="auth-submit-btn" disabled={loading}>
          {loading ? (
            <span className="btn-loading-content">
              <span className="spinner-dot"></span> Creating Account...
            </span>
          ) : (
            "CREATE SAFECIRCLE ACCOUNT"
          )}
        </button>

        <div className="auth-card-footer">
          <p>
            Already have an account?{" "}
            <Link to="/login" className="auth-accent-link">
              Sign In
            </Link>
          </p>
        </div>
      </form>
    </div>
  );
}