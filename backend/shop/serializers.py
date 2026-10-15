import re

from rest_framework import serializers
from rest_framework.exceptions import APIException

from catalog.serializers import ProductSerializer

from .models import CartItem, Order, OrderItem, ShippingAddress, SellerNotification, Coupon


class BusinessError(APIException):
    """Valid request, but breaks a business rule (e.g. not enough stock)."""
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
    quantity = serializers.IntegerField(min_value=1, max_value=99, default=1)


class CartUpdateSerializer(serializers.Serializer):
    quantity = serializers.IntegerField(min_value=1, max_value=99)


class OrderItemSerializer(serializers.ModelSerializer):
    line_total = serializers.SerializerMethodField()

    class Meta:
        model = OrderItem
        fields = ("id", "product", "name", "image_url", "price", "quantity", "line_total", "status")

    def get_line_total(self, obj):
        return f"{obj.line_total:.2f}"


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    code = serializers.CharField(read_only=True)
    status = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = ("id", "code", "status", "total", "subtotal", "discount_amount", "shipping_fee", "coupon_code", "coupon_reserved",
                  "payment_method", "payment_status", "payment_reference", "shipping_name", "phone", "email", "address",
                  "house_building", "street", "locality", "city", "state", "postal_code", "delivery_instructions", "created_at", "items")

    def get_status(self, obj):
        statuses = {i.status for i in obj.items.all()}
        if statuses == {"cancelled"}:
            return "cancelled"
        statuses.discard("cancelled")
        if statuses == {"delivered"}:
            return "delivered"
        for s in ("shipped", "confirmed"):
            if s in statuses:
                return s
        return "pending"


class CheckoutSerializer(serializers.Serializer):
    shipping_name = serializers.CharField(max_length=150)
    phone = serializers.CharField(max_length=20)
    address = serializers.CharField(max_length=300)
    city = serializers.CharField(max_length=100)
    postal_code = serializers.CharField(max_length=20)
    payment_method = serializers.ChoiceField(choices=["cod", "razorpay"], default="cod")
    coupon_code = serializers.CharField(max_length=40, required=False, allow_blank=True)
    email = serializers.EmailField(required=False, allow_blank=True)
    house_building = serializers.CharField(max_length=160, required=False, allow_blank=True)
    street = serializers.CharField(max_length=200, required=False, allow_blank=True)
    locality = serializers.CharField(max_length=160, required=False, allow_blank=True)
    state = serializers.CharField(max_length=100, required=False, allow_blank=True)
    delivery_instructions = serializers.CharField(max_length=500, required=False, allow_blank=True)

    def validate_postal_code(self, v):
        if not re.fullmatch(r"[0-9A-Za-z -]{4,10}", v.strip()):
            raise serializers.ValidationError("Enter a valid PIN/postal code.")
        return v.strip()

    def validate_phone(self, v):
        if not re.fullmatch(r"\+?[0-9 \-]{7,20}", v):
            raise serializers.ValidationError("Enter a valid phone number.")
        return v


class SellerOrderItemSerializer(serializers.ModelSerializer):
    order_code = serializers.CharField(source="order.code")
    created_at = serializers.DateTimeField(source="order.created_at")
    customer = serializers.CharField(source="order.user.name")
    ship_to = serializers.SerializerMethodField()
    line_total = serializers.SerializerMethodField()

    class Meta:
        model = OrderItem
        fields = ("id", "order_code", "created_at", "customer", "ship_to", "name", "image_url", "product",
                  "price", "quantity", "line_total", "status")

    def get_ship_to(self, obj):
        o = obj.order
        return f"{o.shipping_name}, {o.address}, {o.city} {o.postal_code} · {o.phone}"

    def get_line_total(self, obj):
        return f"{obj.line_total:.2f}"


class CouponSerializer(serializers.ModelSerializer):
    discount_value = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=0.01)
    minimum_order_value = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=0)

    class Meta:
        model = Coupon
        fields = ("id", "code", "discount_type", "discount_value", "minimum_order_value", "expires_at", "usage_limit", "usage_count", "reserved_count", "is_active", "seller", "created_at")
        read_only_fields = ("id", "usage_count", "reserved_count", "seller", "created_at")

    def validate_code(self, value):
        return value.strip().upper()

    def validate(self, attrs):
        typ = attrs.get("discount_type", getattr(self.instance, "discount_type", None))
        value = attrs.get("discount_value", getattr(self.instance, "discount_value", None))
        if value is not None and value <= 0:
            raise serializers.ValidationError({"discount_value": "Discount must be greater than zero."})
        if typ == "percentage" and value is not None and value > 100:
            raise serializers.ValidationError({"discount_value": "Percentage discount cannot exceed 100."})
        return attrs


class ShippingAddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = ShippingAddress
        exclude = ("user",)
        read_only_fields = ("id", "created_at", "updated_at")

    def validate_phone(self, value):
        if not re.fullmatch(r"\+?[0-9 ()-]{7,20}", value):
            raise serializers.ValidationError("Enter a valid phone number.")
        return value

    def validate_postal_code(self, value):
        if not re.fullmatch(r"[1-9][0-9]{5}", value.strip()):
            raise serializers.ValidationError("Enter a valid 6-digit Indian PIN code.")
        return value.strip()


class SellerNotificationSerializer(serializers.ModelSerializer):
    order_code = serializers.CharField(source="order.code", read_only=True, allow_null=True)
    class Meta:
        model = SellerNotification
        fields = ("id", "title", "message", "order", "order_code", "is_read", "created_at")
        read_only_fields = fields
