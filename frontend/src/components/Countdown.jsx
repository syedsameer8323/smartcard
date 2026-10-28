import { useEffect, useState } from "react";

/** Live d/h/m/s countdown to an ISO date. Renders nothing once the time has passed. */
export default function Countdown({ to, className = "" }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const ms = new Date(to) - now;
  if (!(ms > 0)) return null;
  const s = Math.floor(ms / 1000);
  const parts = [
    ...(s >= 86400 ? [[Math.floor(s / 86400), "d"]] : []),
    [Math.floor((s % 86400) / 3600), "h"],
    [Math.floor((s % 3600) / 60), "m"],
    [s % 60, "s"],
  ];
  return (
    <div className={`cd ${className}`} role="timer" aria-label="Time left">
      {parts.map(([value, unit]) => (
        <span key={unit}><b>{String(value).padStart(2, "0")}</b><i>{unit}</i></span>
      ))}
    </div>
  );
}
