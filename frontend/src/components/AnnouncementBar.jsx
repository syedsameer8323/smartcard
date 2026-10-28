import { Link } from "react-router-dom";
import { catalogApi } from "../services/shop.js";
import { useAsync } from "../utils/hooks.js";
import { percentText } from "../utils/offers.js";

/** Scrolling ticker above the header. Only states things SmartCart really does today. */
export default function AnnouncementBar() {
  const offers = useAsync(() => catalogApi.activeOffers(), []);
  const top = offers.data?.offers?.[0];

  const items = [
    <span key="ship">Free shipping on every order</span>,
    <span key="pay">Secure payments with Razorpay</span>,
    top
      ? <Link key="offer" to="/shop?offer=true" className="ticker-offer">{top.name} · up to {percentText(top.max_discount_percent)} off</Link>
      : <span key="track">Track every order from checkout to delivery</span>,
    <span key="cancel">Cancel before dispatch, refunds in 5–7 business days</span>,
  ];

  return (
    <div className="ticker" role="region" aria-label="Store announcements">
      <div className="ticker-track">
        <ul>{items.map((item, i) => <li key={i}>{item}</li>)}</ul>
        <ul aria-hidden="true">{items.map((item, i) => <li key={i}>{item}</li>)}</ul>
        <ul aria-hidden="true">{items.map((item, i) => <li key={i}>{item}</li>)}</ul>
      </div>
    </div>
  );
}
