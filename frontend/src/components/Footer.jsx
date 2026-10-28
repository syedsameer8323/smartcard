import { Link } from "react-router-dom";
import Logo from "./Logo.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function Footer() {
  const { isAuthenticated, user } = useAuth();
  const customer = isAuthenticated && user?.role === "customer";

  return (
    <footer className="foot">
      <div className="container foot-grid">
        <div className="foot-brand">
          <Logo variant="dark" />
          <p>Everyday essentials, technology, fashion, beauty and more — from sellers we trust, shipped free.</p>
          <ul className="pay-chips" aria-label="Accepted payment methods">
            <li>Razorpay secure payments</li>
            <li>Cash on delivery</li>
          </ul>
        </div>

        <nav aria-label="Shop">
          <h4>Shop</h4>
          {customer ? (
            <>
              <Link to="/shop">All products</Link>
              <Link to="/shop?sort=newest">New arrivals</Link>
              <Link to="/shop?offer=true">Festival offers</Link>
              <Link to="/shop?max_price=5000&sort=price_asc">Under ₹5,000</Link>
            </>
          ) : (
            <>
              <a href="#collections">Collections</a>
              <a href="#about">About SmartCart</a>
              <Link to="/register">Start shopping</Link>
            </>
          )}
        </nav>

        <nav aria-label="Account">
          <h4>Account</h4>
          {customer ? (
            <>
              <Link to="/orders">My orders</Link>
              <Link to="/wishlist">Wishlist</Link>
              <Link to="/cart">Cart</Link>
            </>
          ) : (
            <>
              <Link to="/login">Sign in</Link>
              <Link to="/register">Create account</Link>
            </>
          )}
        </nav>

        <div>
          <h4>Support</h4>
          <a href="mailto:support@smartcart.example">support@smartcart.example</a>
          <span>Mon–Fri, 9am–6pm</span>
          {customer && <Link to="/orders">Track an order</Link>}
        </div>
      </div>
      <div className="foot-mark" aria-hidden="true">SMARTCART</div>
      <div className="container foot-bottom"><span>© {new Date().getFullYear()} SmartCart. All rights reserved.</span></div>
    </footer>
  );
}
