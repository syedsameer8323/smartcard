import logging
from decimal import Decimal, InvalidOperation

import cloudinary
import cloudinary.uploader
from django.db.models import Q
from rest_framework import viewsets
from rest_framework.generics import ListAPIView, RetrieveAPIView
from rest_framework.pagination import PageNumberPagination
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from users.permissions import IsSeller

from .models import Category, FestivalOffer, Product
from .pricing import annotate_effective_price, load_active_offers, on_offer_q
from .serializers import CategorySerializer, FestivalOfferSerializer, ProductSerializer

logger = logging.getLogger(__name__)


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
    SORTS = {"newest": "-created_at", "price_asc": "effective_price", "price_desc": "-effective_price", "name": "name"}

    def get_queryset(self):
        p = self.request.query_params
        rules = load_active_offers()
        qs = annotate_effective_price(Product.objects.filter(is_active=True).select_related("seller", "category"), rules)
        if q := p.get("q", "").strip():
            qs = qs.filter(Q(name__icontains=q) | Q(description__icontains=q))
        if category := p.get("category"):
            qs = qs.filter(category__slug=category)
        # Price filters use what the customer actually pays (the festival price when a sale is live).
        if (lo := _decimal(p.get("min_price"))) is not None:
            qs = qs.filter(effective_price__gte=lo)
        if (hi := _decimal(p.get("max_price"))) is not None:
            qs = qs.filter(effective_price__lte=hi)
        if p.get("in_stock") == "true":
            qs = qs.filter(stock__gt=0)
        if p.get("offer") == "true":
            qs = qs.filter(on_offer_q(rules))
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


MAX_IMAGE_BYTES = 8 * 1024 * 1024  # the browser shrinks big photos first; this is the hard server limit


def _looks_like_image(head: bytes) -> bool:
    """Check the file's real signature (JPEG / PNG / WebP), not just its name or declared type."""
    return (
        head.startswith(b"\xff\xd8\xff")
        or head.startswith(b"\x89PNG\r\n\x1a\n")
        or (head[:4] == b"RIFF" and head[8:12] == b"WEBP")
    )


class SellerImageUploadView(APIView):
    """Seller uploads a product photo -> stored on Cloudinary -> returns its permanent URL.

    The URL is then saved in Product.image_url by the normal create/update product call,
    so no database change is needed and products that already use pasted URLs keep working.
    """

    permission_classes = [IsSeller]
    parser_classes = [MultiPartParser]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "image_upload"

    def post(self, request):
        file = request.FILES.get("image")
        if file is None:
            return Response({"message": "Please choose an image to upload."}, status=400)
        if file.size > MAX_IMAGE_BYTES:
            return Response({"message": "That image is too large. Please choose one under 8 MB."}, status=400)
        head = file.read(12)
        file.seek(0)
        if not _looks_like_image(head):
            return Response({"message": "Only JPG, PNG or WebP images are allowed."}, status=400)
        if not cloudinary.config().cloud_name:
            logger.error("CLOUDINARY_URL is not configured")
            return Response({"message": "Image uploads are not set up on the server yet."}, status=503)
        try:
            result = cloudinary.uploader.upload(
                file,
                folder="smartcart/products",
                resource_type="image",
                transformation=[{"width": 1200, "height": 1200, "crop": "limit"}, {"quality": "auto"}],
            )
        except Exception:
            logger.exception("Cloudinary upload failed")
            return Response({"message": "Image upload failed. Please try again."}, status=503)
        return Response({"url": result["secure_url"]}, status=201)


class SellerOfferViewSet(viewsets.ModelViewSet):
    """Sellers create and manage festival sales on their own products only."""

    permission_classes = [IsSeller]
    serializer_class = FestivalOfferSerializer
    pagination_class = None

    def get_queryset(self):
        return FestivalOffer.objects.filter(seller=self.request.user).select_related("seller").prefetch_related("products")

    def perform_create(self, serializer):
        serializer.save(seller=self.request.user)


class ActiveOffersView(APIView):
    """Public: the festival sales running right now (powers the storefront banner)."""

    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        rules = load_active_offers()
        groups = {}
        for r in rules:  # best discount first
            key = r.festival if r.festival != "custom" else f"custom:{r.name.lower()}"
            g = groups.setdefault(key, {"festival": r.festival, "name": r.name, "max_discount_percent": f"{r.percent.normalize():f}",
                                        "ends_at": r.ends_at, "sellers": set()})
            g["sellers"].add(r.seller_id)
            g["ends_at"] = max(g["ends_at"], r.ends_at)
        offers = [{**g, "seller_count": len(g.pop("sellers"))} for g in groups.values()]
        product_count = Product.objects.filter(is_active=True, stock__gt=0).filter(on_offer_q(rules)).count() if rules else 0
        return Response({"product_count": product_count, "offers": offers})
