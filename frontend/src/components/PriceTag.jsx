import { money } from "../utils/format.js";
import { percentText } from "../utils/offers.js";
import "../styles/offers.css";

/** The price a customer pays, with the list price crossed out while a festival sale is live. */
export default function PriceTag({ product, size = "md" }) {
  const sale = Number(product.sale_price ?? product.price);
  const list = Number(product.price);
  const discounted = sale < list;
  return (
    <div className={`pricetag ${size}`}>
      <strong className="price-now">{money(sale)}</strong>
      {discounted && <s className="price-was" aria-label={`Original price ${money(list)}`}>{money(list)}</s>}
      {discounted && product.discount_percent && <span className="price-off">{percentText(product.discount_percent)} off</span>}
    </div>
  );
}

/** Discount chip over product imagery, e.g. "-15%". */
export function OfferBadge({ product }) {
  if (!product.offer || !product.discount_percent) return null;
  return (
    <span className="tag tag-offer" title={product.offer.name}>
      −{percentText(product.discount_percent)}
    </span>
  );
}
