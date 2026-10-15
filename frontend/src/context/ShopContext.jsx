import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "./AuthContext.jsx";
import { useToast } from "../components/Toast.jsx";
import { cartApi, wishlistApi } from "../services/shop.js";
import { parseApiError } from "../services/api.js";

const ShopContext = createContext(null);
const EMPTY_CART = { items: [], subtotal: "0.00", count: 0 };

/** Cart + wishlist state for customers. Sellers/guests get empty, inert state. */
export function ShopProvider({ children }) {
  const { user } = useAuth();
  const toast = useToast();
  const isCustomer = user?.role === "customer";
  const [cart, setCart] = useState(EMPTY_CART);
  const [wishlist, setWishlist] = useState([]); // product ids
  const [cartLoading, setCartLoading] = useState(false);

  const refreshCart = useCallback(async () => {
    const { data } = await cartApi.get();
    setCart(data);
  }, []);

  useEffect(() => {
    if (!isCustomer) { setCart(EMPTY_CART); setWishlist([]); return; }
    setCartLoading(true);
    Promise.all([cartApi.get(), wishlistApi.get()])
      .then(([c, w]) => { setCart(c.data); setWishlist(w.data.ids); })
      .catch(() => {})
      .finally(() => setCartLoading(false));
  }, [isCustomer, user?.id]);

  const run = useCallback(async (fn, onOk) => {
    try { const { data } = await fn(); onOk(data); return true; }
    catch (err) { toast.error(parseApiError(err).message); return false; }
  }, [toast]);

  const addToCart = useCallback((id, qty = 1) =>
    run(() => cartApi.add(id, qty), (d) => { setCart(d.cart); toast.success(d.message); }), [run, toast]);

  const updateQty = useCallback((itemId, qty) =>
    run(() => cartApi.update(itemId, qty), (d) => setCart(d.cart)), [run]);

  const removeItem = useCallback((itemId) =>
    run(() => cartApi.remove(itemId), (d) => setCart(d.cart)), [run]);

  const toggleWishlist = useCallback((id) => {
    const saved = wishlist.includes(id);
    return run(() => (saved ? wishlistApi.remove(id) : wishlistApi.add(id)),
      (d) => { setWishlist(d.ids); toast.success(d.message); });
  }, [wishlist, run, toast]);

  const value = useMemo(() => ({
    cart, cartLoading, wishlist, refreshCart, addToCart, updateQty, removeItem, toggleWishlist,
  }), [cart, cartLoading, wishlist, refreshCart, addToCart, updateQty, removeItem, toggleWishlist]);

  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
}

export const useShop = () => {
  const ctx = useContext(ShopContext);
  if (!ctx) throw new Error("useShop must be used inside <ShopProvider>");
  return ctx;
};
