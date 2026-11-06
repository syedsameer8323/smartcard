"""Money-back helpers: how much to refund for an item and how to ask Razorpay to do it."""
import logging
import os
from decimal import Decimal, ROUND_HALF_UP

CENT = Decimal("0.01")
logger = logging.getLogger(__name__)


class RefundError(Exception):
    """Raised when the payment gateway could not start a refund."""


def item_net_shares(order, items=None):
    """What each item actually cost the customer after the coupon discount, split fairly."""
    items = list(items if items is not None else order.items.all())
    base = sum((i.price * i.quantity for i in items), Decimal("0.00"))
    discount = min(order.discount_amount or Decimal("0.00"), base)
    shares, running = {}, Decimal("0.00")
    for index, item in enumerate(items):
        line = item.price * item.quantity
        if index == len(items) - 1:
            share = (base - discount) - running
        else:
            share = (line - (discount * line / base if base else Decimal("0.00"))).quantize(
                CENT, rounding=ROUND_HALF_UP
            )
        shares[item.id] = max(share, Decimal("0.00"))
        running += shares[item.id]
    return shares


def _is_test_mode(key_id: str) -> bool:
    return (key_id or "").startswith("rzp_test_")


def start_refund(order, amount, notes=None):
    """Ask Razorpay to refund `amount` (rupees) of this order's captured payment.

    Returns the refund id (or a synthetic test-mode id when the gateway rejects
    refunds in Test Mode — common with some test UPI/card methods).
    """
    amount = Decimal(amount).quantize(CENT, rounding=ROUND_HALF_UP)
    if amount <= 0:
        raise RefundError("Nothing to refund.")

    payment_id = (order.payment_reference or "").strip()
    if payment_id.startswith("plink:"):
        raise RefundError(
            "This payment has no captured Razorpay payment id yet, so a refund cannot be started."
        )
    if not payment_id or not payment_id.startswith("pay_"):
        raise RefundError("This order has no valid Razorpay payment reference for refund.")

    key_id = os.environ.get("RAZORPAY_KEY_ID", "")
    key_secret = os.environ.get("RAZORPAY_KEY_SECRET", "")
    if not key_id or not key_secret:
        raise RefundError("Payment gateway credentials are not configured.")

    amount_paise = int((amount * 100).to_integral_value(rounding=ROUND_HALF_UP))
    if amount_paise < 100:
        raise RefundError("Refund amount is below the gateway minimum (₹1).")

    try:
        import razorpay
        from razorpay.errors import BadRequestError, ServerError

        client = razorpay.Client(auth=(key_id, key_secret))

        # Fetch payment to validate status and remaining refundable amount
        try:
            payment = client.payment.fetch(payment_id)
        except Exception as exc:
            logger.exception("Could not fetch Razorpay payment %s", payment_id)
            if _is_test_mode(key_id):
                logger.warning(
                    "Test Mode: treating refund as simulated for order %s (fetch failed: %s)",
                    order.pk,
                    exc,
                )
                return f"test_refund_sim_{order.pk}_{payment_id[-8:]}"
            raise RefundError(
                f"Could not load payment from Razorpay ({exc}). Try again in a minute."
            ) from exc

        status = (payment.get("status") or "").lower()
        paid_paise = int(payment.get("amount") or 0)
        refunded_paise = int(payment.get("amount_refunded") or 0)
        remaining_paise = max(0, paid_paise - refunded_paise)

        logger.info(
            "Refund prep order=%s payment=%s status=%s paid=%s refunded=%s remaining=%s request=%s method=%s",
            order.pk,
            payment_id,
            status,
            paid_paise,
            refunded_paise,
            remaining_paise,
            amount_paise,
            payment.get("method"),
        )

        if status == "refunded" or remaining_paise <= 0:
            # Already fully refunded at gateway — treat as success for cancel flow
            return payment.get("id") and f"already_refunded_{payment_id[-8:]}" or f"already_refunded_{order.pk}"

        if status not in ("captured", "authorized"):
            if _is_test_mode(key_id):
                logger.warning(
                    "Test Mode: payment status=%s — simulating refund for order %s",
                    status,
                    order.pk,
                )
                return f"test_refund_sim_{order.pk}_{payment_id[-8:]}"
            raise RefundError(
                f"Payment status is '{status or 'unknown'}', so it cannot be refunded yet."
            )

        if amount_paise > remaining_paise:
            amount_paise = remaining_paise

        # Try several payload shapes — Razorpay is picky and varies by method/SDK version
        attempts = []

        # 1) Full refund when amounts match (simplest — often works when partial fails)
        if amount_paise >= remaining_paise:
            attempts.append({})  # empty body = full refund

        # 2) Amount only (no speed, no notes)
        attempts.append({"amount": amount_paise})

        # 3) Amount + speed
        attempts.append({"amount": amount_paise, "speed": "normal"})

        # 4) Amount + optimum speed
        attempts.append({"amount": amount_paise, "speed": "optimum"})

        last_error = None
        for payload in attempts:
            try:
                refund = client.payment.refund(payment_id, payload)
                refund_id = refund.get("id") if isinstance(refund, dict) else None
                if refund_id:
                    logger.info("Refund succeeded payment=%s refund=%s payload=%s", payment_id, refund_id, payload)
                    return refund_id
                last_error = "Razorpay did not return a refund id."
            except BadRequestError as exc:
                last_error = str(exc) or "invalid request sent"
                logger.warning(
                    "Razorpay refund attempt failed payment=%s payload=%s error=%s",
                    payment_id,
                    payload,
                    last_error,
                )
                continue
            except ServerError as exc:
                raise RefundError(
                    "Razorpay is temporarily unavailable. Please retry the cancellation shortly."
                ) from exc

        # All gateway attempts failed
        if _is_test_mode(key_id):
            # Test Mode limitation: many test UPI/card flows reject refunds with
            # "invalid request sent". Simulate success so cancel/demo still works.
            # Live keys (rzp_live_) never take this path.
            logger.warning(
                "Test Mode: Razorpay rejected refunds for payment %s (%s). "
                "Simulating refund so order cancellation can complete. "
                "Live Mode will require a successful gateway refund.",
                payment_id,
                last_error,
            )
            return f"test_refund_sim_{order.pk}_{payment_id[-8:]}"

        raise RefundError(
            f"Razorpay rejected the refund request: {last_error}"
        )

    except RefundError:
        raise
    except ImportError as exc:
        raise RefundError("Install the Razorpay Python SDK to process refunds.") from exc
    except Exception as exc:
        logger.exception("Unexpected refund error for order %s", order.pk)
        if _is_test_mode(os.environ.get("RAZORPAY_KEY_ID", "")):
            logger.warning("Test Mode: simulating refund after unexpected error: %s", exc)
            return f"test_refund_sim_{order.pk}"
        raise RefundError(str(exc) or "Refund failed.") from exc
