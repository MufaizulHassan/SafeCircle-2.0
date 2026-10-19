import { useState, useRef, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { logout } from "../redux/slices/authSlice";

export default function Navbar() {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const dropdownRef = useRef(null);

  const linkClass = ({ isActive }) => (isActive ? "nav-link active-link" : "nav-link");

  const handleLogout = () => {
    setDropdownOpen(false);
    setMobileOpen(false);
    dispatch(logout());
    navigate("/login");
  };

  const goTo = (path) => {
    setDropdownOpen(false);
    setMobileOpen(false);
    navigate(path);
  };

  const handleNavClick = () => {
    setMobileOpen(false);
  };

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="top-bar">
      <div className="brand" onClick={() => navigate("/")} role="button" tabIndex={0}>
        <div className="brand-icon-wrapper">
          <svg
            className="brand-shield"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2.5" />
          </svg>
          <span className="brand-dot" aria-hidden="true"></span>
        </div>
        <span className="brand-name">
          SAFECIRCLE<span className="brand-version">2.0</span>
        </span>
      </div>

      <button
        className={`mobile-menu-btn ${mobileOpen ? "open" : ""}`}
        onClick={() => setMobileOpen((p) => !p)}
        aria-label="Toggle navigation menu"
        aria-expanded={mobileOpen}
      >
        <span></span>
        <span></span>
        <span></span>
      </button>

      <nav className={`nav-links${mobileOpen ? " open" : ""}`}>
        <NavLink to="/" className={linkClass} onClick={handleNavClick}>
          Home
        </NavLink>

        {!user && (
          <>
            <NavLink to="/signup" className={linkClass} onClick={handleNavClick}>
              Sign Up
            </NavLink>
            <NavLink to="/login" className={linkClass} onClick={handleNavClick}>
              Log In
            </NavLink>
          </>
        )}

        <NavLink to="/volunteer-register" className={linkClass} onClick={handleNavClick}>
          Volunteer
        </NavLink>
        <NavLink to="/volunteer-dashboard" className={linkClass} onClick={handleNavClick}>
          Dashboard
        </NavLink>
        <NavLink to="/evidence" className={linkClass} onClick={handleNavClick}>
          Evidence
        </NavLink>

        {user?.role === "admin" && (
          <NavLink to="/admin-dashboard" className={linkClass} onClick={handleNavClick}>
            Admin
          </NavLink>
        )}
      </nav>

      {user && (
        <div className="profile-container" ref={dropdownRef}>
          <div
            className="profile-avatar"
            onClick={() => setDropdownOpen((p) => !p)}
            role="button"
            tabIndex={0}
            title={user.name || "User profile"}
          >
            {user.name?.[0]?.toUpperCase() || "U"}
            <span className="profile-online-indicator"></span>
          </div>

          {dropdownOpen && (
            <div className="profile-dropdown">
              <div className="profile-dropdown-header">
                <div className="profile-avatar profile-avatar--sm">
                  {user.name?.[0]?.toUpperCase() || "U"}
                </div>
                <div className="profile-dropdown-userinfo">
                  <div className="profile-dropdown-name">{user.name}</div>
                  <div className="profile-dropdown-email">{user.email}</div>
                  <span className={`profile-role-tag profile-role-tag--${user.role || "user"}`}>
                    {user.role ? user.role.toUpperCase() : "MEMBER"}
                  </span>
                </div>
              </div>

              <div className="profile-dropdown-menu">
                <div className="profile-dropdown-item" onClick={() => goTo("/profile")}>
                  <span className="profile-item-icon">👤</span>
                  <span>My Profile</span>
                </div>
                <div className="profile-dropdown-item" onClick={() => goTo("/evidence")}>
                  <span className="profile-item-icon">🔒</span>
                  <span>Evidence Vault</span>
                </div>
                <div className="profile-dropdown-item" onClick={() => goTo("/volunteer-dashboard")}>
                  <span className="profile-item-icon">🟢</span>
                  <span>Volunteer Command</span>
                </div>
                {user.role === "admin" && (
                  <div className="profile-dropdown-item" onClick={() => goTo("/admin-dashboard")}>
                    <span className="profile-item-icon">🛡️</span>
                    <span>Admin Console</span>
                  </div>
                )}
                <div className="profile-dropdown-divider"></div>
                <div
                  className="profile-dropdown-item profile-dropdown-logout"
                  onClick={handleLogout}
                >
                  <span className="profile-item-icon">🚪</span>
                  <span>Log Out</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </header>
  );
}