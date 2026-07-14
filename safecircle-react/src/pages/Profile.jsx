import { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { setAuth } from "../redux/slices/authSlice";

export default function Profile() {
  const { token } = useSelector((state) => state.auth);
  const dispatch = useDispatch();

  const [profileData, setProfileData] = useState(null);
//   const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({
    name: "", phone: "", contact1Name: "", contact1Phone: "", contact2Name: "", contact2Phone: "",
  });
  const [message, setMessage] = useState("");

  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirmNewPassword: "" });
  const [pwMessage, setPwMessage] = useState("");

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
        const res = await fetch("/api/auth/profile", { headers: { Authorization: `Bearer ${token}` } });
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
    const trustedContacts = [];
    if (form.contact1Name && form.contact1Phone) trustedContacts.push({ name: form.contact1Name, phone: form.contact1Phone });
    if (form.contact2Name && form.contact2Phone) trustedContacts.push({ name: form.contact2Name, phone: form.contact2Phone });

    try {
      const res = await fetch("/api/auth/update-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: form.name, phone: form.phone, trustedContacts }),
      });
      const data = await res.json();
      if (data.success) {
        dispatch(setAuth({ user: data.user, token: data.token }));
        setProfileData({ ...profileData, ...data.user });
        setMessage("✅ Profile updated successfully");
        setIsEditing(false);
      } else {
        setMessage(data.message || "Update failed");
      }
    } catch {
      setMessage("⚠️ Something went wrong");
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPwMessage("");
    if (pwForm.newPassword !== pwForm.confirmNewPassword) {
      setPwMessage("New passwords do not match");
      return;
    }
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword }),
      });
      const data = await res.json();
      setPwMessage(data.success ? "✅ Password changed successfully" : data.message);
      if (data.success) setPwForm({ currentPassword: "", newPassword: "", confirmNewPassword: "" });
    } catch {
      setPwMessage("⚠️ Something went wrong");
    }
  };

  if (!profileData) return <div className="home-page"><p style={{ color: "#fff" }}>Loading profile...</p></div>;

  return (
    <div className="home-page">
      <div className="card profile-header-card">
        <div className="profile-avatar profile-avatar-large">{profileData.name?.[0]?.toUpperCase() || "U"}</div>
        <h2 style={{ color: "#fff", marginTop: "10px" }}>{profileData.name}</h2>
        <p className="status-note">{profileData.email}</p>
        <span className="role-badge">{profileData.role}</span>
        <p className="status-note" style={{ marginTop: "6px" }}>
          Member since {new Date(profileData.createdAt).toLocaleDateString()}
        </p>
      </div>

      <div className="profile-grid">
        <div className="card">
          <h2>✏️ Edit Profile</h2>
          {/* <form
            className="auth-card"
            onSubmit={handleSave}
            onKeyDown={(e) => { if (e.key === "Enter" && e.target.tagName === "INPUT") e.preventDefault(); }}
            style={{ background: "transparent", padding: 0, marginTop: "12px" }}
            >
            {message && <p className="auth-error">{message}</p>}

            <label>Full Name</label>
            <input name="name" value={form.name} onChange={handleChange} disabled={!isEditing} required />

            <label>Email (cannot change)</label>
            <input value={profileData.email} disabled />

            <label>Phone Number</label>
            <input name="phone" value={form.phone} onChange={handleChange} disabled={!isEditing} required />

            <h3 className="auth-section-title">📞 Trusted Contacts</h3>

            <div className="contact-row">
              <div>
                <label>Contact 1 Name</label>
                <input name="contact1Name" value={form.contact1Name} onChange={handleChange} disabled={!isEditing} placeholder="Mother / Father / Friend" />
              </div>
              <div>
                <label>Contact 1 Phone</label>
                <input name="contact1Phone" value={form.contact1Phone} onChange={handleChange} disabled={!isEditing} placeholder="9998887777" />
              </div>
            </div>

            <div className="contact-row">
              <div>
                <label>Contact 2 Name</label>
                <input name="contact2Name" value={form.contact2Name} onChange={handleChange} disabled={!isEditing} placeholder="Optional" />
              </div>
              <div>
                <label>Contact 2 Phone</label>
                <input name="contact2Phone" value={form.contact2Phone} onChange={handleChange} disabled={!isEditing} placeholder="Optional" />
              </div>
            </div>

            {isEditing ? (
              <button type="submit">💾 Save Changes</button>
            ) : (
              <button type="button" onClick={() => { setIsEditing(true); setMessage(""); }}>✏️ Edit Profile</button>
            )}
          </form> */}

          <form
          className="auth-card"
          onSubmit={handleSave}
          onKeyDown={(e) => { if (e.key === "Enter" && e.target.tagName === "INPUT") e.preventDefault(); }}
          style={{ background: "transparent", padding: 0, marginTop: "12px" }}
        >
          {message && <p className="auth-error">{message}</p>}

          <label>Full Name</label>
          <input name="name" value={form.name} onChange={handleChange} required />

          <label>Email (cannot change)</label>
          <input value={profileData.email} disabled />

          <label>Phone Number</label>
          <input name="phone" value={form.phone} onChange={handleChange} required />

          <h3 className="auth-section-title">📞 Trusted Contacts</h3>

          <div className="contact-row">
            <div>
              <label>Contact 1 Name</label>
              <input name="contact1Name" value={form.contact1Name} onChange={handleChange} placeholder="Mother / Father / Friend" />
            </div>
            <div>
              <label>Contact 1 Phone</label>
              <input name="contact1Phone" value={form.contact1Phone} onChange={handleChange} placeholder="9998887777" />
            </div>
          </div>

          <div className="contact-row">
            <div>
              <label>Contact 2 Name</label>
              <input name="contact2Name" value={form.contact2Name} onChange={handleChange} placeholder="Optional" />
            </div>
            <div>
              <label>Contact 2 Phone</label>
              <input name="contact2Phone" value={form.contact2Phone} onChange={handleChange} placeholder="Optional" />
            </div>
          </div>

          <button type="submit">💾 Save Changes</button>
        </form>
        </div>

        <div className="card">
          <h2>🔑 Change Password</h2>
          <form className="auth-card" onSubmit={handlePasswordChange} style={{ background: "transparent", padding: 0, marginTop: "12px" }}>
            {pwMessage && <p className="auth-error">{pwMessage}</p>}

            <label>Current Password</label>
            <input name="currentPassword" type="password" value={pwForm.currentPassword} onChange={handlePwChange} placeholder="Enter current password" required />

            <label>New Password</label>
            <input name="newPassword" type="password" value={pwForm.newPassword} onChange={handlePwChange} placeholder="Enter new password" required />

            <label>Confirm New Password</label>
            <input name="confirmNewPassword" type="password" value={pwForm.confirmNewPassword} onChange={handlePwChange} placeholder="Confirm new password" required />

            <button type="submit">🔒 Change Password</button>
          </form>
        </div>
      </div>

      {/* <p className="status-note" style={{ textAlign: "center", marginTop: "20px" }}>
        SafeCircle — your data is stored securely.
      </p> */}
    </div>
  );
}