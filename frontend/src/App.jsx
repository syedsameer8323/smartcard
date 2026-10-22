import { Navigate, Route, Routes } from "react-router-dom";
import Landing from "./pages/Landing.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import ForgotPassword from "./pages/ForgotPassword.jsx";
import ResetPassword from "./pages/ResetPassword.jsx";
import VerifyOTP from "./pages/VerifyOTP.jsx";
import { AdminDashboard } from "./pages/Dashboards.jsx";
import { ProtectedRoute, GuestRoute } from "./routes/ProtectedRoute.jsx";
import CustomerLayout from "./components/CustomerLayout.jsx";
import SellerLayout from "./components/SellerLayout.jsx";
import Home from "./pages/customer/Home.jsx";
import Shop from "./pages/customer/Shop.jsx";
import ProductDetail from "./pages/customer/ProductDetail.jsx";
import Cart from "./pages/customer/Cart.jsx";
import Checkout from "./pages/customer/Checkout.jsx";
import Wishlist from "./pages/customer/Wishlist.jsx";
import Orders from "./pages/customer/Orders.jsx";
import Overview from "./pages/seller/Overview.jsx";
import SellerProducts from "./pages/seller/Products.jsx";
import SellerOrders from "./pages/seller/Orders.jsx";
import SellerCoupons from "./pages/seller/Coupons.jsx";
import SellerOffers from "./pages/seller/Offers.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route element={<GuestRoute />}>
        <Route path="/login" element={<Login />} />
        <Route path="/verify-otp" element={<VerifyOTP />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
      </Route>

      <Route element={<ProtectedRoute roles={["customer"]} />}>
        <Route element={<CustomerLayout />}>
          <Route path="/dashboard" element={<Home />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/wishlist" element={<Wishlist />} />
          <Route path="/orders" element={<Orders />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute roles={["seller"]} />}>
        <Route element={<SellerLayout />}>
          <Route path="/seller" element={<Overview />} />
          <Route path="/seller/products" element={<SellerProducts />} />
          <Route path="/seller/orders" element={<SellerOrders />} />
          <Route path="/seller/offers" element={<SellerOffers />} />
          <Route path="/seller/coupons" element={<SellerCoupons />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute roles={["admin"]} />}>
        <Route path="/admin" element={<AdminDashboard />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
