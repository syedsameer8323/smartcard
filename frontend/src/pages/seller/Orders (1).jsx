import { useState } from "react";
import ProductImage from "../../components/ProductImage.jsx";
import {
  ConfirmModal,
  EmptyState,
  PageHeader,
  Skeleton,
  StatusBadge,
} from "../../components/ui.jsx";
import { useToast } from "../../components/Toast.jsx";
import { parseApiError } from "../../services/api.js";
import { sellerApi } from "../../services/shop.js";
import { useAsync } from "../../utils/hooks.js";
import { money, shortDate, STATUS } from "../../utils/format.js";
import { SELLER_CANCEL_REASONS } from "../../utils/cancel.js";
import "../../styles/offers.css";

const TABS = [
  "",
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "out_for_delivery",
  "delivered",
  "cancelled",
];

const NEXT = {
  pending: ["confirmed", "Confirm order"],
  confirmed: ["processing", "Start processing"],
  processing: ["shipped", "Mark shipped"],
  shipped: ["out_for_delivery", "Mark out for delivery"],
  out_for_delivery: ["delivered", "Mark delivered"],
};

const CANCELLABLE_STATUSES = [
  "pending",
  "confirmed",
  "processing",
];

export default function Orders() {
  const toast = useToast();
  const [tab, setTab] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [cancel, setCancel] = useState(null);
  const [cancelReason, setCancelReason] = useState("out_of_stock");
  const [cancelNote, setCancelNote] = useState("");

  const {
    data,
    loading,
    error,
    reload,
  } = useAsync(
    () => sellerApi.orders({ status: tab || undefined }),
    [tab],
  );

  const change = async (item, status, extra) => {
    setBusyId(item.id);

    try {
      const { data: d } = await sellerApi.updateOrder(
        item.id,
        status,
        extra,
      );

      toast.success(d.message);
      setCancel(null);
      reload();
    } catch (e) {
      toast.error(parseApiError(e).message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <PageHeader
        title="Orders"
        subtitle="Fulfil customer orders for your products"
      />

      <section className="panel flush">
        <div className="toolbar">
          <div className="seg" role="tablist">
            {TABS.map((t) => (
              <button
                key={t}
                role="tab"
                aria-selected={tab === t}
                className={tab === t ? "on" : ""}
                onClick={() => setTab(t)}
              >
                {t ? STATUS[t] || t : "All"}
              </button>
            ))}
          </div>
        </div>

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
          <div className="pad">
            <Skeleton className="sk-hero" />
          </div>
        ) : (data || []).length === 0 ? (
          <EmptyState
            icon="truck"
            title="No orders here"
            text={
              tab
                ? `You have no ${(STATUS[tab] || tab).toLowerCase()} orders.`
                : "New orders will appear as customers check out."
            }
          />
        ) : (
          <div className="table-wrap">
            <table className={`table ${loading ? "dim" : ""}`}>
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Item</th>
                  <th>Customer &amp; delivery</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th className="right">Action</th>
                </tr>
              </thead>

              <tbody>
                {data.map((o) => (
                  <tr key={o.id}>
                    <td>
                      <b>{o.order_code}</b>
                      <small className="muted block">
                        {shortDate(o.created_at)}
                      </small>
                    </td>

                    <td>
                      <div className="cell-product">
                        <div className="thumb-sm">
                          <ProductImage
                            product={{
                              id: o.product,
                              name: o.name,
                              image_url: o.image_url,
                            }}
                          />
                        </div>

                        <div>
                          <b>{o.name}</b>
                          <small className="muted">
                            Qty {o.quantity} · {money(o.price)}
                            {o.offer_name && <span className="offer-chip">{o.offer_name}</span>}
                          </small>
                        </div>
                      </div>
                    </td>

                    <td className="wrap">
                      <b>{o.customer}</b>
                      <small className="muted block">
                        {o.ship_to}
                      </small>
                    </td>

                    <td>{money(o.line_total)}</td>

                    <td>
                      <StatusBadge status={o.status} />
                      {o.status === "cancelled" && o.cancel_reason && (
                        <small className="cancel-meta">
                          By {o.cancelled_by}: {o.cancel_reason}
                          {Number(o.refund_amount) > 0 && ` · refunded ${money(o.refund_amount)}`}
                        </small>
                      )}
                    </td>

                    <td className="right nowrap">
                      {NEXT[o.status] && (
                        <button
                          className="btn btn-primary btn-sm"
                          disabled={busyId === o.id}
                          onClick={() =>
                            change(o, NEXT[o.status][0])
                          }
                        >
                          {busyId === o.id
                            ? "Updating..."
                            : NEXT[o.status][1]}
                        </button>
                      )}

                      {CANCELLABLE_STATUSES.includes(o.status) && (
                        <button
                          className="btn btn-ghost btn-sm danger-text"
                          disabled={busyId === o.id}
                          onClick={() => { setCancelReason("out_of_stock"); setCancelNote(""); setCancel(o); }}
                        >
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {cancel && (
        <ConfirmModal
          title="Cancel this order item?"
          message={`${cancel.name} × ${cancel.quantity} for ${cancel.customer} will be cancelled and the stock returned. If the customer already paid online, they are refunded automatically.`}
          confirmLabel="Cancel item"
          dismissLabel="Keep item"
          busy={busyId === cancel.id}
          onConfirm={() => change(cancel, "cancelled", { reason: cancelReason, note: cancelNote.trim() })}
          onClose={() => setCancel(null)}
        >
          <div>
            <label htmlFor="seller-cancel-reason">Reason (the customer is told)</label>
            <select id="seller-cancel-reason" className="ctl" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)}>
              {SELLER_CANCEL_REASONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="seller-cancel-note">Note (optional)</label>
            <textarea id="seller-cancel-note" className="ctl" maxLength={300} value={cancelNote} onChange={(e) => setCancelNote(e.target.value)} />
          </div>
        </ConfirmModal>
      )}
    </>
  );
}