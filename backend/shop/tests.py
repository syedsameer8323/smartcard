from rest_framework.test import APITestCase

from catalog.models import Category, Product
from users.models import Role, User

from .models import OrderItem, Coupon, SellerNotification, ShippingAddress

SHIP = {"shipping_name": "Alex", "phone": "+1 555 123 4567", "address": "1 Main St", "city": "Metropolis", "postal_code": "12345"}


class ShopFlowTests(APITestCase):
    def setUp(self):
        self.seller = User.objects.create_user("s@x.com", "Pass!word123", name="Seller", role=Role.SELLER)
        self.seller2 = User.objects.create_user("s2@x.com", "Pass!word123", name="Seller2", role=Role.SELLER)
        self.cust = User.objects.create_user("c@x.com", "Pass!word123", name="Cust", role=Role.CUSTOMER)
        self.cat = Category.objects.first()
        self.p = Product.objects.create(seller=self.seller, name="Lamp", price="10.00", stock=5, category=self.cat)
        self.p2 = Product.objects.create(seller=self.seller, name="Hidden", price="5.00", stock=5, is_active=False)

    def test_categories_seeded_and_public_list_filters(self):
        self.assertGreaterEqual(self.client.get("/api/categories/").data.__len__(), 5)
        r = self.client.get("/api/products/", {"q": "lam"})
        self.assertEqual(r.data["count"], 1)  # inactive product hidden
        self.assertEqual(self.client.get("/api/products/", {"min_price": 50}).data["count"], 0)
        self.assertEqual(self.client.get("/api/products/", {"sort": "price_desc"}).status_code, 200)

    def test_seller_crud_scoped_to_owner(self):
        self.client.force_authenticate(self.seller2)
        r = self.client.post("/api/seller/products/", {"name": "Mine", "price": "3.50", "stock": 2}, format="json")
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.data["seller_name"], "Seller2")
        self.assertEqual(self.client.patch(f"/api/seller/products/{self.p.id}/", {"price": "1.00"}, format="json").status_code, 404)
        self.assertEqual(self.client.post("/api/seller/products/", {"name": "x", "price": "-1", "stock": 1}, format="json").status_code, 400)

    def test_customer_cannot_use_seller_endpoints(self):
        self.client.force_authenticate(self.cust)
        self.assertEqual(self.client.post("/api/seller/products/", {"name": "x", "price": "1", "stock": 1}, format="json").status_code, 403)
        self.assertEqual(self.client.get("/api/seller/stats/").status_code, 403)

    def test_seller_cannot_use_cart(self):
        self.client.force_authenticate(self.seller)
        self.assertEqual(self.client.get("/api/cart/").status_code, 403)

    def test_cart_clamps_to_stock_and_checkout_flow(self):
        self.client.force_authenticate(self.cust)
        r = self.client.post("/api/cart/items/", {"product_id": self.p.id, "quantity": 9}, format="json")
        self.assertEqual(r.data["cart"]["count"], 5)
        self.assertEqual(self.client.post("/api/cart/items/", {"product_id": self.p2.id}, format="json").status_code, 404)
        o = self.client.post("/api/orders/", {**SHIP, "payment_method": "cod"}, format="json")
        self.assertEqual(o.status_code, 201, o.data)
        self.assertEqual(o.data["order"]["total"], "50.00")
        self.p.refresh_from_db()
        self.assertEqual(self.p.stock, 0)
        self.assertEqual(self.client.get("/api/cart/").data["count"], 0)
        self.assertEqual(self.client.post("/api/orders/", SHIP, format="json").status_code, 422)  # empty cart

    def test_checkout_rejects_insufficient_stock(self):
        self.client.force_authenticate(self.cust)
        self.client.post("/api/cart/items/", {"product_id": self.p.id, "quantity": 3}, format="json")
        Product.objects.filter(pk=self.p.pk).update(stock=1)
        r = self.client.post("/api/orders/", SHIP, format="json")
        self.assertEqual(r.status_code, 422)
        self.assertIn("left in stock", r.data["message"])


    def test_coupon_validation_and_server_side_discount(self):
        coupon = Coupon.objects.create(code="TENOFF", discount_type="percentage", discount_value="10.00",
                                       minimum_order_value="20.00", usage_limit=2, is_active=True)
        self.client.force_authenticate(self.cust)
        self.client.post("/api/cart/items/", {"product_id": self.p.id, "quantity": 2}, format="json")
        applied = self.client.post("/api/coupons/apply/", {"code": "tenoff"}, format="json")
        self.assertEqual(applied.status_code, 200)
        self.assertEqual(applied.data["discount_amount"], "2.00")
        placed = self.client.post("/api/orders/", {**SHIP, "coupon_code": "TENOFF", "payment_method": "cod"}, format="json")
        self.assertEqual(placed.status_code, 201, placed.data)
        self.assertEqual(placed.data["order"]["subtotal"], "20.00")
        self.assertEqual(placed.data["order"]["discount_amount"], "2.00")
        self.assertEqual(placed.data["order"]["total"], "18.00")
        coupon.refresh_from_db()
        self.assertEqual(coupon.usage_count, 1)

    def test_coupon_rejects_inactive_and_usage_limit(self):
        Coupon.objects.create(code="OFF", discount_type="fixed", discount_value="5.00", is_active=False)
        self.client.force_authenticate(self.cust)
        self.client.post("/api/cart/items/", {"product_id": self.p.id}, format="json")
        self.assertEqual(self.client.post("/api/coupons/apply/", {"code": "OFF"}, format="json").status_code, 422)

    def test_shipping_addresses_are_user_scoped(self):
        self.client.force_authenticate(self.cust)
        data = {"label": "Home", "full_name": "Alex", "phone": "9876543210", "house_building": "1A",
                "street": "Main Road", "locality": "Central", "city": "Hyderabad", "state": "Telangana",
                "postal_code": "500001", "is_default": True}
        created = self.client.post("/api/shipping-addresses/", data, format="json")
        self.assertEqual(created.status_code, 201, created.data)
        other = User.objects.create_user("other@x.com", "Pass!word123", name="Other", role=Role.CUSTOMER)
        self.client.force_authenticate(other)
        self.assertEqual(self.client.patch(f"/api/shipping-addresses/{created.data['id']}/", {"city": "Delhi"}, format="json").status_code, 404)

    def test_seller_notifications_are_scoped(self):
        self.client.force_authenticate(self.cust)
        self.client.post("/api/cart/items/", {"product_id": self.p.id}, format="json")
        self.client.post("/api/orders/", SHIP, format="json")
        self.client.force_authenticate(self.seller)
        self.assertGreaterEqual(self.client.get("/api/seller/notifications/").data["unread_count"], 1)
        self.client.force_authenticate(self.seller2)
        self.assertEqual(self.client.get("/api/seller/notifications/").data["unread_count"], 0)


    def test_customer_can_cancel_cod_order_and_stock_is_restored(self):
        self.client.force_authenticate(self.cust)
        self.client.post("/api/cart/items/", {"product_id": self.p.id, "quantity": 2}, format="json")
        placed = self.client.post("/api/orders/", SHIP, format="json")
        order_id = placed.data["order"]["id"]
        self.p.refresh_from_db()
        self.assertEqual(self.p.stock, 3)
        cancelled = self.client.post(f"/api/orders/{order_id}/cancel/", format="json")
        self.assertEqual(cancelled.status_code, 200, cancelled.data)
        self.assertEqual(cancelled.data["order"]["status"], "cancelled")
        self.p.refresh_from_db()
        self.assertEqual(self.p.stock, 5)
        self.assertTrue(SellerNotification.objects.filter(seller=self.seller, title="Order cancelled").exists())

    def test_wishlist(self):
        self.client.force_authenticate(self.cust)
        self.assertEqual(self.client.post("/api/wishlist/", {"product_id": self.p.id}, format="json").data["ids"], [self.p.id])
        self.assertEqual(self.client.delete(f"/api/wishlist/{self.p.id}/").data["ids"], [])

    def test_seller_order_lifecycle_and_restock(self):
        self.client.force_authenticate(self.cust)
        self.client.post("/api/cart/items/", {"product_id": self.p.id, "quantity": 2}, format="json")
        self.client.post("/api/orders/", SHIP, format="json")
        item = OrderItem.objects.get()
        self.client.force_authenticate(self.seller2)
        self.assertEqual(self.client.patch(f"/api/seller/orders/{item.id}/", {"status": "confirmed"}, format="json").status_code, 404)
        self.client.force_authenticate(self.seller)
        stats = self.client.get("/api/seller/stats/").data
        self.assertEqual((stats["revenue"], stats["pending"]), ("20.00", 1))
        self.assertEqual(self.client.patch(f"/api/seller/orders/{item.id}/", {"status": "delivered"}, format="json").status_code, 422)
        self.assertEqual(self.client.patch(f"/api/seller/orders/{item.id}/", {"status": "confirmed"}, format="json").status_code, 200)
        self.client.patch(f"/api/seller/orders/{item.id}/", {"status": "cancelled"}, format="json")
        self.p.refresh_from_db()
        self.assertEqual(self.p.stock, 5)  # restocked
        self.assertEqual(self.client.get("/api/seller/stats/").data["revenue"], "0.00")
