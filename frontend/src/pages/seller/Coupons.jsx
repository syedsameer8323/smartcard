import { useMemo, useState } from "react";
import { PageHeader, EmptyState, Skeleton } from "../../components/ui.jsx";
import Icon from "../../components/Icon.jsx";
import { useToast } from "../../components/Toast.jsx";
import { parseApiError } from "../../services/api.js";
import { sellerApi } from "../../services/shop.js";
import { useAsync } from "../../utils/hooks.js";
import { money, shortDate } from "../../utils/format.js";
import "../../styles/coupons.css";

const blank = {
  code: "",
  discount_type: "percentage",
  discount_value: "10",
  minimum_order_value: "0",
  expires_at: "",
  usage_limit: "",
  is_active: true,
};

const isExpired = (coupon) => Boolean(coupon.expires_at && new Date(coupon.expires_at) <= new Date());

function CouponStatus({ coupon }) {
  const expired = isExpired(coupon);
  const label = expired ? "Expired" : coupon.is_active ? "Active" : "Inactive";
  return <span className={`coupon-status ${expired ? "is-expired" : coupon.is_active ? "is-active" : "is-inactive"}`}>
    <span className="coupon-status-dot" />{label}
  </span>;
}

function MetricCard({ icon, label, value, note, tone }) {
  return <article className={`coupon-metric ${tone}`}>
    <span className="coupon-metric-icon"><Icon name={icon} size={20} /></span>
    <div className="coupon-metric-copy"><span>{label}</span><strong>{value}</strong><small>{note}</small></div>
  </article>;
}

export default function Coupons() {
  const toast = useToast();
  const { data, loading, error, reload } = useAsync(() => sellerApi.coupons(), []);
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const coupons = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];

  const metrics = useMemo(() => {
    const active = coupons.filter((coupon) => coupon.is_active && !isExpired(coupon)).length;
    const expired = coupons.filter(isExpired).length;
    const redemptions = coupons.reduce((sum, coupon) => sum + Number(coupon.usage_count || 0), 0);
    return { total: coupons.length, active, expired, redemptions };
  }, [coupons]);

  const visibleCoupons = useMemo(() => {
    const query = search.trim().toLowerCase();
    return coupons.filter((coupon) => {
      const matchesSearch = !query || String(coupon.code || "").toLowerCase().includes(query);
      const expired = isExpired(coupon);
      const matchesFilter = filter === "all"
        || (filter === "active" && coupon.is_active && !expired)
        || (filter === "inactive" && !coupon.is_active && !expired)
        || (filter === "expired" && expired);
      return matchesSearch && matchesFilter;
    });
  }, [coupons, search, filter]);

  const updateField = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const resetForm = () => { setEditing(null); setForm({ ...blank }); setFormError(""); };

  const submit = async (event) => {
    event.preventDefault();
    setFormError("");

    const discountValue = Number(form.discount_value);
    const minimumValue = Number(form.minimum_order_value || 0);
    const usageLimit = form.usage_limit === "" ? null : Number(form.usage_limit);
    if (!form.code.trim()) return setFormError("Enter a coupon code to continue.");
    if (!Number.isFinite(discountValue) || discountValue <= 0) return setFormError("Discount value must be greater than zero.");
    if (form.discount_type === "percentage" && discountValue > 100) return setFormError("Percentage discounts cannot exceed 100%.");
    if (!Number.isFinite(minimumValue) || minimumValue < 0) return setFormError("Minimum order value cannot be negative.");
    if (usageLimit !== null && (!Number.isInteger(usageLimit) || usageLimit < 1)) return setFormError("Usage limit must be a whole number greater than zero.");
    if (!editing && form.expires_at && new Date(form.expires_at) <= new Date()) return setFormError("Choose an expiry date and time in the future.");

    const payload = {
      ...form,
      code: form.code.trim().toUpperCase(),
      discount_value: discountValue,
      minimum_order_value: minimumValue,
      usage_limit: usageLimit,
      expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
    };
    setBusy(true);
    try {
      if (editing) await sellerApi.updateCoupon(editing, payload);
      else await sellerApi.createCoupon(payload);
      toast.success(editing ? "Coupon updated successfully." : "Coupon created successfully.");
      resetForm();
      await reload();
    } catch (err) {
      setFormError(parseApiError(err).message);
    } finally {
      setBusy(false);
    }
  };

  const edit = (coupon) => {
    setEditing(coupon.id);
    setForm({
      code: coupon.code,
      discount_type: coupon.discount_type,
      discount_value: String(coupon.discount_value),
      minimum_order_value: String(coupon.minimum_order_value),
      expires_at: "",
      usage_limit: coupon.usage_limit == null ? "" : String(coupon.usage_limit),
      is_active: coupon.is_active,
    });
    // Convert the server's UTC timestamp into the browser's local datetime-local value.
    if (coupon.expires_at) {
      const date = new Date(coupon.expires_at);
      const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      setForm((current) => ({ ...current, expires_at: local }));
    }
    setFormError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const remove = async (coupon) => {
    if (!window.confirm(`Delete coupon ${coupon.code}? This cannot be undone.`)) return;
    try {
      await sellerApi.deleteCoupon(coupon.id);
      toast.success(`Coupon ${coupon.code} deleted.`);
      await reload();
    } catch (err) {
      toast.error(parseApiError(err).message);
    }
  };

  const toggleActive = async (coupon) => {
    try {
      await sellerApi.updateCoupon(coupon.id, { is_active: !coupon.is_active });
      toast.success(`${coupon.code} ${coupon.is_active ? "deactivated" : "activated"}.`);
      await reload();
    } catch (err) {
      toast.error(parseApiError(err).message);
    }
  };

  const generateCode = () => {
    const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
    updateField("code", `SMART${suffix}`);
  };

  const copyCode = async (code) => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success(`${code} copied to clipboard.`);
    } catch {
      toast.error("Clipboard access is unavailable in this browser.");
    }
  };

  return <div className="coupons-page">
    <PageHeader
      title="Coupons & offers"
      subtitle="Create and manage discounts that bring customers back."
      actions={<button type="button" className="btn btn-outline coupon-refresh" onClick={reload} disabled={loading}>
        <Icon name="refresh" size={17} /> Refresh
      </button>}
    />

    <section className="coupon-metrics" aria-label="Coupon overview">
      <MetricCard icon="ticket" label="Total coupons" value={metrics.total} note="All codes created" tone="metric-purple" />
      <MetricCard icon="check" label="Active coupons" value={metrics.active} note="Ready for checkout" tone="metric-green" />
      <MetricCard icon="chart" label="Total redemptions" value={metrics.redemptions.toLocaleString("en-IN")} note="Successful uses" tone="metric-blue" />
      <MetricCard icon="alert" label="Expired coupons" value={metrics.expired} note="Past their expiry date" tone="metric-orange" />
    </section>

    <section className="coupon-builder panel">
      <div className="coupon-builder-main">
        <div className="coupon-section-heading">
          <span className="coupon-heading-icon"><Icon name={editing ? "edit" : "plus"} size={19} /></span>
          <div><h2>{editing ? "Edit coupon" : "Create a coupon"}</h2><p>{editing ? `Updating ${form.code || "your coupon"}` : "Set up a discount code in a few steps."}</p></div>
        </div>
        {formError && <div className="alert alert-error coupon-form-error" role="alert"><Icon name="alert" size={17} />{formError}</div>}

        <form onSubmit={submit} className="coupon-form">
          <div className="coupon-form-grid">
            <div className="field coupon-field">
              <label className="label-like" htmlFor="coupon-code-new">Coupon code <span className="required-mark">*</span></label>
              <div className="coupon-code-input">
                <input id="coupon-code-new" className="input" required maxLength={40} autoComplete="off" value={form.code}
                  onChange={(event) => updateField("code", event.target.value.toUpperCase().replace(/\s/g, ""))} placeholder="e.g. SMART10" />
                <button type="button" className="coupon-generate" onClick={generateCode} title="Generate a code">Generate</button>
              </div>
              <small className="coupon-help">Use letters and numbers; spaces are removed automatically.</small>
            </div>
            <div className="field coupon-field">
              <label className="label-like" htmlFor="discount-type">Discount type <span className="required-mark">*</span></label>
              <select id="discount-type" className="input" value={form.discount_type} onChange={(event) => updateField("discount_type", event.target.value)}>
                <option value="percentage">Percentage discount (%)</option><option value="fixed">Fixed amount (₹)</option>
              </select>
            </div>
            <div className="field coupon-field">
              <label className="label-like" htmlFor="discount-value">Discount value <span className="required-mark">*</span></label>
              <div className="coupon-number-input"><input id="discount-value" className="input" type="number" min="0.01" max={form.discount_type === "percentage" ? 100 : undefined} step="0.01" required value={form.discount_value} onChange={(event) => updateField("discount_value", event.target.value)} /><span>{form.discount_type === "percentage" ? "%" : "₹"}</span></div>
              <small className="coupon-help">{form.discount_type === "percentage" ? "Choose a value between 0.01 and 100." : "Amount is deducted from eligible items."}</small>
            </div>
            <div className="field coupon-field">
              <label className="label-like" htmlFor="minimum-order">Minimum order value</label>
              <div className="coupon-number-input"><span>₹</span><input id="minimum-order" className="input" type="number" min="0" step="0.01" value={form.minimum_order_value} onChange={(event) => updateField("minimum_order_value", event.target.value)} /></div>
              <small className="coupon-help">Set to ₹0 if there is no minimum spend.</small>
            </div>
            <div className="field coupon-field">
              <label className="label-like" htmlFor="coupon-expiry">Expiry date <span className="optional-mark">Optional</span></label>
              <input id="coupon-expiry" className="input" type="datetime-local" min={new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)} value={form.expires_at} onChange={(event) => updateField("expires_at", event.target.value)} />
            </div>
            <div className="field coupon-field">
              <label className="label-like" htmlFor="usage-limit">Total usage limit <span className="optional-mark">Optional</span></label>
              <input id="usage-limit" className="input" type="number" min="1" step="1" value={form.usage_limit} onChange={(event) => updateField("usage_limit", event.target.value)} placeholder="Unlimited" />
            </div>
          </div>

          <label className="coupon-active-toggle" htmlFor="coupon-active">
            <span className="coupon-toggle-copy"><span className="coupon-toggle-title">Coupon is active</span><small>Customers can apply this code during checkout.</small></span>
            <input id="coupon-active" className="coupon-switch" type="checkbox" checked={form.is_active} onChange={(event) => updateField("is_active", event.target.checked)} />
          </label>
          <div className="coupon-form-actions">
            <button type="submit" className="btn btn-primary coupon-submit" disabled={busy || !form.code.trim()}>
              {busy ? <><span className="coupon-spinner" />Saving…</> : <><Icon name={editing ? "check" : "plus"} size={18} />{editing ? "Save changes" : "Create coupon"}</>}
            </button>
            {editing && <button type="button" className="btn btn-outline" onClick={resetForm} disabled={busy}><Icon name="x" size={17} /> Cancel edit</button>}
          </div>
        </form>
      </div>

      <aside className="coupon-preview" aria-label="Coupon preview">
        <div className="coupon-preview-top"><span>LIVE PREVIEW</span><span className="preview-sparkle">✦</span></div>
        <div className="coupon-ticket">
          <div className="coupon-ticket-icon"><Icon name="ticket" size={27} /></div>
          <div className="coupon-ticket-discount"><strong>{form.discount_type === "percentage" ? `${Math.min(Math.max(Number(form.discount_value) || 0, 0), 100)}%` : money(form.discount_value || 0)}</strong><span>OFF</span></div>
          <div className="coupon-ticket-divider" />
          <div className="coupon-ticket-code"><small>YOUR CODE</small><strong>{form.code || "YOURCODE"}</strong></div>
        </div>
        <div className="coupon-preview-details">
          <div><span>Minimum spend</span><strong>{money(form.minimum_order_value || 0)}</strong></div>
          <div><span>Usage limit</span><strong>{form.usage_limit ? `${form.usage_limit} uses` : "Unlimited"}</strong></div>
          <div><span>Availability</span><strong className={form.is_active ? "preview-active" : "preview-inactive"}>{form.is_active ? "Active" : "Inactive"}</strong></div>
        </div>
        <p className="coupon-preview-note"><Icon name="shield" size={15} /> Discounts are validated by SmartCart at checkout.</p>
      </aside>
    </section>

    <section className="coupon-list panel flush">
      <div className="coupon-list-heading">
        <div><h2>Your coupons</h2><p>Track performance and keep your offers up to date.</p></div>
        <span className="coupon-count-pill">{visibleCoupons.length} {visibleCoupons.length === 1 ? "coupon" : "coupons"}</span>
      </div>
      <div className="coupon-toolbar">
        <label className="coupon-search" htmlFor="coupon-search"><Icon name="search" size={18} /><input id="coupon-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search coupon codes…" /><kbd>⌕</kbd></label>
        <div className="coupon-filters" role="group" aria-label="Filter coupons">
          {[ ["all", "All coupons"], ["active", "Active"], ["inactive", "Inactive"], ["expired", "Expired"] ].map(([value, label]) => <button type="button" key={value} className={`coupon-filter ${filter === value ? "selected" : ""}`} onClick={() => setFilter(value)}>{label}</button>)}
        </div>
      </div>

      {error ? <EmptyState icon="alert" title="Couldn't load coupons" text={error} action={<button className="btn btn-primary" onClick={reload}>Try again</button>} />
        : loading && !data ? <div className="coupon-loading"><Skeleton className="sk-hero" /></div>
        : !coupons.length ? <EmptyState icon="star" title="Your first offer starts here" text="Create a coupon above to give customers a reason to come back." />
        : !visibleCoupons.length ? <EmptyState icon="search" title="No matching coupons" text="Try a different code or change the selected filter." action={<button className="btn btn-outline" onClick={() => { setSearch(""); setFilter("all"); }}>Clear filters</button>} />
        : <div className="coupon-table-wrap"><table className="table coupon-table"><thead><tr><th>Coupon code</th><th>Discount</th><th>Minimum spend</th><th>Redemptions</th><th>Expires</th><th>Status</th><th className="coupon-actions-heading">Actions</th></tr></thead>
          <tbody>{visibleCoupons.map((coupon) => <tr key={coupon.id}>
            <td><div className="coupon-code-cell"><span className="coupon-row-ticket"><Icon name="ticket" size={16} /></span><div><strong>{coupon.code}</strong><small>Created {coupon.created_at ? shortDate(coupon.created_at) : "—"}</small></div><button type="button" className="coupon-copy" onClick={() => copyCode(coupon.code)} aria-label={`Copy ${coupon.code}`} title="Copy code"><Icon name="copy" size={15} /></button></div></td>
            <td><span className="coupon-discount-value">{coupon.discount_type === "percentage" ? `${Number(coupon.discount_value)}% off` : `${money(coupon.discount_value)} off`}</span></td>
            <td>{money(coupon.minimum_order_value)}</td>
            <td><div className="coupon-usage"><strong>{coupon.usage_count || 0}</strong><span>{coupon.usage_limit == null ? "of ∞" : `of ${coupon.usage_limit}`}</span>{coupon.usage_limit != null && <span className="coupon-usage-track"><i style={{ width: `${Math.min(100, (Number(coupon.usage_count || 0) / Math.max(1, Number(coupon.usage_limit))) * 100)}%` }} /></span>}</div></td>
            <td><span className="coupon-expiry-date">{coupon.expires_at ? shortDate(coupon.expires_at) : "No expiry"}</span>{coupon.expires_at && <small className="coupon-expiry-sub">{isExpired(coupon) ? "Expired" : "Expiry set"}</small>}</td>
            <td><CouponStatus coupon={coupon} /></td>
            <td><div className="coupon-row-actions"><button type="button" className="coupon-action-btn" onClick={() => edit(coupon)} title="Edit coupon" aria-label={`Edit ${coupon.code}`}><Icon name="edit" size={16} /><span>Edit</span></button><button type="button" className={`coupon-action-btn ${coupon.is_active ? "action-deactivate" : "action-activate"}`} onClick={() => toggleActive(coupon)} title={coupon.is_active ? "Deactivate coupon" : "Activate coupon"} aria-label={`${coupon.is_active ? "Deactivate" : "Activate"} ${coupon.code}`}><Icon name={coupon.is_active ? "minus" : "check"} size={16} /><span>{coupon.is_active ? "Disable" : "Enable"}</span></button><button type="button" className="coupon-action-btn action-delete" onClick={() => remove(coupon)} title="Delete coupon" aria-label={`Delete ${coupon.code}`}><Icon name="trash" size={16} /></button></div></td>
          </tr>)}</tbody></table></div>}
      <div className="coupon-list-footer"><span>Discount values are applied to eligible cart items only.</span><button type="button" className="coupon-footer-refresh" onClick={reload} disabled={loading}><Icon name="refresh" size={15} /> Refresh list</button></div>
    </section>
  </div>;
}
