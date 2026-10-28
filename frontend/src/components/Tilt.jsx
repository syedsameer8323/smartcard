import { useRef } from "react";

/** Subtle 3D hover tilt for desktop pointers. */
export default function Tilt({ children, className = "", max = 7 }) {
  const ref = useRef(null);
  const move = (e) => {
    if (e.pointerType !== "mouse" || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    ref.current.style.setProperty("--ry", `${((e.clientX - r.left) / r.width - 0.5) * max}deg`);
    ref.current.style.setProperty("--rx", `${-((e.clientY - r.top) / r.height - 0.5) * max}deg`);
  };
  const leave = () => {
    ref.current?.style.setProperty("--ry", "0deg");
    ref.current?.style.setProperty("--rx", "0deg");
  };
  return <div ref={ref} className={`tilt ${className}`} onPointerMove={move} onPointerLeave={leave}>{children}</div>;
}
