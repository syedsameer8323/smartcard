import { Link } from "react-router-dom";
import ProductCard from "../../components/ProductCard.jsx";
import HeroSection from "../../components/HeroSection.jsx";
import CategoryRail from "../../components/CategoryRail.jsx";
import BentoTile from "../../components/BentoTile.jsx";
import Scroller from "../../components/Scroller.jsx";
import Countdown from "../../components/Countdown.jsx";
import TrustStrip from "../../components/TrustStrip.jsx";
import SectionHead from "../../components/SectionHead.jsx";
import Reveal from "../../components/Reveal.jsx";
import { ProductGridSkeleton, Skeleton } from "../../components/ui.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { useShop } from "../../context/ShopContext.jsx";
import { catalogApi } from "../../services/shop.js";
import { useAsync } from "../../utils/hooks.js";
import { percentText } from "../../utils/offers.js";
import { categoryPhoto, hasImage, useCategoryShowcase } from "../../utils/storefront.js";
import "../../styles/offers.css";

const listOf = (res) => res.data?.results || res.data || [];

export default function Home() {
  const { user } = useAuth();
  const { wishlist } = useShop();
  const firstName = user?.name?.trim()?.split(/\s+/)[0] || "there";

  const cats = useCategoryShowcase();
  const offers = useAsync(() => catalogApi.activeOffers(), []);
  const hasOffers = (offers.data?.offers || []).length > 0;
  const deals = useAsync(
    () => (hasOffers ? catalogApi.products({ offer: "true", in_stock: "true", page_size: 4 }) : Promise.resolve({ data: { results: [] } })),
    [hasOffers],
  );
  const fresh = useAsync(() => catalogApi.products({ sort: "newest", page_size: 10 }), []);
  const budget = useAsync(() => catalogApi.products({ sort: "price_asc", max_price: 5000, in_stock: "true", page_size: 4 }), []);

  const topOffer = offers.data?.offers?.[0];
  const dealItems = deals.data?.results || [];
  const freshItems = listOf(fresh);
  const budgetItems = listOf(budget);
  const categories = cats.data || [];
  const bigCategory = [...categories].sort((a, b) => b.count - a.count).find((c) => categoryPhoto(c));
  const total = fresh.data?.count;

  return (
    <div className="customer-home">
      <HeroSection
        eyebrow={`Hey ${firstName}, welcome back`}
        title={<>Everything you love.<br /><span className="grad-text">Delivered free.</span></>}
        text="Discover everyday essentials, technology, fashion, beauty and more — from sellers we trust, tracked every step of the way."
        primary={{ label: "Start exploring", to: "/shop" }}
        secondary={{ label: "My orders", to: "/orders" }}
        products={freshItems}
        offer={topOffer}
        facts={[
          ...(total ? [[total, "products"]] : []),
          ...(categories.length ? [[categories.length, "categories"]] : []),
          ["₹0", "shipping"],
        ]}
      />

      <section className="sec" id="collections">
        <div className="container">
          <Reveal>
            <SectionHead eyebrow="Categories" title="Browse the aisles" text="Jump straight to what you need." to="/shop" linkLabel="All products" />
          </Reveal>
          {cats.loading && !cats.data ? <Skeleton className="sk-rail" />
            : categories.length ? <Reveal delay={80}><CategoryRail categories={categories} /></Reveal>
            : <div className="inline-empty">Categories will appear here when they are available.</div>}
        </div>
      </section>

      <section className="sec sec-tight">
        <div className="container">
          <Reveal>
            <div className="bento-grid">
              <BentoTile area="a" to="/shop?sort=newest" tone="photo" product={freshItems.find(hasImage)} eyebrow="New arrivals" title="Just landed" text={total ? `${total} products and counting` : "Fresh from our sellers"} />
              {topOffer ? (
                <BentoTile area="b" to="/shop?offer=true" tone="hot" eyebrow={topOffer.name} title={`Up to ${percentText(topOffer.max_discount_percent)} off`}>
                  <Countdown to={topOffer.ends_at} />
                </BentoTile>
              ) : (
                <BentoTile area="b" to="/shop" tone="hot" eyebrow="Free shipping" title="Shipping is on us" text="Every order, no minimum." />
              )}
              <BentoTile area="c" to="/shop?max_price=5000&sort=price_asc" tone="photo" product={budgetItems.find(hasImage)} eyebrow="Budget picks" title="Under ₹5,000" />
              {bigCategory
                ? <BentoTile area="d" to={`/shop?category=${bigCategory.slug}`} tone="photo" product={categoryPhoto(bigCategory)} eyebrow="Biggest category" title={bigCategory.name} />
                : <BentoTile area="d" to="/shop" tone="glass" eyebrow="Explore" title="All products" />}
              <BentoTile area="e" to="/wishlist" tone="glass" eyebrow="Your wishlist" title={wishlist.length ? `${wishlist.length} saved` : "Nothing saved yet"} text={wishlist.length ? "Pick up where you left off." : "Tap the heart on anything you like."} />
              <BentoTile area="f" to="/orders" tone="cyan" eyebrow="Orders" title="Track your orders" text="Follow every delivery, step by step." />
            </div>
          </Reveal>
        </div>
      </section>

      <section className="sec">
        <div className="container">
          <Reveal><SectionHead eyebrow="Fresh drops" title="New arrivals" text="The latest from our sellers." to="/shop?sort=newest" /></Reveal>
          {fresh.loading && !fresh.data ? <ProductGridSkeleton count={4} />
            : freshItems.length ? <Reveal delay={80}><Scroller label="New arrivals" className="pscroll">{freshItems.map((p) => <ProductCard key={p.id} product={p} />)}</Scroller></Reveal>
            : <div className="inline-empty">New products will appear here as sellers add them. <Link to="/shop">Browse the store →</Link></div>}
        </div>
      </section>

      {topOffer && dealItems.length > 0 && (
        <section className="sec sec-tight">
          <div className="container">
            <Reveal>
              <div className="deal-frame">
                <div className="deal-head">
                  <div>
                    <span className="kicker">Limited time</span>
                    <h2>{topOffer.name}</h2>
                    <p>Up to {percentText(topOffer.max_discount_percent)} off on {offers.data.product_count} product{offers.data.product_count === 1 ? "" : "s"}.</p>
                  </div>
                  <div className="deal-side">
                    <Countdown to={topOffer.ends_at} />
                    <Link to="/shop?offer=true" className="btn btn-white">Shop all deals</Link>
                  </div>
                </div>
                <div className="product-grid">{dealItems.map((p) => <ProductCard key={p.id} product={p} />)}</div>
              </div>
            </Reveal>
          </div>
        </section>
      )}

      <section className="sec">
        <div className="container">
          <Reveal><SectionHead eyebrow="Easy on the wallet" title="Great under ₹5,000" text="In-stock picks that won’t stretch your budget." to="/shop?max_price=5000&sort=price_asc" /></Reveal>
          {budget.loading && !budget.data ? <ProductGridSkeleton count={4} />
            : budgetItems.length ? <Reveal delay={80}><div className="product-grid">{budgetItems.map((p) => <ProductCard key={p.id} product={p} />)}</div></Reveal>
            : <div className="inline-empty">Budget-friendly picks will appear here when matching products are available.</div>}
        </div>
      </section>

      <section className="sec">
        <div className="container"><Reveal><TrustStrip /></Reveal></div>
      </section>
    </div>
  );
}
