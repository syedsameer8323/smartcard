import Logo from "./Logo.jsx";

export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="auth-page">
      <aside className="auth-aside">
        <Logo light />
        <div>
          <h2>Shop smarter.<br />Discover better.</h2>
          <p>AI that learns what you love and surfaces products worth your time.</p>
        </div>
        <div className="aside-cards" aria-hidden="true">
          <div className="mini-card"><span className="dot" />Picked for you<b>98% match</b></div>
          <div className="mini-card offset"><span className="dot alt" />Trending in your interests<b>New</b></div>
        </div>
      </aside>
      <main className="auth-main">
        <div className="auth-card">
          <div className="auth-mobile-logo"><Logo /></div>
          <h1>{title}</h1>
          <p className="muted">{subtitle}</p>
          {children}
          {footer && <p className="auth-footer">{footer}</p>}
        </div>
      </main>
    </div>
  );
}
