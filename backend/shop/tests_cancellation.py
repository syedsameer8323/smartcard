from datetime import timedelta
from decimal import Decimal
from unittest import mock

from django.utils import timezone
from rest_framework.test import APITestCase

from catalog.models import Category, Product
from users.models import Role, User

from .models import Coupon, Order, OrderItem, SellerNotification
from .refunds import RefundError, item_net_shares

SHIP = {"shipping_name": "Alex", "phone": "+1 555 123 4567", "address": "1 Main St", "city": "Metropolis", "postal_code": "12345"}
REFUND = "shop.cancellation.start_refund"


class CancellationBase(APITestCase):
    def setUp(self):
        self.seller = User.objects.create_user("s@x.com", "Pass!word123", name="Seller", role=Role.SELLER)
        self.cust = User.objects.create_user("c@x.com", "Pass!word123", name="Cust", role=Role.CUSTOMER)
        self.other = User.objects.create_user("o@x.com", "Pass!word123", name="Other", role=Role.CUSTOMER)
        cat = Category.objects.first()
        self.a = Product.objects.create(seller=self.seller, name="A", price="100.00", stock=10, category=cat)
        self.b = Product.objects.create(seller=self.seller, name="B", price="300.00", stock=10, category=cat)

    def place(self, method="cod", coupon=None, items=((None, 1), (None, 1))):
        self.client.force_authenticate(self.cust)
        for product, qty in ((self.a, 1), (self.b, 1)):
            self.client.post("/api/cart/items/", {"product_id": product.id, "quantity": qty}, format="json")
        payload = {**SHIP, "payment_method": method}
        if coupon:
            payload["coupon_code"] = coupon
        r = self.client.post("/api/orders/", payload, format="json")
        self.assertEqual(r.status_code, 201, r.data)
        return Order.objects.get(pk=r.data["order"]["id"])

    def pay(self, order, reference="pay_123"):
        Order.objects.filter(pk=order.pk).update(payment_status="paid", payment_reference=reference, coupon_reserved=False)
        OrderItem.objects.filter(order=order, status="pending").update(status="confirmed")
        order.refresh_from_db()

    def cancel(self, order, **body):
        body.setdefault("reason", "changed_mind")
        self.client.force_authenticate(self.cust)
        return self.client.post(f"/api/orders/{order.id}/cancel/", body, format="json")


class CustomerCancellationTests(CancellationBase):
    def test_cod_cancel_restores_stock_and_records_reason(self):
        order = self.place()
        r = self.cancel(order, reason="better_price", note="Cheaper elsewhere")
        self.assertEqual(r.status_code, 200, r.data)
        self.assertEqual(r.data["order"]["status"], "cancelled")
        self.assertFalse(r.data["order"]["can_cancel"])
        self.a.refresh_from_db(); self.b.refresh_from_db()
        self.assertEqual((self.a.stock, self.b.stock), (10, 10))
        item = OrderItem.objects.filter(order=order).first()
        self.assertEqual((item.cancelled_by, item.cancel_reason, item.cancel_note), ("customer", "Found a better price elsewhere", "Cheaper elsewhere"))
        self.assertEqual(Decimal(r.data["order"]["refund_total"]), Decimal("0.00"))  # nothing was paid
        self.assertTrue(SellerNotification.objects.filter(seller=self.seller, title="Order cancelled").exists())

    def test_invalid_reason_rejected_and_missing_reason_defaults_to_other(self):
        order = self.place()
        self.assertEqual(self.cancel(order, reason="nonsense").status_code, 422)
        self.client.force_authenticate(self.cust)
        r = self.client.post(f"/api/orders/{order.id}/cancel/", {}, format="json")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(OrderItem.objects.filter(order=order).first().cancel_reason, "Other reason")

    def test_cannot_cancel_someone_elses_order_or_twice(self):
        order = self.place()
        self.client.force_authenticate(self.other)
        self.assertEqual(self.client.post(f"/api/orders/{order.id}/cancel/", {"reason": "other"}, format="json").status_code, 404)
        self.assertEqual(self.cancel(order).status_code, 200)
        again = self.cancel(order)
        self.assertEqual(again.status_code, 422)

    def test_blocked_once_the_seller_starts_processing(self):
        order = self.place()
        OrderItem.objects.filter(order=order, product=self.a).update(status="processing")
        self.client.force_authenticate(self.cust)
        listed = self.client.get("/api/orders/").data[0]
        self.assertFalse(listed["can_cancel"])
        self.assertIn("already being prepared", listed["cancel_blocked_reason"])
        self.assertEqual(self.cancel(order).status_code, 422)

    def test_paid_online_order_is_refunded_in_full(self):
        order = self.place("razorpay")
        self.pay(order)
        with mock.patch(REFUND, return_value="rfnd_1") as refund:
            r = self.cancel(order)
        self.assertEqual(r.status_code, 200, r.data)
        self.assertEqual(refund.call_args.args[1], Decimal("400.00"))
        self.assertEqual(r.data["order"]["refund_total"], "400.00")
        self.assertIn("refund of ₹400.00", r.data["message"])
        self.assertEqual(set(OrderItem.objects.filter(order=order).values_list("refund_reference", flat=True)), {"rfnd_1"})

    def test_refund_failure_cancels_nothing(self):
        order = self.place("razorpay")
        self.pay(order)
        with mock.patch(REFUND, side_effect=RefundError("gateway down")):
            r = self.cancel(order)
        self.assertEqual(r.status_code, 422)
        self.assertIn("nothing was cancelled", r.data["message"])
        self.assertEqual(set(OrderItem.objects.filter(order=order).values_list("status", flat=True)), {"confirmed"})
        self.a.refresh_from_db()
        self.assertEqual(self.a.stock, 9)  # stock still reserved for the order

    def test_coupon_discount_is_shared_across_the_refund(self):
        Coupon.objects.create(code="TENOFF", discount_type="percentage", discount_value=10, seller=self.seller)
        order = self.place("razorpay", coupon="TENOFF")  # 400 - 40 = 360
        self.assertEqual(order.total, Decimal("360.00"))
        self.pay(order)
        Coupon.objects.filter(code="TENOFF").update(usage_count=1, reserved_count=0)
        with mock.patch(REFUND, return_value="rfnd_2") as refund:
            self.assertEqual(self.cancel(order).status_code, 200)
        self.assertEqual(refund.call_args.args[1], Decimal("360.00"))
        self.assertEqual(Coupon.objects.get(code="TENOFF").usage_count, 0)  # the coupon use is given back

    def test_pending_online_payment_blocks_cancel_until_abandoned(self):
        order = self.place("razorpay")
        Order.objects.filter(pk=order.pk).update(razorpay_order_id="order_x")
        self.assertEqual(self.cancel(order).status_code, 422)
        Order.objects.filter(pk=order.pk).update(created_at=timezone.now() - timedelta(minutes=45))
        with mock.patch(REFUND) as refund:
            self.assertEqual(self.cancel(order).status_code, 200)
        refund.assert_not_called()  # nothing was paid, so nothing to refund
        self.assertEqual(Coupon.objects.count(), 0)


class SellerCancellationTests(CancellationBase):
    def seller_cancel(self, item, **body):
        self.client.force_authenticate(self.seller)
        return self.client.patch(f"/api/seller/orders/{item.id}/", {"status": "cancelled", **body}, format="json")

    def test_seller_cancel_unpaid_item_restores_stock_with_reason(self):
        order = self.place()
        item = OrderItem.objects.get(order=order, product=self.b)
        r = self.seller_cancel(item, reason="out_of_stock")
        self.assertEqual(r.status_code, 200, r.data)
        self.b.refresh_from_db()
        self.assertEqual(self.b.stock, 10)
        item.refresh_from_db()
        self.assertEqual((item.cancelled_by, item.cancel_reason), ("seller", "Item is out of stock"))
        self.assertEqual(Decimal(item.refund_amount), Decimal("0"))

    def test_seller_cancel_of_a_paid_item_refunds_that_items_share(self):
        order = self.place("razorpay")
        self.pay(order)
        item = OrderItem.objects.get(order=order, product=self.b)
        with mock.patch(REFUND, return_value="rfnd_3") as refund:
            r = self.seller_cancel(item, reason="cannot_deliver")
        self.assertEqual(r.status_code, 200, r.data)
        self.assertEqual(refund.call_args.args[1], Decimal("300.00"))
        self.assertIn("₹300.00 is being refunded", r.data["message"])
        item.refresh_from_db()
        self.assertEqual(item.refund_amount, Decimal("300.00"))

    def test_seller_cancel_fails_cleanly_when_refund_fails(self):
        order = self.place("razorpay")
        self.pay(order)
        item = OrderItem.objects.get(order=order, product=self.b)
        with mock.patch(REFUND, side_effect=RefundError("down")):
            self.assertEqual(self.seller_cancel(item).status_code, 422)
        item.refresh_from_db()
        self.assertEqual(item.status, "confirmed")

    def test_partial_seller_cancel_then_customer_cancel_refunds_every_rupee_once(self):
        Coupon.objects.create(code="TENOFF", discount_type="percentage", discount_value=10, seller=self.seller)
        order = self.place("razorpay", coupon="TENOFF")
        self.pay(order)
        refunds = []
        with mock.patch(REFUND, side_effect=lambda o, amount, notes=None: refunds.append(amount) or f"r{len(refunds)}"):
            self.assertEqual(self.seller_cancel(OrderItem.objects.get(order=order, product=self.b)).status_code, 200)
            self.assertEqual(self.cancel(order).status_code, 200)
        self.assertEqual(sum(refunds), order.total)  # 360.00 in total, never more
        self.assertEqual(Order.objects.get(pk=order.pk).items.exclude(status="cancelled").count(), 0)

    def test_seller_cannot_cancel_after_shipping(self):
        order = self.place()
        item = OrderItem.objects.get(order=order, product=self.a)
        OrderItem.objects.filter(pk=item.pk).update(status="shipped")
        self.assertEqual(self.seller_cancel(item).status_code, 422)


class RefundShareTests(CancellationBase):
    def test_shares_always_add_up_to_what_was_paid(self):
        Product.objects.filter(pk=self.a.pk).update(price="33.33")
        Product.objects.filter(pk=self.b.pk).update(price="66.67")
        Coupon.objects.create(code="ODD", discount_type="fixed", discount_value=7, seller=self.seller)
        order = self.place(coupon="ODD")
        shares = item_net_shares(order)
        self.assertEqual(sum(shares.values()), order.total)
