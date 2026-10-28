import { useState } from "react";

// Placeholder tones (used only when a product has no image or it fails to load).
const TONES = [
  ["#2B1A17", "#D9341A"], ["#1B2430", "#22D3EE"], ["#2A2112", "#FFB020"],
  ["#1E1B2E", "#7C83FF"], ["#142421", "#34D399"], ["#2B1522", "#F472B6"],
];

/** Real image if the seller supplied a URL; otherwise a generated placeholder. Never distorts (object-fit: cover). */
export default function ProductImage({ product, className = "" }) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const src = product.image_url;

  if (src && !failed) {
    return (
      <img
        className={`pimg ${loaded ? "is-loaded" : ""} ${className}`}
        src={src}
        alt={product.name}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
      />
    );
  }

  const id = Number(product.id || product.product || 0);
  const [from, to] = TONES[id % TONES.length];
  return (
    <div className={`pimg placeholder ${className}`} style={{ background: `radial-gradient(120% 90% at 20% 0%,${to}55,transparent 60%),linear-gradient(160deg,${from},#0b0c12)` }} aria-label={product.name} role="img">
      <span>{product.category_detail?.icon || "⚡"}</span>
    </div>
  );
}
