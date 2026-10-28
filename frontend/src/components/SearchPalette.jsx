import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import ProductImage from "./ProductImage.jsx";
import Icon from "./Icon.jsx";
import { catalogApi } from "../services/shop.js";
import { money } from "../utils/format.js";

const RECENT_KEY = "sc_recent_searches";
const readRecent = () => { try { return JSON.parse(localStorage.getItem(RECENT_KEY)) || []; } catch { return []; } };
const saveRecent = (q) => {
  try { localStorage.setItem(RECENT_KEY, JSON.stringify([q, ...readRecent().filter((x) => x !== q)].slice(0, 5))); } catch { /* ignore */ }
};

/** Command-palette style search: live product results, categories, recent searches, full keyboard support. */
export default function SearchPalette({ open, onClose }) {
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [cats, setCats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const [recent, setRecent] = useState([]);

  useEffect(() => {
    if (!open) return undefined;
    setQ(""); setResults([]); setActive(0); setRecent(readRecent());
    catalogApi.categories().then((r) => setCats(r.data)).catch(() => {});
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.setTimeout(() => inputRef.current?.focus(), 30);
    return () => { document.body.style.overflow = previous; };
  }, [open]);

  useEffect(() => {
    const term = q.trim();
    if (!open || term.length < 2) { setResults([]); setLoading(false); return undefined; }
    setLoading(true);
    let cancelled = false;
    const id = window.setTimeout(() => {
      catalogApi.products({ q: term, page_size: 6 })
        .then((r) => !cancelled && setResults(r.data.results || []))
        .catch(() => !cancelled && setResults([]))
        .finally(() => !cancelled && setLoading(false));
    }, 220);
    return () => { cancelled = true; window.clearTimeout(id); };
  }, [q, open]);

  const rows = useMemo(() => {
    const term = q.trim();
    if (term.length >= 2) {
      return [
        ...results.map((p) => ({ key: `p${p.id}`, type: "product", product: p, to: `/product/${p.id}` })),
        { key: "all", type: "query", label: `Search all products for “${term}”`, to: `/shop?q=${encodeURIComponent(term)}`, remember: term },
      ];
    }
    return [
      ...recent.map((r) => ({ key: `r${r}`, type: "recent", label: r, to: `/shop?q=${encodeURIComponent(r)}` })),
      ...cats.map((c) => ({ key: `c${c.id}`, type: "category", label: c.name, icon: c.icon, to: `/shop?category=${c.slug}` })),
    ];
  }, [q, results, recent, cats]);

  useEffect(() => setActive(0), [rows.length, q]);

  if (!open) return null;

  const go = (row) => {
    if (!row) return;
    if (row.remember) saveRecent(row.remember);
    onClose();
    navigate(row.to);
  };
  const onKey = (e) => {
    if (e.key === "Escape") { e.preventDefault(); onClose(); }
    else if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => Math.min(i + 1, rows.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
    else if (e.key === "Enter") {
      e.preventDefault();
      const term = q.trim();
      if (rows[active] && (term.length >= 2 || rows[active].type !== "query")) go(rows[active]);
      else if (term) go({ to: `/shop?q=${encodeURIComponent(term)}`, remember: term });
    }
  };

  return (
    <div className="spal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="spal" role="dialog" aria-modal="true" aria-label="Search products" onKeyDown={onKey}>
        <div className="spal-input">
          <Icon name="search" size={20} />
          <input
            ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Search products, brands, categories…" aria-label="Search"
            role="combobox" aria-expanded="true" aria-controls="spal-list" aria-activedescendant={rows[active] ? `spal-${rows[active].key}` : undefined}
            autoComplete="off" spellCheck="false"
          />
          {loading && <span className="spinner" aria-label="Searching" />}
          <kbd>Esc</kbd>
        </div>

        <ul id="spal-list" className="spal-list" role="listbox">
          {q.trim().length < 2 && rows.length > 0 && <li className="spal-label" role="presentation">{recent.length ? "Recent & categories" : "Browse categories"}</li>}
          {q.trim().length >= 2 && !loading && results.length === 0 && <li className="spal-empty" role="presentation">No products match “{q.trim()}”. Try another word.</li>}
          {rows.map((row, i) => (
            <li key={row.key} id={`spal-${row.key}`} role="option" aria-selected={i === active}
              className={`spal-row ${i === active ? "on" : ""}`} onMouseEnter={() => setActive(i)} onClick={() => go(row)}>
              {row.type === "product" ? (
                <>
                  <span className="spal-thumb"><ProductImage product={row.product} /></span>
                  <span className="spal-text"><b>{row.product.name}</b><small>{row.product.category_detail?.name} · by {row.product.seller_name}</small></span>
                  <span className="spal-price">{money(row.product.sale_price ?? row.product.price)}</span>
                </>
              ) : (
                <>
                  <span className="spal-glyph">{row.type === "category" ? row.icon || "▦" : row.type === "recent" ? "↺" : "⌕"}</span>
                  <span className="spal-text"><b>{row.label}</b>{row.type === "category" && <small>Browse category</small>}</span>
                </>
              )}
              <span className="spal-go" aria-hidden="true">↵</span>
            </li>
          ))}
        </ul>

        <div className="spal-foot"><span><kbd>↑</kbd><kbd>↓</kbd> navigate</span><span><kbd>↵</kbd> open</span><span><kbd>Esc</kbd> close</span></div>
      </div>
    </div>
  );
}
