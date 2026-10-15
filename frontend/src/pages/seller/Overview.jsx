import { Link } from "react-router-dom";
import Icon from "../../components/Icon.jsx";
import { EmptyState, PageHeader, Skeleton, StatusBadge } from "../../components/ui.jsx";
import { sellerApi } from "../../services/shop.js";
import { useAsync } from "../../utils/hooks.js";
import { dayLabel, money, shortDate } from "../../utils/format.js";

const Stat = ({ icon, label, value, hint, tone = "indigo" }) => (
  <div className="stat"><span className={`stat-icon ${tone}`}><Icon name={icon} /></span><div><small>{label}</small><b>{value}</b>{hint && <em>{hint}</em>}</div></div>
);

export default function Overview() {
  const { data: s, loading, error, reload } = useAsync(() => sellerApi.stats(), []);

  const actions = <Link to="/seller/products?new=1" className="btn btn-primary"><Icon name="plus" size={17} />Add product</Link>;
  if (error) return <><PageHeader title="Overview" actions={actions} /><EmptyState icon="alert" title="Couldn't load your dashboard" text={error} action={<button className="btn btn-primary" onClick={reload}>Try again</button>} /></>;
  if (loading && !s) return <><PageHeader title="Overview" /><div className="stat-grid">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="sk-stat" />)}</div><Skeleton className="sk-hero" /></>;

  const max = Math.max(...s.chart.map((d) => Number(d.revenue)), 1);
  const weekTotal = s.chart.reduce((a, d) => a + Number(d.revenue), 0);
  const attention = [
    s.pending > 0 && { to: "/seller/orders", icon: "truck", text: `${s.pending} order item${s.pending > 1 ? "s" : ""} waiting for confirmation`, tone: "amber" },
    s.low_stock > 0 && { to: "/seller/products?status=low", icon: "alert", text: `${s.low_stock} product${s.low_stock > 1 ? "s" : ""} running low`, tone: "amber" },
    s.out_of_stock > 0 && { to: "/seller/products?status=out", icon: "box", text: `${s.out_of_stock} product${s.out_of_stock > 1 ? "s" : ""} out of stock`, tone: "red" },
  ].filter(Boolean);

  return (
    <>
      <PageHeader title="Overview" subtitle="How your store is performing" actions={actions} />
      <div className="stat-grid">
        <Stat icon="dollar" label="Total revenue" value={money(s.revenue)} hint="Excludes cancelled" />
        <Stat icon="list" label="Orders" value={s.orders} hint={`${s.pending} to confirm`} tone="violet" />
        <Stat icon="box" label="Active products" value={s.active_products} hint={`${s.products} total`} tone="blue" />
        <Stat icon="alert" label="Needs restock" value={s.low_stock + s.out_of_stock} hint={`${s.out_of_stock} sold out`} tone="amber" />
      </div>

      <div className="two-col">
        <section className="panel">
          <div className="panel-head"><div><h3>Revenue, last 7 days</h3><p className="muted small">{money(weekTotal)} this week</p></div></div>
          <div className="bars" role="img" aria-label="Revenue per day for the last 7 days">
            {s.chart.map((d) => (
              <div key={d.date} className="bar-col" title={`${shortDate(d.date)}: ${money(d.revenue)}`}>
                <span className="bar-val">{Number(d.revenue) > 0 ? money(d.revenue) : ""}</span>
                <div className="bar" style={{ height: `${Math.max((Number(d.revenue) / max) * 100, Number(d.revenue) > 0 ? 6 : 2)}%` }} />
                <span className="bar-label">{dayLabel(d.date)}</span>
              </div>
            ))}
          </div>
        </section>
        <section className="panel">
          <h3>Needs attention</h3>
          {attention.length === 0 ? <p className="muted">You're all caught up. 🎉</p> : (
            <ul className="attention">{attention.map((a) => (
              <li key={a.text}><Link to={a.to}><span className={`stat-icon sm ${a.tone}`}><Icon name={a.icon} size={16} /></span>{a.text}<Icon name="chevron" size={16} /></Link></li>
            ))}</ul>
          )}
          <h3 className="mt">Top products</h3>
          {s.top_products.length === 0 ? <p className="muted">Sales will appear here.</p> : (
            <ul className="top-list">{s.top_products.map((t, i) => (
              <li key={t.name}><span className="rank">{i + 1}</span><div className="grow"><b>{t.name}</b><small className="muted">{t.units} sold</small></div><strong>{money(t.revenue)}</strong></li>
            ))}</ul>
          )}
        </section>
      </div>

      <section className="panel">
        <div className="panel-head"><h3>Recent orders</h3><Link to="/seller/orders" className="link-arrow">View all <Icon name="chevron" size={16} /></Link></div>
        {s.recent.length === 0 ? <EmptyState icon="truck" title="No orders yet" text="Orders from customers will show up here." /> : (
          <div className="table-wrap"><table className="table">
            <thead><tr><th>Order</th><th>Product</th><th>Customer</th><th>Date</th><th>Total</th><th>Status</th></tr></thead>
            <tbody>{s.recent.map((o) => (
              <tr key={o.id}><td><b>{o.order_code}</b></td><td>{o.name} × {o.quantity}</td><td>{o.customer}</td><td>{shortDate(o.created_at)}</td><td>{money(o.line_total)}</td><td><StatusBadge status={o.status} /></td></tr>
            ))}</tbody>
          </table></div>
        )}
      </section>
    </>
  );
}
