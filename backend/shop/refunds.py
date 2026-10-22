"""Money-back helpers: how much to refund for an item and how to ask Razorpay to do it."""
import os
from decimal import Decimal, ROUND_HALF_UP

CENT = Decimal("0.01")


class RefundError(Exception):
    """Raised when the payment gateway could not start a refund."""


def item_net_shares(order, items=None):
    """What each item actually cost the customer after the coupon discount, split fairly.

    The shares always add up to (items total - coupon discount), so refunding every item
    returns exactly what the customer paid for the goods.
    """
    items = list(items if items is not None else order.items.all())
    base = sum((i.price * i.quantity for i in items), Decimal("0.00"))
    discount = min(order.discount_amount or Decimal("0.00"), base)
    shares, running = {}, Decimal("0.00")
    for index, item in enumerate(items):
        line = item.price * item.quantity
        if index == len(items) - 1:
            share = (base - discount) - running
        else:
            share = (line - (discount * line / base if base else Decimal("0.00"))).quantize(CENT, rounding=ROUND_HALF_UP)
        shares[item.id] = max(share, Decimal("0.00"))
        running += shares[item.id]
    return shares


def start_refund(order, amount, notes=None):
    """Ask Razorpay to refund `amount` (rupees) of this order's captured payment. Returns the refund id."""
    amount = Decimal(amount).quantize(CENT, rounding=ROUND_HALF_UP)
    if amount <= 0:
        raise RefundError("Nothing to refund.")
    if not order.payment_reference:
        raise RefundError("This order has no payment reference.")
    key_id, key_secret = os.environ.get("RAZORPAY_KEY_ID"), os.environ.get("RAZORPAY_KEY_SECRET")
    if not key_id or not key_secret:
        raise RefundError("Payment gateway credentials are not configured.")
    try:
        import razorpay
        client = razorpay.Client(auth=(key_id, key_secret))
        refund = client.payment.refund(order.payment_reference, {
            "amount": int((amount * 100).to_integral_value()),
            "speed": "normal",
            "notes": {"order": order.code, **(notes or {})},
        })
        return refund["id"]
    except Exception as exc:  # network errors, bad request, already refunded...
        raise RefundError(str(exc)) from exc
