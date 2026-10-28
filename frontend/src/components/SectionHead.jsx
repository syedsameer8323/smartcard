import { Link } from "react-router-dom";
import { ArrowUpRight } from "./Glyphs.jsx";

export default function SectionHead({ eyebrow, title, text, to, linkLabel = "View all", children }) {
  return (
    <div className="shead">
      <div>
        {eyebrow && <span className="kicker">{eyebrow}</span>}
        <h2>{title}</h2>
        {text && <p>{text}</p>}
      </div>
      <div className="shead-side">
        {children}
        {to && <Link to={to} className="chip-link">{linkLabel} <ArrowUpRight size={15} /></Link>}
      </div>
    </div>
  );
}
