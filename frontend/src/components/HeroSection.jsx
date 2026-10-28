import { Link } from "react-router-dom";
import ProductImage from "./ProductImage.jsx";
import Countdown from "./Countdown.jsx";
import Tilt from "./Tilt.jsx";
import Icon from "./Icon.jsx";
import { ArrowUpRight, Bolt } from "./Glyphs.jsx";
import { money } from "../utils/format.js";
import { percentText } from "../utils/offers.js";
import { hasImage } from "../utils/storefront.js";

/** Hero with a live "stage" of cards. All numbers/imagery come from real data; missing data hides the card. */
export default function HeroSection({ eyebrow, title, text, primary, secondary, products = [], facts = [], offer }) {
  const [main, second] = products.filter(hasImage);
  const stat = facts[0];

  return (
    <section className="hero3" aria-label="Featured">
      <div className="hero3-mesh" aria-hidden="true" />
      <div className="container hero3-grid">
        <div className="hero3-copy">
          <span className="pill-tag"><Bolt size={14} />{eyebrow}</span>
          <h1>{title}</h1>
          <p>{text}</p>
          <div className="hero3-actions">
            <Link to={primary.to} className="btn btn-primary btn-lg">{primary.label}<ArrowUpRight size={18} /></Link>
            {secondary && <Link to={secondary.to} className="btn btn-outline btn-lg">{secondary.label}</Link>}
          </div>
          {facts.length > 1 && (
            <dl className="hero3-proof">
              {facts.map(([value, label]) => <div key={label}><dt>{value}</dt><dd>{label}</dd></div>)}
            </dl>
          )}
        </div>

        <div className="hero3-stage">
          {main && (
            <Tilt className="hcard hcard-main">
              <Link to={`/product/${main.id}`} className="hcard-main-link" aria-label={`${main.name}, ${money(main.sale_price ?? main.price)}`}>
                <ProductImage product={main} />
                <span className="hcard-main-info">
                  <small>{main.category_detail?.name || "Just in"}</small>
                  <strong>{main.name}</strong>
                  <em>{money(main.sale_price ?? main.price)}</em>
                </span>
              </Link>
            </Tilt>
          )}
          {stat && (
            <div className="hcard hcard-stat">
              <b>{stat[0]}</b>
              <span>{stat[1]} live now</span>
              {second && <span className="hcard-thumb"><ProductImage product={second} /></span>}
            </div>
          )}
          {offer ? (
            <div className="hcard hcard-offer">
              <span className="hcard-tag">Live offer</span>
              <strong>{offer.name}</strong>
              <p>Up to {percentText(offer.max_discount_percent)} off</p>
              <Countdown to={offer.ends_at} />
            </div>
          ) : (
            <div className="hcard hcard-offer is-plain">
              <span className="hcard-icon"><Icon name="truck" size={22} /></span>
              <strong>Free shipping</strong>
              <p>On every order, tracked to your door.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
