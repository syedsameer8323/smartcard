import { Link } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import Footer from "../components/Footer.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { ROLE_HOME } from "../routes/ProtectedRoute.jsx";

const FEATURES = [
  ["⌕", "Thoughtful discovery", "Find useful everyday essentials without the extra noise."],
  ["♢", "Secure checkout", "A straightforward checkout with protected account access."],
  ["♡", "Your favourites", "Keep products you love close with your personal wishlist."],
  ["₹", "Clear INR pricing", "Shop with pricing presented in Indian Rupees."],
  ["↗", "Order visibility", "Return to your account to follow your orders."],
];

export default function Landing() {
  const { isAuthenticated, user } = useAuth();
  const startTo = isAuthenticated ? (ROLE_HOME[user?.role] || "/dashboard") : "/register";
  const shopTo = isAuthenticated
    ? (user?.role === "customer" ? "/shop" : startTo)
    : "/register";

  return (
    <>
      <Navbar />
      <main className="landing-page">
        <section id="home" className="landing-hero">
          <div className="landing-hero-glow landing-hero-glow-one" aria-hidden="true" />
          <div className="landing-hero-glow landing-hero-glow-two" aria-hidden="true" />
          <div className="container landing-hero-grid">
            <div className="landing-hero-copy">
              <span className="landing-eyebrow"><span aria-hidden="true">✦</span> A better way to shop</span>
              <h1>Good finds.<span>Smarter choices.</span></h1>
              <p className="landing-hero-description">
                Discover everyday essentials, thoughtful upgrades and new favourites — all in one place.
              </p>
              <div className="landing-hero-actions">
                <Link className="btn btn-primary btn-lg landing-primary-btn" to={shopTo}>
                  {isAuthenticated && user?.role === "customer" ? "Explore the store" : "Get started"} <span aria-hidden="true">→</span>
                </Link>
                <Link className="btn btn-outline btn-lg landing-secondary-btn" to={isAuthenticated ? startTo : "/login"}>
                  {isAuthenticated ? "Go to dashboard" : "Sign in"}
                </Link>
              </div>
              <div className="landing-trust-row">
                <span><i aria-hidden="true">✓</i> Curated discovery</span>
                <span><i aria-hidden="true">✓</i> Clear INR pricing</span>
                <span><i aria-hidden="true">✓</i> Secure checkout</span>
              </div>
            </div>
            <div className="landing-visual" aria-label="Lifestyle image representing the SmartCart shopping experience">
              <div className="landing-visual-image" role="img" aria-label="A thoughtfully arranged selection of clothing" />
              <div className="landing-image-shade" aria-hidden="true" />
              <div className="landing-floating-card">
                <span className="landing-floating-icon" aria-hidden="true">✦</span>
                <div><strong>Find your next favourite</strong><p>Everyday essentials, thoughtfully picked.</p></div>
                <span className="landing-floating-sparkle" aria-hidden="true">✧</span>
              </div>
              <div className="landing-visual-caption">A little more thoughtful. A little more you.</div>
            </div>
          </div>
          <a className="landing-scroll-cue" href="#about" aria-label="Scroll to learn about SmartCart">
            <span aria-hidden="true" /> Discover SmartCart
          </a>
        </section>

        <section id="about" className="landing-about-section">
          <div className="container landing-about-grid">
            <div className="landing-section-heading">
              <span className="landing-kicker">THE SMARTCART DIFFERENCE</span>
              <h2>Shopping should feel <span>simple.</span></h2>
            </div>
            <div className="landing-about-copy">
              <p>A thoughtful place to discover everyday products, manage your favourites and keep your shopping organised — without making the experience feel complicated.</p>
              <Link to={shopTo} className="landing-text-link">
                {isAuthenticated && user?.role === "customer" ? "Start exploring" : "Discover SmartCart"} <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
          <div className="container">
            <div className="landing-feature-strip">
              <div className="landing-feature-intro">
                <span className="landing-kicker">MADE FOR EVERYDAY</span>
                <h3>The little details<br />make the difference.</h3>
                <p>A more considered shopping experience, from discovery to delivery.</p>
              </div>
              <div className="landing-feature-list">
                {FEATURES.map(([icon, title, description], index) => (
                  <article className="landing-feature-item" key={title} style={{ "--feature-index": index }}>
                    <span className="landing-feature-icon" aria-hidden="true">{icon}</span>
                    <div><h4>{title}</h4><p>{description}</p></div>
                    <span className="landing-feature-arrow" aria-hidden="true">↗</span>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="landing-cta-section">
          <div className="container">
            <div className="landing-cta-panel">
              <div className="landing-cta-orb landing-cta-orb-one" aria-hidden="true" />
              <div className="landing-cta-orb landing-cta-orb-two" aria-hidden="true" />
              <span className="landing-kicker">YOUR NEXT FIND IS WAITING</span>
              <h2>Make room for<br /><span>something good.</span></h2>
              <p>{isAuthenticated ? "Your SmartCart space is ready whenever you are." : "Create your account and make your next shopping trip a little more thoughtful."}</p>
              <div className="landing-cta-actions">
                <Link className="btn btn-white btn-lg" to={isAuthenticated ? startTo : "/register"}>
                  {isAuthenticated ? "Go to dashboard" : "Create an account"} <span aria-hidden="true">→</span>
                </Link>
                {!isAuthenticated && <Link className="landing-cta-signin" to="/login">Already a member? Sign in</Link>}
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
