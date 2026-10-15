from decimal import Decimal, InvalidOperation

from django.db.models import Q
from rest_framework import viewsets
from rest_framework.generics import ListAPIView, RetrieveAPIView
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny

from users.permissions import IsSeller

from .models import Category, Product
from .serializers import CategorySerializer, ProductSerializer


class ProductPagination(PageNumberPagination):
    page_size = 12
    page_size_query_param = "page_size"
    max_page_size = 48


class SellerPagination(ProductPagination):
    page_size = 10


class CategoryListView(ListAPIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    serializer_class = CategorySerializer
    queryset = Category.objects.all()
    pagination_class = None


def _decimal(value):
    try:
        return Decimal(value)
    except (InvalidOperation, TypeError):
        return None


class ProductListView(ListAPIView):
    """Public catalog with search, category, price, stock filters and sorting."""

    permission_classes = [AllowAny]
    authentication_classes = []
    serializer_class = ProductSerializer
    pagination_class = ProductPagination
    SORTS = {"newest": "-created_at", "price_asc": "price", "price_desc": "-price", "name": "name"}

    def get_queryset(self):
        p = self.request.query_params
        qs = Product.objects.filter(is_active=True).select_related("seller", "category")
        if q := p.get("q", "").strip():
            qs = qs.filter(Q(name__icontains=q) | Q(description__icontains=q))
        if category := p.get("category"):
            qs = qs.filter(category__slug=category)
        if (lo := _decimal(p.get("min_price"))) is not None:
            qs = qs.filter(price__gte=lo)
        if (hi := _decimal(p.get("max_price"))) is not None:
            qs = qs.filter(price__lte=hi)
        if p.get("in_stock") == "true":
            qs = qs.filter(stock__gt=0)
        return qs.order_by(self.SORTS.get(p.get("sort"), "-created_at"), "id")


class ProductDetailView(RetrieveAPIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    serializer_class = ProductSerializer
    queryset = Product.objects.filter(is_active=True).select_related("seller", "category")


class SellerProductViewSet(viewsets.ModelViewSet):
    """Sellers manage ONLY their own products: the queryset is scoped to request.user."""

    permission_classes = [IsSeller]
    serializer_class = ProductSerializer
    pagination_class = SellerPagination

    def get_queryset(self):
        qs = Product.objects.filter(seller=self.request.user).select_related("seller", "category")
        p = self.request.query_params
        if q := p.get("q", "").strip():
            qs = qs.filter(name__icontains=q)
        status = p.get("status")
        if status == "active":
            qs = qs.filter(is_active=True)
        elif status == "inactive":
            qs = qs.filter(is_active=False)
        elif status == "low":
            qs = qs.filter(stock__gt=0, stock__lte=5)
        elif status == "out":
            qs = qs.filter(stock=0)
        return qs

    def perform_create(self, serializer):
        serializer.save(seller=self.request.user)
