from decimal import Decimal

from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils import timezone


class Category(models.Model):
    name = models.CharField(max_length=80, unique=True)
    slug = models.SlugField(unique=True)
    icon = models.CharField(max_length=8, blank=True)  # emoji shown on tiles / placeholders

    class Meta:
        ordering = ["name"]
        verbose_name_plural = "categories"

    def __str__(self):
        return self.name


class Product(models.Model):
    seller = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="products")
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True, related_name="products")
    name = models.CharField(max_length=160)
    description = models.TextField(blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal("0.01"))])
    stock = models.PositiveIntegerField(default=0)
    image_url = models.URLField(max_length=500, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["is_active", "-created_at"]), models.Index(fields=["price"])]

    def __str__(self):
        return self.name


class FestivalOffer(models.Model):
    """A time-limited sale a seller runs on some (or all) of their own products.

    The seller's list price (Product.price) is never changed. The discounted price is
    calculated on the server whenever a price is shown, added to a cart or charged.
    """

    FESTIVALS = [
        ("diwali", "Diwali"), ("dussehra", "Dussehra"), ("navratri", "Navratri"), ("holi", "Holi"),
        ("eid", "Eid"), ("christmas", "Christmas"), ("new_year", "New Year"),
        ("republic_day", "Republic Day"), ("independence_day", "Independence Day"),
        ("raksha_bandhan", "Raksha Bandhan"), ("custom", "Custom sale"),
    ]

    seller = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="festival_offers")
    name = models.CharField(max_length=80)
    festival = models.CharField(max_length=20, choices=FESTIVALS, default="custom")
    discount_percent = models.DecimalField(
        max_digits=5, decimal_places=2,
        validators=[MinValueValidator(Decimal("1")), MaxValueValidator(Decimal("90"))],
    )
    starts_at = models.DateTimeField()
    ends_at = models.DateTimeField()
    is_active = models.BooleanField(default=True)
    apply_to_all = models.BooleanField(default=True)
    products = models.ManyToManyField(Product, blank=True, related_name="festival_offers")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-starts_at", "-id"]
        indexes = [models.Index(fields=["is_active", "starts_at", "ends_at"], name="offer_active_window_idx")]

    def __str__(self):
        return f"{self.name} ({self.discount_percent}%)"

    @property
    def status(self):
        now = timezone.now()
        if not self.is_active:
            return "paused"
        if self.ends_at <= now:
            return "ended"
        if self.starts_at > now:
            return "scheduled"
        return "live"
