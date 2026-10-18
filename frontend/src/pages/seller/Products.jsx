import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Icon from "../../components/Icon.jsx";
import ProductImage from "../../components/ProductImage.jsx";
import Spinner from "../../components/Spinner.jsx";
import { ConfirmModal, Drawer, EmptyState, PageHeader, Pagination, Skeleton } from "../../components/ui.jsx";
import { useToast } from "../../components/Toast.jsx";
import { parseApiError } from "../../services/api.js";
import { catalogApi, sellerApi } from "../../services/shop.js";
import { useAsync, useDebounced } from "../../utils/hooks.js";
import { money } from "../../utils/format.js";
import { compressImage } from "../../utils/image.js";

const BLANK = { name: "", category: "", price: "", stock: "0", image_url: "", description: "", is_active: true };
const FILTERS = [["", "All"], ["active", "Active"], ["inactive", "Hidden"], ["low", "Low stock"], ["out", "Sold out"]];

function ProductForm({ product, categories, onClose, onSaved }) {
  const toast = useToast();
  const editing = !!product.id;
  const [f, setF] = useState(editing ? { ...BLANK, ...product, category: product.category ?? "", price: String(product.price), stock: String(product.stock) } : BLANK);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);
  const set = (k, v) => { setF((x) => ({ ...x, [k]: v })); setErrors((e) => ({ ...e, [k]: undefined })); };

  const pickImage = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // lets the seller pick the same file again later
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
      setErrors((x) => ({ ...x, image_url: "Please choose a JPG, PNG or WebP image." }));
      return;
    }
    setErrors((x) => ({ ...x, image_url: undefined }));
    setUploading(true);
    try {
      const { data } = await sellerApi.uploadImage(await compressImage(file));
      set("image_url", data.url);
      toast.success("Image uploaded");
    } catch (err) {
      const { message } = parseApiError(err);
      setErrors((x) => ({ ...x, image_url: message }));
      toast.error(message);
    } finally { setUploading(false); }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (uploading) return;
    const v = {};
    if (!f.name.trim()) v.name = "Product name is required.";
    if (!(Number(f.price) > 0)) v.price = "Enter a price greater than 0.";
    if (!/^\d+$/.test(String(f.stock))) v.stock = "Stock must be a whole number (0 or more).";
    if (f.image_url && !/^https?:\/\/.+/i.test(f.image_url)) v.image_url = "Enter a full image URL starting with http(s)://";
    setErrors(v);
    if (Object.keys(v).length) return;
    setBusy(true);
    const payload = { name: f.name.trim(), description: f.description, price: Number(f.price).toFixed(2), stock: Number(f.stock),
      image_url: f.image_url.trim(), is_active: f.is_active, category: f.category === "" ? null : Number(f.category) };
    try {
      editing ? await sellerApi.updateProduct(product.id, payload) : await sellerApi.createProduct(payload);
      toast.success(editing ? "Product updated" : "Product created");
      onSaved();
    } catch (err) {
      const { message, fieldErrors } = parseApiError(err);
      setErrors(fieldErrors); toast.error(message);
    } finally { setBusy(false); }
  };

  const Err = ({ k }) => errors[k] ? <p className="field-error">{errors[k]}</p> : null;
  return (
    <Drawer title={editing ? "Edit product" : "Add product"} onClose={onClose}
      footer={<><button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
        <button form="product-form" className="btn btn-primary" disabled={busy || uploading}>{busy ? <><Spinner /> Saving…</> : editing ? "Save changes" : "Create product"}</button></>}>
      <form id="product-form" onSubmit={submit} noValidate>
        <div className="img-preview"><ProductImage key={f.image_url} product={{ id: product.id || 1, name: f.name || "Preview", image_url: f.image_url, category_detail: categories.find((c) => c.id === Number(f.category)) }} /></div>
        <div className="field"><label htmlFor="p-name">Product name</label><input id="p-name" className={`ctl ${errors.name ? "has-error" : ""}`} value={f.name} onChange={(e) => set("name", e.target.value)} maxLength={160} /><Err k="name" /></div>
        <div className="field"><label htmlFor="p-cat">Category</label>
          <select id="p-cat" className="ctl" value={f.category} onChange={(e) => set("category", e.target.value)}>
            <option value="">Uncategorized</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
          </select><Err k="category" /></div>
        <div className="form-grid">
          <div className="field"><label htmlFor="p-price">Price</label><input id="p-price" className={`ctl ${errors.price ? "has-error" : ""}`} type="number" step="0.01" min="0" value={f.price} onChange={(e) => set("price", e.target.value)} /><Err k="price" /></div>
          <div className="field"><label htmlFor="p-stock">Stock</label><input id="p-stock" className={`ctl ${errors.stock ? "has-error" : ""}`} type="number" min="0" step="1" value={f.stock} onChange={(e) => set("stock", e.target.value)} /><Err k="stock" /></div>
        </div>
        <div className="field">
          <label htmlFor="p-img">Product image <span className="muted">(optional)</span></label>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={pickImage} />
          <div className="upload-row">
            <button type="button" className="btn btn-outline" onClick={() => fileRef.current?.click()} disabled={uploading}>
              {uploading ? <><Spinner /> Uploading…</> : f.image_url ? "Change image" : "Upload image"}
            </button>
            {f.image_url && !uploading && <button type="button" className="btn btn-outline" onClick={() => set("image_url", "")}>Remove</button>}
          </div>
          <input id="p-img" className={`ctl ${errors.image_url ? "has-error" : ""}`} value={f.image_url} onChange={(e) => set("image_url", e.target.value)}
            placeholder="…or paste an image URL (https://…)" disabled={uploading} aria-label="Image URL" />
          <small className="muted">Upload a JPG, PNG or WebP (large photos are resized automatically), or paste a link to an image.</small>
          <Err k="image_url" />
        </div>
        <div className="field"><label htmlFor="p-desc">Description</label><textarea id="p-desc" className="ctl" rows={5} value={f.description} onChange={(e) => set("description", e.target.value)} /></div>
        <label className="switch-row"><div><b>Visible in store</b><small className="muted">Hidden products can't be bought</small></div>
          <input type="checkbox" className="switch" checked={f.is_active} onChange={(e) => set("is_active", e.target.checked)} /></label>
      </form>
    </Drawer>
  );
}

export default function Products() {
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState("");
  const dq = useDebounced(q);
  const [status, setStatus] = useState(params.get("status") || "");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(null);   // null | {} (new) | product
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  const cats = useAsync(() => catalogApi.categories(), []);
  const res = useAsync(() => sellerApi.products({ q: dq || undefined, status: status || undefined, page }), [dq, status, page]);

  useEffect(() => { setPage(1); }, [dq, status]);
  useEffect(() => { if (params.get("new")) { setEditing({}); setParams({}, { replace: true }); } }, [params, setParams]);

  const toggle = async (p) => {
    try { await sellerApi.updateProduct(p.id, { is_active: !p.is_active }); res.reload(); toast.success(p.is_active ? "Product hidden" : "Product is live"); }
    catch (e) { toast.error(parseApiError(e).message); }
  };
  const remove = async () => {
    setBusy(true);
    try { await sellerApi.deleteProduct(deleting.id); toast.success("Product deleted"); setDeleting(null); res.reload(); }
    catch (e) { toast.error(parseApiError(e).message); } finally { setBusy(false); }
  };

  const rows = res.data?.results || [];
  return (
    <>
      <PageHeader title="Products" subtitle="Manage your catalog and inventory"
        actions={<button className="btn btn-primary" onClick={() => setEditing({})}><Icon name="plus" size={17} />Add product</button>} />
      <section className="panel flush">
        <div className="toolbar">
          <div className="search-box"><Icon name="search" size={18} /><input type="search" placeholder="Search your products…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search products" /></div>
          <div className="seg" role="tablist">{FILTERS.map(([v, l]) => <button key={v} role="tab" aria-selected={status === v} className={status === v ? "on" : ""} onClick={() => setStatus(v)}>{l}</button>)}</div>
        </div>
        {res.error ? <EmptyState icon="alert" title="Couldn't load products" text={res.error} action={<button className="btn btn-primary" onClick={res.reload}>Try again</button>} />
          : res.loading && !res.data ? <div className="pad"><Skeleton className="sk-hero" /></div>
          : rows.length === 0 ? <EmptyState icon="box" title={q || status ? "No matching products" : "No products yet"} text={q || status ? "Try a different search or filter." : "Add your first product to start selling."}
              action={!q && !status && <button className="btn btn-primary" onClick={() => setEditing({})}>Add product</button>} />
          : (
            <div className="table-wrap"><table className={`table ${res.loading ? "dim" : ""}`}>
              <thead><tr><th>Product</th><th>Price</th><th>Stock</th><th>Visible</th><th className="right">Actions</th></tr></thead>
              <tbody>{rows.map((p) => (
                <tr key={p.id}>
                  <td><div className="cell-product"><div className="thumb-sm"><ProductImage product={p} /></div><div><b>{p.name}</b><small className="muted">{p.category_detail?.name || "Uncategorized"}</small></div></div></td>
                  <td>{money(p.price)}</td>
                  <td><span className={`stock-chip ${p.stock === 0 ? "out" : p.stock <= 5 ? "low" : "ok"}`}>{p.stock === 0 ? "Sold out" : p.stock <= 5 ? `${p.stock} · Low` : p.stock}</span></td>
                  <td><input type="checkbox" className="switch" checked={p.is_active} onChange={() => toggle(p)} aria-label={`Visible: ${p.name}`} /></td>
                  <td className="right"><button className="icon-btn" onClick={() => setEditing(p)} aria-label={`Edit ${p.name}`}><Icon name="edit" size={18} /></button>
                    <button className="icon-btn danger" onClick={() => setDeleting(p)} aria-label={`Delete ${p.name}`}><Icon name="trash" size={18} /></button></td>
                </tr>))}</tbody>
            </table></div>
          )}
        {res.data && <div className="pad"><Pagination page={page} count={res.data.count} pageSize={10} onChange={setPage} /></div>}
      </section>
      {editing && <ProductForm product={editing} categories={cats.data || []} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); res.reload(); }} />}
      {deleting && <ConfirmModal title="Delete this product?" message={`“${deleting.name}” will be removed from your store. Past orders keep their details.`} busy={busy} onConfirm={remove} onClose={() => setDeleting(null)} />}
    </>
  );
}
