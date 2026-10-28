import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import Icon from "./Icon.jsx";
import Logo from "./Logo.jsx";
import AnnouncementBar from "./AnnouncementBar.jsx";
import Footer from "./Footer.jsx";
import SearchPalette from "./SearchPalette.jsx";
import ThemeToggle from "./ThemeToggle.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useShop } from "../context/ShopContext.jsx";
import { useStorefrontTheme } from "../utils/theme.js";

export default function CustomerLayout() {
  useStorefrontTheme();
  const { user, logout } = useAuth();
  const { cart, wishlist } = useShop();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [menu, setMenu] = useState(false);
  const [searching, setSearching] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const ref = useRef(null);

  useEffect(() => { window.scrollTo(0, 0); setMenu(false); }, [pathname]);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => {
    const outside = (e) => ref.current && !ref.current.contains(e.target) && setMenu(false);
    const keys = (e) => {
      const typing = /input|textarea|select/i.test(document.activeElement?.tagName || "");
      if ((e.key === "k" || e.key === "K") && (e.ctrlKey || e.metaKey)) { e.preventDefault(); setSearching(true); }
      else if (e.key === "/" && !typing) { e.preventDefault(); setSearching(true); }
      else if (e.key === "Escape") setMenu(false);
    };
    document.addEventListener("mousedown", outside);
    document.addEventListener("keydown", keys);
    return () => { document.removeEventListener("mousedown", outside); document.removeEventListener("keydown", keys); };
  }, []);

  const initials = user.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  const wide = pathname === "/dashboard"; // the homepage lays out its own full-width sections

  return (
    <div className="cust">
      <AnnouncementBar />
      <header className={`hdr ${scrolled ? "is-scrolled" : ""}`}>
        <div className="container">
          <div className="hdr-bar">
            <Logo />
            <nav className="seg" aria-label="Primary">
              <NavLink to="/dashboard">Home</NavLink>
              <NavLink to="/shop">Shop</NavLink>
              <NavLink to="/orders">Orders</NavLink>
            </nav>
            <button type="button" className="sbtn" onClick={() => setSearching(true)} aria-label="Search products (Ctrl K)">
              <Icon name="search" size={17} />
              <span>Search products…</span>
              <kbd>Ctrl K</kbd>
            </button>
            <div className="hdr-actions">
              <ThemeToggle />
              <Link to="/wishlist" className="icon-btn badge-wrap hide-sm" aria-label={`Wishlist, ${wishlist.length} saved`}>
                <Icon name="heart" />{wishlist.length > 0 && <span className="count">{wishlist.length}</span>}
              </Link>
              <Link to="/cart" className="icon-btn badge-wrap hide-sm" aria-label={`Cart, ${cart.count} items`}>
                <Icon name="cart" />{cart.count > 0 && <span className="count">{cart.count}</span>}
              </Link>
              <div className="user-menu" ref={ref}>
                <button className="avatar" onClick={() => setMenu((m) => !m)} aria-haspopup="menu" aria-expanded={menu} aria-label="Account menu">{initials}</button>
                {menu && (
                  <div className="umenu" role="menu">
                    <div className="umenu-head"><span className="avatar sm" aria-hidden="true">{initials}</span><div><b>{user.name}</b><small>{user.email}</small></div></div>
                    <Link to="/orders" role="menuitem"><Icon name="list" size={16} />My orders</Link>
                    <Link to="/wishlist" role="menuitem"><Icon name="heart" size={16} />Wishlist</Link>
                    <Link to="/cart" role="menuitem"><Icon name="cart" size={16} />Cart</Link>
                    <button role="menuitem" onClick={async () => { await logout(); navigate("/"); }}><Icon name="logout" size={16} />Sign out</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className={wide ? "cust-main wide" : "container cust-main"}><Outlet /></main>

      <Footer />

      <nav className="tabbar" aria-label="Mobile">
        <NavLink to="/dashboard"><Icon name="home" /><span>Home</span></NavLink>
        <NavLink to="/shop"><Icon name="store" /><span>Shop</span></NavLink>
        <NavLink to="/wishlist"><Icon name="heart" /><span>Saved</span></NavLink>
        <NavLink to="/cart" className="badge-wrap"><Icon name="cart" />{cart.count > 0 && <span className="count">{cart.count}</span>}<span>Cart</span></NavLink>
        <NavLink to="/orders"><Icon name="list" /><span>Orders</span></NavLink>
      </nav>

      <SearchPalette open={searching} onClose={() => setSearching(false)} />
    </div>
  );
}
