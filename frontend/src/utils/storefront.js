import { catalogApi } from "../services/shop.js";
import { useAsync } from "./hooks.js";

export const hasImage = (product) => !!product?.image_url;

/**
 * Real categories from the backend, each enriched with its live product count and
 * a few of its newest products (used for category photography and collections).
 * Nothing here is hardcoded: new categories and products appear automatically.
 */
export function useCategoryShowcase(perCategory = 5) {
  return useAsync(async () => {
    const { data: categories } = await catalogApi.categories();
    const rows = await Promise.all(
      categories.map((category) =>
        catalogApi
          .products({ category: category.slug, page_size: perCategory, sort: "newest" })
          .then((res) => ({ ...category, count: res.data.count ?? 0, products: res.data.results || [] }))
          .catch(() => ({ ...category, count: 0, products: [] })),
      ),
    );
    return { data: rows };
  }, []);
}

/** The first product image a category can show, or null (the tile then uses a tasteful colour block). */
export const categoryPhoto = (category) => category.products?.find(hasImage) || null;
