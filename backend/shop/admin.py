from django.contrib import admin
from .models import Coupon, Order, OrderItem, PushSubscription, SellerNotification, ShippingAddress

class ItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0

@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "total", "payment_status", "created_at")
    list_filter = ("payment_status", "payment_method", "created_at")
    inlines = [ItemInline]

@admin.register(Coupon)
class CouponAdmin(admin.ModelAdmin):
    list_display = ("code", "discount_type", "discount_value", "is_active", "usage_count", "usage_limit", "expires_at")
    list_filter = ("is_active", "discount_type")
    search_fields = ("code",)

admin.site.register(ShippingAddress)
admin.site.register(SellerNotification)
admin.site.register(PushSubscription)
