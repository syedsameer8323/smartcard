from datetime import timedelta

from django.db import transaction
from django.db.models import Count, DecimalField, ExpressionWrapper, F, Sum
from django.db.models.functions import TruncDate
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.response import Response
from rest_framework.views import APIView

from catalog.models import Product
from users.permissions import IsSeller

from .models import OrderItem
from .serializers import BusinessError, SellerOrderItemSerializer

LINE = ExpressionWrapper(F("price") * F("quantity"), output_field=DecimalField(max_digits=14, decimal_places=2))
FLOW = {"pending": ["confirmed", "cancelled"], "confirmed": ["shipped", "cancelled"], "shipped": ["delivered"],
        "delivered": [], "cancelled": []}


def seller_items(user):
    return OrderItem.objects.filter(seller=user).select_related("order__user")


class SellerStatsView(APIView):
    permission_classes = [IsSeller]

    def get(self, request):
        user = request.user
        products = Product.objects.filter(seller=user)
        live = seller_items(user).exclude(status="cancelled")
        today = timezone.localdate()
        start = today - timedelta(days=6)
        per_day = {r["d"]: r["t"] for r in live.filter(order__created_at__date__gte=start)
                   .annotate(d=TruncDate("order__created_at")).values("d").annotate(t=Sum(LINE))}
        chart = [{"date": str(start + timedelta(days=i)), "revenue": f"{per_day.get(start + timedelta(days=i), 0):.2f}"}
                 for i in range(7)]
        top = live.values("name").annotate(units=Sum("quantity"), revenue=Sum(LINE)).order_by("-revenue")[:5]
        return Response({
            "revenue": f"{live.aggregate(t=Sum(LINE))['t'] or 0:.2f}",
            "orders": live.values("order").distinct().count(),
            "pending": seller_items(user).filter(status="pending").count(),
            "products": products.count(),
            "active_products": products.filter(is_active=True).count(),
            "low_stock": products.filter(stock__gt=0, stock__lte=5).count(),
            "out_of_stock": products.filter(stock=0).count(),
            "chart": chart,
            "top_products": [{"name": t["name"], "units": t["units"], "revenue": f"{t['revenue']:.2f}"} for t in top],
            "recent": SellerOrderItemSerializer(seller_items(user).order_by("-order__created_at")[:5], many=True).data,
        })


class SellerOrderListView(APIView):
    permission_classes = [IsSeller]

    def get(self, request):
        qs = seller_items(request.user).order_by("-order__created_at", "-id")
        if (st := request.query_params.get("status")) in FLOW:
            qs = qs.filter(status=st)
        return Response(SellerOrderItemSerializer(qs[:200], many=True).data)


class SellerOrderUpdateView(APIView):
    permission_classes = [IsSeller]

    @transaction.atomic
    def patch(self, request, pk):
        item = get_object_or_404(seller_items(request.user).select_for_update(of=("self",)), pk=pk)
        new = request.data.get("status")
        if new not in FLOW[item.status]:
            raise BusinessError(f"Cannot change an order from {item.status} to {new}.")
        if new == "cancelled" and item.product_id:
            Product.objects.filter(pk=item.product_id).update(stock=F("stock") + item.quantity)  # restock
        item.status = new
        item.save(update_fields=["status"])
        return Response({"message": f"Order marked as {new}", "item": SellerOrderItemSerializer(item).data})
