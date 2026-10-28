import { Link } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import Footer from "../components/Footer.jsx";
import AnnouncementBar from "../components/AnnouncementBar.jsx";
import HeroSection from "../components/HeroSection.jsx";
import CategoryRail from "../components/CategoryRail.jsx";
import TrustStrip from "../components/TrustStrip.jsx";
import SectionHead from "../components/SectionHead.jsx";
import Reveal from "../components/Reveal.jsx";
import ProductCard from "../components/ProductCard.jsx";
import { ArrowUpRight } from "../components/Glyphs.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { ROLE_HOME } from "../routes/ProtectedRoute.jsx";
import { catalogApi } from "../services/shop.js";
import { useAsync } from "../utils/hooks.js";
import { useCategoryShowcase } from "../utils/storefront.js";
import { useStorefrontTheme } from "../utils/theme.js";

export default function Landing() {
  useStorefrontTheme();
  const { isAuthenticated, user } = useAuth();
  const isCustomer = isAuthenticated && user?.role === "customer";
  const startTo = isAuthenticated ? (ROLE_HOME[user?.role] || "/dashboard") : "/register";
  const shopTo = isCustomer ? "/shop" : startTo;

  const cats = useCategoryShowcase();
  const offers = useAsync(() => catalogApi.activeOffers(), []);
  const fresh = useAsync(() => catalogApi.products({ sort: "newest", page_size: 8 }), []);
  const categories = cats.data || [];
  const items = fresh.data?.results || [];

  return (
    <>
      <AnnouncementBar />
      <Navbar />
      <main className="landing-page">
        <div id="home" />
        <HeroSection
          eyebrow="Shopping, upgraded"
          title={<>Good finds.<br /><span className="grad-text">Smarter choices.</span></>}
          text="Discover everyday essentials, thoughtful upgrades and new favourites — all in one place, shipped free and tracked end to end."
          primary={{ label: isCustomer ? "Explore the store" : "Get started", to: shopTo }}
          secondary={{ label: isAuthenticated ? "Go to dashboard" : "Log in", to: isAuthenticated ? startTo : "/login" }}
          products={items}
          offer={offers.data?.offers?.[0]}
          facts={[
            ...(fresh.data?.count ? [[fresh.data.count, "products"]] : []),
            ...(categories.length ? [[categories.length, "categories"]] : []),
            ["₹0", "shipping"],
          ]}
        />

        {categories.length > 0 && (
          <section className="sec" id="collections">
            <div className="container">
              <Reveal><SectionHead eyebrow="Collections" title="Something for every part of life" text="Browse by category to see what our sellers have to offer." /></Reveal>
              <Reveal delay={80}><CategoryRail categories={categories} /></Reveal>
            </div>
          </section>
        )}

        {items.length > 0 && isCustomer && (
          <section className="sec sec-tight">
            <div className="container">
              <Reveal><SectionHead eyebrow="Fresh drops" title="New arrivals" to="/shop?sort=newest" /></Reveal>
              <Reveal delay={80}><div className="product-grid">{items.slice(0, 4).map((p) => <ProductCard key={p.id} product={p} />)}</div></Reveal>
            </div>
          </section>
        )}

        <section id="about" className="sec">
          <div className="container">
            <Reveal>
              <div className="about3">
                <div>
                  <span className="kicker">The SmartCart difference</span>
                  <h2>Shopping should feel <span className="grad-text">effortless.</span></h2>
                </div>
                <div>
                  <p>A fast, clear place to discover everyday products, keep your favourites close and follow every order — without the clutter.</p>
                  <Link to={shopTo} className="chip-link">{isCustomer ? "Start exploring" : "Discover SmartCart"} <ArrowUpRight size={15} /></Link>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        <section id="features" className="sec sec-tight">
          <div className="container"><Reveal><TrustStrip /></Reveal></div>
        </section>

        <section className="sec">
          <div className="container">
            <Reveal>
              <div className="cta3">
                <div className="hero3-mesh" aria-hidden="true" />
                <h2>Your next favourite is <span className="grad-text">one tap away.</span></h2>
                <p>{isAuthenticated ? "Your SmartCart space is ready whenever you are." : "Create a free account and make your next shopping trip a little faster."}</p>
                <Link to={isAuthenticated ? startTo : "/register"} className="btn btn-primary btn-lg">{isAuthenticated ? "Go to dashboard" : "Create your account"}<ArrowUpRight size={18} /></Link>
              </div>
            </Reveal>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
