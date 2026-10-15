import { Link, useNavigate } from "react-router-dom";
import Icon from "../../components/Icon.jsx";
import ProductImage from "../../components/ProductImage.jsx";
import { EmptyState, PageHeader, QtyStepper, Skeleton } from "../../components/ui.jsx";
import { useShop } from "../../context/ShopContext.jsx";
import { money } from "../../utils/format.js";

export default function Cart() {
  const { cart, cartLoading, updateQty, removeItem } = useShop();
  const navigate = useNavigate();

  if (cartLoading && cart.items.length === 0) return <Skeleton className="sk-hero" />;
  if (cart.items.length === 0) {
    return <EmptyState icon="cart" title="Your cart is empty" text="Looks like you haven't added anything yet." action={<Link to="/shop" className="btn btn-primary">Start shopping</Link>} />;
  }
  return (
    <>
      <PageHeader title="Shopping cart" subtitle={`${cart.count} item${cart.count === 1 ? "" : "s"}`} />
      <div className="cart-layout">
        <ul className="cart-list">
          {cart.items.map((i) => (
            <li key={i.id} className="cart-row">
              <Link to={`/product/${i.product.id}`} className="cart-img"><ProductImage product={i.product} /></Link>
              <div className="cart-info">
                <Link to={`/product/${i.product.id}`} className="pcard-name">{i.product.name}</Link>
                <span className="muted small">by {i.product.seller_name} · {money(i.product.price)} each</span>
                {i.product.stock < i.quantity && <span className="field-error">Only {i.product.stock} available</span>}
                <button className="link-btn" onClick={() => removeItem(i.id)}><Icon name="trash" size={15} />Remove</button>
              </div>
              <QtyStepper value={i.quantity} max={i.product.stock} onChange={(q) => updateQty(i.id, q)} />
              <strong className="cart-total">{money(i.line_total)}</strong>
            </li>
          ))}
        </ul>
        <aside className="summary">
          <h3>Order summary</h3>
          <div className="sum-row"><span>Subtotal</span><b>{money(cart.subtotal)}</b></div>
          <div className="sum-row"><span>Shipping</span><b>Free</b></div>
          <div className="sum-row total"><span>Total</span><b>{money(cart.subtotal)}</b></div>
          <button className="btn btn-primary btn-block btn-lg" onClick={() => navigate("/checkout")}>Proceed to checkout</button>
          <Link to="/shop" className="btn btn-ghost btn-block">Continue shopping</Link>
        </aside>
      </div>
    </>
  );
}
