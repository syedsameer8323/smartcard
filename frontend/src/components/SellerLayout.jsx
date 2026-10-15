import { useCallback, useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate, Link } from "react-router-dom";
import Icon from "./Icon.jsx";
import Logo from "./Logo.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { sellerApi } from "../services/shop.js";

const NAV = [["/seller", "chart", "Overview", true], ["/seller/products", "box", "Products"], ["/seller/orders", "truck", "Orders"], ["/seller/coupons", "star", "Coupons"]];
const base64ToBytes = (base64) => { const padding = "=".repeat((4 - base64.length % 4) % 4); const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/")); return Uint8Array.from([...raw].map((c) => c.charCodeAt(0))); };

export default function SellerLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [pushMessage, setPushMessage] = useState("");
  const loadNotifications = useCallback(async () => { try { const { data } = await sellerApi.notifications(); setNotifications(data.results || []); setUnread(data.unread_count || 0); } catch { /* In-app panel gracefully stays empty if the API is temporarily unavailable. */ } }, []);
  useEffect(() => { setOpen(false); window.scrollTo(0, 0); }, [pathname]);
  useEffect(() => { loadNotifications(); const timer = window.setInterval(loadNotifications, 30000); return () => window.clearInterval(timer); }, [loadNotifications]);
  const markRead = async (note) => { if (!note.is_read) { try { await sellerApi.markNotificationRead(note.id); await loadNotifications(); } catch {} } };
  const enablePush = async () => {
    setPushMessage("");
    try {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) throw new Error("Browser push is not supported in this browser. In-app notifications will still work.");
      const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
      if (!vapidKey) throw new Error("Set VITE_VAPID_PUBLIC_KEY in frontend/.env to enable browser push.");
      const permission = await Notification.requestPermission();
      if (permission !== "granted") throw new Error("Notification permission was not granted. You can still see updates in this panel.");
      const registration = await navigator.serviceWorker.register("/sw.js");
      const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64ToBytes(vapidKey) });
      await sellerApi.savePushSubscription(subscription.toJSON());
      setPushMessage("Browser notifications enabled.");
    } catch (error) { setPushMessage(error.message || "Could not enable browser notifications."); }
  };

  return <div className="seller">
    {open && <div className="scrim" onClick={() => setOpen(false)} />}
    <aside className={`sidebar ${open ? "open" : ""}`}>
      <div className="sidebar-top"><Logo light /><span className="role-chip">Seller</span></div>
      <nav className="side-nav" aria-label="Seller">{NAV.map(([to, icon, label, end]) => <NavLink key={to} to={to} end={end}><Icon name={icon} size={19} />{label}</NavLink>)}</nav>
      <div className="side-user"><div className="avatar sm">{user.name[0].toUpperCase()}</div><div><b>{user.name}</b><small>{user.email}</small></div><button className="icon-btn light" aria-label="Sign out" onClick={async () => { await logout(); navigate("/login"); }}><Icon name="logout" size={18} /></button></div>
    </aside>
    <div className="seller-body">
      <header className="seller-top"><button className="icon-btn" onClick={() => setOpen(true)} aria-label="Open menu"><Icon name="menu" /></button><Logo /><button className="notification-trigger" onClick={() => setNotificationsOpen((v) => !v)} aria-label={`Notifications, ${unread} unread`}><Icon name="bell" />{unread > 0 && <span className="notification-count">{unread > 99 ? "99+" : unread}</span>}</button></header>
      <div className="seller-page-topbar"><div><b>Seller workspace</b><small>Orders, inventory and store activity</small></div><button className="notification-trigger desktop-notification" onClick={() => setNotificationsOpen((v) => !v)} aria-label={`Notifications, ${unread} unread`}><Icon name="bell" />Notifications{unread > 0 && <span className="notification-count">{unread}</span>}</button></div>
      {notificationsOpen && <div className="notification-popover"><div className="notification-head"><div><b>Notifications</b><small>{unread} unread</small></div><button className="link-button" onClick={enablePush}>Enable browser push</button></div>{pushMessage && <p className="notification-hint">{pushMessage}</p>}{notifications.length === 0 ? <div className="notification-empty">You're all caught up. New order updates will appear here.</div> : <div className="notification-list">{notifications.map((n) => <div key={n.id} className={`notification-item ${n.is_read ? "read" : "unread"}`}><button className="notification-item-main" onClick={() => markRead(n)}><b>{n.title}</b><span>{n.message}</span><small>{new Date(n.created_at).toLocaleString("en-IN")}</small></button>{n.order && <Link to="/seller/orders" onClick={() => { markRead(n); setNotificationsOpen(false); }}>View order</Link>}</div>)}</div>}</div>}
      <main className="seller-main"><Outlet /></main>
    </div>
  </div>;
}
