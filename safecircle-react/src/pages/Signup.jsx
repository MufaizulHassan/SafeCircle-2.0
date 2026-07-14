import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useDispatch } from "react-redux";
import api from "../api/axios";
import { setAuth } from "../redux/slices/authSlice";

export default function Signup() {
  const [form, setForm] = useState({
    name: "", email: "", phone: "", password: "", confirmPassword: "",
    contact1Name: "", contact1Phone: "", contact2Name: "", contact2Phone: "",
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
        name: form.name, email: form.email, phone: form.phone,
        password: form.password, trustedContacts,
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
    <div className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h1 className="auth-title">Create Your Account</h1>
        <p className="auth-subtitle">
          Join SafeCircle and stay protected with instant community support.
        </p>

        {error && <p className="auth-error">{error}</p>}

        <label>Full Name</label>
        <input name="name" placeholder="Enter your full name" value={form.name} onChange={handleChange} required />

        <label>Email Address</label>
        <input name="email" type="email" placeholder="example@gmail.com" value={form.email} onChange={handleChange} required />

        <label>Phone Number</label>
        <input name="phone" placeholder="9876543210" value={form.phone} onChange={handleChange} required />

        <label>Password</label>
        <input name="password" type="password" placeholder="Choose a strong password" value={form.password} onChange={handleChange} required />

        <label>Confirm Password</label>
        <input name="confirmPassword" type="password" placeholder="Re-enter password" value={form.confirmPassword} onChange={handleChange} required />

        <h3 className="auth-section-title">Trusted Contacts</h3>
        <p className="auth-subtitle" style={{ marginBottom: "8px" }}>
          These contacts will receive alerts when you trigger an emergency.
        </p>

        <label>Contact 1 – Name</label>
        <input name="contact1Name" placeholder="Mother / Father / Friend" value={form.contact1Name} onChange={handleChange} />

        <label>Contact 1 – Phone Number</label>
        <input name="contact1Phone" placeholder="9998887777" value={form.contact1Phone} onChange={handleChange} />

        <label>Contact 2 – Name</label>
        <input name="contact2Name" placeholder="Optional" value={form.contact2Name} onChange={handleChange} />

        <label>Contact 2 – Phone Number</label>
        <input name="contact2Phone" placeholder="Optional" value={form.contact2Phone} onChange={handleChange} />

        <label className="auth-checkbox">
          <input type="checkbox" name="agree" checked={form.agree} onChange={handleChange} />
          I agree to the SafeCircle safety and privacy policy.
        </label>

        <button type="submit" disabled={loading}>
          {loading ? "CREATING..." : "CREATE ACCOUNT"}
        </button>

        <p>
          Already have an account? <Link to="/login">Sign In</Link>
        </p>
      </form>
    </div>
  );
}