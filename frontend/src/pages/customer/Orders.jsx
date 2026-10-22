import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import ProductImage from "../../components/ProductImage.jsx";
import {
  ConfirmModal,
  EmptyState,
  PageHeader,
  Skeleton,
  StatusBadge,
} from "../../components/ui.jsx";
import Icon from "../../components/Icon.jsx";
import { ordersApi } from "../../services/shop.js";
import { useAsync } from "../../utils/hooks.js";
import { money, shortDate } from "../../utils/format.js";
import { CUSTOMER_CANCEL_REASONS } from "../../utils/cancel.js";
import "../../styles/offers.css";
import { parseApiError } from "../../services/api.js";
import { useToast } from "../../components/Toast.jsx";

const TRACKING_STAGES = [
  {
    status: "pending",
    label: "Order placed",
    description: "Your order has been received.",
    timestamp: null,
  },
  {
    status: "confirmed",
    label: "Order confirmed",
    description: "The seller has confirmed your order.",
    timestamp: "confirmed_at",
  },
  {
    status: "processing",
    label: "Processing",
    description: "Your order is being prepared.",
    timestamp: "processing_at",
  },
  {
    status: "shipped",
    label: "Shipped",
    description: "Your order has been shipped.",
    timestamp: "shipped_at",
  },
  {
    status: "out_for_delivery",
    label: "Out for delivery",
    description: "Your order is on its way to you.",
    timestamp: "out_for_delivery_at",
  },
  {
    status: "delivered",
    label: "Delivered",
    description: "Your order has been delivered.",
    timestamp: "delivered_at",
  },
];

const STATUS_ORDER = TRACKING_STAGES.map((stage) => stage.status);

function formatTimestamp(value) {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return null;

  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function TrackingTimeline({ item, orderCreatedAt }) {
  const cancelled = item.status === "cancelled";
  const currentIndex = STATUS_ORDER.indexOf(item.status);

  return (
    <section className="tracking-section">
      <h4 className="tracking-title">Order tracking</h4>

      {cancelled ? (
        <div className="tracking-cancelled">
          <span className="tracking-marker">!</span>

          <div>
            <strong>Order item cancelled</strong>
            <p>
              {item.cancelled_by
                ? `Cancelled by ${item.cancelled_by === "seller" ? "the seller" : "you"}${item.cancel_reason ? ` · ${item.cancel_reason}` : ""}.`
                : "This item will not proceed to delivery."}
            </p>
            {Number(item.refund_amount) > 0 && (
              <p>Refund of {money(item.refund_amount)} started to your original payment method (5–7 business days).</p>
            )}

            {formatTimestamp(item.status_updated_at) && (
              <small>
                Updated {formatTimestamp(item.status_updated_at)}
              </small>
            )}
          </div>
        </div>
      ) : (
        <ol className="tracking-timeline">
          {TRACKING_STAGES.map((stage, index) => {
            const completed =
              currentIndex >= 0 && index < currentIndex;

            const current = index === currentIndex;

            const timestamp = stage.timestamp
              ? item[stage.timestamp]
              : index === 0
                ? orderCreatedAt
                : null;

            return (
              <li
                key={stage.status}
                className={[
                  "tracking-stage",
                  completed ? "is-complete" : "",
                  current ? "is-current" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <span
                  className="tracking-marker"
                  aria-hidden="true"
                >
                  {completed ? "✓" : index + 1}
                </span>

                <div className="tracking-stage-content">
                  <strong>{stage.label}</strong>

                  <p>{stage.description}</p>

                  {timestamp && (
                    <small>
                      {formatTimestamp(timestamp)}
                    </small>
                  )}

                  {current && (
                    <span className="tracking-current-label">
                      Current status
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

export default function Orders() {
  const location = useLocation();
  const placed = location.state?.placed;
  const paidNow = location.state?.paid;

  const toast = useToast();

  const [retrying, setRetrying] = useState(null);
  const [cancelling, setCancelling] = useState(null);

  const {
    data,
    loading,
    error,
    reload,
  } = useAsync(() => ordersApi.list(), []);

  const [cancelTarget, setCancelTarget] = useState(null);
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");

  const askCancel = (order) => {
    setCancelTarget(order);
    setReason("");
    setNote("");
  };

  const cancelOrder = async () => {
    const order = cancelTarget;
    if (!order || !reason) return;

    setCancelling(order.id);

    try {
      const { data: result } = await ordersApi.cancel(order.id, { reason, note: note.trim() });

      toast.success(result.message);
      setCancelTarget(null);
      reload();
    } catch (err) {
      toast.error(parseApiError(err).message);
    } finally {
      setCancelling(null);
    }
  };

  const retryPayment = async (order) => {
    setRetrying(order.id);

    try {
      if (!window.Razorpay) {
        await new Promise((resolve, reject) => {
          const script = document.createElement("script");

          script.src =
            "https://checkout.razorpay.com/v1/checkout.js";

          script.onload = resolve;

          script.onerror = () =>
            reject(
              new Error("Could not load Razorpay checkout."),
            );

          document.body.appendChild(script);
        });
      }

      const { data: payment } = await ordersApi.createPayment(
        order.id,
      );

      const checkout = new window.Razorpay({
        key: payment.key_id,
        amount: payment.amount,
        currency: payment.currency,
        name: "SmartCart",
        description: `Order ${order.code}`,
        order_id: payment.razorpay_order_id,

        prefill: {
          name: order.shipping_name,
          email: order.email,
          contact: order.phone,
        },

        theme: {
          color: "#4f46e5",
        },

        handler: async (response) => {
          try {
            await ordersApi.verifyPayment(
              order.id,
              response,
            );

            toast.success("Payment verified successfully.");
            reload();
          } catch (err) {
            toast.error(parseApiError(err).message);
          } finally {
            setRetrying(null);
          }
        },

        modal: {
          ondismiss: () => setRetrying(null),
        },
      });

      checkout.on("payment.failed", async () => {
        await ordersApi.paymentFailed(order.id).catch(() => {});

        toast.error(
          "Payment failed. You can retry again.",
        );

        setRetrying(null);
      });

      checkout.open();
    } catch (err) {
      toast.error(parseApiError(err).message);
      setRetrying(null);
    }
  };

  return (
    <>
      <PageHeader
        title="My orders"
        subtitle="Track and review everything you've ordered"
      />

      {placed && (
        <div
          className="alert alert-success"
          role="status"
        >
          <Icon name="check" size={16} />

          Order <b>{placed}</b>{" "}
          {paidNow
            ? "paid and confirmed successfully."
            : "placed successfully. The seller will confirm it shortly."}
        </div>
      )}

      {error ? (
        <EmptyState
          icon="alert"
          title="Couldn't load orders"
          text={error}
          action={
            <button
              className="btn btn-primary"
              onClick={reload}
            >
              Try again
            </button>
          }
        />
      ) : loading && !data ? (
        <Skeleton className="sk-hero" />
      ) : (data || []).length === 0 ? (
        <EmptyState
          icon="list"
          title="No orders yet"
          text="When you place an order it will show up here."
          action={
            <Link
              to="/shop"
              className="btn btn-primary"
            >
              Start shopping
            </Link>
          }
        />
      ) : (
        <div className="order-list">
          {data.map((o) => (
            <article
              key={o.id}
              className="order-card"
            >
              <header>
                <div>
                  <b>{o.code}</b>

                  <span className="muted small">
                    Placed {shortDate(o.created_at)}
                  </span>
                </div>

                <div className="order-head-right">
                  <StatusBadge status={o.status} />
                  <strong>{money(o.total)}</strong>
                </div>
              </header>

              <ul>
                {o.items.map((item) => (
                  <li key={item.id}>
                    <div className="mini-img">
                      <ProductImage
                        product={{
                          id: item.product,
                          name: item.name,
                          image_url: item.image_url,
                        }}
                      />
                    </div>

                    <div className="grow">
                      <span>{item.name}</span>

                      <small className="muted">
                        Qty {item.quantity} ·{" "}
                        {money(item.price)} each
                        {item.list_price && <span className="was">{money(item.list_price)}</span>}
                        {item.offer_name && <span className="offer-chip">{item.offer_name}</span>}
                      </small>
                    </div>

                    <StatusBadge status={item.status} />
                  </li>
                ))}
              </ul>

              <div className="order-tracking-list">
                {o.items.map((item) => (
                  <TrackingTimeline
                    key={item.id}
                    item={item}
                    orderCreatedAt={o.created_at}
                  />
                ))}
              </div>

              <footer className="order-footer-detail">
                <div className="order-shipping-info">
                  <span className="muted small">
                    Ship to {o.shipping_name}, {o.address},{" "}
                    {o.city} {o.state} {o.postal_code} ·{" "}
                    {o.payment_method === "razorpay"
                      ? "Online payment"
                      : "Cash on delivery"}{" "}
                    · Payment:{" "}
                    {o.payment_status === "paid"
                      ? "Paid"
                      : o.payment_status === "failed"
                        ? "Failed"
                        : o.payment_status === "cod_pending"
                          ? "Pay on delivery"
                          : "Pending"}
                  </span>

                  <small className="muted">
                    Subtotal {money(o.subtotal)} · Discount −
                    {money(o.discount_amount)} · Shipping{" "}
                    {money(o.shipping_fee)}
                    {o.coupon_code
                      ? ` · Coupon ${o.coupon_code}`
                      : ""}
                  </small>

                  {(Number(o.offer_savings) > 0 || Number(o.refund_total) > 0) && (
                    <small className="order-extra">
                      {Number(o.offer_savings) > 0 && <span className="good">🎉 Festival offers saved you {money(o.offer_savings)}</span>}
                      {Number(o.refund_total) > 0 && <span className="good">Refund started: {money(o.refund_total)}</span>}
                    </small>
                  )}
                </div>

                <div className="order-actions">
                  {o.payment_method === "razorpay" &&
                    o.payment_status !== "paid" && (
                      <button
                        className="btn btn-primary btn-sm"
                        disabled={retrying === o.id}
                        onClick={() => retryPayment(o)}
                      >
                        {retrying === o.id
                          ? "Opening payment…"
                          : "Retry payment"}
                      </button>
                    )}

                  {o.can_cancel && (
                    <button
                      className="btn btn-ghost btn-sm danger-text"
                      disabled={cancelling === o.id}
                      onClick={() => askCancel(o)}
                    >
                      Cancel order
                    </button>
                  )}

                  {!o.can_cancel && !["cancelled", "delivered"].includes(o.status) && o.cancel_blocked_reason && (
                    <small className="muted">{o.cancel_blocked_reason}</small>
                  )}
                </div>
              </footer>
            </article>
          ))}
        </div>
      )}

      {cancelTarget && (
        <ConfirmModal
          title={`Cancel order ${cancelTarget.code}?`}
          message="Tell us why — it helps sellers improve. This can't be undone."
          confirmLabel="Cancel order"
          dismissLabel="Keep order"
          busy={cancelling === cancelTarget.id}
          confirmDisabled={!reason}
          onConfirm={cancelOrder}
          onClose={() => setCancelTarget(null)}
        >
          <div>
            <label htmlFor="cancel-reason">Reason for cancelling</label>
            <select id="cancel-reason" className="ctl" value={reason} onChange={(e) => setReason(e.target.value)}>
              <option value="">Select a reason…</option>
              {CUSTOMER_CANCEL_REASONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="cancel-note">Anything else? (optional)</label>
            <textarea id="cancel-note" className="ctl" maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          {cancelTarget.payment_status === "paid"
            ? <div className="refund-box paid">💸 Your payment of <b>{money(cancelTarget.total)}</b> will be refunded to your original payment method within 5–7 business days.</div>
            : <div className="refund-box unpaid">You haven't paid for this order yet, so nothing will be charged.</div>}
        </ConfirmModal>
      )}
    </>
  );
}