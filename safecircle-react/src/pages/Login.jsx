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
      <div className="auth-backdrop-glow"></div>
      <form className="auth-card" onSubmit={handleSubmit}>
        <div className="auth-brand-badge">
          <span className="auth-shield-dot"></span>
          <span>SECURE ACCESS PORTAL</span>
        </div>

        <h1 className="auth-title">Welcome Back</h1>
        <p className="auth-subtitle">
          Sign in to access your SafeCircle safety network and monitoring tools.
        </p>

        {error && (
          <div className="auth-error-banner" role="alert">
            <span className="auth-error-icon">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <div className="form-group">
          <label htmlFor="login-email">Email Address</label>
          <div className="input-with-icon">
            <span className="input-icon" aria-hidden="true">✉️</span>
            <input
              id="login-email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>
        </div>

        <div className="form-group">
          <div className="label-row">
            <label htmlFor="login-password">Password</label>
            <a href="#" className="auth-link-small" onClick={(e) => e.preventDefault()}>
              Forgot password?
            </a>
          </div>
          <div className="input-with-icon">
            <span className="input-icon" aria-hidden="true">🔒</span>
            <input
              id="login-password"
              type="password"
              placeholder="Enter your account password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
        </div>

        <div className="auth-row">
          <label className="auth-checkbox">
            <input type="checkbox" />
            <span>Remember this device</span>
          </label>
        </div>

        <button type="submit" className="auth-submit-btn" disabled={loading}>
          {loading ? (
            <span className="btn-loading-content">
              <span className="spinner-dot"></span> Authenticating...
            </span>
          ) : (
            "SIGN IN TO SAFECIRCLE"
          )}
        </button>

        <div className="auth-card-footer">
          <p>
            New to SafeCircle?{" "}
            <Link to="/signup" className="auth-accent-link">
              Create an account
            </Link>
          </p>
        </div>
      </form>
    </div>
  );
}