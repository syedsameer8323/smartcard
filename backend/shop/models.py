from django.conf import settings
from django.db import models
import hashlib
from catalog.models import Product


class CartItem(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="cart_items",
    )
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField(default=1)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["user", "product"],
                name="uniq_cart_user_product",
            )
        ]
        ordering = ["-updated_at"]


class WishlistItem(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="wishlist_items",
    )
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["user", "product"],
                name="uniq_wish_user_product",
            )
        ]
        ordering = ["-created_at"]


class Order(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="orders",
    )
    shipping_name = models.CharField(max_length=150)
    phone = models.CharField(max_length=20)
    address = models.CharField(max_length=300)
    city = models.CharField(max_length=100)
    postal_code = models.CharField(max_length=20)

    payment_method = models.CharField(max_length=20, default="cod")
    total = models.DecimalField(max_digits=12, decimal_places=2)
    subtotal = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
    )
    discount_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
    )
    shipping_fee = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
    )
    coupon_code = models.CharField(max_length=40, blank=True)
    coupon_reserved = models.BooleanField(default=False)

    email = models.EmailField(blank=True)
    house_building = models.CharField(max_length=160, blank=True)
    street = models.CharField(max_length=200, blank=True)
    locality = models.CharField(max_length=160, blank=True)
    state = models.CharField(max_length=100, blank=True)
    delivery_instructions = models.CharField(max_length=500, blank=True)

    payment_status = models.CharField(
        max_length=20,
        default="pending",
        db_index=True,
    )
    payment_reference = models.CharField(max_length=120, blank=True)
    razorpay_order_id = models.CharField(
        max_length=120,
        blank=True,
        db_index=True,
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    @property
    def code(self):
        return f"ORD-{self.pk:06d}"


class OrderItem(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        CONFIRMED = "confirmed", "Confirmed"
        PROCESSING = "processing", "Processing"
        SHIPPED = "shipped", "Shipped"
        OUT_FOR_DELIVERY = "out_for_delivery", "Out for Delivery"
        DELIVERED = "delivered", "Delivered"
        CANCELLED = "cancelled", "Cancelled"

    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name="items",
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.SET_NULL,
        null=True,
        related_name="order_items",
    )
    seller = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="sales",
    )

    # Product snapshots preserve order history.
    name = models.CharField(max_length=160)
    image_url = models.URLField(max_length=500, blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    quantity = models.PositiveIntegerField()

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
    )

    # Latest status update time.
    status_updated_at = models.DateTimeField(auto_now=True)

    # Timestamps for the order-tracking timeline.
    confirmed_at = models.DateTimeField(null=True, blank=True)
    processing_at = models.DateTimeField(null=True, blank=True)
    shipped_at = models.DateTimeField(null=True, blank=True)
    out_for_delivery_at = models.DateTimeField(null=True, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["id"]

    @property
    def line_total(self):
        return self.price * self.quantity


class Coupon(models.Model):
    class DiscountType(models.TextChoices):
        PERCENTAGE = "percentage", "Percentage"
        FIXED = "fixed", "Fixed amount"

    code = models.CharField(max_length=40, unique=True)
    discount_type = models.CharField(
        max_length=12,
        choices=DiscountType.choices,
    )
    discount_value = models.DecimalField(
        max_digits=10,
        decimal_places=2,
    )
    minimum_order_value = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
    )
    expires_at = models.DateTimeField(null=True, blank=True)
    usage_limit = models.PositiveIntegerField(null=True, blank=True)
    usage_count = models.PositiveIntegerField(default=0)
    reserved_count = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    seller = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="coupons",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(
                fields=["code", "is_active"],
                name="shop_coupon_code_active_idx",
            )
        ]

    def __str__(self):
        return self.code


class ShippingAddress(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="shipping_addresses",
    )
    label = models.CharField(max_length=50, default="Home")
    full_name = models.CharField(max_length=150)
    phone = models.CharField(max_length=20)
    email = models.EmailField(blank=True)

    house_building = models.CharField(max_length=160)
    street = models.CharField(max_length=200)
    locality = models.CharField(max_length=160)
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    postal_code = models.CharField(max_length=10)

    delivery_instructions = models.CharField(max_length=500, blank=True)
    is_default = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-is_default", "-updated_at"]


class SellerNotification(models.Model):
    seller = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="seller_notifications",
    )
    title = models.CharField(max_length=160)
    message = models.CharField(max_length=500)

    order = models.ForeignKey(
        Order,
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="seller_notifications",
    )

    is_read = models.BooleanField(default=False, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]


class PushSubscription(models.Model):
    seller = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="push_subscriptions",
    )
    endpoint = models.URLField(max_length=1000)
    endpoint_hash = models.CharField(
        max_length=64,
        unique=True,
        editable=False,
    )
    p256dh = models.CharField(max_length=255)
    auth = models.CharField(max_length=255)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def save(self, *args, **kwargs):
        self.endpoint_hash = hashlib.sha256(
            self.endpoint.encode("utf-8")
        ).hexdigest()
        super().save(*args, **kwargs)


class OrderEmailNotification(models.Model):
    class Event(models.TextChoices):
        SELLER_NEW_ORDER = "seller_new_order", "Seller new order"
        SELLER_ORDER_CANCELLED = "seller_order_cancelled", "Seller order cancelled"
        ORDER_PLACED = "order_placed", "Order placed"
        PAYMENT_SUCCESSFUL = "payment_successful", "Payment successful"
        ORDER_CONFIRMED = "order_confirmed", "Order confirmed"
        ORDER_SHIPPED = "order_shipped", "Order shipped"
        OUT_FOR_DELIVERY = "out_for_delivery", "Out for delivery"
        ORDER_DELIVERED = "order_delivered", "Order delivered"
        ORDER_CANCELLED = "order_cancelled", "Order cancelled"

    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name="email_notifications",
    )
    event = models.CharField(
        max_length=30,
        choices=Event.choices,
    )
    recipient_email = models.EmailField()
    sent_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["order", "event", "recipient_email"],
                name="uniq_order_email_event_recipient",
            )
        ]        