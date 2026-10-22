import logging

from django.conf import settings
from django.core.mail import send_mail
from django.db import IntegrityError, transaction

from .models import OrderEmailNotification

logger = logging.getLogger(__name__)


EVENT_DETAILS = {
    "order_placed": (
        "Your SmartCart order has been placed",
        "Thank you! We have received your order.",
    ),
    "payment_successful": (
        "SmartCart payment successful",
        "Your payment has been verified successfully.",
    ),
    "order_confirmed": (
        "Your SmartCart order is confirmed",
        "The seller has confirmed your order.",
    ),
    "order_shipped": (
        "Your SmartCart order has been shipped",
        "Your order has been shipped and is on its way.",
    ),
    "out_for_delivery": (
        "Your SmartCart order is out for delivery",
        "Your order is on its way to your delivery address.",
    ),
    "order_delivered": (
        "Your SmartCart order has been delivered",
        "Your order has been marked as delivered.",
    ),
    "order_cancelled": (
        "Your SmartCart order has been cancelled",
        "Your order or order item has been cancelled.",
    ),
    "seller_new_order": (
        "New order received - SmartCart",
        "A new customer order has been received. Please review it in your seller dashboard.",
    ),
    "seller_order_cancelled": (
        "Order cancelled - SmartCart",
        "A customer has cancelled an order containing your product. Please review your seller dashboard.",
    ),
}


def send_order_notification(order, recipient, event):
    """
    Send one order notification.

    The database record is created only after Django reports that the
    email was sent successfully. A unique constraint prevents two
    successful attempts from creating duplicate notification records.
    """

    if not recipient:
        logger.warning(
            "Skipping order email: recipient is missing. Order ID=%s",
            order.pk,
        )
        return False

    if event not in EVENT_DETAILS:
        logger.error("Unknown order email event: %s", event)
        return False

    subject, message = EVENT_DETAILS[event]

    try:
        with transaction.atomic():
            already_sent = OrderEmailNotification.objects.filter(
                order=order,
                event=event,
                recipient_email=recipient,
            ).exists()

            if already_sent:
                return True

            items = list(order.items.all())

            product_lines = [
                (
                    f"- {item.name} x {item.quantity}: "
                    f"₹{item.price * item.quantity:.2f}"
                )
                for item in items
            ]

            products = "\n".join(product_lines) or "No products available."

            extra = ""
            if event in ("order_cancelled", "seller_order_cancelled"):
                cancelled = [i for i in items if i.status == "cancelled"]
                if cancelled and cancelled[-1].cancel_reason:
                    extra += f"Reason: {cancelled[-1].cancel_reason}\n"
                refunded = sum((i.refund_amount for i in items), 0)
                if refunded and event == "order_cancelled":
                    extra += (
                        f"Refund: Rs.{refunded:.2f} has been started to your original payment method. "
                        "It usually reaches your account in 5-7 business days.\n"
                    )
                if extra:
                    extra = "\n" + extra

            body = f"""
Hello,

{message}

Order ID: {order.code}

Products:
{products}

Subtotal: ₹{order.subtotal:.2f}
Discount: ₹{order.discount_amount:.2f}
Shipping: ₹{order.shipping_fee:.2f}
Total: ₹{order.total:.2f}

Payment status: {order.payment_status}
{extra}
Thank you for shopping with SmartCart!

The SmartCart Team
""".strip()

            sent_count = send_mail(
                subject=f"{subject} - {order.code}",
                message=body,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[recipient],
                fail_silently=False,
            )

            if sent_count != 1:
                return False

            try:
                OrderEmailNotification.objects.create(
                    order=order,
                    event=event,
                    recipient_email=recipient,
                )
            except IntegrityError:
                # Another request recorded this notification first.
                return OrderEmailNotification.objects.filter(
                    order=order,
                    event=event,
                    recipient_email=recipient,
                ).exists()

            return True

    except Exception:
        logger.exception(
            "Failed to send order email. Order ID=%s, event=%s",
            order.pk,
            event,
        )
        return False

def schedule_order_notification(order, recipient, event):
    """
    Schedule an email after the current database transaction commits.
    Email failures must not undo the order or payment operation.
    """
    from django.db import transaction

    if not recipient:
        logger.warning(
            "No recipient email for order %s, event %s",
            order.pk,
            event,
        )
        return

    order_id = order.pk

    def send_after_commit():
        try:
            from .models import Order

            current_order = Order.objects.get(pk=order_id)

            send_order_notification(
                order=current_order,
                recipient=recipient,
                event=event,
            )
        except Exception:
            logger.exception(
                "Could not process email for order %s, event %s",
                order_id,
                event,
            )

    transaction.on_commit(send_after_commit)