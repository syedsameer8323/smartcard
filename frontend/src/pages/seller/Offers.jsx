import { useMemo, useState } from "react";
import Icon from "../../components/Icon.jsx";
import Spinner from "../../components/Spinner.jsx";
import { ConfirmModal, Drawer, EmptyState, PageHeader, Skeleton } from "../../components/ui.jsx";
import { useToast } from "../../components/Toast.jsx";
import { parseApiError } from "../../services/api.js";
import { sellerApi } from "../../services/shop.js";
import { useAsync, useDebounced } from "../../utils/hooks.js";
import { money } from "../../utils/format.js";
import { FESTIVALS, OFFER_STATUS, festivalOf, formatDateTime, percentText, toLocalInput } from "../../utils/offers.js";
import "../../styles/offers.css";

const QUICK_PERCENTS = [5, 10, 15, 20, 25, 30, 40, 50];

const blankForm = () => {
  const start = new Date();
  const festival = FESTIVALS[0];
  return {
    festival: festival.key,
    name: festival.name,
    discount_percent: String(festival.percent),
    starts_at: toLocalInput(start),
    ends_at: toLocalInput(new Date(start.getTime() + 7 * 24 * 3600 * 1000)),
    apply_to_all: true,
    product_ids: [],
    is_active: true,
  };
};

const formFromOffer = (offer) => ({
  festival: offer.festival,
  name: offer.name,
  discount_percent: String(Number(offer.discount_percent)),
  starts_at: toLocalInput(offer.starts_at),
  ends_at: toLocalInput(offer.ends_at),
  apply_to_all: offer.apply_to_all,
  product_ids: offer.product_ids || [],
  is_active: offer.is_active,
});

function OfferForm({ offer, onClose, onSaved }) {
  const toast = useToast();
  const editing = Boolean(offer);
  const [f, setF] = useState(editing ? formFromOffer(offer) : blankForm());
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const debounced = useDebounced(search);
  const products = useAsync(() => sellerApi.products({ q: debounced || undefined, status: "active", page_size: 48 }), [debounced]);
  const list = products.data?.results || [];
  const picked = useMemo(() => new Set(f.product_ids), [f.product_ids]);
  const set = (key, value) => setF((cur) => ({ ...cur, [key]: value }));

  const chooseFestival = (festival) =>
    setF((cur) => ({
      ...cur,
      festival: festival.key,
      // Only overwrite the name/percent if the seller hasn't customised them.
      name: !cur.name || FESTIVALS.some((x) => x.name === cur.name) ? festival.name : cur.name,
      discount_percent: FESTIVALS.some((x) => String(x.percent) === cur.discount_percent) ? String(festival.percent) : cur.discount_percent,
    }));

  const toggleProduct = (id) =>
    set("product_ids", picked.has(id) ? f.product_ids.filter((x) => x !== id) : [...f.product_ids, id]);

  const percent = Number(f.discount_percent);
  const sample = list.find((p) => picked.has(p.id)) || list[0];
  const samplePrice = sample && percent >= 1 && percent <= 90 ? (Number(sample.price) * (100 - percent)) / 100 : null;

  const submit = async (event) => {
    event.preventDefault();
    const v = {};
    if (f.name.trim().length < 3) v.name = "Give the sale a name of at least 3 characters.";
    if (!(percent >= 1 && percent <= 90)) v.discount_percent = "Choose a discount between 1% and 90%.";
    if (!f.starts_at) v.starts_at = "Pick a start date and time.";
    if (!f.ends_at) v.ends_at = "Pick an end date and time.";
    if (f.starts_at && f.ends_at && new Date(f.ends_at) <= new Date(f.starts_at)) v.ends_at = "The sale must end after it starts.";
    if (!editing && f.ends_at && new Date(f.ends_at) <= new Date()) v.ends_at = "Choose an end date and time in the future.";
    if (!f.apply_to_all && f.product_ids.length === 0) v.product_ids = "Select at least one product, or apply the sale to all your products.";
    setErrors(v);
    if (Object.keys(v).length) return;

    const payload = {
      name: f.name.trim(),
      festival: f.festival,
      discount_percent: percent.toFixed(2),
      starts_at: new Date(f.starts_at).toISOString(),
      ends_at: new Date(f.ends_at).toISOString(),
      apply_to_all: f.apply_to_all,
      product_ids: f.apply_to_all ? [] : f.product_ids,
      is_active: f.is_active,
    };
    setBusy(true);
    try {
      editing ? await sellerApi.updateOffer(offer.id, payload) : await sellerApi.createOffer(payload);
      toast.success(editing ? "Festival sale updated" : "Festival sale created");
      onSaved();
    } catch (err) {
      const { message, fieldErrors } = parseApiError(err);
      setErrors(fieldErrors);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  const Err = ({ k }) => (errors[k] ? <p className="field-error" role="alert">{errors[k]}</p> : null);

  return (
    <Drawer
      title={editing ? "Edit festival sale" : "New festival sale"}
      onClose={busy ? () => {} : onClose}
      footer={<>
        <button type="button" className="btn btn-outline" onClick={onClose} disabled={busy}>Cancel</button>
        <button form="offer-form" className="btn btn-primary" disabled={busy}>{busy ? <><Spinner /> Saving…</> : editing ? "Save changes" : "Create sale"}</button>
      </>}
    >
      <form id="offer-form" onSubmit={submit} noValidate>
        <div className="field">
          <label>Festival</label>
          <div className="fest-chips">
            {FESTIVALS.map((x) => (
              <button type="button" key={x.key} className={`fest-chip fest-${x.key} ${f.festival === x.key ? "selected" : ""}`} onClick={() => chooseFestival(x)}>
                <span aria-hidden="true">{x.emoji}</span>{x.label}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label htmlFor="o-name">Sale name</label>
          <input id="o-name" className={`ctl ${errors.name ? "has-error" : ""}`} maxLength={80} value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Diwali Dhamaka" />
          <small className="muted">Customers see this on the product page.</small>
          <Err k="name" />
        </div>

        <div className="field">
          <label htmlFor="o-pct">Discount (%)</label>
          <input id="o-pct" className={`ctl ${errors.discount_percent ? "has-error" : ""}`} type="number" min="1" max="90" step="0.5" value={f.discount_percent} onChange={(e) => set("discount_percent", e.target.value)} />
          <div className="pct-row">
            {QUICK_PERCENTS.map((p) => (
              <button type="button" key={p} className={`pct-chip ${percent === p ? "selected" : ""}`} onClick={() => set("discount_percent", String(p))}>{p}%</button>
            ))}
          </div>
          <Err k="discount_percent" />
        </div>

        <div className="form-grid">
          <div className="field">
            <label htmlFor="o-start">Starts</label>
            <input id="o-start" className={`ctl ${errors.starts_at ? "has-error" : ""}`} type="datetime-local" value={f.starts_at} onChange={(e) => set("starts_at", e.target.value)} />
            <Err k="starts_at" />
          </div>
          <div className="field">
            <label htmlFor="o-end">Ends</label>
            <input id="o-end" className={`ctl ${errors.ends_at ? "has-error" : ""}`} type="datetime-local" value={f.ends_at} onChange={(e) => set("ends_at", e.target.value)} />
            <Err k="ends_at" />
          </div>
        </div>

        <div className="field">
          <label>Which products?</label>
          <div className="scope-opts">
            <label className={`scope-opt ${f.apply_to_all ? "selected" : ""}`}>
              <input type="radio" name="scope" checked={f.apply_to_all} onChange={() => set("apply_to_all", true)} />
              <span><b>All my products</b><small>Includes products you add later.</small></span>
            </label>
            <label className={`scope-opt ${!f.apply_to_all ? "selected" : ""}`}>
              <input type="radio" name="scope" checked={!f.apply_to_all} onChange={() => set("apply_to_all", false)} />
              <span><b>Selected products</b><small>Choose exactly what goes on sale.</small></span>
            </label>
          </div>
          {!f.apply_to_all && (
            <>
              <input className="ctl" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search your products…" aria-label="Search your products" />
              <div className="pick-list">
                {products.loading && !products.data ? <div className="pad"><Spinner /></div>
                  : list.length === 0 ? <div className="pad muted">No active products found.</div>
                  : list.map((p) => (
                    <label key={p.id} className="pick-row">
                      <input type="checkbox" checked={picked.has(p.id)} onChange={() => toggleProduct(p.id)} />
                      <span>{p.name}</span><span>{money(p.price)}</span>
                    </label>
                  ))}
              </div>
              <small className="muted">{f.product_ids.length} selected</small>
              <Err k="product_ids" />
            </>
          )}
        </div>

        {samplePrice !== null && (
          <div className="price-preview">
            <Icon name="percent" size={18} />
            <span>Customers will see <b>{sample.name}</b>: <s>{money(sample.price)}</s> → <b>{money(samplePrice)}</b> ({percentText(percent)} off)</span>
          </div>
        )}

        <label className="check"><input type="checkbox" checked={f.is_active} onChange={(e) => set("is_active", e.target.checked)} /> Sale is active (uncheck to save it as paused)</label>
      </form>
    </Drawer>
  );
}

export default function Offers() {
  const toast = useToast();
  const { data, loading, error, reload } = useAsync(() => sellerApi.offers(), []);
  const [editing, setEditing] = useState(null); // null = closed, {} = new, offer = edit
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  const offers = Array.isArray(data) ? data : [];

  const stats = useMemo(() => ({
    live: offers.filter((o) => o.status === "live").length,
    scheduled: offers.filter((o) => o.status === "scheduled").length,
    total: offers.length,
  }), [offers]);

  const togglePause = async (offer) => {
    try {
      await sellerApi.updateOffer(offer.id, { is_active: !offer.is_active });
      toast.success(offer.is_active ? "Sale paused. Prices are back to normal." : "Sale resumed.");
      reload();
    } catch (err) {
      toast.error(parseApiError(err).message);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await sellerApi.deleteOffer(deleting.id);
      toast.success("Sale deleted");
      setDeleting(null);
      reload();
    } catch (err) {
      toast.error(parseApiError(err).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="offers-page">
      <PageHeader
        title="Festival offers"
        subtitle="Run Diwali, Dussehra and other festival sales. Prices update automatically when the sale starts and ends."
        actions={<button className="btn btn-primary" onClick={() => setEditing({})}><Icon name="plus" size={18} />New festival sale</button>}
      />

      <section className="offer-stats" aria-label="Offer summary">
        <div className="offer-stat"><span>Live now</span><strong>{stats.live}</strong></div>
        <div className="offer-stat"><span>Scheduled</span><strong>{stats.scheduled}</strong></div>
        <div className="offer-stat"><span>Total sales created</span><strong>{stats.total}</strong></div>
      </section>

      {error ? <EmptyState icon="alert" title="Couldn't load your sales" text={error} action={<button className="btn btn-primary" onClick={reload}>Try again</button>} />
        : loading && !data ? <Skeleton className="sk-hero" />
        : offers.length === 0 ? <EmptyState icon="star" title="Plan your first festival sale" text="Pick a festival, choose a discount and the products it applies to. Your list prices never change." action={<button className="btn btn-primary" onClick={() => setEditing({})}>Create a sale</button>} />
        : (
          <div className="offer-list">
            {offers.map((o) => {
              const fest = festivalOf(o.festival);
              return (
                <article key={o.id} className={`offer-card fest-${fest.key}`}>
                  <div className="offer-tile" aria-hidden="true">{fest.emoji}</div>
                  <div className="offer-main">
                    <h3>{o.name}<span className={`offer-badge ${o.status}`}>{OFFER_STATUS[o.status]}</span></h3>
                    <p>{formatDateTime(o.starts_at)} → {formatDateTime(o.ends_at)}</p>
                    <p>
                      {o.apply_to_all
                        ? `All your active products (${o.product_count})`
                        : `${o.product_count} product${o.product_count === 1 ? "" : "s"}: ${o.product_names.join(", ")}${o.product_count > o.product_names.length ? "…" : ""}`}
                    </p>
                  </div>
                  <div className="offer-pct"><strong>{percentText(o.discount_percent)}</strong><small>off</small></div>
                  <div className="offer-actions">
                    {o.status !== "ended" && (
                      <button className="btn btn-outline btn-sm" onClick={() => togglePause(o)}>{o.is_active ? "Pause" : "Resume"}</button>
                    )}
                    <button className="btn btn-outline btn-sm" onClick={() => setEditing(o)}>{o.status === "ended" ? "Reuse" : "Edit"}</button>
                    <button className="btn btn-ghost btn-sm danger-text" onClick={() => setDeleting(o)} aria-label={`Delete ${o.name}`}><Icon name="trash" size={16} /></button>
                  </div>
                </article>
              );
            })}
          </div>
        )}

      {editing && (
        <OfferForm
          offer={editing.id ? editing : null}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); reload(); }}
        />
      )}
      {deleting && (
        <ConfirmModal
          title="Delete this sale?"
          message={`“${deleting.name}” will be removed and prices return to normal. Orders already placed keep the price the customer paid.`}
          busy={busy}
          onConfirm={remove}
          onClose={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
