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

from .models import OrderItem
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


def seller_items(user):
    return OrderItem.objects.filter(
        seller=user
    ).select_related("order__user")


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
                "revenue": f"{per_day.get(start + timedelta(days=i), 0):.2f}",
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
            "revenue": f"{live.aggregate(t=Sum(LINE))['t'] or 0:.2f}",
            "orders": live.values("order").distinct().count(),
            "pending": seller_items(user).filter(status="pending").count(),
            "products": products.count(),
            "active_products": products.filter(is_active=True).count(),
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
                seller_items(user).order_by("-order__created_at")[:5],
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

        new_status = request.data.get("status")

        if new_status not in FLOW[item.status]:
            raise BusinessError(
                f"Cannot change an order from "
                f"{item.status} to {new_status}."
            )

        if new_status == "cancelled" and item.product_id:
            Product.objects.filter(
                pk=item.product_id
            ).update(
                stock=F("stock") + item.quantity
            )

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

        return Response({
            "message": f"Order marked as {new_status}",
            "item": SellerOrderItemSerializer(item).data,
        })