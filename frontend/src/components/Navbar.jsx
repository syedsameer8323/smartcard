import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { ROLE_HOME } from "../routes/ProtectedRoute.jsx";
import Logo from "./Logo.jsx";

const LINKS = [["Home", "#home"], ["Products", "#products"], ["About", "#about"], ["Features", "#features"]];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const close = () => setOpen(false);

  return (
    <header className="navbar">
      <div className="container nav-inner">
        <Logo />
        <nav className={`nav-links ${open ? "open" : ""}`} aria-label="Main">
          {LINKS.map(([label, href]) => <a key={href} href={href} onClick={close}>{label}</a>)}
          <div className="nav-actions">
            {isAuthenticated ? (
              <>
                <Link className="btn btn-ghost" to={ROLE_HOME[user.role]} onClick={close}>Dashboard</Link>
                <button className="btn btn-primary" onClick={async () => { close(); await logout(); navigate("/"); }}>Logout</button>
              </>
            ) : (
              <>
                <Link className="btn btn-ghost" to="/login" onClick={close}>Login</Link>
                <Link className="btn btn-primary" to="/register" onClick={close}>Register</Link>
              </>
            )}
          </div>
        </nav>
        <button className="hamburger" aria-label="Toggle menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          <span /><span /><span />
        </button>
      </div>
    </header>
  );
}
