import { Link } from "react-router-dom";
import ProductCard from "../../components/ProductCard.jsx";
import { EmptyState, PageHeader, ProductGridSkeleton } from "../../components/ui.jsx";
import { useShop } from "../../context/ShopContext.jsx";
import { wishlistApi } from "../../services/shop.js";
import { useAsync } from "../../utils/hooks.js";

export default function Wishlist() {
  const { wishlist } = useShop();
  const { data, loading } = useAsync(() => wishlistApi.get(), []);
  const items = (data?.items || []).filter((p) => wishlist.includes(p.id)); // reflects removals instantly

  return (
    <>
      <PageHeader title="Your wishlist" subtitle="Products you've saved for later" />
      {loading && !data ? <ProductGridSkeleton count={4} />
        : items.length === 0 ? <EmptyState icon="heart" title="No saved items yet" text="Tap the heart on any product to save it here." action={<Link to="/shop" className="btn btn-primary">Discover products</Link>} />
        : <div className="product-grid">{items.map((p) => <ProductCard key={p.id} product={p} />)}</div>}
    </>
  );
}
