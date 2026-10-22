# shop/pricing.py: the single source of truth for price
def effective_price(product, offers):
    """Best (lowest) price wins; offers never stack with each other."""
    best, best_offer = product.price, None
    for o in offers:
        if o.seller_id != product.seller_id or not o.applies_to(product):
            continue
        cut = product.price * o.discount_value / 100 if o.discount_type == "percentage" else o.discount_value
        if o.max_discount:
            cut = min(cut, o.max_discount)
        price = max(product.price - cut, Decimal("0.01")).quantize(Decimal("0.01"), ROUND_HALF_UP)
        if price < best:
            best, best_offer = price, o
    return best, best_offer