import Icon from "./Icon.jsx";

// Only benefits SmartCart genuinely provides today.
const ITEMS = [
  ["shield", "Secure payments", "Online payments are processed by Razorpay."],
  ["truck", "Free shipping", "No delivery charge on any order."],
  ["list", "Live order tracking", "Follow each item from placed to delivered."],
  ["refresh", "Easy cancellation", "Cancel before dispatch; paid orders are refunded in 5–7 business days."],
];

export default function TrustStrip() {
  return (
    <ul className="trust" aria-label="Why shop with SmartCart">
      {ITEMS.map(([icon, title, text], i) => (
        <li key={title}>
          <span className="trust-no" aria-hidden="true">0{i + 1}</span>
          <span className="trust-icon"><Icon name={icon} size={22} /></span>
          <strong>{title}</strong>
          <p>{text}</p>
        </li>
      ))}
    </ul>
  );
}
