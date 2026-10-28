import { Link } from "react-router-dom";
import ProductImage from "./ProductImage.jsx";
import Scroller from "./Scroller.jsx";
import { categoryPhoto } from "../utils/storefront.js";

/** Horizontal rail of photo category cards, ordered by how many products each holds. */
export default function CategoryRail({ categories }) {
  const list = [...categories].filter((c) => c.slug).sort((a, b) => b.count - a.count);
  if (!list.length) return null;
  return (
    <Scroller label="Categories" className="crail">
      {list.map((c, i) => {
        const photo = categoryPhoto(c);
        return (
          <Link key={c.id} to={`/shop?category=${c.slug}`} className={`ccard hue-${i % 5}`}>
            <span className="ccard-media">{photo ? <ProductImage product={{ ...photo, name: c.name }} /> : <span className="ccard-icon" aria-hidden="true">{c.icon}</span>}</span>
            <span className="ccard-text">
              <small>{c.count} {c.count === 1 ? "item" : "items"}</small>
              <strong>{c.name}</strong>
            </span>
            <span className="ccard-go" aria-hidden="true">↗</span>
          </Link>
        );
      })}
    </Scroller>
  );
}
