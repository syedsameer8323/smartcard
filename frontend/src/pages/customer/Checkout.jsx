// cod+online(partially)

// import { useEffect, useState } from "react";
// import { Link, useNavigate } from "react-router-dom";
// import ProductImage from "../../components/ProductImage.jsx";
// import Spinner from "../../components/Spinner.jsx";
// import TextField from "../../components/TextField.jsx";
// import { EmptyState, PageHeader } from "../../components/ui.jsx";
// import { useAuth } from "../../context/AuthContext.jsx";
// import { useToast } from "../../components/Toast.jsx";
// import { useShop } from "../../context/ShopContext.jsx";
// import { parseApiError } from "../../services/api.js";
// import { ordersApi } from "../../services/shop.js";
// import { money } from "../../utils/format.js";

// const initial = (user) => ({ shipping_name: user?.name || "", phone: "", email: user?.email || "", house_building: "", street: "", locality: "", city: "", state: "", postal_code: "", delivery_instructions: "", payment_method: "cod" });
// const validate = (f) => {
//   const e = {};
//   if (!f.shipping_name.trim()) e.shipping_name = "Full name is required.";
//   if (!/^\+?[0-9 ()-]{10,16}$/.test(f.phone.trim())) e.phone = "Enter a valid mobile number.";
//   if (!f.house_building.trim()) e.house_building = "House number or building is required.";
//   if (!f.street.trim()) e.street = "Street address is required.";
//   if (!f.locality.trim()) e.locality = "Area or locality is required.";
//   if (!f.city.trim()) e.city = "City is required.";
//   if (!f.state.trim()) e.state = "State is required.";
//   if (!/^[1-9][0-9]{5}$/.test(f.postal_code.trim())) e.postal_code = "Enter a valid 6-digit Indian PIN code.";
//   if (f.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) e.email = "Enter a valid email address.";
//   return e;
// };
// const loadRazorpay = () => new Promise((resolve) => {
//   if (window.Razorpay) return resolve(true);
//   const script = document.createElement("script");
//   script.src = "https://checkout.razorpay.com/v1/checkout.js";
//   script.onload = () => resolve(true); script.onerror = () => resolve(false);
//   document.body.appendChild(script);
// });

// export default function Checkout() {
//   const { user } = useAuth();
//   const toast = useToast();
//   const { cart, refreshCart } = useShop();
//   const navigate = useNavigate();
//   const [form, setForm] = useState(() => initial(user));
//   const [errors, setErrors] = useState({});
//   const [formError, setFormError] = useState("");
//   const [busy, setBusy] = useState(false);
//   const [couponInput, setCouponInput] = useState("");
//   const [coupon, setCoupon] = useState(null);
//   const [couponError, setCouponError] = useState("");
//   const [couponBusy, setCouponBusy] = useState(false);
//   const [addresses, setAddresses] = useState([]);
//   const [selectedAddressId, setSelectedAddressId] = useState("");
//   const [saveAddress, setSaveAddress] = useState(true);

//   useEffect(() => { ordersApi.addresses().then(({ data }) => {
//     setAddresses(data || []);
//     const preferred = (data || []).find((a) => a.is_default) || (data || [])[0];
//     if (preferred) { setSelectedAddressId(String(preferred.id)); setForm((current) => ({ ...current, shipping_name: preferred.full_name || current.shipping_name, phone: preferred.phone || "", email: preferred.email || current.email, house_building: preferred.house_building || "", street: preferred.street || "", locality: preferred.locality || "", city: preferred.city || "", state: preferred.state || "", postal_code: preferred.postal_code || "", delivery_instructions: preferred.delivery_instructions || "" })); }
//   }).catch(() => {}); }, []);

//   const subtotal = Number(cart.subtotal || 0);
//   const discount = Number(coupon?.discount_amount || 0);
//   const shipping = coupon ? Number(coupon.shipping_fee || 0) : 0;
//   const total = Math.max(0, subtotal - discount + shipping);
//   if (cart.items.length === 0) return <EmptyState icon="cart" title="Nothing to check out" text="Add some products to your cart first." action={<Link to="/shop" className="btn btn-primary">Browse products</Link>} />;

//   const set = (e) => { setForm((f) => ({ ...f, [e.target.name]: e.target.value })); setErrors((x) => ({ ...x, [e.target.name]: undefined })); };
//   const applyCoupon = async () => {
//     setCouponError(""); setCouponBusy(true);
//     try { const { data } = await ordersApi.applyCoupon(couponInput); setCoupon(data); setCouponInput(data.code); }
//     catch (err) { setCoupon(null); setCouponError(parseApiError(err).message); }
//     finally { setCouponBusy(false); }
//   };
//   const placeOrder = async (e) => {
//     e.preventDefault(); setFormError("");
//     const validation = validate(form); setErrors(validation);
//     if (Object.keys(validation).length) return;
//     setBusy(true);
//     let createdOrder = null;
//     try {
//       const address = [form.house_building, form.street, form.locality].filter(Boolean).join(", ");
//       const payload = { ...form, address, coupon_code: coupon?.code || "" };
//       const { data } = await ordersApi.checkout(payload);
//       createdOrder = data.order;
//       if (saveAddress) {
//         const addressPayload = { label: "Home", full_name: form.shipping_name, phone: form.phone, email: form.email, house_building: form.house_building, street: form.street, locality: form.locality, city: form.city, state: form.state, postal_code: form.postal_code, delivery_instructions: form.delivery_instructions, is_default: selectedAddressId ? !!addresses.find((a) => String(a.id) === selectedAddressId)?.is_default : addresses.length === 0 };
//         try { const { data: saved } = await (selectedAddressId ? ordersApi.updateAddress(selectedAddressId, addressPayload) : ordersApi.saveAddress(addressPayload)); setAddresses((current) => [saved, ...current.filter((a) => a.id !== saved.id)]); setSelectedAddressId(String(saved.id)); toast.success("Shipping address saved."); } catch { toast.error("Order placed, but the address could not be saved. You can retry next time."); }
//       }
//       if (form.payment_method === "razorpay") {
//         const loaded = await loadRazorpay();
//         if (!loaded) throw new Error("Razorpay checkout could not load. Your order was created; retry payment from your orders once available.");
//         const { data: payment } = await ordersApi.createPayment(data.order.id);
//         const rzp = new window.Razorpay({ key: payment.key_id, amount: payment.amount, currency: payment.currency, name: "SmartCart", description: `Order ${payment.order_code}`, order_id: payment.razorpay_order_id, prefill: { name: form.shipping_name, email: form.email, contact: form.phone }, theme: { color: "#4f46e5" },
//           handler: async (response) => { try { await ordersApi.verifyPayment(data.order.id, response); await refreshCart(); navigate("/orders", { replace: true, state: { placed: data.order.code, paid: true } }); } catch (err) { toast.error(parseApiError(err).message || "Payment verification failed. Check your order status before retrying."); await refreshCart(); navigate("/orders", { replace: true, state: { placed: data.order.code } }); setBusy(false); } },
//           modal: { ondismiss: async () => { await ordersApi.paymentFailed(data.order.id, { reason: "checkout_closed" }).catch(() => {}); setBusy(false); navigate("/orders", { replace: true, state: { placed: data.order.code } }); toast.error("Payment was not completed. You can retry from My orders."); } }
//         });
//         rzp.on("payment.failed", async (response) => { await ordersApi.paymentFailed(data.order.id, { reason: response?.error?.code || "payment_failed" }).catch(() => {}); setBusy(false); navigate("/orders", { replace: true, state: { placed: data.order.code } }); toast.error(response?.error?.description || "Payment failed. You can retry from My orders."); });
//         rzp.open(); return;
//       }
//       await refreshCart(); navigate("/orders", { replace: true, state: { placed: data.order.code } });
//     } catch (err) { const { message, fieldErrors } = parseApiError(err); const readable = err.message && !err.response ? err.message : message; if (createdOrder && form.payment_method === "razorpay") { toast.error(`${readable} Your order is saved; you can retry payment from My orders.`); await refreshCart().catch(() => {}); navigate("/orders", { replace: true, state: { placed: createdOrder.code } }); } else { setFormError(readable); setErrors(fieldErrors); refreshCart().catch(() => {}); } }
//     finally { setBusy(false); }
//   };

//   return <>
//     <PageHeader title="Secure checkout" subtitle="Your details are protected. Review your order before placing it." />
//     <form className="cart-layout checkout-layout" onSubmit={placeOrder} noValidate>
//       <div className="panel checkout-form">
//         <h3>Delivery address</h3>
//         {formError && <div className="alert alert-error" role="alert">{formError}</div>}
//         {addresses.length > 0 && <div className="field"><label className="label-like" htmlFor="saved-address">Use a saved address</label><select id="saved-address" className="input" value={selectedAddressId} onChange={(e) => { setSelectedAddressId(e.target.value); const a = addresses.find((x) => String(x.id) === e.target.value); if (a) setForm((f) => ({ ...f, shipping_name: a.full_name, phone: a.phone, email: a.email || "", house_building: a.house_building, street: a.street, locality: a.locality, city: a.city, state: a.state, postal_code: a.postal_code, delivery_instructions: a.delivery_instructions || "" })); else setForm(initial(user)); }}><option value="">Enter a new address</option>{addresses.map((a) => <option key={a.id} value={a.id}>{a.label} — {a.house_building}, {a.city}</option>)}</select></div>}
//         <div className="form-grid"><TextField id="shipping_name" label="Full name" value={form.shipping_name} onChange={set} error={errors.shipping_name} autoComplete="name" /><TextField id="phone" label="Mobile number" value={form.phone} onChange={set} error={errors.phone} autoComplete="tel" /></div>
//         <TextField id="email" label="Email address (optional)" type="email" value={form.email} onChange={set} error={errors.email} autoComplete="email" />
//         <div className="form-grid"><TextField id="house_building" label="House / building" value={form.house_building} onChange={set} error={errors.house_building} autoComplete="address-line1" /><TextField id="street" label="Street address" value={form.street} onChange={set} error={errors.street} autoComplete="address-line2" /></div>
//         <TextField id="locality" label="Area / locality" value={form.locality} onChange={set} error={errors.locality} />
//         <div className="form-grid"><TextField id="city" label="City" value={form.city} onChange={set} error={errors.city} autoComplete="address-level2" /><TextField id="state" label="State" value={form.state} onChange={set} error={errors.state} autoComplete="address-level1" /></div>
//         <TextField id="postal_code" label="PIN code" value={form.postal_code} onChange={set} error={errors.postal_code} autoComplete="postal-code" inputMode="numeric" maxLength={6} />
//         <div className="field"><label className="label-like" htmlFor="delivery_instructions">Delivery instructions (optional)</label><textarea id="delivery_instructions" name="delivery_instructions" className="input" rows="3" maxLength={500} placeholder="Landmark, gate instructions, etc." value={form.delivery_instructions} onChange={set} /></div>
//         <label className="check checkout-save"><input type="checkbox" checked={saveAddress} onChange={(e) => setSaveAddress(e.target.checked)} /> Save this address for next time</label>
//         <h3 className="mt">Payment method</h3>
//         <label className={`pay-option ${form.payment_method === "cod" ? "active" : ""}`}><input type="radio" name="payment_method" value="cod" checked={form.payment_method === "cod"} onChange={set} /><div><b>Cash on delivery</b><small>Pay when your order arrives</small></div></label>
//         <label className={`pay-option ${form.payment_method === "razorpay" ? "active" : ""}`}>
//         <input
//         type="radio"
//         name="payment_method"
//         value="razorpay"
//         checked={form.payment_method === "razorpay"}
//         onChange={set}
//         />

//           <div>
//             <b>Pay Online</b>
//             <small>
//               Secure payment using UPI, QR code where available, debit or credit cards, and net banking.
//             </small>
//           </div>
//         </label>
//       </div>
//       <aside className="summary">
//         <h3>Order summary</h3>
//         <ul className="mini-list">{cart.items.map((i) => <li key={i.id}><div className="mini-img"><ProductImage product={i.product} /></div><div><span>{i.product.name}</span><small className="muted">Qty {i.quantity}</small></div><b>{money(i.line_total)}</b></li>)}</ul>
//         <div className="coupon-box"><label className="label-like" htmlFor="coupon-code">Coupon code</label><div className="coupon-entry"><input id="coupon-code" className="input" value={couponInput} onChange={(e) => setCouponInput(e.target.value.toUpperCase())} disabled={!!coupon} placeholder="e.g. SMART10" /><button type="button" className="btn btn-secondary" disabled={couponBusy || !couponInput.trim()} onClick={applyCoupon}>{couponBusy ? <Spinner /> : "Apply"}</button></div>{couponError && <p className="field-error" role="alert">{couponError}</p>}{coupon && <div className="coupon-applied"><span>✓ {coupon.code} applied</span><button type="button" className="link-button" onClick={() => { setCoupon(null); setCouponInput(""); setCouponError(""); }}>Remove</button></div>}</div>
//         <div className="sum-row"><span>Subtotal</span><b>{money(subtotal)}</b></div>
//         <div className="sum-row"><span>Discount</span><b className="discount-value">−{money(discount)}</b></div>
//         <div className="sum-row"><span>Shipping</span><b>{shipping ? money(shipping) : "Free"}</b></div>
//         <div className="sum-row total"><span>Total</span><b>{money(total)}</b></div>
//         <small className="muted block checkout-note">Shipping is free on this order.</small>
//         <button className="btn btn-primary btn-block btn-lg" disabled={busy}>{busy ? <><Spinner /> Processing…</> : form.payment_method === "razorpay" ? "Continue to payment" : "Place order"}</button>
//         <p className="muted small checkout-safe">🔒 Your payment details are handled by the payment provider.</p>
//       </aside>
//     </form>
//   </>;
// }

//  has only cod option and online payment option is disabled.
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import ProductImage from "../../components/ProductImage.jsx";
import Spinner from "../../components/Spinner.jsx";
import TextField from "../../components/TextField.jsx";
import { EmptyState, PageHeader } from "../../components/ui.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { useToast } from "../../components/Toast.jsx";
import { useShop } from "../../context/ShopContext.jsx";
import { parseApiError } from "../../services/api.js";
import { ordersApi } from "../../services/shop.js";
import { money } from "../../utils/format.js";

const initial = (user) => ({ shipping_name: user?.name || "", phone: "", email: user?.email || "", house_building: "", street: "", locality: "", city: "", state: "", postal_code: "", delivery_instructions: "", payment_method: "cod" });
const validate = (f) => {
  const e = {};
  if (!f.shipping_name.trim()) e.shipping_name = "Full name is required.";
  if (!/^\+?[0-9 ()-]{10,16}$/.test(f.phone.trim())) e.phone = "Enter a valid mobile number.";
  if (!f.house_building.trim()) e.house_building = "House number or building is required.";
  if (!f.street.trim()) e.street = "Street address is required.";
  if (!f.locality.trim()) e.locality = "Area or locality is required.";
  if (!f.city.trim()) e.city = "City is required.";
  if (!f.state.trim()) e.state = "State is required.";
  if (!/^[1-9][0-9]{5}$/.test(f.postal_code.trim())) e.postal_code = "Enter a valid 6-digit Indian PIN code.";
  if (f.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) e.email = "Enter a valid email address.";
  return e;
};
const loadRazorpay = () => new Promise((resolve) => {
  if (window.Razorpay) return resolve(true);
  const script = document.createElement("script");
  script.src = "https://checkout.razorpay.com/v1/checkout.js";
  script.onload = () => resolve(true); script.onerror = () => resolve(false);
  document.body.appendChild(script);
});

export default function Checkout() {
  const { user } = useAuth();
  const toast = useToast();
  const { cart, refreshCart } = useShop();
  const navigate = useNavigate();
  const [form, setForm] = useState(() => initial(user));
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState(null);
  const [couponError, setCouponError] = useState("");
  const [couponBusy, setCouponBusy] = useState(false);
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [saveAddress, setSaveAddress] = useState(true);

  useEffect(() => { ordersApi.addresses().then(({ data }) => {
    setAddresses(data || []);
    const preferred = (data || []).find((a) => a.is_default) || (data || [])[0];
    if (preferred) { setSelectedAddressId(String(preferred.id)); setForm((current) => ({ ...current, shipping_name: preferred.full_name || current.shipping_name, phone: preferred.phone || "", email: preferred.email || current.email, house_building: preferred.house_building || "", street: preferred.street || "", locality: preferred.locality || "", city: preferred.city || "", state: preferred.state || "", postal_code: preferred.postal_code || "", delivery_instructions: preferred.delivery_instructions || "" })); }
  }).catch(() => {}); }, []);

  const subtotal = Number(cart.subtotal || 0);
  const discount = Number(coupon?.discount_amount || 0);
  const shipping = coupon ? Number(coupon.shipping_fee || 0) : 0;
  const total = Math.max(0, subtotal - discount + shipping);
  if (cart.items.length === 0) return <EmptyState icon="cart" title="Nothing to check out" text="Add some products to your cart first." action={<Link to="/shop" className="btn btn-primary">Browse products</Link>} />;

  const set = (e) => { setForm((f) => ({ ...f, [e.target.name]: e.target.value })); setErrors((x) => ({ ...x, [e.target.name]: undefined })); };
  const applyCoupon = async () => {
    setCouponError(""); setCouponBusy(true);
    try { const { data } = await ordersApi.applyCoupon(couponInput); setCoupon(data); setCouponInput(data.code); }
    catch (err) { setCoupon(null); setCouponError(parseApiError(err).message); }
    finally { setCouponBusy(false); }
  };
  const placeOrder = async (e) => {
    e.preventDefault(); setFormError("");

    // Online payments are temporarily disabled. Keep this guard so a manually
    // altered form cannot start the Razorpay flow while the option is unavailable.
    if (form.payment_method === "razorpay") {
      setFormError("Online payments are currently unavailable. Please choose Cash on Delivery to continue.");
      return;
    }

    const validation = validate(form); setErrors(validation);
    if (Object.keys(validation).length) return;
    setBusy(true);
    let createdOrder = null;
    try {
      const address = [form.house_building, form.street, form.locality].filter(Boolean).join(", ");
      const payload = { ...form, address, coupon_code: coupon?.code || "" };
      const { data } = await ordersApi.checkout(payload);
      createdOrder = data.order;
      if (saveAddress) {
        const addressPayload = { label: "Home", full_name: form.shipping_name, phone: form.phone, email: form.email, house_building: form.house_building, street: form.street, locality: form.locality, city: form.city, state: form.state, postal_code: form.postal_code, delivery_instructions: form.delivery_instructions, is_default: selectedAddressId ? !!addresses.find((a) => String(a.id) === selectedAddressId)?.is_default : addresses.length === 0 };
        try { const { data: saved } = await (selectedAddressId ? ordersApi.updateAddress(selectedAddressId, addressPayload) : ordersApi.saveAddress(addressPayload)); setAddresses((current) => [saved, ...current.filter((a) => a.id !== saved.id)]); setSelectedAddressId(String(saved.id)); toast.success("Shipping address saved."); } catch { toast.error("Order placed, but the address could not be saved. You can retry next time."); }
      }
      if (form.payment_method === "razorpay") {
        const loaded = await loadRazorpay();
        if (!loaded) throw new Error("Razorpay checkout could not load. Your order was created; retry payment from your orders once available.");
        const { data: payment } = await ordersApi.createPayment(data.order.id);
        const rzp = new window.Razorpay({ key: payment.key_id, amount: payment.amount, currency: payment.currency, name: "SmartCart", description: `Order ${payment.order_code}`, order_id: payment.razorpay_order_id, prefill: { name: form.shipping_name, email: form.email, contact: form.phone }, theme: { color: "#4f46e5" },
          handler: async (response) => { try { await ordersApi.verifyPayment(data.order.id, response); await refreshCart(); navigate("/orders", { replace: true, state: { placed: data.order.code, paid: true } }); } catch (err) { toast.error(parseApiError(err).message || "Payment verification failed. Check your order status before retrying."); await refreshCart(); navigate("/orders", { replace: true, state: { placed: data.order.code } }); setBusy(false); } },
          modal: { ondismiss: async () => { await ordersApi.paymentFailed(data.order.id, { reason: "checkout_closed" }).catch(() => {}); setBusy(false); navigate("/orders", { replace: true, state: { placed: data.order.code } }); toast.error("Payment was not completed. You can retry from My orders."); } }
        });
        rzp.on("payment.failed", async (response) => { await ordersApi.paymentFailed(data.order.id, { reason: response?.error?.code || "payment_failed" }).catch(() => {}); setBusy(false); navigate("/orders", { replace: true, state: { placed: data.order.code } }); toast.error(response?.error?.description || "Payment failed. You can retry from My orders."); });
        rzp.open(); return;
      }
      await refreshCart(); navigate("/orders", { replace: true, state: { placed: data.order.code } });
    } catch (err) { const { message, fieldErrors } = parseApiError(err); const readable = err.message && !err.response ? err.message : message; if (createdOrder && form.payment_method === "razorpay") { toast.error(`${readable} Your order is saved; you can retry payment from My orders.`); await refreshCart().catch(() => {}); navigate("/orders", { replace: true, state: { placed: createdOrder.code } }); } else { setFormError(readable); setErrors(fieldErrors); refreshCart().catch(() => {}); } }
    finally { setBusy(false); }
  };

  return <>
    <PageHeader title="Secure checkout" subtitle="Your details are protected. Review your order before placing it." />
    <form className="cart-layout checkout-layout" onSubmit={placeOrder} noValidate>
      <div className="panel checkout-form">
        <h3>Delivery address</h3>
        {formError && <div className="alert alert-error" role="alert">{formError}</div>}
        {addresses.length > 0 && <div className="field"><label className="label-like" htmlFor="saved-address">Use a saved address</label><select id="saved-address" className="input" value={selectedAddressId} onChange={(e) => { setSelectedAddressId(e.target.value); const a = addresses.find((x) => String(x.id) === e.target.value); if (a) setForm((f) => ({ ...f, shipping_name: a.full_name, phone: a.phone, email: a.email || "", house_building: a.house_building, street: a.street, locality: a.locality, city: a.city, state: a.state, postal_code: a.postal_code, delivery_instructions: a.delivery_instructions || "" })); else setForm(initial(user)); }}><option value="">Enter a new address</option>{addresses.map((a) => <option key={a.id} value={a.id}>{a.label} — {a.house_building}, {a.city}</option>)}</select></div>}
        <div className="form-grid"><TextField id="shipping_name" label="Full name" value={form.shipping_name} onChange={set} error={errors.shipping_name} autoComplete="name" /><TextField id="phone" label="Mobile number" value={form.phone} onChange={set} error={errors.phone} autoComplete="tel" /></div>
        <TextField id="email" label="Email address (optional)" type="email" value={form.email} onChange={set} error={errors.email} autoComplete="email" />
        <div className="form-grid"><TextField id="house_building" label="House / building" value={form.house_building} onChange={set} error={errors.house_building} autoComplete="address-line1" /><TextField id="street" label="Street address" value={form.street} onChange={set} error={errors.street} autoComplete="address-line2" /></div>
        <TextField id="locality" label="Area / locality" value={form.locality} onChange={set} error={errors.locality} />
        <div className="form-grid"><TextField id="city" label="City" value={form.city} onChange={set} error={errors.city} autoComplete="address-level2" /><TextField id="state" label="State" value={form.state} onChange={set} error={errors.state} autoComplete="address-level1" /></div>
        <TextField id="postal_code" label="PIN code" value={form.postal_code} onChange={set} error={errors.postal_code} autoComplete="postal-code" inputMode="numeric" maxLength={6} />
        <div className="field"><label className="label-like" htmlFor="delivery_instructions">Delivery instructions (optional)</label><textarea id="delivery_instructions" name="delivery_instructions" className="input" rows="3" maxLength={500} placeholder="Landmark, gate instructions, etc." value={form.delivery_instructions} onChange={set} /></div>
        <label className="check checkout-save"><input type="checkbox" checked={saveAddress} onChange={(e) => setSaveAddress(e.target.checked)} /> Save this address for next time</label>
        <h3 className="mt">Payment method</h3>
        <label className={`pay-option ${form.payment_method === "cod" ? "active" : ""}`}>
          <input
            type="radio"
            name="payment_method"
            value="cod"
            checked={form.payment_method === "cod"}
            onChange={set}
          />
          <div>
            <b>Cash on Delivery</b>
            <small>Pay when your order arrives.</small>
          </div>
        </label>

        <label className="pay-option payment-unavailable" aria-disabled="true">
          <input type="radio" name="payment_method" value="razorpay" disabled />
          <div>
            <b>Online Payment <span className="payment-coming-soon">Coming Soon</span></b>
            <small>
              Online payments via UPI, QR code, debit cards, and credit cards are temporarily unavailable.
              Please choose Cash on Delivery to place your order.
            </small>
          </div>
        </label>
      </div>
      <aside className="summary">
        <h3>Order summary</h3>
        <ul className="mini-list">{cart.items.map((i) => <li key={i.id}><div className="mini-img"><ProductImage product={i.product} /></div><div><span>{i.product.name}</span><small className="muted">Qty {i.quantity}</small></div><b>{money(i.line_total)}</b></li>)}</ul>
        <div className="coupon-box"><label className="label-like" htmlFor="coupon-code">Coupon code</label><div className="coupon-entry"><input id="coupon-code" className="input" value={couponInput} onChange={(e) => setCouponInput(e.target.value.toUpperCase())} disabled={!!coupon} placeholder="e.g. SMART10" /><button type="button" className="btn btn-secondary" disabled={couponBusy || !couponInput.trim()} onClick={applyCoupon}>{couponBusy ? <Spinner /> : "Apply"}</button></div>{couponError && <p className="field-error" role="alert">{couponError}</p>}{coupon && <div className="coupon-applied"><span>✓ {coupon.code} applied</span><button type="button" className="link-button" onClick={() => { setCoupon(null); setCouponInput(""); setCouponError(""); }}>Remove</button></div>}</div>
        {Number(cart.offer_savings) > 0 && <div className="savings-note">🎉 You're saving {money(cart.offer_savings)} with festival offers</div>}
        <div className="sum-row"><span>Subtotal</span><b>{money(subtotal)}</b></div>
        <div className="sum-row"><span>Discount</span><b className="discount-value">−{money(discount)}</b></div>
        <div className="sum-row"><span>Shipping</span><b>{shipping ? money(shipping) : "Free"}</b></div>
        <div className="sum-row total"><span>Total</span><b>{money(total)}</b></div>
        <small className="muted block checkout-note">Shipping is free on this order.</small>
        <button className="btn btn-primary btn-block btn-lg" disabled={busy}>{busy ? <><Spinner /> Processing…</> : form.payment_method === "razorpay" ? "Continue to payment" : "Place order"}</button>
        <p className="muted small checkout-safe">🔒 Your information is protected during checkout.</p>
      </aside>
    </form>
  </>;
}
