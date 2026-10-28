import { Link } from "react-router-dom";
import ProductImage from "./ProductImage.jsx";
import { ArrowUpRight } from "./Glyphs.jsx";
import { hasImage } from "../utils/storefront.js";

/** One tile of the homepage bento grid. tone: "photo" | "hot" | "glass" | "cyan". */
export default function BentoTile({ to, area, tone = "glass", eyebrow, title, text, product, children }) {
  const photo = product && hasImage(product) ? product : null;
  return (
    <Link to={to} className={`bento bento-${area} tone-${tone} ${photo ? "has-photo" : ""}`}>
      {photo && <span className="bento-photo" aria-hidden="true"><ProductImage product={photo} /></span>}
      <span className="bento-body">
        {eyebrow && <small>{eyebrow}</small>}
        <strong>{title}</strong>
        {text && <span className="bento-text">{text}</span>}
        {children}
      </span>
      <span className="bento-go" aria-hidden="true"><ArrowUpRight size={18} /></span>
    </Link>
  );
}
