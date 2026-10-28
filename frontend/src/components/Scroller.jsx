import { Children, useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight } from "./Glyphs.jsx";

/** Horizontal scroll-snap track with prev/next controls. Each child becomes one slide. */
export default function Scroller({ children, label, className = "" }) {
  const ref = useRef(null);
  const [edge, setEdge] = useState({ start: true, end: false });

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setEdge({ start: el.scrollLeft < 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 });
  }, []);

  useEffect(() => {
    update();
    const el = ref.current;
    if (!el || !("ResizeObserver" in window)) return undefined;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [update, children]);

  const by = (dir) => ref.current?.scrollBy({ left: dir * ref.current.clientWidth * 0.8, behavior: "smooth" });

  return (
    <div className={`scroller ${className}`}>
      <div className="scroller-track" ref={ref} onScroll={update} role="list" aria-label={label} tabIndex={0}>
        {Children.map(children, (child) => <div className="scroller-item" role="listitem">{child}</div>)}
      </div>
      <button type="button" className="scroller-btn prev" onClick={() => by(-1)} disabled={edge.start} aria-label="Scroll left"><ArrowLeft /></button>
      <button type="button" className="scroller-btn next" onClick={() => by(1)} disabled={edge.end} aria-label="Scroll right"><ArrowRight /></button>
    </div>
  );
}
