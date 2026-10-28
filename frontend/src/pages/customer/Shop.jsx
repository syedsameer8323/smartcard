import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Icon from "../../components/Icon.jsx";
import ProductCard from "../../components/ProductCard.jsx";
import { Drawer, EmptyState, Pagination, ProductGridSkeleton } from "../../components/ui.jsx";
import { GridIcon, RowsIcon } from "../../components/Glyphs.jsx";
import { catalogApi } from "../../services/shop.js";
import { useAsync } from "../../utils/hooks.js";

const PAGE_SIZE = 12;

export default function Shop() {
  const [params, setParams] = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);
  const [view, setView] = useState(() => { try { return localStorage.getItem("sc_view") || "grid"; } catch { return "grid"; } });
  const f = {
    q: params.get("q") || "", category: params.get("category") || "", min_price: params.get("min_price") || "",
    max_price: params.get("max_price") || "", sort: params.get("sort") || "newest",
    in_stock: params.get("in_stock") === "true", offer: params.get("offer") === "true", page: Number(params.get("page") || 1),
  };
  const [draft, setDraft] = useState({ min: f.min_price, max: f.max_price, in_stock: f.in_stock, offer: f.offer });
  useEffect(() => { if (showFilters) setDraft({ min: f.min_price, max: f.max_price, in_stock: f.in_stock, offer: f.offer }); }, [showFilters]); // eslint-disable-line react-hooks/exhaustive-deps

  const changeView = (next) => { setView(next); try { localStorage.setItem("sc_view", next); } catch { /* ignore */ } };

  const update = (patch) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v === "" || v === false || v == null ? next.delete(k) : next.set(k, v)));
    if (!("page" in patch)) next.delete("page");
    setParams(next);
  };

  const cats = useAsync(() => catalogApi.categories(), []);
  const res = useAsync(() => catalogApi.products({
    q: f.q || undefined, category: f.category || undefined, min_price: f.min_price || undefined,
    max_price: f.max_price || undefined, sort: f.sort, in_stock: f.in_stock || undefined, offer: f.offer || undefined, page: f.page, page_size: PAGE_SIZE,
  }), [params.toString()]);

  const activeCat = (cats.data || []).find((c) => c.slug === f.category);
  const hasFilters = f.q || f.category || f.min_price || f.max_price || f.in_stock || f.offer;
  const refineCount = [f.min_price || f.max_price, f.in_stock, f.offer].filter(Boolean).length;
  const results = res.data?.results || [];
  const total = res.data?.count;

  const title = f.q ? <>Results for <span className="grad-text">“{f.q}”</span></> : f.offer ? <>Festival <span className="grad-text">deals</span></> : activeCat ? activeCat.name : <>The <span className="grad-text">shop</span></>;
  const chips = [
    f.q && { label: `“${f.q}”`, clear: { q: "" } },
    activeCat && { label: activeCat.name, clear: { category: "" } },
    (f.min_price || f.max_price) && { label: `₹${f.min_price || 0} – ${f.max_price ? `₹${f.max_price}` : "any"}`, clear: { min_price: "", max_price: "" } },
    f.in_stock && { label: "In stock", clear: { in_stock: false } },
    f.offer && { label: "Festival offers", clear: { offer: false } },
  ].filter(Boolean);

  return (
    <div className="shop-page">
      <header className="shop-head">
        <div>
          <span className="kicker">Browse everything</span>
          <h1>{title}</h1>
        </div>
        <p className="shop-count" aria-live="polite">{total != null ? <><b>{total}</b> product{total === 1 ? "" : "s"}</> : "Loading…"}</p>
      </header>

      <div className="shop-bar">
        <nav className="pills" aria-label="Categories">
          <button type="button" className={!f.category ? "on" : ""} aria-pressed={!f.category} onClick={() => update({ category: "" })}>All</button>
          {(cats.data || []).map((c) => (
            <button type="button" key={c.id} className={f.category === c.slug ? "on" : ""} aria-pressed={f.category === c.slug} onClick={() => update({ category: c.slug })}>{c.name}</button>
          ))}
        </nav>
        <div className="shop-tools">
          <button type="button" className="btn btn-outline btn-sm" onClick={() => setShowFilters(true)}>
            <Icon name="filter" size={16} />Filters{refineCount > 0 && <span className="mini-count">{refineCount}</span>}
          </button>
          <label className="sort-label">
            <span className="sr-only">Sort by</span>
            <select className="sort-select" value={f.sort} onChange={(e) => update({ sort: e.target.value })} aria-label="Sort by">
              <option value="newest">Newest</option><option value="price_asc">Price: low to high</option>
              <option value="price_desc">Price: high to low</option><option value="name">Name A–Z</option>
            </select>
          </label>
          <div className="view-toggle" role="group" aria-label="Layout">
            <button type="button" className={view === "grid" ? "on" : ""} aria-pressed={view === "grid"} onClick={() => changeView("grid")} aria-label="Grid view"><GridIcon /></button>
            <button type="button" className={view === "list" ? "on" : ""} aria-pressed={view === "list"} onClick={() => changeView("list")} aria-label="List view"><RowsIcon /></button>
          </div>
        </div>
      </div>

      {chips.length > 0 && (
        <div className="active-chips">
          {chips.map((c) => (
            <button type="button" key={c.label} className="active-chip" onClick={() => update(c.clear)} aria-label={`Remove filter ${c.label}`}>{c.label}<Icon name="x" size={13} /></button>
          ))}
          <button type="button" className="chip-clear" onClick={() => setParams({})}>Clear all</button>
        </div>
      )}

      {res.error ? <EmptyState icon="alert" title="Couldn't load products" text={res.error} action={<button className="btn btn-primary" onClick={res.reload}>Try again</button>} />
        : res.loading && !res.data ? <ProductGridSkeleton count={8} />
        : results.length === 0 ? <EmptyState icon="search" title="No products found" text="Try adjusting your search or clearing some filters." action={hasFilters && <button className="btn btn-primary" onClick={() => setParams({})}>Clear filters</button>} />
        : <div className={`product-grid ${view === "list" ? "is-list" : ""} ${res.loading ? "dim" : ""}`}>{results.map((p) => <ProductCard key={p.id} product={p} />)}</div>}

      {res.data && <Pagination page={f.page} count={res.data.count} pageSize={PAGE_SIZE} onChange={(p) => update({ page: p })} />}

      {showFilters && (
        <Drawer
          title="Filters"
          onClose={() => setShowFilters(false)}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => { setDraft({ min: "", max: "", in_stock: false, offer: false }); }}>Reset</button>
              <button className="btn btn-primary" onClick={() => { update({ min_price: draft.min, max_price: draft.max, in_stock: draft.in_stock, offer: draft.offer }); setShowFilters(false); }}>Show results</button>
            </>
          }
        >
          <div className="fgroup">
            <h4>Price range (₹)</h4>
            <div className="price-row">
              <input className="ctl" type="number" min="0" inputMode="numeric" placeholder="Min" value={draft.min} onChange={(e) => setDraft({ ...draft, min: e.target.value })} aria-label="Minimum price" />
              <span aria-hidden="true">to</span>
              <input className="ctl" type="number" min="0" inputMode="numeric" placeholder="Max" value={draft.max} onChange={(e) => setDraft({ ...draft, max: e.target.value })} aria-label="Maximum price" />
            </div>
            <div className="quick-prices">
              {[[0, 1000], [1000, 5000], [5000, 20000]].map(([a, b]) => (
                <button type="button" key={b} className="active-chip" onClick={() => setDraft({ ...draft, min: String(a), max: String(b) })}>₹{a.toLocaleString("en-IN")}–{b.toLocaleString("en-IN")}</button>
              ))}
            </div>
          </div>
          <div className="fgroup">
            <h4>Availability</h4>
            <label className="switch"><input type="checkbox" checked={draft.in_stock} onChange={(e) => setDraft({ ...draft, in_stock: e.target.checked })} /><span />In stock only</label>
            <label className="switch"><input type="checkbox" checked={draft.offer} onChange={(e) => setDraft({ ...draft, offer: e.target.checked })} /><span />Festival offers only</label>
          </div>
        </Drawer>
      )}
    </div>
  );
}
