"""
Tool implementations that query the live SmartCart database.
Never return fabricated products or prices — everything comes from models + pricing.
"""
from __future__ import annotations

from decimal import Decimal
from typing import Any

from django.db.models import Q

from catalog.models import Category, Product
from catalog.pricing import load_active_offers, price_info
from shop.models import CartItem, Order, WishlistItem


def _product_dict(product: Product, rules) -> dict[str, Any]:
    info = price_info(product, rules)
    cat = product.category
    return {
        "id": product.id,
        "name": product.name,
        "description": (product.description or "")[:280],
        "price": float(product.price),
        "sale_price": float(info["sale_price"]),
        "discount_percent": float(info["percent"]) if info["percent"] is not None else None,
        "stock": product.stock,
        "in_stock": product.stock > 0,
        "image_url": product.image_url or "",
        "category": cat.name if cat else None,
        "category_slug": cat.slug if cat else None,
        "seller_name": getattr(product.seller, "name", "") or "",
        "offer": (
            {"name": info["rule"].name, "festival": info["rule"].festival}
            if info["rule"]
            else None
        ),
    }


def search_products(
    query: str = "",
    category: str = "",
    max_price: float | None = None,
    min_price: float | None = None,
    in_stock_only: bool = True,
    limit: int = 6,
    exclude_ids: list[int] | None = None,
) -> dict[str, Any]:
    """Search live catalog. Prices are effective (festival) prices."""
    rules = load_active_offers()
    qs = Product.objects.filter(is_active=True).select_related("seller", "category")

    q = (query or "").strip()
    if q:
        qs = qs.filter(
            Q(name__icontains=q) | Q(description__icontains=q) | Q(category__name__icontains=q)
        )

    if category:
        slug = category.strip().lower().replace(" ", "-")
        qs = qs.filter(Q(category__slug=slug) | Q(category__name__icontains=category.strip()))

    if in_stock_only:
        qs = qs.filter(stock__gt=0)

    exclude = {int(x) for x in (exclude_ids or []) if x}
    if exclude:
        qs = qs.exclude(id__in=exclude)

    products = list(qs.order_by("-created_at")[:60])
    results = []
    for p in products:
        d = _product_dict(p, rules)
        sp = d["sale_price"]
        if min_price is not None and sp < float(min_price):
            continue
        if max_price is not None and sp > float(max_price):
            continue
        results.append(d)
        if len(results) >= max(1, min(limit, 12)):
            break

    return {
        "count": len(results),
        "products": results,
        "note": "These are real products currently listed on SmartCart with live prices.",
    }


def get_product_details(product_id: int) -> dict[str, Any]:
    rules = load_active_offers()
    try:
        p = Product.objects.select_related("seller", "category").get(pk=product_id, is_active=True)
    except Product.DoesNotExist:
        return {"error": f"Product {product_id} not found or inactive."}
    return {"product": _product_dict(p, rules)}


def get_cart(user) -> dict[str, Any]:
    if not user or not getattr(user, "is_authenticated", False):
        return {"error": "User is not logged in.", "items": [], "authenticated": False}
    rules = load_active_offers()
    items = (
        CartItem.objects.filter(user=user)
        .select_related("product", "product__seller", "product__category")
        .order_by("-updated_at")
    )
    out = []
    total = Decimal("0")
    for item in items:
        if not item.product or not item.product.is_active:
            continue
        d = _product_dict(item.product, rules)
        line = float(d["sale_price"]) * item.quantity
        total += Decimal(str(line))
        out.append({**d, "quantity": item.quantity, "line_total": round(line, 2)})
    return {
        "items": out,
        "item_count": len(out),
        "cart_total": float(total),
        "authenticated": True,
    }


def get_wishlist(user) -> dict[str, Any]:
    if not user or not getattr(user, "is_authenticated", False):
        return {"error": "User is not logged in.", "items": [], "authenticated": False}
    rules = load_active_offers()
    items = (
        WishlistItem.objects.filter(user=user)
        .select_related("product", "product__seller", "product__category")
        .order_by("-created_at")[:20]
    )
    out = []
    for item in items:
        if item.product and item.product.is_active:
            out.append(_product_dict(item.product, rules))
    return {"items": out, "count": len(out), "authenticated": True}


def get_orders(user, limit: int = 5) -> dict[str, Any]:
    if not user or not getattr(user, "is_authenticated", False):
        return {"error": "User is not logged in.", "orders": [], "authenticated": False}
    orders = (
        Order.objects.filter(user=user)
        .prefetch_related("items")
        .order_by("-created_at")[: max(1, min(limit, 10))]
    )
    out = []
    for o in orders:
        out.append(
            {
                "code": o.code,
                "total": float(o.total),
                "payment_status": o.payment_status,
                "payment_method": o.payment_method,
                "created_at": o.created_at.isoformat(),
                "items": [
                    {
                        "name": it.name,
                        "quantity": it.quantity,
                        "price": float(it.price),
                        "status": it.status,
                        "image_url": it.image_url or "",
                    }
                    for it in o.items.all()
                ],
            }
        )
    return {"orders": out, "count": len(out), "authenticated": True}


def list_categories() -> dict[str, Any]:
    cats = list(Category.objects.all().values("id", "name", "slug", "icon"))
    return {"categories": cats}


def get_active_offers() -> dict[str, Any]:
    rules = load_active_offers()
    return {
        "offers": [
            {
                "name": r.name,
                "festival": r.festival,
                "discount_percent": float(r.percent),
                "seller": r.seller_name,
                "ends_at": r.ends_at.isoformat() if r.ends_at else None,
            }
            for r in rules
        ]
    }


# Complementary category keyword maps (used for accessories)
_COMPLEMENT_KEYWORDS = {
    "shirt": ["trouser", "jeans", "pant", "shoe", "belt", "watch", "access"],
    "top": ["trouser", "jeans", "pant", "shoe", "access"],
    "t-shirt": ["trouser", "jeans", "pant", "shoe", "access"],
    "kurta": ["trouser", "pyjama", "shoe", "dupatta", "access"],
    "jeans": ["shirt", "t-shirt", "top", "shoe", "belt"],
    "trouser": ["shirt", "t-shirt", "top", "shoe", "belt"],
    "pant": ["shirt", "t-shirt", "top", "shoe"],
    "shoe": ["sock", "belt", "access"],
    "laptop": ["mouse", "bag", "headphone", "charger", "access", "stand"],
    "computer": ["mouse", "keyboard", "headphone", "access"],
    "phone": ["case", "cover", "charger", "earphone", "headphone", "access"],
    "mobile": ["case", "cover", "charger", "earphone", "access"],
    "mug": ["coaster", "flask", "bottle", "kitchen", "home"],
    "coffee": ["mug", "flask", "kitchen"],
}


def _seed_products(product_ids: list[int]):
    return list(
        Product.objects.filter(id__in=product_ids, is_active=True).select_related("category", "seller")
    )


def recommend_related(
    product_ids: list[int] | None = None,
    limit: int = 6,
    mode: str = "similar",
) -> dict[str, Any]:
    """
    Recommend products based on seed product ids.

    mode:
      - similar: same category, different products
      - cheaper: same category, lower sale price than the cheapest seed
      - accessories: complementary categories (not the same category when possible)
    """
    rules = load_active_offers()
    product_ids = [int(x) for x in (product_ids or []) if x]
    exclude = set(product_ids)
    mode = (mode or "similar").lower().strip()
    if mode not in ("similar", "cheaper", "accessories", "related"):
        mode = "similar"
    if mode == "related":
        mode = "accessories"

    seeds = _seed_products(product_ids) if product_ids else []
    seed_cats = {p.category_id for p in seeds if p.category_id}
    seed_prices = []
    for p in seeds:
        seed_prices.append(float(price_info(p, rules)["sale_price"]))
    max_seed_price = min(seed_prices) if seed_prices else None

    qs = Product.objects.filter(is_active=True, stock__gt=0).select_related("seller", "category")
    if exclude:
        qs = qs.exclude(id__in=exclude)

    if mode == "cheaper" and seed_cats and max_seed_price is not None:
        # Same category, strictly cheaper than cheapest seed
        qs = qs.filter(category_id__in=seed_cats)
        candidates = list(qs.order_by("price")[:40])
        products = []
        for p in candidates:
            d = _product_dict(p, rules)
            if d["sale_price"] < max_seed_price:
                products.append(d)
            if len(products) >= max(1, min(limit, 12)):
                break
        return {
            "products": products,
            "count": len(products),
            "mode": "cheaper",
            "based_on_product_ids": product_ids,
            "note": "Cheaper alternatives in the same category from the live catalog.",
        }

    if mode == "accessories" and seeds:
        # Build complementary category set from seed category names
        complement_cat_ids = set()
        for p in seeds:
            cname = (p.category.name if p.category else "").lower()
            for key, kws in _COMPLEMENT_KEYWORDS.items():
                if key in cname or key in (p.name or "").lower():
                    for kw in kws:
                        complement_cat_ids |= set(
                            Category.objects.filter(name__icontains=kw).values_list("id", flat=True)
                        )
        # Prefer complementary categories; fall back to other categories (exclude seed cats)
        if complement_cat_ids:
            qs_acc = qs.filter(category_id__in=complement_cat_ids)
            if seed_cats:
                qs_acc = qs_acc.exclude(category_id__in=seed_cats)
            products = [_product_dict(p, rules) for p in qs_acc.order_by("-created_at")[: max(1, min(limit, 12))]]
            if products:
                return {
                    "products": products,
                    "count": len(products),
                    "mode": "accessories",
                    "based_on_product_ids": product_ids,
                    "note": "Complementary / accessory products from the live catalog.",
                }
        # Fallback: any other category
        if seed_cats:
            qs = qs.exclude(category_id__in=seed_cats)
        products = [_product_dict(p, rules) for p in qs.order_by("-created_at")[: max(1, min(limit, 12))]]
        return {
            "products": products,
            "count": len(products),
            "mode": "accessories",
            "based_on_product_ids": product_ids,
            "note": "Related products from other categories.",
        }

    # similar (default): same category when possible
    if seed_cats:
        qs = qs.filter(category_id__in=seed_cats)
    products = [_product_dict(p, rules) for p in qs.order_by("-created_at")[: max(1, min(limit, 12))]]
    return {
        "products": products,
        "count": len(products),
        "mode": "similar",
        "based_on_product_ids": product_ids,
        "note": "Similar products in the same category from the live catalog.",
    }


def compare_products(product_ids: list[int]) -> dict[str, Any]:
    rules = load_active_offers()
    ids = [int(x) for x in product_ids[:6]]
    products = Product.objects.filter(id__in=ids, is_active=True).select_related("seller", "category")
    by_id = {p.id: _product_dict(p, rules) for p in products}
    ordered = [by_id[i] for i in ids if i in by_id]
    return {"products": ordered, "count": len(ordered)}


TOOL_SCHEMAS = [
    {
        "type": "function",
        "function": {
            "name": "search_products",
            "description": "Search SmartCart products by keywords, category, and price range. Always use this for product questions. Returns real products with live sale prices.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Search keywords e.g. 'programming laptop', 'cotton shirt'"},
                    "category": {"type": "string", "description": "Category name or slug if known"},
                    "max_price": {"type": "number", "description": "Maximum effective price in INR"},
                    "min_price": {"type": "number", "description": "Minimum effective price in INR"},
                    "in_stock_only": {"type": "boolean", "description": "Only in-stock products (default true)"},
                    "limit": {"type": "integer", "description": "Max products to return (1-12)"},
                    "exclude_ids": {
                        "type": "array",
                        "items": {"type": "integer"},
                        "description": "Product ids to exclude (already shown)",
                    },
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_product_details",
            "description": "Get full details for one product by its numeric id.",
            "parameters": {
                "type": "object",
                "properties": {"product_id": {"type": "integer"}},
                "required": ["product_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_cart",
            "description": "Get the current customer's shopping cart items and total. Only works when the user is authenticated.",
            "parameters": {"type": "object", "properties": {}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_wishlist",
            "description": "Get the current customer's wishlist. Only works when the user is authenticated.",
            "parameters": {"type": "object", "properties": {}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_orders",
            "description": "Get recent orders for the logged-in customer.",
            "parameters": {
                "type": "object",
                "properties": {"limit": {"type": "integer"}},
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "list_categories",
            "description": "List all product categories on SmartCart.",
            "parameters": {"type": "object", "properties": {}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_active_offers",
            "description": "List currently live festival / sale offers.",
            "parameters": {"type": "object", "properties": {}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "recommend_related",
            "description": (
                "Recommend products based on previously shown product ids. "
                "mode='similar' for same-category alternatives, "
                "mode='cheaper' for lower-priced alternatives, "
                "mode='accessories' for complementary items (e.g. shirt→trousers/shoes). "
                "ALWAYS pass the product_ids from the conversation context."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "product_ids": {"type": "array", "items": {"type": "integer"}},
                    "limit": {"type": "integer"},
                    "mode": {
                        "type": "string",
                        "enum": ["similar", "cheaper", "accessories"],
                        "description": "Recommendation mode",
                    },
                },
                "required": ["product_ids"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "compare_products",
            "description": "Compare 2–6 products side by side using their numeric ids from earlier results in this chat.",
            "parameters": {
                "type": "object",
                "properties": {
                    "product_ids": {"type": "array", "items": {"type": "integer"}},
                },
                "required": ["product_ids"],
            },
        },
    },
]


def run_tool(name: str, arguments: dict, user=None) -> dict[str, Any]:
    args = arguments or {}
    try:
        if name == "search_products":
            return search_products(
                query=args.get("query", ""),
                category=args.get("category", ""),
                max_price=args.get("max_price"),
                min_price=args.get("min_price"),
                in_stock_only=args.get("in_stock_only", True),
                limit=int(args.get("limit") or 6),
                exclude_ids=args.get("exclude_ids"),
            )
        if name == "get_product_details":
            return get_product_details(int(args["product_id"]))
        if name == "get_cart":
            return get_cart(user)
        if name == "get_wishlist":
            return get_wishlist(user)
        if name == "get_orders":
            return get_orders(user, limit=int(args.get("limit") or 5))
        if name == "list_categories":
            return list_categories()
        if name == "get_active_offers":
            return get_active_offers()
        if name == "recommend_related":
            return recommend_related(
                args.get("product_ids"),
                limit=int(args.get("limit") or 6),
                mode=args.get("mode") or "similar",
            )
        if name == "compare_products":
            return compare_products(args.get("product_ids") or [])
        return {"error": f"Unknown tool: {name}"}
    except Exception as exc:  # noqa: BLE001
        return {"error": str(exc)}
