from decimal import Decimal

from django.utils import timezone
from rest_framework import serializers

from .models import Category, FestivalOffer, Product
from .pricing import load_active_offers, price_info


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ("id", "name", "slug", "icon")


class ProductSerializer(serializers.ModelSerializer):
    """Used for reading (public) and writing (seller). Seller is always taken from the request."""

    price = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=Decimal("0.01"))
    category = serializers.PrimaryKeyRelatedField(queryset=Category.objects.all(), required=False, allow_null=True)
    category_detail = CategorySerializer(source="category", read_only=True)
    seller_name = serializers.CharField(source="seller.name", read_only=True)
    in_stock = serializers.SerializerMethodField()
    sale_price = serializers.SerializerMethodField()
    discount_percent = serializers.SerializerMethodField()
    offer = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = ("id", "name", "description", "price", "sale_price", "discount_percent", "offer", "stock",
                  "image_url", "is_active", "category", "category_detail", "seller_name", "in_stock", "created_at")
        read_only_fields = ("id", "created_at")

    def get_in_stock(self, obj):
        return obj.stock > 0

    def _rules(self):
        # Live offers are loaded once per request (cached on the root serializer), not once per product.
        root = self.root
        if not hasattr(root, "_offer_rules"):
            root._offer_rules = load_active_offers()
        return root._offer_rules

    def get_sale_price(self, obj):
        return f"{price_info(obj, self._rules())['sale_price']:.2f}"

    def get_discount_percent(self, obj):
        percent = price_info(obj, self._rules())["percent"]
        return None if percent is None else f"{percent.normalize():f}"

    def get_offer(self, obj):
        rule = price_info(obj, self._rules())["rule"]
        if not rule:
            return None
        return {"name": rule.name, "festival": rule.festival, "ends_at": rule.ends_at}


class FestivalOfferSerializer(serializers.ModelSerializer):
    """Seller-facing: create / edit a festival sale."""

    discount_percent = serializers.DecimalField(max_digits=5, decimal_places=2, min_value=Decimal("1"), max_value=Decimal("90"))
    product_ids = serializers.PrimaryKeyRelatedField(many=True, queryset=Product.objects.all(), source="products", required=False)
    status = serializers.CharField(read_only=True)
    product_count = serializers.SerializerMethodField()
    product_names = serializers.SerializerMethodField()

    class Meta:
        model = FestivalOffer
        fields = ("id", "name", "festival", "discount_percent", "starts_at", "ends_at", "is_active", "apply_to_all",
                  "product_ids", "product_count", "product_names", "status", "created_at")
        read_only_fields = ("id", "created_at")

    def get_product_count(self, obj):
        return obj.products.count() if not obj.apply_to_all else obj.seller.products.filter(is_active=True).count()

    def get_product_names(self, obj):
        if obj.apply_to_all:
            return []
        return [p.name for p in obj.products.all()[:3]]

    def validate_name(self, value):
        value = value.strip()
        if len(value) < 3:
            raise serializers.ValidationError("Give the sale a name of at least 3 characters.")
        return value

    def validate_product_ids(self, products):
        user = self.context["request"].user
        if any(p.seller_id != user.id for p in products):
            raise serializers.ValidationError("You can only include your own products.")
        return products

    def validate(self, attrs):
        inst = self.instance
        starts = attrs.get("starts_at", getattr(inst, "starts_at", None))
        ends = attrs.get("ends_at", getattr(inst, "ends_at", None))
        if starts and ends and ends <= starts:
            raise serializers.ValidationError({"ends_at": "The sale must end after it starts."})
        if inst is None and ends and ends <= timezone.now():
            raise serializers.ValidationError({"ends_at": "Choose an end date and time in the future."})
        apply_all = attrs.get("apply_to_all", getattr(inst, "apply_to_all", True))
        if apply_all:
            attrs["products"] = []
        else:
            chosen = attrs["products"] if "products" in attrs else (list(inst.products.all()) if inst else [])
            if not chosen:
                raise serializers.ValidationError({"product_ids": "Select at least one product, or apply the sale to all your products."})
        return attrs
