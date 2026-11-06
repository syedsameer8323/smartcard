import { useEffect, useRef, useState } from "react";
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
import "../../styles/checkout-payments.css";

const initial = (user) => ({
  shipping_name: user?.name || "",
  phone: "",
  email: user?.email || "",
  house_building: "",
  street: "",
  locality: "",
  city: "",
  state: "",
  postal_code: "",
  delivery_instructions: "",
  payment_method: "cod",
});

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

const loadRazorpay = () =>
  new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

const IconCod = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
    <rect x="2" y="6" width="20" height="12" rx="2" />
    <path d="M2 10h20M12 14h.01" />
  </svg>
);
const IconOnline = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
    <rect x="2" y="5" width="20" height="14" rx="2" />
    <path d="M2 10h20M6 15h4" />
  </svg>
);
const IconQr = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
    <path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h3v3h-3zM18 18h3v3h-3zM14 18h.01M18 14h.01" />
  </svg>
);

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

  // Scan & Pay session
  const [qrSession, setQrSession] = useState(null);
  const [qrBusy, setQrBusy] = useState(false);
  const [qrChecking, setQrChecking] = useState(false);
  const [qrSeconds, setQrSeconds] = useState(0);
  const pollRef = useRef(null);

  useEffect(() => {
    ordersApi.addresses().then(({ data }) => {
      setAddresses(data || []);
      const preferred = (data || []).find((a) => a.is_default) || (data || [])[0];
      if (preferred) {
        setSelectedAddressId(String(preferred.id));
        setForm((current) => ({
          ...current,
          shipping_name: preferred.full_name || current.shipping_name,
          phone: preferred.phone || "",
          email: preferred.email || current.email,
          house_building: preferred.house_building || "",
          street: preferred.street || "",
          locality: preferred.locality || "",
          city: preferred.city || "",
          state: preferred.state || "",
          postal_code: preferred.postal_code || "",
          delivery_instructions: preferred.delivery_instructions || "",
        }));
      }
    }).catch(() => {});
  }, []);

  useEffect(() => () => { if (pollRef.current) window.clearInterval(pollRef.current); }, []);

  useEffect(() => {
    if (!qrSession || qrSeconds <= 0) return undefined;
    const t = window.setInterval(() => setQrSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => window.clearInterval(t);
  }, [qrSession, qrSeconds > 0]);

  const subtotal = Number(cart.subtotal) || 0;
  const discount = coupon ? Number(coupon.discount_amount || coupon.discount || 0) : 0;
  const shipping = 0;
  const total = Math.max(0, subtotal - discount + shipping);

  if (!cart.items?.length) {
    return (
      <>
        <PageHeader title="Secure checkout" subtitle="Your cart is empty." />
        <EmptyState title="Nothing to checkout" action={<Link className="btn btn-primary" to="/shop">Continue shopping</Link>} />
      </>
    );
  }

  const set = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setErrors((x) => ({ ...x, [e.target.name]: undefined }));
  };

  const selectMethod = (method) => {
    setForm((f) => ({ ...f, payment_method: method }));
    setFormError("");
    setQrSession(null);
  };

  const applyCoupon = async () => {
    setCouponError("");
    setCouponBusy(true);
    try {
      const { data } = await ordersApi.applyCoupon(couponInput);
      setCoupon(data);
      setCouponInput(data.code);
    } catch (err) {
      setCoupon(null);
      setCouponError(parseApiError(err).message);
    } finally {
      setCouponBusy(false);
    }
  };

  const openRazorpayCheckout = async (order, formData) => {
    const loaded = await loadRazorpay();
    if (!loaded) throw new Error("Razorpay checkout could not load. Retry payment from My orders.");
    const { data: payment } = await ordersApi.createPayment(order.id);
    return new Promise((resolve) => {
      const rzp = new window.Razorpay({
        key: payment.key_id,
        amount: payment.amount,
        currency: payment.currency,
        name: "SmartCart",
        description: `Order ${payment.order_code}`,
        order_id: payment.razorpay_order_id,
        prefill: { name: formData.shipping_name, email: formData.email, contact: formData.phone },
        theme: { color: "#D9341A" },
        handler: async (response) => {
          try {
            await ordersApi.verifyPayment(order.id, response);
            await refreshCart();
            navigate("/orders", { replace: true, state: { placed: order.code, paid: true } });
            resolve("paid");
          } catch (err) {
            toast.error(parseApiError(err).message || "Payment verification failed.");
            await refreshCart();
            navigate("/orders", { replace: true, state: { placed: order.code } });
            resolve("verify_failed");
          }
        },
        modal: {
          ondismiss: async () => {
            await ordersApi.paymentFailed(order.id, { reason: "checkout_closed" }).catch(() => {});
            navigate("/orders", { replace: true, state: { placed: order.code } });
            toast.error("Payment was not completed. You can retry from My orders.");
            resolve("dismissed");
          },
        },
      });
      rzp.on("payment.failed", async (response) => {
        await ordersApi.paymentFailed(order.id, { reason: response?.error?.code || "payment_failed" }).catch(() => {});
        navigate("/orders", { replace: true, state: { placed: order.code } });
        toast.error(response?.error?.description || "Payment failed. You can retry from My orders.");
        resolve("failed");
      });
      rzp.open();
    });
  };

  const startQrSession = async (order) => {
    setQrBusy(true);
    try {
      const { data } = await ordersApi.createQRPayment(order.id);
      setQrSession({ ...data, orderId: order.id, orderCode: order.code });
      setQrSeconds(data.expires_in_seconds || 1800);
      if (pollRef.current) window.clearInterval(pollRef.current);
      pollRef.current = window.setInterval(() => checkQrStatus(order.id, true), 8000);
    } catch (err) {
      toast.error(parseApiError(err).message || "Could not start Scan & Pay.");
      navigate("/orders", { replace: true, state: { placed: order.code } });
    } finally {
      setQrBusy(false);
    }
  };

  const checkQrStatus = async (orderId, silent = false) => {
    if (!silent) setQrChecking(true);
    try {
      const { data } = await ordersApi.qrPaymentStatus(orderId);
      if (data.payment_status === "paid") {
        if (pollRef.current) window.clearInterval(pollRef.current);
        await refreshCart();
        toast.success("Payment confirmed.");
        navigate("/orders", { replace: true, state: { placed: data.order?.code, paid: true } });
      } else if (!silent) {
        toast.info(data.message || "Payment not received yet.");
      }
    } catch (err) {
      if (!silent) toast.error(parseApiError(err).message || "Could not check payment status.");
    } finally {
      if (!silent) setQrChecking(false);
    }
  };

  const refreshQr = async () => {
    if (!qrSession?.orderId) return;
    await startQrSession({ id: qrSession.orderId, code: qrSession.orderCode });
  };

  const placeOrder = async (e) => {
    e.preventDefault();
    setFormError("");
    const validation = validate(form);
    setErrors(validation);
    if (Object.keys(validation).length) return;
    setBusy(true);
    let createdOrder = null;
    try {
      const address = [form.house_building, form.street, form.locality].filter(Boolean).join(", ");
      const payload = { ...form, address, coupon_code: coupon?.code || "" };
      const { data } = await ordersApi.checkout(payload);
      createdOrder = data.order;
      if (saveAddress) {
        const addressPayload = {
          label: "Home",
          full_name: form.shipping_name,
          phone: form.phone,
          email: form.email,
          house_building: form.house_building,
          street: form.street,
          locality: form.locality,
          city: form.city,
          state: form.state,
          postal_code: form.postal_code,
          delivery_instructions: form.delivery_instructions,
          is_default: selectedAddressId
            ? !!addresses.find((a) => String(a.id) === selectedAddressId)?.is_default
            : addresses.length === 0,
        };
        try {
          const { data: saved } = await (selectedAddressId
            ? ordersApi.updateAddress(selectedAddressId, addressPayload)
            : ordersApi.saveAddress(addressPayload));
          setAddresses((current) => [saved, ...current.filter((a) => a.id !== saved.id)]);
          setSelectedAddressId(String(saved.id));
          toast.success("Shipping address saved.");
        } catch {
          toast.error("Order placed, but the address could not be saved.");
        }
      }

      if (form.payment_method === "razorpay") {
        await openRazorpayCheckout(data.order, form);
        return;
      }
      if (form.payment_method === "upi_qr") {
        await startQrSession(data.order);
        return;
      }
      await refreshCart();
      navigate("/orders", { replace: true, state: { placed: data.order.code } });
    } catch (err) {
      const { message, fieldErrors } = parseApiError(err);
      const readable = err.message && !err.response ? err.message : message;
      if (createdOrder && form.payment_method !== "cod") {
        toast.error(`${readable} Your order is saved; you can retry payment from My orders.`);
        await refreshCart().catch(() => {});
        navigate("/orders", { replace: true, state: { placed: createdOrder.code } });
      } else {
        setFormError(readable);
        setErrors(fieldErrors);
        refreshCart().catch(() => {});
      }
    } finally {
      setBusy(false);
    }
  };

  const btnLabel =
    form.payment_method === "razorpay"
      ? "Continue to payment"
      : form.payment_method === "upi_qr"
        ? "Generate QR & place order"
        : "Place order";

  return (
    <>
      <PageHeader title="Secure checkout" subtitle="Your details are protected. Review your order before placing it." />

      {qrSession && (
        <div className="qr-panel panel">
          <div className="qr-panel-head">
            <h3>Scan &amp; Pay</h3>
            <span className="qr-order-ref">Order {qrSession.order_code || qrSession.orderCode}</span>
          </div>
          {qrSession.test_mode && (
            <div className="qr-test-notice" role="status">
              <strong>Test Mode</strong> — {qrSession.test_mode_notice || "Use Razorpay test payment methods. Phone UPI apps may not complete test QR scans."}
            </div>
          )}
          <div className="qr-grid">
            <div className="qr-image-wrap">
              {qrSession.qr_image_url ? (
                <img src={qrSession.qr_image_url} alt="Payment QR code" width={280} height={280} />
              ) : (
                <div className="qr-placeholder">QR unavailable</div>
              )}
            </div>
            <div className="qr-meta">
              <p className="qr-amount">Pay <strong>{money(qrSession.amount)}</strong></p>
              <p className="muted">Scan with any UPI app, or open the payment link on this device.</p>
              {qrSeconds > 0 && (
                <p className="qr-timer">Expires in {Math.floor(qrSeconds / 60)}:{String(qrSeconds % 60).padStart(2, "0")}</p>
              )}
              {qrSeconds === 0 && <p className="field-error">QR expired — refresh to generate a new one.</p>}
              <div className="qr-actions">
                {qrSession.payment_url && (
                  <a className="btn btn-primary" href={qrSession.payment_url} target="_blank" rel="noreferrer">
                    Open payment link
                  </a>
                )}
                <button type="button" className="btn btn-secondary" disabled={qrChecking} onClick={() => checkQrStatus(qrSession.orderId)}>
                  {qrChecking ? "Checking…" : "I've paid — verify"}
                </button>
                <button type="button" className="btn btn-ghost" disabled={qrBusy} onClick={refreshQr}>
                  {qrBusy ? "Refreshing…" : "Refresh QR"}
                </button>
                <Link className="btn btn-ghost" to="/orders">View my orders</Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {!qrSession && (
        <form className="cart-layout checkout-layout" onSubmit={placeOrder} noValidate>
          <div className="panel checkout-form">
            <h3>Delivery address</h3>
            {addresses.length > 0 && (
              <div className="address-picks">
                {addresses.map((a) => (
                  <label key={a.id} className={`address-pick ${selectedAddressId === String(a.id) ? "active" : ""}`}>
                    <input
                      type="radio"
                      name="saved_address"
                      checked={selectedAddressId === String(a.id)}
                      onChange={() => {
                        setSelectedAddressId(String(a.id));
                        setForm((current) => ({
                          ...current,
                          shipping_name: a.full_name || current.shipping_name,
                          phone: a.phone || "",
                          email: a.email || current.email,
                          house_building: a.house_building || "",
                          street: a.street || "",
                          locality: a.locality || "",
                          city: a.city || "",
                          state: a.state || "",
                          postal_code: a.postal_code || "",
                          delivery_instructions: a.delivery_instructions || "",
                        }));
                      }}
                    />
                    <div>
                      <b>{a.full_name}</b>
                      <small className="muted block">{[a.house_building, a.street, a.locality, a.city, a.state, a.postal_code].filter(Boolean).join(", ")}</small>
                    </div>
                  </label>
                ))}
              </div>
            )}
            <div className="form-grid">
              <TextField label="Full name" name="shipping_name" value={form.shipping_name} onChange={set} error={errors.shipping_name} required />
              <TextField label="Mobile" name="phone" value={form.phone} onChange={set} error={errors.phone} required />
              <TextField label="Email" name="email" type="email" value={form.email} onChange={set} error={errors.email} />
              <TextField label="House / Building" name="house_building" value={form.house_building} onChange={set} error={errors.house_building} required />
              <TextField label="Street" name="street" value={form.street} onChange={set} error={errors.street} required />
              <TextField label="Locality" name="locality" value={form.locality} onChange={set} error={errors.locality} required />
              <TextField label="City" name="city" value={form.city} onChange={set} error={errors.city} required />
              <TextField label="State" name="state" value={form.state} onChange={set} error={errors.state} required />
              <TextField label="PIN code" name="postal_code" value={form.postal_code} onChange={set} error={errors.postal_code} required />
              <TextField label="Delivery instructions (optional)" name="delivery_instructions" value={form.delivery_instructions} onChange={set} />
            </div>
            <label className="check checkout-save">
              <input type="checkbox" checked={saveAddress} onChange={(e) => setSaveAddress(e.target.checked)} />
              Save this address for next time
            </label>

            <h3 className="mt">Payment method</h3>
            <div className="pay-options">
              <button type="button" className={`pay-card ${form.payment_method === "cod" ? "active" : ""}`} onClick={() => selectMethod("cod")}>
                <span className="pay-card-icon"><IconCod /></span>
                <span className="pay-card-body">
                  <b>Cash on Delivery</b>
                  <small>Pay when your order arrives.</small>
                </span>
                <span className="pay-card-check" aria-hidden="true" />
              </button>
              <button type="button" className={`pay-card ${form.payment_method === "razorpay" ? "active" : ""}`} onClick={() => selectMethod("razorpay")}>
                <span className="pay-card-icon"><IconOnline /></span>
                <span className="pay-card-body">
                  <b>Online Payment</b>
                  <small>Pay securely using UPI, cards or net banking through Razorpay.</small>
                </span>
                <span className="pay-card-check" aria-hidden="true" />
              </button>
              <button type="button" className={`pay-card ${form.payment_method === "upi_qr" ? "active" : ""}`} onClick={() => selectMethod("upi_qr")}>
                <span className="pay-card-icon"><IconQr /></span>
                <span className="pay-card-body">
                  <b>Scan &amp; Pay</b>
                  <small>Scan a QR code using your preferred UPI application.</small>
                </span>
                <span className="pay-card-check" aria-hidden="true" />
              </button>
            </div>
            {formError && <p className="field-error" role="alert">{formError}</p>}
          </div>

          <aside className="summary">
            <h3>Order summary</h3>
            <ul className="mini-list">
              {cart.items.map((i) => (
                <li key={i.id}>
                  <div className="mini-img"><ProductImage product={i.product} /></div>
                  <div>
                    <span>{i.product.name}</span>
                    <small className="muted">Qty {i.quantity}</small>
                  </div>
                  <b>{money(i.line_total)}</b>
                </li>
              ))}
            </ul>
            <div className="coupon-box">
              <label className="label-like" htmlFor="coupon-code">Coupon code</label>
              <div className="coupon-entry">
                <input id="coupon-code" className="input" value={couponInput} onChange={(e) => setCouponInput(e.target.value.toUpperCase())} disabled={!!coupon} placeholder="e.g. SMART10" />
                <button type="button" className="btn btn-secondary" disabled={couponBusy || !couponInput.trim()} onClick={applyCoupon}>
                  {couponBusy ? <Spinner /> : "Apply"}
                </button>
              </div>
              {couponError && <p className="field-error" role="alert">{couponError}</p>}
              {coupon && (
                <div className="coupon-applied">
                  <span>✓ {coupon.code} applied</span>
                  <button type="button" className="link-button" onClick={() => { setCoupon(null); setCouponInput(""); setCouponError(""); }}>Remove</button>
                </div>
              )}
            </div>
            {Number(cart.offer_savings) > 0 && (
              <div className="savings-note">🎉 You&apos;re saving {money(cart.offer_savings)} with festival offers</div>
            )}
            <div className="sum-row"><span>Subtotal</span><b>{money(subtotal)}</b></div>
            <div className="sum-row"><span>Discount</span><b className="discount-value">−{money(discount)}</b></div>
            <div className="sum-row"><span>Shipping</span><b>Free</b></div>
            <div className="sum-row total"><span>Total</span><b>{money(total)}</b></div>
            <small className="muted block checkout-note">Shipping is free on this order.</small>
            <button className="btn btn-primary btn-block btn-lg" disabled={busy || qrBusy}>
              {busy || qrBusy ? <><Spinner /> Processing…</> : btnLabel}
            </button>
            <p className="muted small checkout-safe">🔒 Card and UPI details are handled by Razorpay. SmartCart never stores them.</p>
          </aside>
        </form>
      )}
    </>
  );
}
