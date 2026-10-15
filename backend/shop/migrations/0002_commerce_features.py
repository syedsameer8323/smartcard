# Generated for SmartCart commerce features.
# Existing rows are preserved with safe defaults.


import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models
from django.db.models import F


def populate_legacy_order_fields(apps, schema_editor):
    Order = apps.get_model("shop", "Order")

    Order.objects.filter(subtotal=0).update(subtotal=F("total"))

    Order.objects.filter(
        payment_method="cod",
        payment_status="pending",
    ).update(payment_status="cod_pending")


# def populate_push_subscription_hashes(apps, schema_editor):
#     """
#     Populate hashes for any existing push subscriptions.

#     SHA-256 produces a fixed-length 64-character hexadecimal digest.
#     """
#     PushSubscription = apps.get_model("shop", "PushSubscription")

#     for subscription in PushSubscription.objects.all().iterator():
#         subscription.endpoint_hash = hashlib.sha256(
#             subscription.endpoint.encode("utf-8")
#         ).hexdigest()

#         subscription.save(update_fields=["endpoint_hash"])


class Migration(migrations.Migration):

    dependencies = [
        ("shop", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name="order",
            name="subtotal",
            field=models.DecimalField(
                decimal_places=2,
                default=0,
                max_digits=12,
            ),
        ),
        migrations.AddField(
            model_name="order",
            name="discount_amount",
            field=models.DecimalField(
                decimal_places=2,
                default=0,
                max_digits=12,
            ),
        ),
        migrations.AddField(
            model_name="order",
            name="shipping_fee",
            field=models.DecimalField(
                decimal_places=2,
                default=0,
                max_digits=10,
            ),
        ),
        migrations.AddField(
            model_name="order",
            name="coupon_code",
            field=models.CharField(
                blank=True,
                max_length=40,
            ),
        ),
        migrations.AddField(
            model_name="order",
            name="coupon_reserved",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="order",
            name="email",
            field=models.EmailField(
                blank=True,
                max_length=254,
            ),
        ),
        migrations.AddField(
            model_name="order",
            name="house_building",
            field=models.CharField(
                blank=True,
                max_length=160,
            ),
        ),
        migrations.AddField(
            model_name="order",
            name="street",
            field=models.CharField(
                blank=True,
                max_length=200,
            ),
        ),
        migrations.AddField(
            model_name="order",
            name="locality",
            field=models.CharField(
                blank=True,
                max_length=160,
            ),
        ),
        migrations.AddField(
            model_name="order",
            name="state",
            field=models.CharField(
                blank=True,
                max_length=100,
            ),
        ),
        migrations.AddField(
            model_name="order",
            name="delivery_instructions",
            field=models.CharField(
                blank=True,
                max_length=500,
            ),
        ),
        migrations.AddField(
            model_name="order",
            name="payment_status",
            field=models.CharField(
                db_index=True,
                default="pending",
                max_length=20,
            ),
        ),
        migrations.RunPython(
            populate_legacy_order_fields,
            migrations.RunPython.noop,
        ),
        migrations.AddField(
            model_name="order",
            name="payment_reference",
            field=models.CharField(
                blank=True,
                max_length=120,
            ),
        ),
        migrations.AddField(
            model_name="order",
            name="razorpay_order_id",
            field=models.CharField(
                blank=True,
                db_index=True,
                max_length=120,
            ),
        ),

        # Coupons
        migrations.CreateModel(
            name="Coupon",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "code",
                    models.CharField(
                        max_length=40,
                        unique=True,
                    ),
                ),
                (
                    "discount_type",
                    models.CharField(
                        choices=[
                            ("percentage", "Percentage"),
                            ("fixed", "Fixed amount"),
                        ],
                        max_length=12,
                    ),
                ),
                (
                    "discount_value",
                    models.DecimalField(
                        decimal_places=2,
                        max_digits=10,
                    ),
                ),
                (
                    "minimum_order_value",
                    models.DecimalField(
                        decimal_places=2,
                        default=0,
                        max_digits=12,
                    ),
                ),
                (
                    "expires_at",
                    models.DateTimeField(
                        blank=True,
                        null=True,
                    ),
                ),
                (
                    "usage_limit",
                    models.PositiveIntegerField(
                        blank=True,
                        null=True,
                    ),
                ),
                (
                    "usage_count",
                    models.PositiveIntegerField(default=0),
                ),
                (
                    "reserved_count",
                    models.PositiveIntegerField(default=0),
                ),
                (
                    "is_active",
                    models.BooleanField(default=True),
                ),
                (
                    "created_at",
                    models.DateTimeField(auto_now_add=True),
                ),
                (
                    "seller",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="coupons",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
        migrations.AddIndex(
            model_name="coupon",
            index=models.Index(
                fields=["code", "is_active"],
                name="shop_coupon_code_active_idx",
            ),
        ),

        # Saved shipping addresses
        migrations.CreateModel(
            name="ShippingAddress",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "label",
                    models.CharField(
                        default="Home",
                        max_length=50,
                    ),
                ),
                ("full_name", models.CharField(max_length=150)),
                ("phone", models.CharField(max_length=20)),
                ("email", models.EmailField(blank=True, max_length=254)),
                ("house_building", models.CharField(max_length=160)),
                ("street", models.CharField(max_length=200)),
                ("locality", models.CharField(max_length=160)),
                ("city", models.CharField(max_length=100)),
                ("state", models.CharField(max_length=100)),
                ("postal_code", models.CharField(max_length=10)),
                (
                    "delivery_instructions",
                    models.CharField(
                        blank=True,
                        max_length=500,
                    ),
                ),
                (
                    "is_default",
                    models.BooleanField(default=False),
                ),
                (
                    "created_at",
                    models.DateTimeField(auto_now_add=True),
                ),
                (
                    "updated_at",
                    models.DateTimeField(auto_now=True),
                ),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="shipping_addresses",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["-is_default", "-updated_at"],
            },
        ),

        # Seller notifications
        migrations.CreateModel(
            name="SellerNotification",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("title", models.CharField(max_length=160)),
                ("message", models.CharField(max_length=500)),
                (
                    "is_read",
                    models.BooleanField(
                        db_index=True,
                        default=False,
                    ),
                ),
                (
                    "created_at",
                    models.DateTimeField(auto_now_add=True),
                ),
                (
                    "order",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="seller_notifications",
                        to="shop.order",
                    ),
                ),
                (
                    "seller",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="seller_notifications",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),

        # Push subscriptions: index a short hash instead of the long URL.
        # migrations.CreateModel(
        #     name="PushSubscription",
        #     fields=[
        #         (
        #             "id",
        #             models.BigAutoField(
        #                 auto_created=True,
        #                 primary_key=True,
        #                 serialize=False,
        #                 verbose_name="ID",
        #             ),
        #         ),
        #         (
        #             "endpoint",
        #             models.URLField(max_length=1000),
        #         ),
        #         (
        #             "endpoint_hash",
        #             models.CharField(
        #                 max_length=64,
        #                 unique=True,
        #                 editable=False,
        #             ),
        #         ),
        #         ("p256dh", models.CharField(max_length=255)),
        #         ("auth", models.CharField(max_length=255)),
        #         (
        #             "created_at",
        #             models.DateTimeField(auto_now_add=True),
        #         ),
        #         (
        #             "updated_at",
        #             models.DateTimeField(auto_now=True),
        #         ),
        #         (
        #             "seller",
        #             models.ForeignKey(
        #                 on_delete=django.db.models.deletion.CASCADE,
        #                 related_name="push_subscriptions",
        #                 to=settings.AUTH_USER_MODEL,
        #             ),
        #         ),
        #     ],
        # ),
    ]