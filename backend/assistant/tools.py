"""
Tool implementations that query the live SmartCart database.
Never return fabricated products or prices — everything comes from models + pricing.
"""
from __future__ import annotations

from decimal import Decimal
from typing import Any

from django.db.models import Q
from django.utils import timezone

from catalog.models import Category, FestivalOffer, Product
from catalog.pricing import load_active_offers, price_info
from shop.models import CartItem, Order, WishlistItem

# Prefer longer, specific phrases. Avoid short stems like "mat"/"band"/"top" that false-match.
_DOMAIN_KEYWORDS = {
    "fitness": [
        "fitness", "gym", "workout", "exercise", "yoga", "sports", "sport",
        "skipping", "jump rope", "dumbbell", "dumbell", "treadmill", "protein",
        "athletic", "training", "resistance band", "yoga mat", "gym bag",
        "fitness watch", "smart fitness",
    ],
    "beauty": [
        "beauty", "skincare", "skin care", "makeup", "make-up", "cosmetic",
        "lipstick", "serum", "moisturizer", "shampoo", "perfume", "fragrance",
        "face cream", "nail polish",
    ],
    "electronics": [
        "laptop", "smartphone", "mobile phone", "earphone", "headphone", "earbuds",
        "charger", "tablet", "camera", "speaker", "smartwatch", "smart watch",
        "computer", "keyboard", "monitor", "electronics",
    ],
    "fashion": [
        "shirt", "t-shirt", "tshirt", "kurta", "jeans", "trouser", "trousers",
        "pants", "dress", "hoodie", "jacket", "apparel", "clothing", "fashion",
        "sneakers", "sneaker",
    ],
    "home": [
        "kitchen", "home decor", "bedsheet", "cushion", "lamp", "flask",
        "water bottle", "coffee mug",
    ],
}

_THEME_KEYWORDS = {
    "fitness": _DOMAIN_KEYWORDS["fitness"] + ["gym bag", "jump rope", "yoga mat", "dumbbell", "fitness watch"],
    "beauty": _DOMAIN_KEYWORDS["beauty"],
    "electronics": _DOMAIN_KEYWORDS["electronics"] + ["phone", "mobile", "mouse"],
    "fashion": _DOMAIN_KEYWORDS["fashion"] + ["shoe", "shoes", "belt", "handbag"],
    "footwear": ["shoe", "shoes", "sneaker", "sneakers", "sandal", "sandals", "slipper", "boot", "footwear"],
    "home": _DOMAIN_KEYWORDS["home"] + ["mug", "bottle", "decor"],
    "accessories": ["handbag", "belt", "wallet", "cap", "hat", "sunglasses", "accessory", "accessories"],
    "grocery": ["rice", "grocery", "food", "snack", "spice", "atta", "dal", "oil", "flour"],
    "books": ["book", "novel", "textbook", "magazine"],
}

# Category name hints (slug/name contains) — strongest signal
_THEME_CATEGORIES = {
    "fitness": ["fitness", "sport", "sports", "gym", "outdoor"],
    "beauty": ["beauty", "cosmetic", "personal care", "skincare"],
    "electronics": ["electronic", "gadget", "computer", "mobile"],
    "fashion": ["fashion", "apparel", "clothing", "wear"],
    "footwear": ["footwear", "shoe"],
    "home": ["home", "living", "kitchen", "decor"],
    "grocery": ["grocery", "food", "staples"],
    "books": ["book"],
    "accessories": ["accessor"],
}


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
            {"name": info["rule"].name, "festival": info["rule"].festival, "discount_percent": float(info["rule"].percent)}
            if info["rule"] else None
        ),
    }


def _price_filter(items, min_price, max_price):
    out = []
    for d in items:
        sp = d["sale_price"]
        if min_price is not None and sp < float(min_price):
            continue
        if max_price is not None and sp > float(max_price):
            continue
        out.append(d)
    return out


def _word_match(text: str, keyword: str) -> bool:
    """Case-insensitive match that avoids 'mat' hitting 'Matte'."""
    if not text or not keyword:
        return False
    import re
    pattern = r"(?<![a-z0-9])" + re.escape(keyword.lower()) + r"(?![a-z0-9])"
    return re.search(pattern, text.lower()) is not None


def _theme_score(product, theme: str) -> int:
    """Higher score = stronger match. 0 = not in theme."""
    theme = (theme or "").lower()
    kws = _THEME_KEYWORDS.get(theme, [])
    cat_hints = _THEME_CATEGORIES.get(theme, [])
    name = (product.name or "")
    desc = (product.description or "")
    cat = (product.category.name if product.category else "") or ""
    score = 0
    for hint in cat_hints:
        if hint in cat.lower() or hint in (product.category.slug if product.category else "").lower():
            score += 5
    for kw in kws:
        if _word_match(name, kw):
            score += 3
        elif _word_match(cat, kw):
            score += 2
        elif _word_match(desc, kw):
            score += 1
    return score


def _theme_q(theme: str) -> Q:
    """Broad DB pre-filter (may over-fetch); _theme_score does precise filtering."""
    kws = _THEME_KEYWORDS.get((theme or "").lower(), [])
    cat_hints = _THEME_CATEGORIES.get((theme or "").lower(), [])
    q = Q()
    for kw in kws:
        q |= Q(name__icontains=kw) | Q(category__name__icontains=kw)
    for hint in cat_hints:
        q |= Q(category__name__icontains=hint) | Q(category__slug__icontains=hint)
    return q


def search_products(query="", category="", max_price=None, min_price=None, in_stock_only=True, limit=8, exclude_ids=None, theme=None):
    rules = load_active_offers()
    qs = Product.objects.filter(is_active=True).select_related("seller", "category")
    theme = (theme or "").lower().strip() or None

    if theme and theme in _THEME_KEYWORDS:
        tq = _theme_q(theme)
        # If Q is empty (no keywords), do not return the whole catalog
        if tq:
            qs = qs.filter(tq)
        else:
            qs = qs.none()
    elif (query or "").strip():
        q = query.strip()
        # Multi-token: match any significant token (healthy food → healthy OR food)
        tokens = [t for t in q.replace(",", " ").split() if len(t) > 2]
        if len(tokens) >= 2:
            tq = Q()
            for t in tokens:
                tq |= Q(name__icontains=t) | Q(description__icontains=t) | Q(category__name__icontains=t)
            qs = qs.filter(tq)
        else:
            qs = qs.filter(Q(name__icontains=q) | Q(description__icontains=q) | Q(category__name__icontains=q))
    if category and not theme:
        slug = category.strip().lower().replace(" ", "-")
        qs = qs.filter(Q(category__slug=slug) | Q(category__name__icontains=category.strip()))
    if in_stock_only:
        qs = qs.filter(stock__gt=0)
    exclude = {int(x) for x in (exclude_ids or []) if x}
    if exclude:
        qs = qs.exclude(id__in=exclude)

    candidates = list(qs.order_by("-created_at")[:120])

    # Precise theme scoring — drop false positives (e.g. "mat" in "Matte")
    if theme and theme in _THEME_KEYWORDS:
        scored = [(p, _theme_score(p, theme)) for p in candidates]
        scored = [(p, s) for p, s in scored if s > 0]
        scored.sort(key=lambda x: (-x[1], -x[0].id))
        candidates = [p for p, s in scored]

    pool = [_product_dict(p, rules) for p in candidates]
    results = _price_filter(pool, min_price, max_price)[: max(1, min(int(limit or 8), 12))]
    return {
        "count": len(results),
        "products": results,
        "filters": {"query": query, "theme": theme, "min_price": min_price, "max_price": max_price},
        "note": "Live catalog products with effective selling prices.",
    }


def search_by_offer(offer_query="", max_price=None, min_price=None, limit=12):
    rules = load_active_offers()
    now = timezone.now()
    q = (offer_query or "").strip()
    offers_qs = FestivalOffer.objects.filter(is_active=True, starts_at__lte=now, ends_at__gt=now).select_related("seller").prefetch_related("products")
    if q and q != "__all_active__":
        offers_qs = offers_qs.filter(Q(name__icontains=q) | Q(festival__icontains=q.replace(" ", "_")))
    offers = list(offers_qs)
    if not offers:
        return {"count": 0, "products": [], "offers_matched": [], "note": f'No active offer matched "{offer_query}".'}
    pids = set()
    matched = []
    for o in offers:
        matched.append({"id": o.id, "name": o.name, "festival": o.festival, "discount_percent": float(o.discount_percent)})
        if o.apply_to_all:
            pids.update(Product.objects.filter(seller_id=o.seller_id, is_active=True, stock__gt=0).values_list("id", flat=True))
        else:
            pids.update(o.products.filter(is_active=True, stock__gt=0).values_list("id", flat=True))
    products = Product.objects.filter(id__in=pids, is_active=True).select_related("seller", "category").order_by("-created_at")[:60]
    results = _price_filter([_product_dict(p, rules) for p in products], min_price, max_price)[: max(1, min(int(limit or 12), 16))]
    return {"count": len(results), "products": results, "offers_matched": matched, "note": "Products covered by the matched campaign(s)."}


def get_product_details(product_id: int):
    rules = load_active_offers()
    try:
        p = Product.objects.select_related("seller", "category").get(pk=product_id, is_active=True)
    except Product.DoesNotExist:
        return {"error": f"Product {product_id} not found or inactive."}
    return {"product": _product_dict(p, rules)}


def get_cart(user):
    if not user or not getattr(user, "is_authenticated", False):
        return {"error": "User is not logged in.", "items": [], "authenticated": False}
    rules = load_active_offers()
    items = CartItem.objects.filter(user=user).select_related("product", "product__seller", "product__category").order_by("-updated_at")
    out, total = [], Decimal("0")
    for item in items:
        if not item.product or not item.product.is_active:
            continue
        d = _product_dict(item.product, rules)
        line = float(d["sale_price"]) * item.quantity
        total += Decimal(str(line))
        out.append({**d, "quantity": item.quantity, "line_total": round(line, 2)})
    return {"items": out, "item_count": len(out), "cart_total": float(total), "authenticated": True}


def get_wishlist(user):
    if not user or not getattr(user, "is_authenticated", False):
        return {"error": "User is not logged in.", "items": [], "authenticated": False}
    rules = load_active_offers()
    items = WishlistItem.objects.filter(user=user).select_related("product", "product__seller", "product__category").order_by("-created_at")[:20]
    out = [_product_dict(i.product, rules) for i in items if i.product and i.product.is_active]
    return {"items": out, "count": len(out), "authenticated": True}


def get_orders(user, limit=5):
    if not user or not getattr(user, "is_authenticated", False):
        return {"error": "User is not logged in.", "orders": [], "authenticated": False}
    orders = Order.objects.filter(user=user).prefetch_related("items").order_by("-created_at")[: max(1, min(limit, 10))]
    out = []
    for o in orders:
        out.append({
            "code": o.code, "total": float(o.total), "payment_status": o.payment_status,
            "payment_method": o.payment_method, "created_at": o.created_at.isoformat(),
            "items": [{"name": it.name, "quantity": it.quantity, "price": float(it.price), "status": it.status, "image_url": it.image_url or ""} for it in o.items.all()],
        })
    return {"orders": out, "count": len(out), "authenticated": True}


def list_categories():
    return {"categories": list(Category.objects.all().values("id", "name", "slug", "icon"))}


def get_active_offers():
    rules = load_active_offers()
    return {"offers": [{"name": r.name, "festival": r.festival, "discount_percent": float(r.percent), "seller": r.seller_name, "ends_at": r.ends_at.isoformat() if r.ends_at else None} for r in rules]}


def _seed_products(product_ids):
    return list(Product.objects.filter(id__in=product_ids, is_active=True).select_related("category", "seller"))


def _infer_domain(seeds):
    best, best_score = None, 0
    for d in _DOMAIN_KEYWORDS:
        score = sum(_theme_score(p, d) for p in seeds)
        if score > best_score:
            best, best_score = d, score
    return best if best_score > 0 else None



def _filter_by_domain(products_dicts, domain, rules, limit):
    """Keep only products that truly belong to domain (word-boundary score > 0)."""
    if not domain:
        return products_dicts[:limit]
    # Re-fetch model instances is heavy; score using dict fields
    import re
    kws = _THEME_KEYWORDS.get(domain, [])
    cat_hints = _THEME_CATEGORIES.get(domain, [])
    scored = []
    for d in products_dicts:
        name = (d.get("name") or "").lower()
        cat = (d.get("category") or "").lower()
        desc = (d.get("description") or "").lower()
        score = 0
        for hint in cat_hints:
            if hint in cat:
                score += 5
        for kw in kws:
            pat = r"(?<![a-z0-9])" + re.escape(kw.lower()) + r"(?![a-z0-9])"
            if re.search(pat, name):
                score += 3
            elif re.search(pat, cat):
                score += 2
            elif re.search(pat, desc):
                score += 1
        if score > 0:
            scored.append((score, d))
    scored.sort(key=lambda x: -x[0])
    return [d for s, d in scored[:limit]]

def recommend_related(product_ids=None, limit=6, mode="similar", domain=None, theme=None):
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
    seed_prices = [float(price_info(p, rules)["sale_price"]) for p in seeds]
    max_seed_price = min(seed_prices) if seed_prices else None
    inferred = domain or (theme if theme in _DOMAIN_KEYWORDS else None) or _infer_domain(seeds)

    qs = Product.objects.filter(is_active=True, stock__gt=0).select_related("seller", "category")
    if exclude:
        qs = qs.exclude(id__in=exclude)

    # HARD domain lock — never leak beauty into fitness etc.
    if inferred and inferred in _THEME_KEYWORDS:
        dq = _theme_q(inferred)
        if dq:
            qs = qs.filter(dq)
        # Post-filter with word-boundary scoring after fetch

    lim = max(1, min(int(limit or 6), 12))

    if mode == "cheaper" and max_seed_price is not None:
        products = []
        for p in qs.order_by("price")[:50]:
            d = _product_dict(p, rules)
            if d["sale_price"] < max_seed_price:
                products.append(d)
            if len(products) >= lim:
                break
        products = _filter_by_domain(products, inferred, rules, lim)
        return {"products": products, "count": len(products), "mode": "cheaper", "domain": inferred, "based_on_product_ids": product_ids, "note": "Cheaper alternatives in the same domain."}

    if mode == "accessories":
        products = [_product_dict(p, rules) for p in qs.order_by("-created_at")[:lim]]
        if not products and seed_cats:
            qs2 = Product.objects.filter(is_active=True, stock__gt=0, category_id__in=seed_cats).exclude(id__in=exclude).select_related("seller", "category")
            products = [_product_dict(p, rules) for p in qs2.order_by("-created_at")[:lim]]
        products = _filter_by_domain(products, inferred, rules, lim)
        return {"products": products, "count": len(products), "mode": "accessories", "domain": inferred, "based_on_product_ids": product_ids, "note": "Related items in the same shopping domain only."}

    # similar
    if seed_cats:
        qs_sim = Product.objects.filter(is_active=True, stock__gt=0, category_id__in=seed_cats).exclude(id__in=exclude).select_related("seller", "category")
        products = [_product_dict(p, rules) for p in qs_sim.order_by("-created_at")[:lim]]
        if products:
            products = _filter_by_domain(products, inferred, rules, lim)
            return {"products": products, "count": len(products), "mode": "similar", "domain": inferred, "based_on_product_ids": product_ids, "note": "Similar products in the same category."}
    products = [_product_dict(p, rules) for p in qs.order_by("-created_at")[:lim]]
    products = _filter_by_domain(products, inferred, rules, lim)
    return {"products": products, "count": len(products), "mode": "similar", "domain": inferred, "based_on_product_ids": product_ids, "note": "Similar products from the catalog."}


def compare_products(product_ids):
    rules = load_active_offers()
    ids = [int(x) for x in product_ids[:6]]
    products = Product.objects.filter(id__in=ids, is_active=True).select_related("seller", "category")
    by_id = {p.id: _product_dict(p, rules) for p in products}
    ordered = [by_id[i] for i in ids if i in by_id]
    return {"products": ordered, "count": len(ordered)}


TOOL_SCHEMAS = [
    {"type": "function", "function": {"name": "search_products", "description": "Search products by keywords, theme (fitness/beauty/electronics/fashion), category, price. Live sale prices.", "parameters": {"type": "object", "properties": {"query": {"type": "string"}, "category": {"type": "string"}, "theme": {"type": "string", "enum": ["fitness", "beauty", "electronics", "fashion", "footwear", "home", "accessories"]}, "max_price": {"type": "number"}, "min_price": {"type": "number"}, "in_stock_only": {"type": "boolean"}, "limit": {"type": "integer"}, "exclude_ids": {"type": "array", "items": {"type": "integer"}}}}}},
    {"type": "function", "function": {"name": "search_by_offer", "description": "Products in a named sale/campaign e.g. Diwali Dhamaka.", "parameters": {"type": "object", "properties": {"offer_query": {"type": "string"}, "max_price": {"type": "number"}, "min_price": {"type": "number"}, "limit": {"type": "integer"}}, "required": ["offer_query"]}}},
    {"type": "function", "function": {"name": "get_product_details", "description": "Details for one product id.", "parameters": {"type": "object", "properties": {"product_id": {"type": "integer"}}, "required": ["product_id"]}}},
    {"type": "function", "function": {"name": "get_cart", "description": "Logged-in customer cart.", "parameters": {"type": "object", "properties": {}}}},
    {"type": "function", "function": {"name": "get_wishlist", "description": "Logged-in customer wishlist.", "parameters": {"type": "object", "properties": {}}}},
    {"type": "function", "function": {"name": "get_orders", "description": "Recent orders for logged-in customer.", "parameters": {"type": "object", "properties": {"limit": {"type": "integer"}}}}},
    {"type": "function", "function": {"name": "list_categories", "description": "List categories.", "parameters": {"type": "object", "properties": {}}}},
    {"type": "function", "function": {"name": "get_active_offers", "description": "Live festival offers.", "parameters": {"type": "object", "properties": {}}}},
    {"type": "function", "function": {"name": "recommend_related", "description": "Recommend similar/cheaper/accessories. Pass domain to avoid cross-category leaks.", "parameters": {"type": "object", "properties": {"product_ids": {"type": "array", "items": {"type": "integer"}}, "limit": {"type": "integer"}, "mode": {"type": "string", "enum": ["similar", "cheaper", "accessories"]}, "domain": {"type": "string"}, "theme": {"type": "string"}}, "required": ["product_ids"]}}},
    {"type": "function", "function": {"name": "compare_products", "description": "Compare products by ids.", "parameters": {"type": "object", "properties": {"product_ids": {"type": "array", "items": {"type": "integer"}}}, "required": ["product_ids"]}}},
]


def run_tool(name: str, arguments: dict, user=None) -> dict[str, Any]:
    args = arguments or {}
    try:
        if name == "search_products":
            return search_products(query=args.get("query", ""), category=args.get("category", ""), max_price=args.get("max_price"), min_price=args.get("min_price"), in_stock_only=args.get("in_stock_only", True), limit=int(args.get("limit") or 8), exclude_ids=args.get("exclude_ids"), theme=args.get("theme"))
        if name == "search_by_offer":
            return search_by_offer(offer_query=args.get("offer_query", ""), max_price=args.get("max_price"), min_price=args.get("min_price"), limit=int(args.get("limit") or 12))
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
            return recommend_related(args.get("product_ids"), limit=int(args.get("limit") or 6), mode=args.get("mode") or "similar", domain=args.get("domain"), theme=args.get("theme"))
        if name == "compare_products":
            return compare_products(args.get("product_ids") or [])
        return {"error": f"Unknown tool: {name}"}
    except Exception as exc:
        return {"error": str(exc)}
