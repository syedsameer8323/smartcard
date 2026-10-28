import { useEffect, useSyncExternalStore } from "react";

const KEY = "sc_theme";
const read = () => {
  try {
    const stored = localStorage.getItem(KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch { /* storage unavailable */ }
  return "dark"; // SmartCart opens in dark mode by default
};

let current = read();
const subscribers = new Set();
const subscribe = (fn) => { subscribers.add(fn); return () => subscribers.delete(fn); };

export function setTheme(next) {
  current = next;
  try { localStorage.setItem(KEY, next); } catch { /* ignore */ }
  document.documentElement.dataset.theme = next;
  subscribers.forEach((fn) => fn());
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, () => current, () => "dark");
  return { theme, setTheme, toggle: () => setTheme(current === "dark" ? "light" : "dark") };
}

/** Customer-facing screens follow the saved theme; seller/admin dashboards always stay light. */
export function useStorefrontTheme() {
  useEffect(() => {
    document.documentElement.dataset.theme = current;
    return () => { document.documentElement.dataset.theme = "light"; };
  }, []);
}
