import { Link } from "react-router-dom";
import Icon from "./Icon.jsx";
import ProductImage from "./ProductImage.jsx";
import { useShop } from "../context/ShopContext.jsx";
import { money } from "../utils/format.js";

export default function ProductCard({ product }) {
  const { wishlist, toggleWishlist, addToCart } = useShop();
  const saved = wishlist.includes(product.id);
  const out = product.stock === 0;
  const low = product.stock > 0 && product.stock <= 5;

  return (
    <article className="pcard">
      <div className="pcard-media">
        <Link to={`/product/${product.id}`} aria-label={product.name}><ProductImage product={product} /></Link>
        <button className={`wish ${saved ? "on" : ""}`} onClick={() => toggleWishlist(product.id)}
          aria-pressed={saved} aria-label={saved ? "Remove from wishlist" : "Add to wishlist"}>
          <Icon name="heart" size={18} />
        </button>
        {out && <span className="tag tag-out">Sold out</span>}
        {low && <span className="tag tag-low">Only {product.stock} left</span>}
      </div>
      <div className="pcard-body">
        <span className="pcard-cat">{product.category_detail?.name || "General"}</span>
        <Link to={`/product/${product.id}`} className="pcard-name">{product.name}</Link>
        <span className="pcard-seller">by {product.seller_name}</span>
        <div className="pcard-foot">
          <strong>{money(product.price)}</strong>
          <button className="btn btn-primary btn-sm" disabled={out} onClick={() => addToCart(product.id)}>
            <Icon name="cart" size={16} />{out ? "Unavailable" : "Add"}
          </button>
        </div>
      </div>
    </article>
  );
}
