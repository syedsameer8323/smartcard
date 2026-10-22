import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Icon from "../../components/Icon.jsx";
import ProductCard from "../../components/ProductCard.jsx";
import { EmptyState, Pagination, ProductGridSkeleton } from "../../components/ui.jsx";
import { catalogApi } from "../../services/shop.js";
import { useAsync } from "../../utils/hooks.js";

const PAGE_SIZE = 12;

export default function Shop() {
  const [params, setParams] = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);
  const f = {
    q: params.get("q") || "", category: params.get("category") || "", min_price: params.get("min_price") || "",
    max_price: params.get("max_price") || "", sort: params.get("sort") || "newest",
    in_stock: params.get("in_stock") === "true", offer: params.get("offer") === "true", page: Number(params.get("page") || 1),
  };
  const [price, setPrice] = useState({ min: f.min_price, max: f.max_price });
  useEffect(() => setPrice({ min: f.min_price, max: f.max_price }), [f.min_price, f.max_price]);

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
  const results = res.data?.results || [];

  return (
    <div className="shop-layout">
      <aside className={`filters ${showFilters ? "open" : ""}`}>
        <div className="filters-head"><h3>Filters</h3><button className="icon-btn only-mobile" onClick={() => setShowFilters(false)} aria-label="Close filters"><Icon name="x" /></button></div>
        <div className="filter-group">
          <h4>Category</h4>
          <button className={`filter-opt ${!f.category ? "active" : ""}`} onClick={() => update({ category: "" })}>All categories</button>
          {(cats.data || []).map((c) => (
            <button key={c.id} className={`filter-opt ${f.category === c.slug ? "active" : ""}`} onClick={() => update({ category: c.slug })}>
              <span>{c.icon}</span>{c.name}
            </button>
          ))}
        </div>
        <form className="filter-group" onSubmit={(e) => { e.preventDefault(); update({ min_price: price.min, max_price: price.max }); }}>
          <h4>Price</h4>
          <div className="price-row">
            <input className="ctl" type="number" min="0" placeholder="Min" value={price.min} onChange={(e) => setPrice({ ...price, min: e.target.value })} aria-label="Minimum price" />
            <span>–</span>
            <input className="ctl" type="number" min="0" placeholder="Max" value={price.max} onChange={(e) => setPrice({ ...price, max: e.target.value })} aria-label="Maximum price" />
          </div>
          <button className="btn btn-outline btn-block btn-sm">Apply</button>
        </form>
        <label className="check"><input type="checkbox" checked={f.offer} onChange={(e) => update({ offer: e.target.checked })} /> 🎉 Festival offers only</label>
        <label className="check"><input type="checkbox" checked={f.in_stock} onChange={(e) => update({ in_stock: e.target.checked })} /> In stock only</label>
        {hasFilters && <button className="btn btn-ghost btn-block" onClick={() => setParams({})}>Clear all filters</button>}
      </aside>

      <section className="shop-results">
        <div className="results-bar">
          <div>
            <h1>{f.q ? `Results for “${f.q}”` : f.offer ? "Festival deals" : activeCat ? activeCat.name : "All products"}</h1>
            <p className="muted">{res.data ? `${res.data.count} product${res.data.count === 1 ? "" : "s"}` : "Loading…"}</p>
          </div>
          <div className="results-tools">
            <button className="btn btn-outline only-mobile" onClick={() => setShowFilters(true)}><Icon name="filter" size={16} />Filters</button>
            <select className="ctl" value={f.sort} onChange={(e) => update({ sort: e.target.value })} aria-label="Sort products">
              <option value="newest">Newest</option><option value="price_asc">Price: low to high</option>
              <option value="price_desc">Price: high to low</option><option value="name">Name A–Z</option>
            </select>
          </div>
        </div>

        {res.error ? <EmptyState icon="alert" title="Couldn't load products" text={res.error} action={<button className="btn btn-primary" onClick={res.reload}>Try again</button>} />
          : res.loading && !res.data ? <ProductGridSkeleton count={8} />
          : results.length === 0 ? <EmptyState icon="search" title="No products found" text="Try adjusting your search or clearing some filters." action={hasFilters && <button className="btn btn-primary" onClick={() => setParams({})}>Clear filters</button>} />
          : <div className={`product-grid ${res.loading ? "dim" : ""}`}>{results.map((p) => <ProductCard key={p.id} product={p} />)}</div>}

        {res.data && <Pagination page={f.page} count={res.data.count} pageSize={PAGE_SIZE} onChange={(p) => update({ page: p })} />}
      </section>
      {showFilters && <div className="scrim" onClick={() => setShowFilters(false)} />}
    </div>
  );
}
