import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { logout } from "../redux/slices/authSlice";

export default function Navbar() {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const linkClass = ({ isActive }) => isActive ? "nav-link active-link" : "nav-link";

  const handleLogout = () => {
    setDropdownOpen(false);
    dispatch(logout());
    navigate("/login");
  };

  const goTo = (path) => {
    setDropdownOpen(false);
    navigate(path);
  };

  return (
    <header className="top-bar">
      <div className="brand">
        <span className="brand-dot"></span>
        <span className="brand-name">SAFECIRCLE</span>
      </div>

      <nav className="nav-links">
        <NavLink to="/" className={linkClass}>Home</NavLink>

        {!user && (
          <>
            <NavLink to="/signup" className={linkClass}>Sign Up</NavLink>
            <NavLink to="/login" className={linkClass}>Log In</NavLink>
          </>
        )}

        <NavLink to="/volunteer-register" className={linkClass}>Volunteer</NavLink>
        <NavLink to="/volunteer-dashboard" className={linkClass}>Dashboard</NavLink>
        <NavLink to="/evidence" className={linkClass}>Evidence</NavLink>

        {user?.role === "admin" && (
          <NavLink to="/admin-dashboard" className={linkClass}>Admin</NavLink>
        )}
      </nav>

      {user && (
        <div style={{ position: "relative" }}>
          <div className="profile-avatar" onClick={() => setDropdownOpen((p) => !p)}>
            {user.name?.[0]?.toUpperCase() || "U"}
          </div>

          {dropdownOpen && (
            <div className="profile-dropdown">
              <div className="profile-dropdown-header">
                <div className="profile-avatar">{user.name?.[0]?.toUpperCase() || "U"}</div>
                <div>
                  <div className="profile-dropdown-name">{user.name}</div>
                  <div className="profile-dropdown-email">{user.email}</div>
                </div>
              </div>
              <div className="profile-dropdown-item" onClick={() => goTo("/profile")}>👤 My Profile</div>
              <div className="profile-dropdown-item" onClick={() => goTo("/evidence")}>🔒 Evidence Vault</div>
              <div className="profile-dropdown-item" onClick={() => goTo("/volunteer-dashboard")}>🟢 Volunteer Dashboard</div>
              <div className="profile-dropdown-item profile-dropdown-logout" onClick={handleLogout}>🚪 Logout</div>
            </div>
          )}
        </div>
      )}
    </header>
  );
}