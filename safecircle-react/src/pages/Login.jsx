import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useDispatch } from "react-redux";
import api from "../api/axios";
import { setAuth } from "../redux/slices/authSlice";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await api.post("/auth/login", { email, password });
      if (res.data.success) {
        dispatch(setAuth({ user: res.data.user, token: res.data.token }));
        if (res.data.user.role === "admin") navigate("/admin-dashboard");
        else if (res.data.user.role === "volunteer") navigate("/volunteer-dashboard");
        else navigate("/");
      } else {
        setError(res.data.message || "Login failed");
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
        <h1 className="auth-title">Welcome back</h1>
        <p className="auth-subtitle">
          Log in to access your SafeCircle dashboard and safety features.
        </p>

        {error && <p className="auth-error">{error}</p>}

        <label>Email</label>
        <input
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <label>Password</label>
        <input
          type="password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <div className="auth-row">
          <label className="auth-checkbox">
            <input type="checkbox" /> Remember me
          </label>
          <a href="#" className="auth-link-small">Forgot password?</a>
        </div>

        <button type="submit" disabled={loading}>
          {loading ? "LOGGING IN..." : "LOG IN"}
        </button>

        <p>
          New to SafeCircle? <Link to="/signup">Create an account</Link>
        </p>
      </form>
    </div>
  );
}