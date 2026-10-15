import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import Icon from "./Icon.jsx";
import Logo from "./Logo.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useShop } from "../context/ShopContext.jsx";

export default function CustomerLayout() {
  const { user, logout } = useAuth();
  const { cart, wishlist } = useShop();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [q, setQ] = useState("");
  const [menu, setMenu] = useState(false);
  const ref = useRef(null);

  useEffect(() => { window.scrollTo(0, 0); setMenu(false); }, [pathname]);
  useEffect(() => {
    const h = (e) => ref.current && !ref.current.contains(e.target) && setMenu(false);
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const search = (e) => {
    e.preventDefault();
    navigate(q.trim() ? `/shop?q=${encodeURIComponent(q.trim())}` : "/shop");
  };
  const initials = user.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="cust">
      <header className="cust-header">
        <div className="container cust-bar">
          <Logo />
          <nav className="cust-nav" aria-label="Primary">
            <NavLink to="/dashboard">Home</NavLink>
            <NavLink to="/shop">Shop</NavLink>
            <NavLink to="/orders">Orders</NavLink>
          </nav>
          <form className="cust-search" onSubmit={search} role="search">
            <Icon name="search" size={18} />
            <input type="search" placeholder="Search products…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search products" />
          </form>
          <div className="cust-actions">
            <Link to="/wishlist" className="icon-btn badge-wrap" aria-label="Wishlist">
              <Icon name="heart" />{wishlist.length > 0 && <span className="count">{wishlist.length}</span>}
            </Link>
            <Link to="/cart" className="icon-btn badge-wrap" aria-label={`Cart, ${cart.count} items`}>
              <Icon name="cart" />{cart.count > 0 && <span className="count">{cart.count}</span>}
            </Link>
            <div className="user-menu" ref={ref}>
              <button className="avatar" onClick={() => setMenu((m) => !m)} aria-haspopup="menu" aria-expanded={menu} aria-label="Account menu">{initials}</button>
              {menu && (
                <div className="menu" role="menu">
                  <div className="menu-head"><b>{user.name}</b><small>{user.email}</small></div>
                  <Link to="/orders" role="menuitem"><Icon name="list" size={16} />My orders</Link>
                  <Link to="/wishlist" role="menuitem"><Icon name="heart" size={16} />Wishlist</Link>
                  <button role="menuitem" onClick={async () => { await logout(); navigate("/"); }}><Icon name="logout" size={16} />Sign out</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="container cust-main"><Outlet /></main>

      <footer className="cust-footer"><div className="container">© {new Date().getFullYear()} SmartCart · Secure checkout · Track every order</div></footer>

      <nav className="tabbar" aria-label="Mobile">
        <NavLink to="/dashboard"><Icon name="home" /><span>Home</span></NavLink>
        <NavLink to="/shop"><Icon name="search" /><span>Shop</span></NavLink>
        <NavLink to="/wishlist"><Icon name="heart" /><span>Saved</span></NavLink>
        <NavLink to="/cart" className="badge-wrap"><Icon name="cart" />{cart.count > 0 && <span className="count">{cart.count}</span>}<span>Cart</span></NavLink>
        <NavLink to="/orders"><Icon name="list" /><span>Orders</span></NavLink>
      </nav>
    </div>
  );
}
