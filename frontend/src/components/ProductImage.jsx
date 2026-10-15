import { useState } from "react";

const GRADS = [
  "linear-gradient(135deg,#c7d2fe,#818cf8)", "linear-gradient(135deg,#fbcfe8,#c084fc)",
  "linear-gradient(135deg,#bae6fd,#6366f1)", "linear-gradient(135deg,#fde68a,#f9a8d4)",
  "linear-gradient(135deg,#a7f3d0,#60a5fa)", "linear-gradient(135deg,#ddd6fe,#f0abfc)",
];

/** Real image if the seller supplied a URL; otherwise a clean generated placeholder. */
export default function ProductImage({ product, className = "" }) {
  const [failed, setFailed] = useState(false);
  const src = product.image_url;
  if (src && !failed) {
    return <img className={`pimg ${className}`} src={src} alt={product.name} loading="lazy" onError={() => setFailed(true)} />;
  }
  const id = product.id || product.product || 0;
  return (
    <div className={`pimg placeholder ${className}`} style={{ background: GRADS[id % GRADS.length] }} aria-label={product.name} role="img">
      <span>{product.category_detail?.icon || "✦"}</span>
    </div>
  );
}
