import { Link } from "react-router-dom";
import Icon from "../../components/Icon.jsx";
import ProductCard from "../../components/ProductCard.jsx";
import { ProductGridSkeleton, Skeleton } from "../../components/ui.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { catalogApi } from "../../services/shop.js";
import { useAsync } from "../../utils/hooks.js";

function Section({ title, subtitle, to, children }) {
  return (
    <section className="section-block">
      <div className="section-head">
        <div>
          <h2>{title}</h2>
          {subtitle && <p className="muted">{subtitle}</p>}
        </div>
        {to && (
          <Link to={to} className="link-arrow">
            View all <Icon name="chevron" size={16} />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

const QUICK_ACTIONS = [
  {
    icon: "▦",
    title: "Browse products",
    description: "Explore the full collection",
    to: "/shop",
    tone: "indigo",
  },
  {
    icon: "▣",
    title: "My orders",
    description: "Check order status",
    to: "/orders",
    tone: "blue",
  },
  {
    icon: "♡",
    title: "My wishlist",
    description: "Find your saved favourites",
    to: "/wishlist",
    tone: "rose",
  },
  {
    icon: "🛒",
    title: "My cart",
    description: "Continue where you left off",
    to: "/cart",
    tone: "violet",
  },
];

export default function Home() {
  const { user } = useAuth();
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const firstName = user?.name?.trim()?.split(/\s+/)[0] || "there";

  const cats = useAsync(() => catalogApi.categories(), []);
  const fresh = useAsync(
    () => catalogApi.products({ sort: "newest", page_size: 8 }),
    []
  );
  const budget = useAsync(
    () =>
      catalogApi.products({
        sort: "price_asc",
        max_price: 5000,
        in_stock: "true",
        page_size: 4,
      }),
    []
  );

  return (
    <div className="customer-home">
      <section className="customer-welcome">
        <div className="customer-welcome-copy">
          <span className="customer-overline">YOUR SMARTCART</span>
          <h1>
            {greeting}, <span>{firstName}</span>.
          </h1>
          <p>
            Your shopping space, all in one place. Pick up where you left off
            or discover something new today.
          </p>
          <div className="customer-welcome-actions">
            <Link to="/shop" className="btn btn-primary btn-lg">
              Browse products <span aria-hidden="true">→</span>
            </Link>
            <Link to="/orders" className="customer-secondary-link">
              Track an order
            </Link>
          </div>
        </div>
        <div className="customer-welcome-note">
          <span className="customer-welcome-sparkle" aria-hidden="true">
            ✦
          </span>
          <div>
            <strong>A little something for you</strong>
            <p>Thoughtful finds. Simple shopping.</p>
          </div>
        </div>
      </section>

      <section className="customer-quick-section" aria-labelledby="quick-actions-title">
        <div className="customer-section-intro">
          <div>
            <span className="customer-overline">SHORTCUTS</span>
            <h2 id="quick-actions-title">Your shopping, at a glance</h2>
          </div>
          <p>Jump straight to what you need.</p>
        </div>
        <div className="customer-quick-grid">
          {QUICK_ACTIONS.map((action) => (
            <Link
              key={action.title}
              to={action.to}
              className="customer-quick-card"
            >
              <span
                className={`customer-quick-icon ${action.tone}`}
                aria-hidden="true"
              >
                {action.icon}
              </span>
              <span className="customer-quick-copy">
                <strong>{action.title}</strong>
                <small>{action.description}</small>
              </span>
              <span className="customer-quick-arrow" aria-hidden="true">
                ↗
              </span>
            </Link>
          ))}
        </div>
      </section>

      <Section title="Shop by category" subtitle="Find your way to something good">
        {cats.loading && !cats.data ? (
          <Skeleton className="sk-row" />
        ) : (cats.data || []).length ? (
          <div className="cat-row">
            {(cats.data || []).map((category) => (
              <Link
                key={category.id}
                to={`/shop?category=${category.slug}`}
                className="cat-tile"
              >
                <span>{category.icon || "✦"}</span>
                {category.name}
              </Link>
            ))}
          </div>
        ) : (
          <div className="customer-inline-empty">
            Categories will appear here when they are available.
          </div>
        )}
      </Section>

      <Section
        title="New arrivals"
        subtitle="Fresh from our sellers"
        to="/shop?sort=newest"
      >
        {fresh.loading && !fresh.data ? (
          <ProductGridSkeleton count={4} />
        ) : (fresh.data?.results || fresh.data || []).length ? (
          <div className="product-grid">
            {(fresh.data?.results || fresh.data || []).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="customer-inline-empty">
            New products will appear here when sellers add them to SmartCart.
            <Link to="/shop">Browse the store →</Link>
          </div>
        )}
      </Section>

      <Section
        title="Great under ₹5,000"
        subtitle="Budget-friendly picks in stock"
        to="/shop?max_price=5000&sort=price_asc"
      >
        {budget.loading && !budget.data ? (
          <ProductGridSkeleton count={4} />
        ) : (budget.data?.results || budget.data || []).length ? (
          <div className="product-grid">
            {(budget.data?.results || budget.data || []).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="customer-inline-empty">
            Budget-friendly picks will appear here when matching products are
            available.
          </div>
        )}
      </Section>
    </div>
  );
}
