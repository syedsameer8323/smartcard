import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import Spinner from "../components/Spinner.jsx";

export const ROLE_HOME = { customer: "/dashboard", seller: "/seller", admin: "/admin" };

/** Requires login; optional `roles` restricts to specific roles (CustomerRoute/SellerRoute/AdminRoute). */
export function ProtectedRoute({ roles }) {
  const { isAuthenticated, user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Spinner fullPage />;
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location }} />;
  if (roles && !roles.includes(user.role)) return <Navigate to={ROLE_HOME[user.role]} replace />;
  return <Outlet />;
}

/** Login/register pages: signed-in users are sent to their own dashboard. */
export function GuestRoute() {
  const { isAuthenticated, user, loading } = useAuth();
  if (loading) return <Spinner fullPage />;
  if (isAuthenticated) return <Navigate to={ROLE_HOME[user.role]} replace />;
  return <Outlet />;
}
