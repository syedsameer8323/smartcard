import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import ProductImage from "../../components/ProductImage.jsx";
import { EmptyState, PageHeader, Skeleton, StatusBadge } from "../../components/ui.jsx";
import Icon from "../../components/Icon.jsx";
import { ordersApi } from "../../services/shop.js";
import { useAsync } from "../../utils/hooks.js";
import { money, shortDate } from "../../utils/format.js";
import { parseApiError } from "../../services/api.js";
import { useToast } from "../../components/Toast.jsx";

export default function Orders() {
  const location = useLocation();
  const placed = location.state?.placed;
  const paidNow = location.state?.paid;
  const toast = useToast(); const [retrying, setRetrying] = useState(null); const [cancelling, setCancelling] = useState(null);
  const { data, loading, error, reload } = useAsync(() => ordersApi.list(), []);
  const cancelOrder = async (order) => {
    if (!window.confirm(`Cancel order ${order.code}? This will restore available stock.`)) return;
    setCancelling(order.id);
    try { const { data: result } = await ordersApi.cancel(order.id); toast.success(result.message); reload(); }
    catch (err) { toast.error(parseApiError(err).message); }
    finally { setCancelling(null); }
  };
  const retryPayment = async (order) => {
    setRetrying(order.id);
    try {
      if (!window.Razorpay) { await new Promise((resolve, reject) => { const script = document.createElement("script"); script.src = "https://checkout.razorpay.com/v1/checkout.js"; script.onload = resolve; script.onerror = () => reject(new Error("Could not load Razorpay checkout.")); document.body.appendChild(script); }); }
      const { data: payment } = await ordersApi.createPayment(order.id);
      const checkout = new window.Razorpay({ key: payment.key_id, amount: payment.amount, currency: payment.currency, name: "SmartCart", description: `Order ${order.code}`, order_id: payment.razorpay_order_id, prefill: { name: order.shipping_name, email: order.email, contact: order.phone }, theme: { color: "#4f46e5" },
        handler: async (response) => { try { await ordersApi.verifyPayment(order.id, response); toast.success("Payment verified successfully."); reload(); } catch (err) { toast.error(parseApiError(err).message); } finally { setRetrying(null); } },
        modal: { ondismiss: () => setRetrying(null) } });
      checkout.on("payment.failed", async () => { await ordersApi.paymentFailed(order.id).catch(() => {}); toast.error("Payment failed. You can retry again."); setRetrying(null); });
      checkout.open();
    } catch (err) { toast.error(parseApiError(err).message); setRetrying(null); }
  };

  return (
    <>
      <PageHeader title="My orders" subtitle="Track and review everything you've ordered" />
      {placed && <div className="alert alert-success" role="status"><Icon name="check" size={16} /> Order <b>{placed}</b> {paidNow ? "paid and confirmed successfully." : "placed successfully. The seller will confirm it shortly."}</div>}
      {error ? <EmptyState icon="alert" title="Couldn't load orders" text={error} action={<button className="btn btn-primary" onClick={reload}>Try again</button>} />
        : loading && !data ? <Skeleton className="sk-hero" />
        : (data || []).length === 0 ? <EmptyState icon="list" title="No orders yet" text="When you place an order it will show up here." action={<Link to="/shop" className="btn btn-primary">Start shopping</Link>} />
        : (
          <div className="order-list">
            {data.map((o) => (
              <article key={o.id} className="order-card">
                <header>
                  <div><b>{o.code}</b><span className="muted small">Placed {shortDate(o.created_at)}</span></div>
                  <div className="order-head-right"><StatusBadge status={o.status} /><strong>{money(o.total)}</strong></div>
                </header>
                <ul>
                  {o.items.map((i) => (
                    <li key={i.id}>
                      <div className="mini-img"><ProductImage product={{ id: i.product, name: i.name, image_url: i.image_url }} /></div>
                      <div className="grow"><span>{i.name}</span><small className="muted">Qty {i.quantity} · {money(i.price)} each</small></div>
                      <StatusBadge status={i.status} />
                    </li>
                  ))}
                </ul>
                <footer className="order-footer-detail"><div className="order-shipping-info"><span className="muted small">Ship to {o.shipping_name}, {o.address}, {o.city} {o.state} {o.postal_code} · {o.payment_method === "razorpay" ? "Online payment" : "Cash on delivery"} · Payment: {o.payment_status === "paid" ? "Paid" : o.payment_status === "failed" ? "Failed" : o.payment_status === "cod_pending" ? "Pay on delivery" : "Pending"}</span><small className="muted">Subtotal {money(o.subtotal)} · Discount −{money(o.discount_amount)} · Shipping {money(o.shipping_fee)}{o.coupon_code ? ` · Coupon ${o.coupon_code}` : ""}</small></div><div className="order-actions">{o.payment_method === "razorpay" && o.payment_status !== "paid" && <button className="btn btn-primary btn-sm" disabled={retrying === o.id} onClick={() => retryPayment(o)}>{retrying === o.id ? "Opening payment…" : "Retry payment"}</button>}{o.payment_method === "cod" && o.payment_status !== "paid" && ["pending", "confirmed"].includes(o.status) && <button className="btn btn-ghost btn-sm danger-text" disabled={cancelling === o.id} onClick={() => cancelOrder(o)}>{cancelling === o.id ? "Cancelling…" : "Cancel order"}</button>}</div></footer>
              </article>
            ))}
          </div>
        )}
    </>
  );
}
