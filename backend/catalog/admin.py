from django.contrib import admin

from .models import Category, FestivalOffer, Product


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "icon")
    prepopulated_fields = {"slug": ("name",)}


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("name", "seller", "category", "price", "stock", "is_active")
    list_filter = ("is_active", "category")
    search_fields = ("name", "seller__email")


@admin.register(FestivalOffer)
class FestivalOfferAdmin(admin.ModelAdmin):
    list_display = ("name", "seller", "discount_percent", "starts_at", "ends_at", "is_active", "apply_to_all")
    list_filter = ("is_active", "festival", "apply_to_all")
    search_fields = ("name", "seller__email")
    filter_horizontal = ("products",)
