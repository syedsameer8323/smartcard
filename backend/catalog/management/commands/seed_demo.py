from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from catalog.models import Category, Product
from shop.models import Coupon
from users.models import Role, User

DEMO_PASSWORD = "Demo@12345!"  # development only; the command refuses to run with DEBUG=False

PRODUCTS = [
    ("electronics", "Aero Wireless Headphones", 2499.00, 40, "Over-ear Bluetooth headphones with active noise cancelling and 30-hour battery life."),
    ("electronics", "Pulse Smartwatch S2", 3299.00, 25, "Fitness tracking, heart-rate monitoring and a bright always-on display."),
    ("electronics", "Nova 65W GaN Charger", 899.00, 3, "Compact dual-port fast charger for laptops and phones."),
    ("electronics", "Studio Mechanical Keyboard", 4499.00, 0, "Hot-swappable switches, aluminium frame and warm white backlight."),
    ("fashion", "Linen Weekender Bag", 1799.00, 18, "Roomy, lightweight carry-all in breathable washed linen."),
    ("fashion", "Everyday Merino Sweater", 2299.00, 32, "Soft, temperature-regulating merino knit that works year-round."),
    ("fashion", "Trail Runner Sneakers", 2999.00, 4, "Cushioned, grippy sneakers built for city streets and light trails."),
    ("home-living", "Studio Desk Lamp", 1299.00, 60, "Adjustable LED lamp with three colour temperatures and a USB port."),
    ("home-living", "Stoneware Mug Set (4)", 699.00, 50, "Hand-glazed stoneware mugs, dishwasher and microwave safe."),
    ("home-living", "Cotton Throw Blanket", 999.00, 22, "Woven throw with a relaxed, lived-in texture."),
    ("beauty", "Daily Mineral Sunscreen SPF 50", 499.00, 120, "Lightweight, non-greasy broad-spectrum protection."),
    ("beauty", "Vitamin C Glow Serum", 799.00, 45, "Brightening serum with 10% vitamin C and hyaluronic acid."),
    ("sports", "Grip Pro Yoga Mat", 1199.00, 70, "6mm non-slip mat with alignment guides."),
    ("sports", "Adjustable Dumbbell Pair", 1999.00, 12, "Quick-change dumbbells from 2 to 24 kg."),
    ("books", "The Design of Everyday Things", 599.00, 85, "A classic on usability and human-centred design."),
    ("toys", "Wooden Building Blocks (100pc)", 899.00, 35, "Smooth-sanded beechwood blocks in a cotton storage bag."),
]


class Command(BaseCommand):
    help = "Create demo seller, customer and sample products (development only)."

    def handle(self, *args, **opts):
        if not settings.DEBUG:
            raise CommandError("seed_demo only runs with DEBUG=True.")
        seller, _ = User.objects.get_or_create(email="seller@smartcart.test", defaults={"name": "Northwind Goods", "role": Role.SELLER})
        customer, _ = User.objects.get_or_create(email="customer@smartcart.test", defaults={"name": "Alex Morgan", "role": Role.CUSTOMER})
        for u in (seller, customer):
            u.set_password(DEMO_PASSWORD)
            u.save()
        image_urls = {
            "Aero Wireless Headphones": "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=80",
            "Pulse Smartwatch S2": "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=900&q=80",
            "Nova 65W GaN Charger": "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=900&q=80",
            "Studio Mechanical Keyboard": "https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=900&q=80",
            "Linen Weekender Bag": "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=900&q=80",
            "Everyday Merino Sweater": "https://images.unsplash.com/photo-1576566588028-4147f3842f27?auto=format&fit=crop&w=900&q=80",
            "Trail Runner Sneakers": "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80",
            "Studio Desk Lamp": "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=900&q=80",
            "Stoneware Mug Set (4)": "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?auto=format&fit=crop&w=900&q=80",
            "Cotton Throw Blanket": "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=900&q=80",
            "Daily Mineral Sunscreen SPF 50": "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=900&q=80",
            "Vitamin C Glow Serum": "https://images.unsplash.com/photo-1601049541289-9b1b7bbbfe19?auto=format&fit=crop&w=900&q=80",
            "Grip Pro Yoga Mat": "https://images.unsplash.com/photo-1592432678016-e910b452f9a2?auto=format&fit=crop&w=900&q=80",
            "Adjustable Dumbbell Pair": "https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?auto=format&fit=crop&w=900&q=80",
            "The Design of Everyday Things": "https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=900&q=80",
            "Wooden Building Blocks (100pc)": "https://images.unsplash.com/photo-1599623560574-39d485900c95?auto=format&fit=crop&w=900&q=80",
        }
        legacy_demo_prices = {
            "Aero Wireless Headphones": 129.00, "Pulse Smartwatch S2": 189.00, "Nova 65W GaN Charger": 39.50,
            "Studio Mechanical Keyboard": 94.00, "Linen Weekender Bag": 78.00, "Everyday Merino Sweater": 64.90,
            "Trail Runner Sneakers": 110.00, "Studio Desk Lamp": 45.00, "Stoneware Mug Set (4)": 32.00,
            "Cotton Throw Blanket": 49.00, "Daily Mineral Sunscreen SPF 50": 18.50, "Vitamin C Glow Serum": 27.00,
            "Grip Pro Yoga Mat": 36.00, "Adjustable Dumbbell Pair": 149.00, "The Design of Everyday Things": 16.99,
            "Wooden Building Blocks (100pc)": 29.00,
        }
        created = 0
        for slug, name, price, stock, desc in PRODUCTS:
            cat = Category.objects.filter(slug=slug).first()
            product, new = Product.objects.get_or_create(seller=seller, name=name, defaults={
                "category": cat, "price": price, "stock": stock, "description": desc,
                "image_url": image_urls.get(name, "")})
            created += new
            # Upgrade only this command's known demo seller records from the original sample USD values.
            # Other sellers' catalog and real inventory are never changed by seeding.
            changed = []
            if not new and product.price == legacy_demo_prices.get(name) and not product.image_url:
                product.price = price
                changed.append("price")
            if not product.image_url and image_urls.get(name):
                product.image_url = image_urls[name]
                changed.append("image_url")
            if changed:
                product.save(update_fields=changed + ["updated_at"])
        Coupon.objects.get_or_create(code="SMART10", defaults={"discount_type": "percentage", "discount_value": 10,
            "minimum_order_value": 499, "is_active": True, "usage_limit": 100, "seller": seller})
        self.stdout.write(self.style.SUCCESS(f"{created} products created. Demo coupon SMART10 is available."))
        self.stdout.write(f"Seller:   seller@smartcart.test   / {DEMO_PASSWORD}")
        self.stdout.write(f"Customer: customer@smartcart.test / {DEMO_PASSWORD}")
