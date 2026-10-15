import { useNavigate } from "react-router-dom";
import Logo from "../components/Logo.jsx";
import { useAuth } from "../context/AuthContext.jsx";

// Customer and seller experiences now live in pages/customer and pages/seller.
// Admin is still a placeholder until the admin module is built.
export function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="dash">
      <header className="dash-bar">
        <Logo />
        <div className="dash-user">
          <span className="badge">{user.role}</span>
          <button className="btn btn-outline" onClick={async () => { await logout(); navigate("/login"); }}>Logout</button>
        </div>
      </header>
      <main className="dash-main">
        <h1>Admin Dashboard</h1>
        <p className="muted">Manage users, products and analytics here.</p>
        <div className="empty-state"><span>✦</span><p>Nothing here yet. This area is coming soon.</p></div>
      </main>
    </div>
  );
}
