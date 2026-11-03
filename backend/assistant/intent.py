"""
Deterministic intent parsing for SmartCart AI.
Extracts budget, offer/campaign, category theme, and follow-up actions
before the LLM runs — so product retrieval is grounded in real filters.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any


# Theme → search keywords (name / description / category)
CATEGORY_THEMES: dict[str, list[str]] = {
    "fitness": [
        "fitness", "gym", "workout", "exercise", "yoga", "sport", "sports",
        "skipping", "jump rope", "dumbbell", "protein", "training", "athletic",
        "treadmill", "resistance band", "yoga mat", "gym bag",
    ],
    "beauty": [
        "beauty", "skincare", "makeup", "cosmetic", "lipstick", "serum",
        "face cream", "moisturizer", "shampoo", "hair", "nail", "perfume",
    ],
    "electronics": [
        "laptop", "phone", "mobile", "earphone", "headphone", "charger",
        "tablet", "camera", "speaker", "smartwatch", "watch", "electronics",
        "computer", "mouse", "keyboard", "monitor",
    ],
    "fashion": [
        "shirt", "t-shirt", "tshirt", "kurta", "jeans", "trouser", "pant",
        "dress", "saree", "top", "hoodie", "jacket", "fashion", "apparel",
        "clothing", "wear",
    ],
    "footwear": [
        "shoe", "shoes", "sneaker", "sandal", "slipper", "boot", "footwear",
    ],
    "home": [
        "home", "kitchen", "mug", "bottle", "flask", "decor", "furniture",
        "lamp", "cushion", "bedsheet",
    ],
    "accessories": [
        "bag", "belt", "wallet", "watch", "jewellery", "jewelry", "cap",
        "hat", "sunglass", "accessory", "accessories",
    ],
}

# Domains that must not cross-recommend into each other
DOMAIN_OF_THEME = {
    "fitness": "fitness",
    "beauty": "beauty",
    "electronics": "electronics",
    "fashion": "fashion",
    "footwear": "fashion",
    "home": "home",
    "accessories": "fashion",
}

# Complementary keywords within the same domain only
DOMAIN_COMPLEMENTS: dict[str, list[str]] = {
    "fitness": ["fitness", "gym", "yoga", "sport", "workout", "exercise", "band", "mat", "skipping"],
    "beauty": ["beauty", "skincare", "makeup", "cosmetic", "serum", "cream", "shampoo"],
    "electronics": ["charger", "case", "cover", "earphone", "headphone", "mouse", "bag", "stand", "cable"],
    "fashion": ["shirt", "trouser", "jeans", "pant", "shoe", "belt", "watch", "bag", "scarf"],
    "home": ["kitchen", "mug", "bottle", "flask", "home", "decor"],
}


@dataclass
class ParsedIntent:
    kind: str = "general"  # search | offer | cart | wishlist | orders | compare | similar | cheaper | accessories | faq | general
    query: str = ""
    max_price: float | None = None
    min_price: float | None = None
    theme: str | None = None
    offer_query: str | None = None
    product_index: int | None = None  # 1-based for "add the second one"
    action: str | None = None  # add_to_cart | compare | similar | cheaper | accessories
    domain: str | None = None
    raw: str = ""
    chips_hint: list[str] = field(default_factory=list)


def _parse_price(text: str) -> tuple[float | None, float | None]:
    lower = text.lower().replace(",", "")
    max_price = min_price = None

    m = re.search(r"(?:under|below|less than|upto|up to|within|<)\s*₹?\s*(\d+(?:\.\d+)?)", lower)
    if m:
        max_price = float(m.group(1))

    m = re.search(r"(?:above|over|more than|at least|>)\s*₹?\s*(\d+(?:\.\d+)?)", lower)
    if m:
        min_price = float(m.group(1))

    m = re.search(r"₹\s*(\d+(?:\.\d+)?)\s*[-–to]+\s*₹?\s*(\d+(?:\.\d+)?)", lower)
    if m:
        min_price = float(m.group(1))
        max_price = float(m.group(2))

    return min_price, max_price


def _detect_theme(text: str) -> str | None:
    lower = text.lower()
    # Prefer longer / more specific matches
    scores: dict[str, int] = {}
    for theme, kws in CATEGORY_THEMES.items():
        score = sum(1 for kw in kws if kw in lower)
        if score:
            scores[theme] = score
    if not scores:
        return None
    return max(scores, key=scores.get)


def _detect_offer(text: str) -> str | None:
    lower = text.lower()
    # Explicit sale / offer / campaign phrases
    patterns = [
        r"(?:under|in|from|of)\s+(?:the\s+)?([a-z0-9][a-z0-9\s]{1,40}?)\s+(?:sale|offer|campaign|dhamaka|deal)",
        r"([a-z0-9][a-z0-9\s]{1,40}?)\s+(?:sale|offer|dhamaka|campaign)",
        r"(diwali|dussehra|navratri|holi|eid|christmas|new year|republic day|independence)[a-z\s]*",
    ]
    for pat in patterns:
        m = re.search(pat, lower)
        if m:
            return m.group(1).strip() if m.lastindex else m.group(0).strip()
    if "festival offer" in lower or "festival sale" in lower or "active offer" in lower:
        return "__all_active__"
    return None


def _ordinal_index(text: str) -> int | None:
    lower = text.lower()
    mapping = {
        "first": 1, "1st": 1, "one": 1,
        "second": 2, "2nd": 2, "two": 2,
        "third": 3, "3rd": 3, "three": 3,
        "fourth": 4, "4th": 4,
        "fifth": 5, "5th": 5,
        "last": -1,
    }
    for word, idx in mapping.items():
        if re.search(rf"\b{word}\b", lower):
            return idx
    m = re.search(r"\b(?:number|#)?\s*(\d+)\b", lower)
    if m and any(w in lower for w in ("add", "cart", "this", "that", "product")):
        return int(m.group(1))
    return None


def parse_intent(message: str, context: dict[str, Any] | None = None) -> ParsedIntent:
    """
    Parse user message into structured intent.
    `context` may include: theme, domain, max_price, offer_query, product_ids
    """
    ctx = context or {}
    raw = (message or "").strip()
    lower = raw.lower()
    intent = ParsedIntent(raw=raw)

    # --- Cart / account ---
    if any(w in lower for w in ("my cart", "what's in my cart", "whats in my cart", "show cart", "view cart")):
        intent.kind = "cart"
        return intent
    if "wishlist" in lower:
        intent.kind = "wishlist"
        return intent
    if any(w in lower for w in ("my order", "my orders", "track order", "order status")):
        intent.kind = "orders"
        return intent

    # --- Add to cart by position ---
    if any(w in lower for w in ("add to cart", "add it", "add this", "add that", "add the")):
        intent.kind = "add_to_cart"
        intent.action = "add_to_cart"
        intent.product_index = _ordinal_index(lower)
        return intent

    # --- Follow-up recommendation actions ---
    if any(p in lower for p in ("compare these", "compare products", "compare them", "compare the")):
        intent.kind = "compare"
        intent.action = "compare"
        intent.theme = ctx.get("theme")
        intent.domain = ctx.get("domain")
        return intent
    if any(p in lower for p in ("cheaper", "lower price", "less expensive", "budget option")):
        intent.kind = "cheaper"
        intent.action = "cheaper"
        intent.theme = ctx.get("theme")
        intent.domain = ctx.get("domain")
        intent.max_price = ctx.get("max_price")
        return intent
    if any(p in lower for p in ("matching accessor", "accessories", "complement", "you may also", "what about accessor")):
        intent.kind = "accessories"
        intent.action = "accessories"
        intent.theme = ctx.get("theme")
        intent.domain = ctx.get("domain")
        return intent
    if any(p in lower for p in ("similar product", "show similar", "more like these", "more like this")):
        intent.kind = "similar"
        intent.action = "similar"
        intent.theme = ctx.get("theme")
        intent.domain = ctx.get("domain")
        return intent
    if any(p in lower for p in ("show more", "more products", "see more")):
        intent.kind = "search"
        intent.action = "show_more"
        intent.theme = ctx.get("theme")
        intent.domain = ctx.get("domain")
        intent.max_price = ctx.get("max_price")
        intent.min_price = ctx.get("min_price")
        intent.offer_query = ctx.get("offer_query")
        intent.query = ctx.get("query") or ""
        return intent

    # --- Offer / campaign ---
    offer_q = _detect_offer(lower)
    if offer_q:
        intent.kind = "offer"
        intent.offer_query = offer_q
        intent.min_price, intent.max_price = _parse_price(lower)
        return intent

    # --- Price + theme search ---
    min_p, max_p = _parse_price(lower)
    theme = _detect_theme(lower)

    # Inherit context for relative queries like "under 1000" after fitness
    if (min_p is not None or max_p is not None) and not theme and ctx.get("theme"):
        theme = ctx.get("theme")

    if theme or min_p is not None or max_p is not None or any(
        w in lower for w in ("find", "show", "search", "looking for", "need", "want", "product", "buy")
    ):
        intent.kind = "search"
        intent.theme = theme
        intent.domain = DOMAIN_OF_THEME.get(theme) if theme else ctx.get("domain")
        intent.min_price = min_p
        intent.max_price = max_p
        # Clean query terms
        q = lower
        for noise in (
            "show me", "find me", "find", "show", "some", "products", "product",
            "please", "under", "below", "less than", "rupees", "rs", "inr", "₹",
        ):
            q = q.replace(noise, " ")
        q = re.sub(r"\d[\d,]*", " ", q)
        q = re.sub(r"\s+", " ", q).strip()
        intent.query = q or (theme or "")
        return intent

    intent.kind = "general"
    intent.theme = ctx.get("theme")
    intent.domain = ctx.get("domain")
    return intent


def build_context_update(intent: ParsedIntent, products: list[dict]) -> dict[str, Any]:
    """Merge intent + results into conversation context for the next turn."""
    ids = [p["id"] for p in products if p.get("id") is not None]
    return {
        "theme": intent.theme,
        "domain": intent.domain or (DOMAIN_OF_THEME.get(intent.theme) if intent.theme else None),
        "max_price": intent.max_price,
        "min_price": intent.min_price,
        "offer_query": intent.offer_query,
        "query": intent.query,
        "product_ids": ids,
        "kind": intent.kind,
    }


def contextual_suggestions(intent: ParsedIntent, products: list[dict]) -> list[str]:
    if not products:
        return [
            "Show festival offers",
            "Find products under ₹5,000",
            "Show fitness products",
            "What's in my cart?",
        ]
    chips = []
    if len(products) >= 2:
        chips.append("Compare these products")
    chips.append("Show similar products")
    chips.append("Cheaper alternatives")
    if intent.theme or intent.domain:
        chips.append("Matching accessories")
    if intent.kind == "search" and intent.max_price:
        chips.append("Show more products")
    if intent.theme == "fitness":
        chips = ["Show more fitness accessories", "Workout gear under ₹1,000", "Compare these products", "Cheaper alternatives"]
    elif intent.theme == "beauty":
        chips = ["Show similar beauty products", "Cheaper alternatives", "Highest discounts", "Compare these products"]
    # unique, max 4
    out, seen = [], set()
    for c in chips:
        if c not in seen:
            seen.add(c)
            out.append(c)
        if len(out) >= 4:
            break
    return out
