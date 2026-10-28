import { useState } from "react";
import { Link } from "react-router-dom";
import Icon from "./Icon.jsx";
import ProductImage from "./ProductImage.jsx";
import PriceTag, { OfferBadge } from "./PriceTag.jsx";
import Spinner from "./Spinner.jsx";
import { useShop } from "../context/ShopContext.jsx";

export function WishlistButton({ product }) {
  const { wishlist, toggleWishlist } = useShop();
  const saved = wishlist.includes(product.id);
  const [busy, setBusy] = useState(false);
  const onClick = async () => {
    setBusy(true);
    try { await toggleWishlist(product.id); } finally { setBusy(false); }
  };
  return (
    <button type="button" className={`wish ${saved ? "on" : ""}`} onClick={onClick} disabled={busy}
      aria-pressed={saved} aria-label={saved ? "Remove from wishlist" : "Add to wishlist"}>
      <Icon name="heart" size={17} />
    </button>
  );
}

/** variant="round" is the compact icon button used on product cards. */
export function AddToCartButton({ product, className = "btn btn-primary btn-sm", label = "Add", variant }) {
  const { addToCart } = useShop();
  const [state, setState] = useState("idle"); // idle | busy | done
  const out = product.stock === 0;

  const onClick = async () => {
    setState("busy");
    const ok = await addToCart(product.id);
    setState(ok ? "done" : "idle");
    if (ok) window.setTimeout(() => setState("idle"), 1400);
  };
  const aria = out ? `${product.name} is unavailable` : `Add ${product.name} to cart`;

  if (variant === "round") {
    return (
      <button type="button" className={`pc-add ${state === "done" ? "done" : ""}`} disabled={out || state === "busy"} onClick={onClick} aria-label={aria} title={out ? "Unavailable" : "Add to cart"}>
        {state === "busy" ? <Spinner /> : <Icon name={state === "done" ? "check" : "plus"} size={19} />}
      </button>
    );
  }
  return (
    <button type="button" className={className} disabled={out || state === "busy"} onClick={onClick} aria-label={aria}>
      {state === "busy" ? <Spinner /> : <Icon name={state === "done" ? "check" : "cart"} size={16} />}
      {out ? "Unavailable" : state === "done" ? "Added" : label}
    </button>
  );
}

export default function ProductCard({ product }) {
  const out = product.stock === 0;
  const low = product.stock > 0 && product.stock <= 5;
  return (
    <article className={`pc ${out ? "is-out" : ""}`}>
      <div className="pc-media">
        <Link to={`/product/${product.id}`} aria-label={product.name}><ProductImage product={product} /></Link>
        <div className="pc-badges">
          <OfferBadge product={product} />
          {out && <span className="tag tag-out">Sold out</span>}
          {low && <span className="tag tag-low">{product.stock} left</span>}
        </div>
        <WishlistButton product={product} />
      </div>
      <div className="pc-body">
        <span className="pc-cat">{product.category_detail?.name || "General"}</span>
        <Link to={`/product/${product.id}`} className="pc-name">{product.name}</Link>
        <span className="pc-seller">by {product.seller_name}</span>
        <div className="pc-foot">
          <PriceTag product={product} />
          <AddToCartButton product={product} variant="round" />
        </div>
      </div>
    </article>
  );
}
