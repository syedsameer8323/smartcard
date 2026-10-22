from datetime import timedelta

from django.db import transaction
from django.db.models import (
    DecimalField,
    ExpressionWrapper,
    F,
    Sum,
)
from django.db.models.functions import TruncDate
from django.shortcuts import get_object_or_404
from django.utils import timezone

from rest_framework.response import Response
from rest_framework.views import APIView

from catalog.models import Product
from users.permissions import IsSeller

from .cancellation import SELLER_REASONS, cancel_items
from .email_notifications import schedule_order_notification
from .models import Order, OrderItem
from .serializers import BusinessError, SellerOrderItemSerializer


LINE = ExpressionWrapper(
    F("price") * F("quantity"),
    output_field=DecimalField(max_digits=14, decimal_places=2),
)


FLOW = {
    "pending": ["confirmed", "cancelled"],
    "confirmed": ["processing", "cancelled"],
    "processing": ["shipped", "cancelled"],
    "shipped": ["out_for_delivery"],
    "out_for_delivery": ["delivered"],
    "delivered": [],
    "cancelled": [],
}


TIMESTAMP_FIELDS = {
    "confirmed": "confirmed_at",
    "processing": "processing_at",
    "shipped": "shipped_at",
    "out_for_delivery": "out_for_delivery_at",
    "delivered": "delivered_at",
}


EMAIL_EVENTS = {
    "confirmed": "order_confirmed",
    "shipped": "order_shipped",
    "out_for_delivery": "out_for_delivery",
    "delivered": "order_delivered",
    "cancelled": "order_cancelled",
}


def seller_items(user):
    return OrderItem.objects.filter(
        seller=user
    ).select_related("order__user")


def get_order_status(order):
    """
    Calculate the overall customer-facing order status.

    This follows the priority used by OrderSerializer:
    the least advanced active item determines the order status.
    """
    statuses = set(
        order.items.values_list("status", flat=True)
    )

    if not statuses:
        return "pending"

    if statuses == {"cancelled"}:
        return "cancelled"

    statuses.discard("cancelled")

    priority = [
        "pending",
        "confirmed",
        "processing",
        "shipped",
        "out_for_delivery",
        "delivered",
    ]

    for current_status in priority:
        if current_status in statuses:
            return current_status

    return "pending"


class SellerStatsView(APIView):
    permission_classes = [IsSeller]

    def get(self, request):
        user = request.user

        products = Product.objects.filter(seller=user)
        live = seller_items(user).exclude(status="cancelled")

        today = timezone.localdate()
        start = today - timedelta(days=6)

        per_day = {
            row["d"]: row["t"]
            for row in (
                live.filter(order__created_at__date__gte=start)
                .annotate(d=TruncDate("order__created_at"))
                .values("d")
                .annotate(t=Sum(LINE))
            )
        }

        chart = [
            {
                "date": str(start + timedelta(days=i)),
                "revenue": (
                    f"{per_day.get(start + timedelta(days=i), 0):.2f}"
                ),
            }
            for i in range(7)
        ]

        top = (
            live.values("name")
            .annotate(
                units=Sum("quantity"),
                revenue=Sum(LINE),
            )
            .order_by("-revenue")[:5]
        )

        return Response({
            "revenue": (
                f"{live.aggregate(t=Sum(LINE))['t'] or 0:.2f}"
            ),
            "orders": live.values("order").distinct().count(),
            "pending": seller_items(user).filter(
                status="pending"
            ).count(),
            "products": products.count(),
            "active_products": products.filter(
                is_active=True
            ).count(),
            "low_stock": products.filter(
                stock__gt=0,
                stock__lte=5,
            ).count(),
            "out_of_stock": products.filter(stock=0).count(),
            "chart": chart,
            "top_products": [
                {
                    "name": row["name"],
                    "units": row["units"],
                    "revenue": f"{row['revenue']:.2f}",
                }
                for row in top
            ],
            "recent": SellerOrderItemSerializer(
                seller_items(user).order_by(
                    "-order__created_at"
                )[:5],
                many=True,
            ).data,
        })


class SellerOrderListView(APIView):
    permission_classes = [IsSeller]

    def get(self, request):
        qs = seller_items(request.user).order_by(
            "-order__created_at",
            "-id",
        )

        status = request.query_params.get("status")

        if status in FLOW:
            qs = qs.filter(status=status)

        return Response(
            SellerOrderItemSerializer(qs[:200], many=True).data
        )


class SellerOrderUpdateView(APIView):
    permission_classes = [IsSeller]

    @transaction.atomic
    def patch(self, request, pk):
        item = get_object_or_404(
            seller_items(request.user).select_for_update(
                of=("self",)
            ),
            pk=pk,
        )

        order = item.order

        # Capture the overall order status before this update.
        old_order_status = get_order_status(order)

        new_status = request.data.get("status")

        if new_status not in FLOW[item.status]:
            raise BusinessError(
                f"Cannot change an order from "
                f"{item.status} to {new_status}."
            )

        refund_total = 0

        if new_status == "cancelled":
            # Cancelling restores stock, frees the coupon and refunds the customer if they already paid online.
            reason_key = str(request.data.get("reason", "other"))
            reason = SELLER_REASONS.get(reason_key, SELLER_REASONS["other"])
            note = str(request.data.get("note") or "").strip()[:300]
            order = Order.objects.select_for_update().get(pk=order.pk)
            all_items = list(order.items.all())
            target = next(i for i in all_items if i.id == item.id)
            refund_total = cancel_items(
                order, all_items, [target], by="seller", reason=reason, note=note,
            )
            item = target
        else:
            item.status = new_status

            update_fields = [
                "status",
                "status_updated_at",
            ]

            timestamp_field = TIMESTAMP_FIELDS.get(new_status)

            if timestamp_field:
                setattr(
                    item,
                    timestamp_field,
                    timezone.now(),
                )
                update_fields.append(timestamp_field)

            item.save(update_fields=update_fields)

        # Refresh item statuses before calculating the overall status.
        new_order_status = get_order_status(order)

        # Always tell the customer when an item is cancelled; otherwise only when the overall status changes.
        if new_status == "cancelled":
            schedule_order_notification(
                order=order,
                recipient=order.email or getattr(order.user, "email", ""),
                event="order_cancelled",
            )
        elif new_order_status != old_order_status:
            event = EMAIL_EVENTS.get(new_order_status)

            if event:
                customer_email = (
                    order.email
                    or getattr(order.user, "email", "")
                )

                schedule_order_notification(
                    order=order,
                    recipient=customer_email,
                    event=event,
                )

        message = f"Order marked as {new_status}"
        if refund_total:
            message += f". ₹{refund_total:.2f} is being refunded to the customer."

        return Response({
            "message": message,
            "item": SellerOrderItemSerializer(item).data,
        })