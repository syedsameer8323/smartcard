import { useEffect, useState } from "react";
import { parseApiError } from "../services/api.js";

/** Runs an axios call whenever deps change. Keeps previous data while reloading (no flicker). */
export function useAsync(fn, deps) {
  const [state, setState] = useState({ data: null, loading: true, error: "" });
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true, error: "" }));
    fn()
      .then((r) => alive && setState({ data: r.data, loading: false, error: "" }))
      .catch((e) => alive && setState({ data: null, loading: false, error: parseApiError(e).message }));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);
  return { ...state, reload: () => setTick((t) => t + 1) };
}

export function useDebounced(value, ms = 350) {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return v;
}
