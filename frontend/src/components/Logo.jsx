import { Link } from "react-router-dom";

export default function Logo({ light = false }) {
  return (
    <Link to="/" className={`logo ${light ? "logo-light" : ""}`} aria-label="SmartCart home">
    <span className="logo-mark" aria-hidden="true">✦</span>
    <span>SmartCart</span>
    </Link>
  );
}
