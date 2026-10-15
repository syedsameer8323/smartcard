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

  const {
    data,
    loading,
    error,
    reload,
  } = useAsync(
    () => sellerApi.orders({ status: tab || undefined }),
    [tab],
  );

  const change = async (item, status) => {
    setBusyId(item.id);

    try {
      const { data: d } = await sellerApi.updateOrder(
        item.id,
        status,
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
                          onClick={() => setCancel(o)}
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
          message={`${cancel.name} × ${cancel.quantity} for ${cancel.customer} will be cancelled and the stock returned.`}
          confirmLabel="Cancel order"
          busy={busyId === cancel.id}
          onConfirm={() => change(cancel, "cancelled")}
          onClose={() => setCancel(null)}
        />
      )}
    </>
  );
}