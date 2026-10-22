"""Single source of truth for festival-offer pricing.

Every place that shows a price, totals a cart or charges an order goes through
`unit_price()` / `price_info()`, so what the customer sees is exactly what they pay.
"""
from dataclasses import dataclass
from decimal import Decimal, ROUND_HALF_UP
from functools import reduce
from operator import or_

from django.db.models import Case, DecimalField, ExpressionWrapper, F, Q, Value, When
from django.utils import timezone

from .models import FestivalOffer

CENT = Decimal("0.01")
HUNDRED = Decimal("100")


@dataclass(frozen=True)
class OfferRule:
    id: int
    name: str
    festival: str
    percent: Decimal
    seller_id: int
    seller_name: str
    apply_to_all: bool
    product_ids: frozenset
    ends_at: object


def load_active_offers(now=None):
    """All offers that are live right now, best discount first. Usually a handful of rows."""
    now = now or timezone.now()
    offers = (
        FestivalOffer.objects.filter(is_active=True, starts_at__lte=now, ends_at__gt=now)
        .select_related("seller")
        .prefetch_related("products")
    )
    rules = [
        OfferRule(
            id=o.id, name=o.name, festival=o.festival, percent=o.discount_percent,
            seller_id=o.seller_id, seller_name=o.seller.name, apply_to_all=o.apply_to_all,
            product_ids=frozenset() if o.apply_to_all else frozenset(p.id for p in o.products.all()),
            ends_at=o.ends_at,
        )
        for o in offers
    ]
    rules.sort(key=lambda r: (-r.percent, r.ends_at))
    return rules


def _applies(rule, product):
    return product.seller_id == rule.seller_id and (rule.apply_to_all or product.id in rule.product_ids)


def best_rule(product, rules):
    for rule in rules:  # rules are sorted best-discount-first
        if _applies(rule, product):
            return rule
    return None


def apply_percent(price, percent):
    sale = (Decimal(price) * (HUNDRED - Decimal(percent)) / HUNDRED).quantize(CENT, rounding=ROUND_HALF_UP)
    return max(sale, CENT)


def price_info(product, rules):
    """Everything a screen or an order needs to know about a product's current price."""
    rule = best_rule(product, rules)
    list_price = product.price
    if not rule:
        return {"list_price": list_price, "sale_price": list_price, "percent": None, "rule": None, "savings": Decimal("0.00")}
    sale = apply_percent(list_price, rule.percent)
    return {"list_price": list_price, "sale_price": sale, "percent": rule.percent, "rule": rule, "savings": list_price - sale}


def unit_price(product, rules=None):
    return price_info(product, load_active_offers() if rules is None else rules)["sale_price"]


# ---- database-level helpers (used for filtering and sorting the shop) ----

def _rule_q(rule):
    q = Q(seller_id=rule.seller_id)
    return q if rule.apply_to_all else q & Q(id__in=list(rule.product_ids))


def on_offer_q(rules):
    """Q matching every product covered by at least one live offer (matches nothing if none)."""
    if not rules:
        return Q(pk__in=[])
    return reduce(or_, (_rule_q(r) for r in rules))


def annotate_effective_price(qs, rules):
    """Adds `effective_price` so the shop can filter/sort by what customers really pay."""
    money = DecimalField(max_digits=12, decimal_places=2)
    if not rules:
        return qs.annotate(effective_price=ExpressionWrapper(F("price"), output_field=money))
    whens = [
        When(_rule_q(r), then=ExpressionWrapper(F("price") * Value((HUNDRED - r.percent) / HUNDRED), output_field=money))
        for r in rules
    ]
    return qs.annotate(effective_price=Case(*whens, default=F("price"), output_field=money))
