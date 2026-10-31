"""
LLM orchestration with tool-calling against live SmartCart data.
Uses the OpenAI-compatible API so you can point at OpenAI, Groq, OpenRouter, etc.
"""
from __future__ import annotations

import json
import logging
import re
from typing import Any

from django.conf import settings

from .tools import TOOL_SCHEMAS, run_tool

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are SmartCart AI, the intelligent shopping assistant for the SmartCart e-commerce platform (India, prices in ₹ INR).

Your capabilities:
- Search and recommend real products from the live catalog (never invent products, prices, or stock).
- Help with cart, wishlist, and order status for logged-in customers.
- Suggest complementary items, cheaper alternatives, and similar products using recommend_related.
- Compare products the customer has already seen in this chat using compare_products with their numeric ids.
- Explain offers, shipping, payments, refunds, and cancellation policies.

Hard rules:
1. ALWAYS call tools for any product, cart, wishlist, order, offer, or category data. Never fabricate.
2. When tools return products, write a short friendly summary only. Do NOT repeat full product lists, tables, markdown tables, raw image URLs, or markdown product links — the UI already shows product cards with images and prices.
3. Never use markdown tables. Prefer short paragraphs or simple bullet lines starting with "• ".
4. Currency is Indian Rupees (₹). Format prices like ₹59,999.
5. Read the AUTH STATUS line carefully. If the user IS authenticated, call get_cart / get_wishlist / get_orders immediately when asked — do NOT ask them to sign in. If they are a guest, then ask them to sign in for cart/orders/wishlist.
6. For follow-ups like "Compare these options", "Cheaper alternatives", "Matching accessories", "Show similar products", you MUST call recommend_related or compare_products with the product ids listed in RECENT PRODUCT IDS (or from earlier tool results). Never ignore these intents.
7. After showing products, suggest 2–4 short follow-up chips.
8. You may answer general FAQ topics (tracking, refunds, COD, coupons) without tools.
9. Do not greet the user again mid-conversation. Do not repeat the welcome message.
"""

FAQ_FALLBACK = (
    "I can help you find products, compare options, check your cart, or answer questions about "
    "orders, payments, and offers. Try asking something like “Find a programming laptop under ₹60,000”."
)

# Map chip labels → explicit tool intents (expanded before the LLM runs)
_CHIP_INTENTS = {
    "compare these options": "compare",
    "compare products": "compare",
    "cheaper alternatives": "cheaper",
    "show cheaper options": "cheaper",
    "matching accessories": "accessories",
    "recommend matching items": "accessories",
    "show similar products": "similar",
    "similar products": "similar",
}


def expand_suggestion_intent(message: str, product_ids: list[int] | None) -> str | None:
    """
    If the user clicked a suggestion chip, rewrite it into an explicit instruction
    that forces the correct tool call with product ids.
    """
    lower = (message or "").strip().lower()
    intent = _CHIP_INTENTS.get(lower)
    if not intent:
        # partial match
        for key, val in _CHIP_INTENTS.items():
            if key in lower:
                intent = val
                break
    if not intent:
        return None

    ids = [int(x) for x in (product_ids or []) if x]
    id_str = ", ".join(str(i) for i in ids) if ids else "the product ids from the previous assistant message"

    if intent == "compare":
        return (
            f"Compare these products side by side using the compare_products tool with product_ids=[{id_str}]. "
            "Summarize differences briefly; do not invent products."
        )
    if intent == "cheaper":
        return (
            f"Find cheaper alternatives using recommend_related with mode='cheaper' and product_ids=[{id_str}]. "
            "Exclude the original products. Use live catalog prices only."
        )
    if intent == "accessories":
        return (
            f"Find matching accessories / complementary products using recommend_related with mode='accessories' "
            f"and product_ids=[{id_str}]. Do not repeat the same products."
        )
    if intent == "similar":
        return (
            f"Show similar products using recommend_related with mode='similar' and product_ids=[{id_str}]. "
            "Exclude the original products."
        )
    return None


def _auth_status_line(user) -> str:
    if user is not None and getattr(user, "is_authenticated", False):
        name = getattr(user, "name", "") or ""
        email = getattr(user, "email", "") or ""
        return (
            f"AUTH STATUS: The customer is LOGGED IN as {name} ({email}). "
            "You MUST call get_cart / get_wishlist / get_orders when they ask — "
            "do NOT tell them to sign in."
        )
    return (
        "AUTH STATUS: Guest (not logged in). "
        "For cart, wishlist, or orders, politely ask them to sign in."
    )


def _product_ids_line(product_ids: list[int] | None) -> str:
    ids = [int(x) for x in (product_ids or []) if x]
    if not ids:
        return "RECENT PRODUCT IDS: (none yet in this turn)"
    return f"RECENT PRODUCT IDS: {ids} — use these ids for compare / similar / cheaper / accessories tools."


def _client():
    try:
        from openai import OpenAI
    except ImportError as exc:
        raise RuntimeError("Install the openai package: pip install openai") from exc

    api_key = getattr(settings, "LLM_API_KEY", "") or ""
    base_url = getattr(settings, "LLM_BASE_URL", "") or None
    if not api_key:
        raise RuntimeError(
            "LLM_API_KEY is not configured. Set it in backend/.env (e.g. a Groq or OpenAI key)."
        )
    kwargs = {"api_key": api_key}
    if base_url:
        kwargs["base_url"] = base_url
    return OpenAI(**kwargs)


def _model_name() -> str:
    return getattr(settings, "LLM_MODEL", "llama-3.3-70b-versatile") or "llama-3.3-70b-versatile"


def _extract_products_from_tool_results(tool_results: list[dict]) -> list[dict]:
    seen = set()
    products = []
    for tr in tool_results:
        payload = tr.get("result") or {}
        for key in ("products", "items"):
            for p in payload.get(key) or []:
                if not isinstance(p, dict) or "id" not in p:
                    continue
                pid = p["id"]
                if pid in seen:
                    continue
                seen.add(pid)
                products.append(p)
        if "product" in payload and isinstance(payload["product"], dict):
            p = payload["product"]
            if p.get("id") not in seen:
                seen.add(p["id"])
                products.append(p)
    return products[:12]


def _suggest_chips(user_text: str, products: list[dict]) -> list[str]:
    chips = []
    lower = (user_text or "").lower()
    if products:
        if len(products) >= 2:
            chips.append("Compare these options")
        chips.append("Show similar products")
        chips.append("Cheaper alternatives")
        chips.append("Matching accessories")
    else:
        chips.extend(
            [
                "Find laptops under ₹60,000",
                "Show festival offers",
                "What's in my cart?",
                "Recommend something for me",
            ]
        )
    if "cart" in lower:
        chips = ["Matching accessories", "Show festival offers"] + chips
    out, seen = [], set()
    for c in chips:
        if c not in seen:
            seen.add(c)
            out.append(c)
        if len(out) >= 4:
            break
    return out


def _strip_noisy_markdown(text: str) -> str:
    """Remove markdown tables and raw image/link dumps that break the chat UI."""
    if not text:
        return text
    # Drop markdown table lines
    lines = []
    for line in text.split("\n"):
        stripped = line.strip()
        if stripped.startswith("|") and stripped.endswith("|"):
            continue
        if re.match(r"^\|?[\s:-]+\|", stripped):
            continue
        lines.append(line)
    text = "\n".join(lines)
    # Soften raw markdown images/links into plain text
    text = re.sub(r"!\[([^\]]*)\]\([^)]+\)", r"\1", text)
    text = re.sub(r"\[([^\]]+)\]\((https?://[^)]+)\)", r"\1", text)
    # Collapse excessive blank lines
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def run_assistant(
    messages: list[dict[str, Any]],
    user=None,
    product_ids: list[int] | None = None,
    max_tool_rounds: int = 4,
) -> dict[str, Any]:
    """
    Run the chat with tool calling.

    messages: list of {role, content} including history.
    product_ids: recent product ids from the UI for suggestion context.
    """
    client = _client()
    model = _model_name()

    # Expand chip intents on the latest user message
    if messages and messages[-1].get("role") == "user":
        expanded = expand_suggestion_intent(messages[-1].get("content") or "", product_ids)
        if expanded:
            messages = list(messages)
            messages[-1] = {**messages[-1], "content": expanded}

    system = (
        SYSTEM_PROMPT
        + "\n\n"
        + _auth_status_line(user)
        + "\n"
        + _product_ids_line(product_ids)
    )

    api_messages: list[dict[str, Any]] = [{"role": "system", "content": system}]
    for m in messages:
        role = m.get("role")
        content = m.get("content") or ""
        if role in ("user", "assistant") and content:
            api_messages.append({"role": role, "content": content})

    tool_trace: list[dict] = []
    collected_products: list[dict] = []

    for _round in range(max_tool_rounds):
        try:
            response = client.chat.completions.create(
                model=model,
                messages=api_messages,
                tools=TOOL_SCHEMAS,
                tool_choice="auto",
                temperature=0.3,
                max_tokens=900,
            )
        except Exception as exc:  # noqa: BLE001
            logger.exception("LLM request failed")
            return {
                "reply": (
                    "I'm having trouble reaching the AI service right now. "
                    "Please try again in a moment, or browse the shop directly."
                ),
                "products": [],
                "suggestions": ["Browse shop", "Show festival offers"],
                "error": str(exc),
                "tool_trace": tool_trace,
            }

        choice = response.choices[0]
        msg = choice.message

        if msg.tool_calls:
            api_messages.append(
                {
                    "role": "assistant",
                    "content": msg.content or "",
                    "tool_calls": [
                        {
                            "id": tc.id,
                            "type": "function",
                            "function": {
                                "name": tc.function.name,
                                "arguments": tc.function.arguments or "{}",
                            },
                        }
                        for tc in msg.tool_calls
                    ],
                }
            )
            for tc in msg.tool_calls:
                name = tc.function.name
                try:
                    args = json.loads(tc.function.arguments or "{}")
                except json.JSONDecodeError:
                    args = {}
                # Inject product_ids for recommendation tools when the model forgets them
                if name in ("recommend_related", "compare_products"):
                    if not args.get("product_ids") and product_ids:
                        args["product_ids"] = list(product_ids)
                result = run_tool(name, args, user=user)
                tool_trace.append({"tool": name, "args": args, "result": result})
                collected_products.extend(
                    _extract_products_from_tool_results([{"result": result}])
                )
                api_messages.append(
                    {
                        "role": "tool",
                        "tool_call_id": tc.id,
                        "content": json.dumps(result, default=str)[:12000],
                    }
                )
            continue

        reply = _strip_noisy_markdown((msg.content or "").strip()) or FAQ_FALLBACK
        seen, products = set(), []
        for p in collected_products:
            pid = p.get("id")
            if pid is None or pid in seen:
                continue
            seen.add(pid)
            products.append(p)

        last_user = next(
            (m["content"] for m in reversed(messages) if m.get("role") == "user"), ""
        )
        return {
            "reply": reply,
            "products": products[:8],
            "suggestions": _suggest_chips(last_user, products),
            "tool_trace": tool_trace if settings.DEBUG else [],
        }

    return {
        "reply": FAQ_FALLBACK,
        "products": collected_products[:8],
        "suggestions": _suggest_chips("", collected_products),
        "tool_trace": tool_trace if settings.DEBUG else [],
    }


def simple_keyword_fallback(
    text: str,
    user=None,
    product_ids: list[int] | None = None,
) -> dict[str, Any]:
    """Keyword + live DB fallback when LLM is not configured."""
    text = (text or "").strip()
    lower = text.lower()

    # Chip intents without LLM
    expanded = expand_suggestion_intent(text, product_ids)
    if expanded:
        intent = None
        for key, val in _CHIP_INTENTS.items():
            if key in lower:
                intent = val
                break
        if intent == "compare" and product_ids:
            result = run_tool("compare_products", {"product_ids": product_ids}, user=user)
            products = result.get("products") or []
            return {
                "reply": "Here’s a side-by-side look at those products:" if products else "I couldn’t compare those products.",
                "products": products,
                "suggestions": ["Cheaper alternatives", "Matching accessories"],
            }
        if intent in ("cheaper", "similar", "accessories") and product_ids:
            mode = intent if intent != "accessories" else "accessories"
            result = run_tool(
                "recommend_related",
                {"product_ids": product_ids, "mode": mode, "limit": 6},
                user=user,
            )
            products = result.get("products") or []
            labels = {
                "cheaper": "Here are cheaper alternatives from the catalog:",
                "similar": "Here are similar products:",
                "accessories": "Here are matching accessories / complementary items:",
            }
            return {
                "reply": labels.get(mode, "Here are some recommendations:") if products else "No matching products found right now.",
                "products": products,
                "suggestions": ["Compare these options", "Show similar products", "Cheaper alternatives"],
            }

    price_match = re.search(r"(?:under|below|less than|<)\s*₹?\s*([\d,]+)", lower)
    max_price = float(price_match.group(1).replace(",", "")) if price_match else None

    if any(w in lower for w in ("cart", "my bag", "my basket")):
        result = run_tool("get_cart", {}, user=user)
        if result.get("error"):
            return {
                "reply": "Please sign in to view your cart.",
                "products": [],
                "suggestions": ["Sign in"],
            }
        items = result.get("items") or []
        if not items:
            return {
                "reply": "Your cart is empty. Want product recommendations?",
                "products": [],
                "suggestions": ["Recommend something for me", "Show festival offers"],
            }
        return {
            "reply": f"You have {len(items)} item(s) in your cart (total ₹{result.get('cart_total', 0):,.0f}).",
            "products": items,
            "suggestions": ["Matching accessories", "Show festival offers"],
        }

    if any(w in lower for w in ("wishlist", "saved items")):
        result = run_tool("get_wishlist", {}, user=user)
        if result.get("error"):
            return {"reply": "Please sign in to view your wishlist.", "products": [], "suggestions": ["Sign in"]}
        items = result.get("items") or []
        return {
            "reply": f"You have {len(items)} item(s) in your wishlist." if items else "Your wishlist is empty.",
            "products": items,
            "suggestions": ["Show festival offers", "Recommend something for me"],
        }

    shopping_hints = any(
        w in lower
        for w in (
            "find", "show", "search", "laptop", "phone", "shirt", "shoe", "buy",
            "recommend", "suggest", "looking for", "need a", "want a", "under", "offer",
        )
    )
    if shopping_hints:
        q = re.sub(
            r"\b(find|show|me|a|an|the|under|below|less than|₹|rs\.?|rupees?|please)\b",
            " ",
            lower,
            flags=re.I,
        )
        q = re.sub(r"[\d,]+", " ", q).strip()
        q = re.sub(r"\s+", " ", q)
        result = run_tool(
            "search_products",
            {"query": q or text, "max_price": max_price, "limit": 6},
            user=user,
        )
        products = result.get("products") or []
        if products:
            return {
                "reply": "Here are real products matching your request:",
                "products": products,
                "suggestions": ["Compare these options", "Show similar products", "Cheaper alternatives"],
            }
        return {
            "reply": "I couldn’t find matching products right now. Try different keywords or browse the shop.",
            "products": [],
            "suggestions": ["Show festival offers", "Recommend something for me"],
        }

    return {
        "reply": FAQ_FALLBACK,
        "products": [],
        "suggestions": [
            "Find a programming laptop under ₹60,000",
            "Show festival offers",
            "What's in my cart?",
            "Recommend something for me",
        ],
    }
