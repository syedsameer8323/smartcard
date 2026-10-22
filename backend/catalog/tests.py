from datetime import timedelta
from decimal import Decimal

from django.utils import timezone
from rest_framework.test import APITestCase

from users.models import Role, User

from .models import Category, FestivalOffer, Product

SHIP = {"shipping_name": "Alex", "phone": "+1 555 123 4567", "address": "1 Main St", "city": "Metropolis", "postal_code": "12345"}


def make_offer(seller, percent="20", *, products=None, starts=-1, ends=5, **extra):
    now = timezone.now()
    offer = FestivalOffer.objects.create(
        seller=seller, name=extra.pop("name", "Diwali Dhamaka"), festival=extra.pop("festival", "diwali"),
        discount_percent=Decimal(percent), starts_at=now + timedelta(days=starts), ends_at=now + timedelta(days=ends),
        apply_to_all=products is None, **extra,
    )
    if products:
        offer.products.set(products)
    return offer


class FestivalOfferPricingTests(APITestCase):
    def setUp(self):
        self.s1 = User.objects.create_user("s1@x.com", "Pass!word123", name="Seller1", role=Role.SELLER)
        self.s2 = User.objects.create_user("s2@x.com", "Pass!word123", name="Seller2", role=Role.SELLER)
        self.cust = User.objects.create_user("c@x.com", "Pass!word123", name="Cust", role=Role.CUSTOMER)
        cat = Category.objects.first()
        self.lamp = Product.objects.create(seller=self.s1, name="Lamp", price="1000.00", stock=10, category=cat)
        self.diya = Product.objects.create(seller=self.s1, name="Diya", price="100.00", stock=10, category=cat)
        self.other = Product.objects.create(seller=self.s2, name="Rangoli", price="500.00", stock=10, category=cat)

    def product(self, p):
        return self.client.get(f"/api/products/{p.id}/").data

    def test_no_offer_means_list_price(self):
        d = self.product(self.lamp)
        self.assertEqual(d["sale_price"], "1000.00")
        self.assertIsNone(d["offer"])
        self.assertIsNone(d["discount_percent"])

    def test_live_offer_on_all_products_discounts_only_that_sellers_items(self):
        make_offer(self.s1, "20")
        d = self.product(self.lamp)
        self.assertEqual(d["price"], "1000.00")        # list price is never changed
        self.assertEqual(d["sale_price"], "800.00")
        self.assertEqual(d["discount_percent"], "20")
        self.assertEqual(d["offer"]["name"], "Diwali Dhamaka")
        self.assertEqual(self.product(self.other)["sale_price"], "500.00")

    def test_offer_on_selected_products_only(self):
        make_offer(self.s1, "10", products=[self.lamp])
        self.assertEqual(self.product(self.lamp)["sale_price"], "900.00")
        self.assertEqual(self.product(self.diya)["sale_price"], "100.00")

    def test_scheduled_ended_and_paused_offers_do_not_apply(self):
        make_offer(self.s1, "50", starts=2, ends=9)
        make_offer(self.s1, "50", starts=-9, ends=-2)
        make_offer(self.s1, "50", is_active=False)
        self.assertEqual(self.product(self.lamp)["sale_price"], "1000.00")

    def test_best_discount_wins_when_offers_overlap(self):
        make_offer(self.s1, "10")
        make_offer(self.s1, "25", name="Dussehra Sale", festival="dussehra", products=[self.lamp])
        self.assertEqual(self.product(self.lamp)["sale_price"], "750.00")
        self.assertEqual(self.product(self.diya)["sale_price"], "90.00")

    def test_rounding_to_paise(self):
        Product.objects.filter(pk=self.diya.pk).update(price="99.99")
        make_offer(self.s1, "15")
        self.assertEqual(self.product(self.diya)["sale_price"], "84.99")  # 84.9915 -> 84.99

    def test_shop_sorts_and_filters_by_the_price_customers_pay(self):
        make_offer(self.s1, "60", products=[self.lamp])  # lamp 1000 -> 400, now cheaper than rangoli 500
        r = self.client.get("/api/products/", {"sort": "price_desc"}).data["results"]
        self.assertEqual([p["name"] for p in r], ["Rangoli", "Lamp", "Diya"])
        r = self.client.get("/api/products/", {"min_price": 450}).data
        self.assertEqual([p["name"] for p in r["results"]], ["Rangoli"])
        r = self.client.get("/api/products/", {"max_price": 450}).data
        self.assertEqual({p["name"] for p in r["results"]}, {"Lamp", "Diya"})

    def test_offer_filter_and_active_offers_endpoint(self):
        self.assertEqual(self.client.get("/api/offers/active/").data, {"product_count": 0, "offers": []})
        make_offer(self.s1, "20", products=[self.lamp])
        r = self.client.get("/api/products/", {"offer": "true"}).data
        self.assertEqual([p["name"] for p in r["results"]], ["Lamp"])
        a = self.client.get("/api/offers/active/").data
        self.assertEqual(a["product_count"], 1)
        self.assertEqual(a["offers"][0]["festival"], "diwali")
        self.assertEqual(a["offers"][0]["max_discount_percent"], "20")

    def test_cart_checkout_and_order_snapshot_use_festival_price(self):
        make_offer(self.s1, "20", products=[self.lamp])
        self.client.force_authenticate(self.cust)
        self.client.post("/api/cart/items/", {"product_id": self.lamp.id, "quantity": 2}, format="json")
        cart = self.client.get("/api/cart/").data
        self.assertEqual(cart["subtotal"], "1600.00")
        self.assertEqual(cart["offer_savings"], "400.00")
        self.assertEqual(cart["items"][0]["line_total"], "1600.00")
        o = self.client.post("/api/orders/", {**SHIP, "payment_method": "cod"}, format="json")
        self.assertEqual(o.status_code, 201, o.data)
        self.assertEqual(o.data["order"]["total"], "1600.00")
        self.assertEqual(o.data["order"]["offer_savings"], "400.00")
        item = o.data["order"]["items"][0]
        self.assertEqual((item["price"], item["list_price"], item["offer_name"]), ("800.00", "1000.00", "Diwali Dhamaka"))
        # The price paid is frozen: ending the sale later does not change the order.
        FestivalOffer.objects.update(is_active=False)
        self.assertEqual(self.client.get("/api/orders/").data[0]["items"][0]["price"], "800.00")

    def test_percentage_coupon_applies_on_top_of_festival_price(self):
        from shop.models import Coupon
        make_offer(self.s1, "20", products=[self.lamp])
        Coupon.objects.create(code="EXTRA10", discount_type="percentage", discount_value=10, seller=self.s1)
        self.client.force_authenticate(self.cust)
        self.client.post("/api/cart/items/", {"product_id": self.lamp.id}, format="json")
        r = self.client.post("/api/coupons/apply/", {"code": "EXTRA10"}, format="json")
        self.assertEqual((r.data["discount_amount"], r.data["total"]), ("80.00", "720.00"))  # 10% of 800


class SellerOfferApiTests(APITestCase):
    def setUp(self):
        self.s1 = User.objects.create_user("s1@x.com", "Pass!word123", name="Seller1", role=Role.SELLER)
        self.s2 = User.objects.create_user("s2@x.com", "Pass!word123", name="Seller2", role=Role.SELLER)
        self.cust = User.objects.create_user("c@x.com", "Pass!word123", name="Cust", role=Role.CUSTOMER)
        self.mine = Product.objects.create(seller=self.s1, name="Mine", price="100.00", stock=3)
        self.theirs = Product.objects.create(seller=self.s2, name="Theirs", price="100.00", stock=3)
        now = timezone.now()
        self.payload = {"name": "Diwali Sale", "festival": "diwali", "discount_percent": "15", "apply_to_all": True,
                        "starts_at": (now - timedelta(hours=1)).isoformat(), "ends_at": (now + timedelta(days=3)).isoformat()}

    def test_seller_creates_lists_edits_pauses_and_deletes(self):
        self.client.force_authenticate(self.s1)
        r = self.client.post("/api/seller/offers/", self.payload, format="json")
        self.assertEqual(r.status_code, 201, r.data)
        self.assertEqual(r.data["status"], "live")
        oid = r.data["id"]
        self.assertEqual(len(self.client.get("/api/seller/offers/").data), 1)
        self.assertEqual(self.client.patch(f"/api/seller/offers/{oid}/", {"is_active": False}, format="json").data["status"], "paused")
        self.assertEqual(self.client.delete(f"/api/seller/offers/{oid}/").status_code, 204)

    def test_validation_rules(self):
        self.client.force_authenticate(self.s1)
        post = lambda **kw: self.client.post("/api/seller/offers/", {**self.payload, **kw}, format="json")
        self.assertEqual(post(discount_percent="0").status_code, 400)
        self.assertEqual(post(discount_percent="95").status_code, 400)
        past = (timezone.now() - timedelta(days=1)).isoformat()
        self.assertEqual(post(ends_at=past).status_code, 400)               # must end in the future
        self.assertEqual(post(apply_to_all=False).status_code, 400)         # needs products
        self.assertEqual(post(apply_to_all=False, product_ids=[self.theirs.id]).status_code, 400)  # someone else's product
        self.assertEqual(post(apply_to_all=False, product_ids=[self.mine.id]).status_code, 201)

    def test_sellers_only_see_and_touch_their_own_offers(self):
        offer = make_offer(self.s1, "10")
        self.client.force_authenticate(self.s2)
        self.assertEqual(self.client.get("/api/seller/offers/").data, [])
        self.assertEqual(self.client.patch(f"/api/seller/offers/{offer.id}/", {"is_active": False}, format="json").status_code, 404)

    def test_customers_and_anonymous_cannot_manage_offers(self):
        self.assertIn(self.client.get("/api/seller/offers/").status_code, (401, 403))
        self.client.force_authenticate(self.cust)
        self.assertEqual(self.client.post("/api/seller/offers/", self.payload, format="json").status_code, 403)
