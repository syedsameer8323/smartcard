import { Link } from "react-router-dom";

/**
 * variant="light": dark wordmark for light backgrounds (landing header).
 * variant="dark": white wordmark for dark backgrounds (footer/login panel).
 * The legacy `light` prop remains supported for existing callers.
 */
export default function Logo({ variant = "light", light = false, className = "" }) {
  const appearance = light ? "dark" : variant;
  const image =
    appearance === "dark"
      ? "/smartcart-logo-dark.png"
      : "/smartcart-logo-light.png";

  return (
    <Link
      to="/"
      className={`logo logo-${appearance} ${className}`.trim()}
      aria-label="SmartCart home"
    >
      <img
        src={image}
        alt="SmartCart — Shop Everything Smarter"
        className="logo-image"
      />
    </Link>
  );
}
