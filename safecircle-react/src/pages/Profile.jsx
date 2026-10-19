import { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { setAuth } from "../redux/slices/authSlice";
import { apiFetch } from "../api/fetch";

export default function Profile() {
  const { token } = useSelector((state) => state.auth);
  const dispatch = useDispatch();

  const [profileData, setProfileData] = useState(null);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    contact1Name: "",
    contact1Phone: "",
    contact2Name: "",
    contact2Phone: "",
  });
  const [message, setMessage] = useState("");
  const [saveLoading, setSaveLoading] = useState(false);

  const [pwForm, setPwForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  });
  const [pwMessage, setPwMessage] = useState("");
  const [pwLoading, setPwLoading] = useState(false);

  const fillForm = (data) => {
    setForm({
      name: data.name || "",
      phone: data.phone || "",
      contact1Name: data.trustedContacts?.[0]?.name || "",
      contact1Phone: data.trustedContacts?.[0]?.phone || "",
      contact2Name: data.trustedContacts?.[1]?.name || "",
      contact2Phone: data.trustedContacts?.[1]?.phone || "",
    });
  };

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await apiFetch("/api/auth/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success) {
          setProfileData(data.user);
          fillForm(data.user);
        }
      } catch (err) {
        console.warn("Failed to load profile:", err);
      }
    };
    if (token) loadProfile();
  }, [token]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const handlePwChange = (e) => setPwForm({ ...pwForm, [e.target.name]: e.target.value });

  const handleSave = async (e) => {
    e.preventDefault();
    setMessage("");
    setSaveLoading(true);

    const trustedContacts = [];
    if (form.contact1Name && form.contact1Phone) {
      trustedContacts.push({ name: form.contact1Name, phone: form.contact1Phone });
    }
    if (form.contact2Name && form.contact2Phone) {
      trustedContacts.push({ name: form.contact2Name, phone: form.contact2Phone });
    }

    try {
      const res = await apiFetch("/api/auth/update-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: form.name, phone: form.phone, trustedContacts }),
      });
      const data = await res.json();
      if (data.success) {
        dispatch(setAuth({ user: data.user, token: data.token }));
        setProfileData({ ...profileData, ...data.user });
        setMessage("✅ Profile updated successfully");
      } else {
        setMessage(data.message || "Update failed");
      }
    } catch {
      setMessage("⚠️ Something went wrong while updating profile");
    } finally {
      setSaveLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPwMessage("");

    if (pwForm.newPassword !== pwForm.confirmNewPassword) {
      setPwMessage("⚠️ New passwords do not match");
      return;
    }

    setPwLoading(true);
    try {
      const res = await apiFetch("/api/auth/change-password", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          currentPassword: pwForm.currentPassword,
          newPassword: pwForm.newPassword,
        }),
      });
      const data = await res.json();
      setPwMessage(data.success ? "✅ Password changed successfully" : data.message || "Password update failed");
      if (data.success) {
        setPwForm({ currentPassword: "", newPassword: "", confirmNewPassword: "" });
      }
    } catch {
      setPwMessage("⚠️ Something went wrong while changing password");
    } finally {
      setPwLoading(false);
    }
  };

  if (!profileData) {
    return (
      <div className="home-page profile-page">
        <div className="card loading-card">
          <div className="loading-spinner"></div>
          <p>Loading your profile details...</p>
        </div>
      </div>
    );
  }

  const roleName = profileData.role ? profileData.role.toUpperCase() : "MEMBER";

  return (
    <div className="home-page profile-page">
      {/* ===== HEADER CARD ===== */}
      <div className="card profile-header-card">
        <div className="profile-header-backdrop"></div>
        <div className="profile-header-content">
          <div className="profile-avatar profile-avatar-large">
            {profileData.name?.[0]?.toUpperCase() || "U"}
            <span className="profile-badge-dot"></span>
          </div>

          <div className="profile-details-summary">
            <div className="profile-name-row">
              <h1 className="profile-name">{profileData.name}</h1>
              <span className={`role-badge role-badge--${profileData.role || "user"}`}>
                {roleName}
              </span>
            </div>
            <p className="profile-email">{profileData.email}</p>
            <div className="profile-meta-tags">
              <span className="meta-tag">
                📱 {profileData.phone || "No phone added"}
              </span>
              <span className="meta-tag">
                📅 Member since {new Date(profileData.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </span>
              <span className="meta-tag meta-tag--verified">
                🛡️ Verified Identity
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ===== 2-COLUMN PROFILE WORKSPACE ===== */}
      <div className="profile-grid">
        {/* Left Column: Personal Info & Trusted Contacts */}
        <div className="card profile-section-card">
          <div className="section-card-header">
            <div className="section-header-left">
              <span className="section-header-icon">👤</span>
              <div>
                <h2>Personal & Emergency Contacts</h2>
                <p>Manage your identity and the people alerted during your emergencies.</p>
              </div>
            </div>
          </div>

          <form
            className="profile-form"
            onSubmit={handleSave}
            onKeyDown={(e) => {
              if (e.key === "Enter" && e.target.tagName === "INPUT") e.preventDefault();
            }}
          >
            {message && (
              <div
                className={`form-feedback-banner ${
                  message.startsWith("✅") ? "feedback-success" : "feedback-error"
                }`}
              >
                {message}
              </div>
            )}

            <div className="form-group">
              <label htmlFor="profile-fullname">Full Name</label>
              <input
                id="profile-fullname"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Enter your full name"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="profile-email">Email Address (Fixed)</label>
              <input
                id="profile-email"
                value={profileData.email}
                disabled
                className="input-disabled"
                title="Email address cannot be modified directly"
              />
            </div>

            <div className="form-group">
              <label htmlFor="profile-phone">Phone Number</label>
              <input
                id="profile-phone"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="10-digit mobile number"
                required
              />
            </div>

            <div className="form-divider">
              <span>TRUSTED EMERGENCY CONTACTS</span>
            </div>

            {/* Contact 1 */}
            <div className="profile-contact-box">
              <span className="contact-box-title">Primary Contact (Contact 1)</span>
              <div className="contact-row">
                <div className="form-group">
                  <label htmlFor="profile-c1-name">Contact 1 Name</label>
                  <input
                    id="profile-c1-name"
                    name="contact1Name"
                    value={form.contact1Name}
                    onChange={handleChange}
                    placeholder="Mother / Father / Friend"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="profile-c1-phone">Contact 1 Phone</label>
                  <input
                    id="profile-c1-phone"
                    name="contact1Phone"
                    value={form.contact1Phone}
                    onChange={handleChange}
                    placeholder="Mobile number"
                  />
                </div>
              </div>
            </div>

            {/* Contact 2 */}
            <div className="profile-contact-box">
              <span className="contact-box-title">Secondary Contact (Contact 2 - Optional)</span>
              <div className="contact-row">
                <div className="form-group">
                  <label htmlFor="profile-c2-name">Contact 2 Name</label>
                  <input
                    id="profile-c2-name"
                    name="contact2Name"
                    value={form.contact2Name}
                    onChange={handleChange}
                    placeholder="Partner / Sibling / Colleague"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="profile-c2-phone">Contact 2 Phone</label>
                  <input
                    id="profile-c2-phone"
                    name="contact2Phone"
                    value={form.contact2Phone}
                    onChange={handleChange}
                    placeholder="Mobile number"
                  />
                </div>
              </div>
            </div>

            <button type="submit" className="btn-primary-action" disabled={saveLoading}>
              {saveLoading ? "Saving Changes..." : "💾 Save Profile Changes"}
            </button>
          </form>
        </div>

        {/* Right Column: Security & Credentials */}
        <div className="card profile-section-card">
          <div className="section-card-header">
            <div className="section-header-left">
              <span className="section-header-icon">🔑</span>
              <div>
                <h2>Security & Password</h2>
                <p>Update your authentication password to ensure account integrity.</p>
              </div>
            </div>
          </div>

          <form className="profile-form" onSubmit={handlePasswordChange}>
            {pwMessage && (
              <div
                className={`form-feedback-banner ${
                  pwMessage.startsWith("✅") ? "feedback-success" : "feedback-error"
                }`}
              >
                {pwMessage}
              </div>
            )}

            <div className="form-group">
              <label htmlFor="pw-current">Current Password</label>
              <input
                id="pw-current"
                name="currentPassword"
                type="password"
                value={pwForm.currentPassword}
                onChange={handlePwChange}
                placeholder="Enter current password"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="pw-new">New Password</label>
              <input
                id="pw-new"
                name="newPassword"
                type="password"
                value={pwForm.newPassword}
                onChange={handlePwChange}
                placeholder="Choose a new strong password"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="pw-confirm">Confirm New Password</label>
              <input
                id="pw-confirm"
                name="confirmNewPassword"
                type="password"
                value={pwForm.confirmNewPassword}
                onChange={handlePwChange}
                placeholder="Re-enter new password"
                required
              />
            </div>

            <div className="security-notice-box">
              <span className="security-notice-icon">🛡️</span>
              <p>
                <strong>Password requirement:</strong> Your password is also used to force-stop
                video recording and emergency broadcasting during active alerts.
              </p>
            </div>

            <button type="submit" className="btn-secondary-action" disabled={pwLoading}>
              {pwLoading ? "Updating Password..." : "🔒 Update Password"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}