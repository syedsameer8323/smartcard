import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { ROLE_HOME } from "../routes/ProtectedRoute.jsx";
import Logo from "./Logo.jsx";
import ThemeToggle from "./ThemeToggle.jsx";

const LINKS = [["Home", "#home"], ["Collections", "#collections"], ["About", "#about"], ["Features", "#features"]];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const close = () => setOpen(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`hdr ${scrolled ? "is-scrolled" : ""}`}>
      <div className="container">
        <div className="hdr-bar">
          <Logo />
          <nav className={`pnav ${open ? "open" : ""}`} aria-label="Main">
            {LINKS.map(([label, href]) => <a key={href} href={href} onClick={close}>{label}</a>)}
            <div className="pnav-actions">
              {isAuthenticated ? (
                <>
                  <Link className="btn btn-outline btn-sm" to={ROLE_HOME[user.role]} onClick={close}>Dashboard</Link>
                  <button className="btn btn-primary btn-sm" onClick={async () => { close(); await logout(); navigate("/"); }}>Log out</button>
                </>
              ) : (
                <>
                  <Link className="btn btn-outline btn-sm" to="/login" onClick={close}>Log in</Link>
                  <Link className="btn btn-primary btn-sm" to="/register" onClick={close}>Get started</Link>
                </>
              )}
            </div>
          </nav>
          <div className="hdr-actions">
            <ThemeToggle />
            <button className="hamburger" aria-label="Toggle menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}><span /><span /><span /></button>
          </div>
        </div>
      </div>
    </header>
  );
}
