export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-content">
        <span className="footer-brand">
          <span className="brand-dot"></span>
          SAFECIRCLE
        </span>
        <span className="footer-text">
          Community-powered safety — &copy; {new Date().getFullYear()}
        </span>
      </div>
    </footer>
  );
}