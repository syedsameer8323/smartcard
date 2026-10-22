"""Cancellation rules and the shared 'cancel these items' routine used by customers and sellers."""
import logging
from datetime import timedelta
from decimal import Decimal

from django.db.models import F
from django.utils import timezone

from catalog.models import Product

from .models import Coupon
from .refunds import RefundError, item_net_shares, start_refund

logger = logging.getLogger(__name__)

CUSTOMER_REASONS = {
    "changed_mind": "I changed my mind",
    "ordered_by_mistake": "Ordered by mistake",
    "better_price": "Found a better price elsewhere",
    "delivery_too_slow": "Delivery is taking too long",
    "wrong_details": "Wrong address or product details",
    "other": "Other reason",
}
SELLER_REASONS = {
    "out_of_stock": "Item is out of stock",
    "cannot_deliver": "Unable to deliver to this address",
    "pricing_error": "Pricing or listing error",
    "other": "Other reason",
}

# A customer can cancel until the seller starts preparing the order.
CUSTOMER_CANCELLABLE = ("pending", "confirmed")
# An online payment that was never completed is treated as abandoned after this long.
ABANDONED_PAYMENT_AFTER = timedelta(minutes=30)


def customer_cancel_block(order, items):
    """Return why a customer cannot cancel this order right now, or None if they can."""
    active = [i for i in items if i.status != "cancelled"]
    if not active:
        return "This order has already been cancelled."
    if any(i.status not in CUSTOMER_CANCELLABLE for i in active):
        return "This order is already being prepared or shipped, so it can no longer be cancelled."
    if order.payment_method == "razorpay" and order.payment_status == "pending" and order.razorpay_order_id:
        if timezone.now() - order.created_at < ABANDONED_PAYMENT_AFTER:
            return "Your payment is still being processed. Please try again in a few minutes."
    return None


def release_coupon(order):
    """Give the coupon use back when an order is cancelled completely."""
    if not order.coupon_code:
        return
    coupon = Coupon.objects.select_for_update().filter(code=order.coupon_code).first()
    if coupon:
        if order.coupon_reserved and coupon.reserved_count > 0:
            coupon.reserved_count -= 1
        elif not order.coupon_reserved and coupon.usage_count > 0:
            coupon.usage_count -= 1
        coupon.save(update_fields=["reserved_count", "usage_count"])
    if order.coupon_reserved:
        order.coupon_reserved = False
        order.save(update_fields=["coupon_reserved"])


def cancel_items(order, all_items, to_cancel, *, by, reason, note=""):
    """Cancel `to_cancel` (a subset of `all_items`): restore stock, refund paid money, free the coupon.

    Must run inside a transaction. If the refund cannot be started nothing is cancelled
    (the caller's transaction rolls back), so the customer is never left half-refunded.
    Returns the total amount refunded (Decimal).
    """
    from .serializers import BusinessError

    now = timezone.now()
    paid = order.payment_status == "paid"
    shares = item_net_shares(order, all_items) if paid else {}
    refund_total = Decimal("0.00")

    for item in to_cancel:
        if item.product_id:
            Product.objects.filter(pk=item.product_id).update(stock=F("stock") + item.quantity)
        item.status = "cancelled"
        item.cancelled_at = now
        item.cancelled_by = by
        item.cancel_reason = reason[:80]
        item.cancel_note = note[:300]
        if paid:
            item.refund_amount = shares.get(item.id, Decimal("0.00"))
            refund_total += item.refund_amount

    if all(i.status == "cancelled" for i in all_items):
        release_coupon(order)

    if paid and refund_total > 0:
        try:
            refund_id = start_refund(order, refund_total, {"cancelled_by": by})
        except RefundError:
            logger.exception("Refund failed for order %s", order.pk)
            raise BusinessError(
                "We couldn't start your refund right now, so nothing was cancelled. Please try again in a few minutes."
            )
        for item in to_cancel:
            item.refund_reference = refund_id

    for item in to_cancel:
        item.save(update_fields=["status", "status_updated_at", "cancelled_at", "cancelled_by", "cancel_reason",
                                 "cancel_note", "refund_amount", "refund_reference"])
    return refund_total
