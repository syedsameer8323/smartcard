import Logo from "./Logo.jsx";
import ThemeToggle from "./ThemeToggle.jsx";
import { useStorefrontTheme } from "../utils/theme.js";

export default function AuthLayout({ title, subtitle, children, footer }) {
  useStorefrontTheme();
  return (
    <div className="auth-page">
      <aside className="auth-aside">
        <div className="hero3-mesh" aria-hidden="true" />
        <Logo variant="dark" />
        <div className="auth-aside-copy">
          <span className="kicker">Welcome to SmartCart</span>
          <h2>Shop at the <span className="grad-text">speed of now.</span></h2>
          <p>Thoughtful finds from sellers we trust — clear prices, secure payments and every order tracked.</p>
        </div>
        <ul className="aside-cards" aria-hidden="true">
          <li><b>Free</b><span>shipping on every order</span></li>
          <li><b>Secure</b><span>payments by Razorpay</span></li>
          <li><b>Live</b><span>order tracking</span></li>
        </ul>
      </aside>
      <main className="auth-main">
        <div className="auth-top"><ThemeToggle /></div>
        <div className="auth-card">
          <div className="auth-mobile-logo"><Logo variant="light" /></div>
          <h1>{title}</h1>
          <p className="muted">{subtitle}</p>
          {children}
          {footer && <p className="auth-footer">{footer}</p>}
        </div>
      </main>
    </div>
  );
}
