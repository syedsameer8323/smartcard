from decimal import Decimal

from rest_framework import serializers

from .models import Category, Product


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

    class Meta:
        model = Product
        fields = ("id", "name", "description", "price", "stock", "image_url", "is_active", "category",
                  "category_detail", "seller_name", "in_stock", "created_at")
        read_only_fields = ("id", "created_at")

    def get_in_stock(self, obj):
        return obj.stock > 0
