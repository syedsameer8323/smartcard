import re

from rest_framework import serializers
from rest_framework.exceptions import APIException
from decimal import Decimal
from catalog.serializers import ProductSerializer

from .models import (
    CartItem,
    Order,
    OrderItem,
    ShippingAddress,
    SellerNotification,
    Coupon,
)


class BusinessError(APIException):
    """Valid request, but breaks a business rule."""
    status_code = 422
    default_detail = "Request could not be completed."


class CartItemSerializer(serializers.ModelSerializer):
    product = ProductSerializer(read_only=True)
    line_total = serializers.SerializerMethodField()

    class Meta:
        model = CartItem
        fields = ("id", "quantity", "product", "line_total")

    def get_line_total(self, obj):
        return f"{obj.product.price * obj.quantity:.2f}"


class CartAddSerializer(serializers.Serializer):
    product_id = serializers.IntegerField()
    quantity = serializers.IntegerField(
        min_value=1,
        max_value=99,
        default=1,
    )


class CartUpdateSerializer(serializers.Serializer):
    quantity = serializers.IntegerField(min_value=1, max_value=99)


class OrderItemSerializer(serializers.ModelSerializer):
    line_total = serializers.SerializerMethodField()

    class Meta:
        model = OrderItem
        fields = (
            "id",
            "product",
            "name",
            "image_url",
            "price",
            "quantity",
            "line_total",
            "status",
            "status_updated_at",
            "confirmed_at",
            "processing_at",
            "shipped_at",
            "out_for_delivery_at",
            "delivered_at",
        )

    def get_line_total(self, obj):
        return f"{obj.line_total:.2f}"


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    code = serializers.CharField(read_only=True)
    status = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = (
            "id",
            "code",
            "status",
            "total",
            "subtotal",
            "discount_amount",
            "shipping_fee",
            "coupon_code",
            "coupon_reserved",
            "payment_method",
            "payment_status",
            "payment_reference",
            "shipping_name",
            "phone",
            "email",
            "address",
            "house_building",
            "street",
            "locality",
            "city",
            "state",
            "postal_code",
            "delivery_instructions",
            "created_at",
            "items",
        )

    def get_status(self, obj):
        statuses = {item.status for item in obj.items.all()}

        if not statuses:
            return "pending"

        if statuses == {"cancelled"}:
            return "cancelled"

        statuses.discard("cancelled")

        if not statuses:
            return "cancelled"

        # Return the least advanced active status when items
        # from different sellers are at different stages.
        priority = [
            "pending",
            "confirmed",
            "processing",
            "shipped",
            "out_for_delivery",
            "delivered",
        ]

        for status in priority:
            if status in statuses:
                return status

        return "pending"


class CheckoutSerializer(serializers.Serializer):
    shipping_name = serializers.CharField(max_length=150)
    phone = serializers.CharField(max_length=20)
    address = serializers.CharField(max_length=300)
    city = serializers.CharField(max_length=100)
    postal_code = serializers.CharField(max_length=20)

    payment_method = serializers.ChoiceField(
        choices=["cod", "razorpay"],
        default="cod",
    )

    coupon_code = serializers.CharField(
        max_length=40,
        required=False,
        allow_blank=True,
    )
    email = serializers.EmailField(required=False, allow_blank=True)
    house_building = serializers.CharField(
        max_length=160,
        required=False,
        allow_blank=True,
    )
    street = serializers.CharField(
        max_length=200,
        required=False,
        allow_blank=True,
    )
    locality = serializers.CharField(
        max_length=160,
        required=False,
        allow_blank=True,
    )
    state = serializers.CharField(
        max_length=100,
        required=False,
        allow_blank=True,
    )
    delivery_instructions = serializers.CharField(
        max_length=500,
        required=False,
        allow_blank=True,
    )

    def validate_postal_code(self, value):
        if not re.fullmatch(r"[0-9A-Za-z -]{4,10}", value.strip()):
            raise serializers.ValidationError(
                "Enter a valid PIN/postal code."
            )
        return value.strip()

    def validate_phone(self, value):
        if not re.fullmatch(r"\+?[0-9 \-()]{7,20}", value):
            raise serializers.ValidationError(
                "Enter a valid phone number."
            )
        return value


class SellerOrderItemSerializer(serializers.ModelSerializer):
    order_code = serializers.CharField(source="order.code")
    created_at = serializers.DateTimeField(source="order.created_at")
    customer = serializers.CharField(source="order.user.name")
    ship_to = serializers.SerializerMethodField()
    line_total = serializers.SerializerMethodField()

    class Meta:
        model = OrderItem
        fields = (
            "id",
            "order_code",
            "created_at",
            "customer",
            "ship_to",
            "name",
            "image_url",
            "product",
            "price",
            "quantity",
            "line_total",
            "status",
            "status_updated_at",
            "confirmed_at",
            "processing_at",
            "shipped_at",
            "out_for_delivery_at",
            "delivered_at",
        )

    def get_ship_to(self, obj):
        order = obj.order
        return (
            f"{order.shipping_name}, {order.address}, "
            f"{order.city} {order.postal_code} · {order.phone}"
        )

    def get_line_total(self, obj):
        return f"{obj.line_total:.2f}"


class CouponSerializer(serializers.ModelSerializer):
    discount_value = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        min_value=Decimal("0.01"),
    )
    minimum_order_value = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        min_value=Decimal("0"),
    )

    class Meta:
        model = Coupon
        fields = (
            "id",
            "code",
            "discount_type",
            "discount_value",
            "minimum_order_value",
            "expires_at",
            "usage_limit",
            "usage_count",
            "reserved_count",
            "is_active",
            "seller",
            "created_at",
        )
        read_only_fields = (
            "id",
            "usage_count",
            "reserved_count",
            "seller",
            "created_at",
        )

    def validate_code(self, value):
        return value.strip().upper()

    def validate(self, attrs):
        discount_type = attrs.get(
            "discount_type",
            getattr(self.instance, "discount_type", None),
        )
        value = attrs.get(
            "discount_value",
            getattr(self.instance, "discount_value", None),
        )

        if value is not None and value <= 0:
            raise serializers.ValidationError({
                "discount_value": "Discount must be greater than zero."
            })

        if (
            discount_type == "percentage"
            and value is not None
            and value > 100
        ):
            raise serializers.ValidationError({
                "discount_value": "Percentage discount cannot exceed 100."
            })

        return attrs


class ShippingAddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = ShippingAddress
        exclude = ("user",)
        read_only_fields = ("id", "created_at", "updated_at")

    def validate_phone(self, value):
        if not re.fullmatch(r"\+?[0-9 ()-]{7,20}", value):
            raise serializers.ValidationError(
                "Enter a valid phone number."
            )
        return value

    def validate_postal_code(self, value):
        if not re.fullmatch(r"[1-9][0-9]{5}", value.strip()):
            raise serializers.ValidationError(
                "Enter a valid 6-digit Indian PIN code."
            )
        return value.strip()


class SellerNotificationSerializer(serializers.ModelSerializer):
    order_code = serializers.CharField(
        source="order.code",
        read_only=True,
        allow_null=True,
    )

    class Meta:
        model = SellerNotification
        fields = (
            "id",
            "title",
            "message",
            "order",
            "order_code",
            "is_read",
            "created_at",
        )
        read_only_fields = fields