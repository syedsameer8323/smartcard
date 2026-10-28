import { useEffect, useRef, useState } from "react";

/** Fades/slides content in once as it scrolls into view. Honors reduced-motion via CSS. */
export default function Reveal({ as: Tag = "div", delay = 0, className = "", children, ...rest }) {
  const ref = useRef(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || !("IntersectionObserver" in window)) { setSeen(true); return undefined; }
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setSeen(true); io.disconnect(); }
    }, { threshold: 0.1, rootMargin: "0px 0px -5% 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return <Tag ref={ref} className={`reveal ${seen ? "in" : ""} ${className}`} style={{ "--d": `${delay}ms` }} {...rest}>{children}</Tag>;
}
