// Change CURRENCY (ISO 4217 code) to switch every price in the app, e.g. "INR", "EUR".
export const CURRENCY = "INR";
const fmt = new Intl.NumberFormat("en-IN", { style: "currency", currency: CURRENCY, maximumFractionDigits: 2 });

export const money = (v) => fmt.format(Number(v || 0));
export const shortDate = (iso) =>
  new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
export const dayLabel = (iso) =>
  new Date(iso + "T00:00:00").toLocaleDateString(undefined, { weekday: "short" });

export const STATUS = {
  pending: "Pending", confirmed: "Confirmed", shipped: "Shipped", delivered: "Delivered", cancelled: "Cancelled",
};
