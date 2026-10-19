export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-brand-section">
          <span className="footer-brand">
            <span className="brand-dot" aria-hidden="true"></span>
            SAFECIRCLE <span className="footer-version">2.0</span>
          </span>
          <span className="footer-tagline">
            Community-powered safety network with instant dispatch & encrypted evidence capture.
          </span>
        </div>

        <div className="footer-status-pill">
          <span className="footer-status-dot"></span>
          <span>MESH NETWORK ACTIVE</span>
        </div>

        <div className="footer-meta">
          <span className="footer-badge">🛡️ 256-Bit Encrypted</span>
          <span className="footer-copyright">
            &copy; {new Date().getFullYear()} SafeCircle. All rights reserved.
          </span>
        </div>
      </div>
    </footer>
  );
}