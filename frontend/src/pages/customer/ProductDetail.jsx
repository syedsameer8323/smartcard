import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Icon from "../../components/Icon.jsx";
import ProductCard from "../../components/ProductCard.jsx";
import ProductImage from "../../components/ProductImage.jsx";
import PriceTag, { OfferBadge } from "../../components/PriceTag.jsx";
import { EmptyState, QtyStepper, Skeleton } from "../../components/ui.jsx";
import { useShop } from "../../context/ShopContext.jsx";
import { catalogApi } from "../../services/shop.js";
import { useAsync } from "../../utils/hooks.js";
import { money } from "../../utils/format.js";
import { festivalOf, endsIn, formatDateTime } from "../../utils/offers.js";

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart, wishlist, toggleWishlist } = useShop();
  const [qty, setQty] = useState(1);
  const { data: p, loading, error } = useAsync(() => catalogApi.product(id), [id]);
  const related = useAsync(
    () => (p?.category_detail ? catalogApi.products({ category: p.category_detail.slug, page_size: 5 }) : Promise.resolve({ data: { results: [] } })),
    [p?.id]);
  useEffect(() => setQty(1), [id]);

  if (loading && !p) return <div className="detail"><Skeleton className="sk-hero" /><div><Skeleton className="sk-line" /><Skeleton className="sk-line short" /></div></div>;
  if (error || !p) return <EmptyState icon="search" title="Product not found" text="It may have been removed or is no longer available." action={<Link to="/shop" className="btn btn-primary">Back to shop</Link>} />;

  const out = p.stock === 0;
  const saving = Number(p.price) - Number(p.sale_price ?? p.price);
  const saved = wishlist.includes(p.id);
  const others = (related.data?.results || []).filter((r) => r.id !== p.id).slice(0, 4);

  return (
    <>
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link to="/dashboard">Home</Link><span>/</span><Link to="/shop">Shop</Link>
        {p.category_detail && <><span>/</span><Link to={`/shop?category=${p.category_detail.slug}`}>{p.category_detail.name}</Link></>}
      </nav>
      <div className="detail">
        <div className="detail-media"><ProductImage product={p} /><OfferBadge product={p} /></div>
        <div className="detail-info">
          {p.category_detail && <span className="pcard-cat">{p.category_detail.icon} {p.category_detail.name}</span>}
          <h1>{p.name}</h1>
          <p className="muted">Sold by <b>{p.seller_name}</b></p>
          <PriceTag product={p} size="lg" />
          {saving > 0 && <p className="detail-save">You save {money(saving)} on this item</p>}
          {p.offer && (
            <div className={`offer-strip fest-${p.offer.festival}`}>
              <span aria-hidden="true">{festivalOf(p.offer.festival).emoji}</span><b>{p.offer.name}</b>
              <small>{endsIn(p.offer.ends_at)} · until {formatDateTime(p.offer.ends_at)}</small>
            </div>
          )}
          <p className={`stock ${out ? "out" : p.stock <= 5 ? "low" : "ok"}`}>
            <Icon name={out ? "alert" : "check"} size={16} />
            {out ? "Out of stock" : p.stock <= 5 ? `Only ${p.stock} left, order soon` : "In stock"}
          </p>
          <p className="detail-desc">{p.description || "No description provided."}</p>
          {!out && <div className="detail-qty"><span>Quantity</span><QtyStepper value={qty} max={p.stock} onChange={setQty} /></div>}
          <div className="detail-actions">
            <button className="btn btn-primary btn-lg" disabled={out} onClick={() => addToCart(p.id, qty)}><Icon name="cart" size={18} />Add to cart</button>
            <button className="btn btn-outline btn-lg" disabled={out} onClick={async () => (await addToCart(p.id, qty)) && navigate("/checkout")}>Buy now</button>
            <button className={`btn btn-outline btn-lg square ${saved ? "saved" : ""}`} onClick={() => toggleWishlist(p.id)} aria-pressed={saved} aria-label="Toggle wishlist"><Icon name="heart" size={18} /></button>
          </div>
          <ul className="assure"><li><Icon name="shield" size={16} />Secure checkout</li><li><Icon name="truck" size={16} />Order tracking included</li></ul>
        </div>
      </div>
      {others.length > 0 && (
        <section className="section-block"><div className="section-head"><h2>You might also like</h2></div>
          <div className="product-grid">{others.map((r) => <ProductCard key={r.id} product={r} />)}</div></section>
      )}
    </>
  );
}
