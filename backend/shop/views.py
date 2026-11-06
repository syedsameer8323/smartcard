from decimal import Decimal, ROUND_HALF_UP
import hashlib
import hmac
import json
import os
from .cancellation import CUSTOMER_REASONS, cancel_items, customer_cancel_block
from .email_notifications import schedule_order_notification
from django.db import transaction
from django.db.models import F
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from catalog.models import Product
from catalog.pricing import load_active_offers, price_info
from catalog.serializers import ProductSerializer
from users.permissions import IsCustomer

from .models import CartItem, Order, OrderItem, WishlistItem, Coupon, ShippingAddress, SellerNotification, PushSubscription
from .serializers import (BusinessError, CartAddSerializer, CartItemSerializer, CartUpdateSerializer,
                          CheckoutSerializer, OrderSerializer, CouponSerializer, ShippingAddressSerializer,
                          SellerNotificationSerializer)


def coupon_discount(code, subtotal, user=None, rules=None):
    code = (code or "").strip().upper()
    if not code:
        return None, Decimal("0.00")
    coupon = Coupon.objects.select_for_update().filter(code=code, is_active=True).first()
    if not coupon:
        raise BusinessError("This coupon is invalid or inactive.")
    eligible_subtotal = subtotal
    if coupon.seller_id and user:
        eligible_items = CartItem.objects.filter(user=user, product__seller_id=coupon.seller_id).select_related("product")
        rules = load_active_offers() if rules is None else rules
        eligible_subtotal = sum((price_info(item.product, rules)["sale_price"] * item.quantity for item in eligible_items), Decimal("0.00"))
        if eligible_subtotal <= 0:
            raise BusinessError("This coupon is not applicable to products in your cart.")
    if coupon.expires_at and coupon.expires_at <= timezone.now():
        raise BusinessError("This coupon has expired.")
    if coupon.usage_limit is not None and coupon.usage_count + coupon.reserved_count >= coupon.usage_limit:
        raise BusinessError("This coupon has reached its usage limit.")
    if subtotal < coupon.minimum_order_value:
        raise BusinessError(f"Minimum order value for this coupon is ₹{coupon.minimum_order_value}.")
    if coupon.discount_type == Coupon.DiscountType.PERCENTAGE:
        discount = (eligible_subtotal * coupon.discount_value / Decimal("100")).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    else:
        discount = coupon.discount_value
    return coupon, min(max(discount, Decimal("0.00")), eligible_subtotal)


def notify_sellers(order, title, message):
    seller_ids = set(order.items.exclude(seller__isnull=True).values_list("seller_id", flat=True))
    for seller_id in seller_ids:
        SellerNotification.objects.create(seller_id=seller_id, order=order, title=title, message=message)
        # Browser push is optional and only delivered when Web Push credentials and pywebpush are configured.
        vapid_private = os.environ.get("VAPID_PRIVATE_KEY")
        vapid_email = os.environ.get("VAPID_CLAIMS_EMAIL", "mailto:support@smartcart.example")
        if vapid_private:
            try:
                from pywebpush import webpush
                payload = json.dumps({"title": title, "body": message, "url": "/seller/orders"})
                for sub in PushSubscription.objects.filter(seller_id=seller_id):
                    try:
                        webpush({"endpoint": sub.endpoint, "keys": {"p256dh": sub.p256dh, "auth": sub.auth}}, payload,
                                vapid_private_key=vapid_private, vapid_claims={"sub": vapid_email})
                    except Exception as exc:
                        response = getattr(exc, "response", None)
                        if getattr(response, "status_code", None) in (404, 410):
                            sub.delete()
                        continue
            except ImportError:
                pass


def cart_subtotal(user, rules=None):
    rules = load_active_offers() if rules is None else rules
    items = CartItem.objects.filter(user=user).select_related("product")
    return sum((price_info(i.product, rules)["sale_price"] * i.quantity for i in items), Decimal("0.00"))


def cart_payload(user):
    rules = load_active_offers()
    items = CartItem.objects.filter(user=user).select_related("product__category", "product__seller")
    subtotal = sum((price_info(i.product, rules)["sale_price"] * i.quantity for i in items), Decimal("0.00"))
    list_total = sum((i.product.price * i.quantity for i in items), Decimal("0.00"))
    return {"items": CartItemSerializer(items, many=True).data, "subtotal": f"{subtotal:.2f}",
            "offer_savings": f"{list_total - subtotal:.2f}", "count": sum(i.quantity for i in items)}


class CartView(APIView):
    permission_classes = [IsCustomer]

    def get(self, request):
        return Response(cart_payload(request.user))


class CartItemAddView(APIView):
    permission_classes = [IsCustomer]

    def post(self, request):
        s = CartAddSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        product = get_object_or_404(Product, pk=s.validated_data["product_id"], is_active=True)
        if product.stock < 1:
            raise BusinessError("This product is out of stock.")
        item, _ = CartItem.objects.get_or_create(user=request.user, product=product, defaults={"quantity": 0})
        wanted = item.quantity + s.validated_data["quantity"]
        item.quantity = min(wanted, product.stock)
        item.save()
        msg = "Added to cart" if wanted <= product.stock else f"Only {product.stock} available. Cart updated."
        return Response({"message": msg, "cart": cart_payload(request.user)})


class CartItemDetailView(APIView):
    permission_classes = [IsCustomer]

    def patch(self, request, pk):
        item = get_object_or_404(CartItem.objects.select_related("product"), pk=pk, user=request.user)
        s = CartUpdateSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        if s.validated_data["quantity"] > item.product.stock:
            raise BusinessError(f"Only {item.product.stock} available.")
        item.quantity = s.validated_data["quantity"]
        item.save()
        return Response({"cart": cart_payload(request.user)})

    def delete(self, request, pk):
        get_object_or_404(CartItem, pk=pk, user=request.user).delete()
        return Response({"message": "Removed from cart", "cart": cart_payload(request.user)})


def wishlist_payload(user):
    items = WishlistItem.objects.filter(user=user, product__is_active=True).select_related("product__category", "product__seller")
    return {"ids": [i.product_id for i in items], "items": ProductSerializer([i.product for i in items], many=True).data}


class WishlistView(APIView):
    permission_classes = [IsCustomer]

    def get(self, request):
        return Response(wishlist_payload(request.user))

    def post(self, request):
        product = get_object_or_404(Product, pk=request.data.get("product_id"), is_active=True)
        WishlistItem.objects.get_or_create(user=request.user, product=product)
        return Response({"message": "Saved to wishlist", **wishlist_payload(request.user)}, status=201)


class WishlistDetailView(APIView):
    permission_classes = [IsCustomer]

    def delete(self, request, product_id):
        WishlistItem.objects.filter(user=request.user, product_id=product_id).delete()
        return Response({"message": "Removed from wishlist", **wishlist_payload(request.user)})


class OrderListCreateView(APIView):
    permission_classes = [IsCustomer]

    def get(self, request):
        orders = Order.objects.filter(user=request.user).prefetch_related("items")
        return Response(OrderSerializer(orders, many=True).data)

    @transaction.atomic
    def post(self, request):
        s = CheckoutSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        data = dict(s.validated_data)
        coupon_code = data.pop("coupon_code", "")
        cart = list(CartItem.objects.filter(user=request.user).select_related("product"))
        if not cart:
            raise BusinessError("Your cart is empty.")
        products = {p.id: p for p in Product.objects.select_for_update().filter(id__in=[c.product_id for c in cart])}
        rules = load_active_offers()
        pricing = {c.product_id: price_info(products[c.product_id], rules) for c in cart}
        subtotal = Decimal("0.00")
        for c in cart:
            p = products[c.product_id]
            if not p.is_active:
                raise BusinessError(f"'{p.name}' is no longer available. Please remove it from your cart.")
            if p.stock < c.quantity:
                raise BusinessError(f"Only {p.stock} of '{p.name}' left in stock. Please update your cart.")
            subtotal += pricing[c.product_id]["sale_price"] * c.quantity
        coupon, discount = coupon_discount(coupon_code, subtotal, request.user, rules) if coupon_code else (None, Decimal("0.00"))
        shipping_fee = Decimal("0.00")
        total = max(Decimal("0.00"), subtotal - discount + shipping_fee)
        # Keep the legacy address field populated for existing order views/integrations.
        address_parts = [data.get("house_building", ""), data.get("street", ""), data.get("locality", "")]
        data["address"] = ", ".join(x.strip() for x in address_parts if x and x.strip()) or data.get("address", "")
        data["subtotal"] = subtotal
        data["discount_amount"] = discount
        data["shipping_fee"] = shipping_fee
        data["coupon_code"] = coupon.code if coupon else ""
        data["total"] = total
        data["payment_status"] = "pending" if data.get("payment_method") in ("razorpay", "upi_qr") else "cod_pending"
        order = Order.objects.create(user=request.user, **data)
        for c in cart:
            p = products[c.product_id]
            info = pricing[c.product_id]
            OrderItem.objects.create(order=order, product=p, seller=p.seller, name=p.name, image_url=p.image_url,
                                     price=info["sale_price"], quantity=c.quantity,
                                     list_price=info["list_price"] if info["rule"] else None,
                                     offer_name=info["rule"].name if info["rule"] else "")
            Product.objects.filter(pk=p.pk).update(stock=F("stock") - c.quantity)
            if p.stock - c.quantity <= 5:
                SellerNotification.objects.create(seller_id=p.seller_id, order=order, title="Low stock alert",
                    message=f"{p.name} has {p.stock - c.quantity} unit(s) remaining after order {order.code}.")
        CartItem.objects.filter(user=request.user).delete()
        order = Order.objects.prefetch_related("items").get(pk=order.pk)
        notify_sellers(order, "New order received", f"Order {order.code} includes new item(s).")

        # Schedule the customer order confirmation after the transaction commits.
        customer_email = order.email or getattr(order.user, "email", "")
        schedule_order_notification(order, customer_email, "order_placed")

        # Email each seller who has products in this order.
        seller_emails = (
            order.items.exclude(seller__isnull=True)
            .values_list("seller__email", flat=True)
            .distinct()
        )
        for seller_email in seller_emails:
            if seller_email:
                schedule_order_notification(order, seller_email, "seller_new_order")
        if coupon:
            if order.payment_method == "cod":
                Coupon.objects.filter(pk=coupon.pk).update(usage_count=F("usage_count") + 1)
            else:
                # razorpay + upi_qr: reserve until payment verified
                Coupon.objects.filter(pk=coupon.pk).update(reserved_count=F("reserved_count") + 1)
                order.coupon_reserved = True
                order.save(update_fields=["coupon_reserved"])
        return Response({"message": "Order created successfully", "order": OrderSerializer(order).data},
                        status=status.HTTP_201_CREATED)


class OrderDetailView(APIView):
    permission_classes = [IsCustomer]

    def get(self, request, pk):
        order = get_object_or_404(Order.objects.prefetch_related("items"), pk=pk, user=request.user)
        return Response(OrderSerializer(order).data)


class CustomerOrderCancelView(APIView):
    """Customer cancels an order that the seller has not started preparing yet.

    Cash-on-delivery orders are simply cancelled. Orders already paid online are cancelled
    AND refunded to the original payment method (Razorpay), all in one step.
    """
    permission_classes = [IsCustomer]

    @transaction.atomic
    def post(self, request, pk):
        # The app always sends a reason; older clients that don't are recorded as "Other reason".
        reason_key = str(request.data.get("reason") or "other")
        if reason_key not in CUSTOMER_REASONS:
            raise BusinessError("Please choose a valid reason for cancelling.")
        note = str(request.data.get("note") or "").strip()[:300]

        order = get_object_or_404(Order.objects.select_for_update(), pk=pk, user=request.user)
        items = list(order.items.select_for_update().select_related("product", "seller"))
        blocked = customer_cancel_block(order, items)
        if blocked:
            raise BusinessError(blocked)

        to_cancel = [i for i in items if i.status != "cancelled"]
        refund_total = cancel_items(order, items, to_cancel, by="customer", reason=CUSTOMER_REASONS[reason_key], note=note)

        for seller_id in {i.seller_id for i in to_cancel if i.seller_id}:
            SellerNotification.objects.create(seller_id=seller_id, order=order, title="Order cancelled",
                message=f"Customer cancelled order {order.code} ({CUSTOMER_REASONS[reason_key]}). Stock was returned to inventory.")
        order = Order.objects.prefetch_related("items").get(pk=order.pk)

        # Emails are sent after the transaction commits.
        customer_email = order.email or getattr(order.user, "email", "")
        schedule_order_notification(order, customer_email, "order_cancelled")
        for seller_email in order.items.exclude(seller__isnull=True).values_list("seller__email", flat=True).distinct():
            if seller_email:
                schedule_order_notification(order, seller_email, "seller_order_cancelled")

        message = "Order cancelled and stock restored."
        if refund_total > 0:
            message = f"Order cancelled. A refund of ₹{refund_total:.2f} has been started to your original payment method."
        return Response({"message": message, "order": OrderSerializer(order).data})


class CouponApplyView(APIView):
    permission_classes = [IsCustomer]

    @transaction.atomic
    def post(self, request):
        subtotal = cart_subtotal(request.user)
        if subtotal <= 0:
            raise BusinessError("Add products to your cart before applying a coupon.")
        coupon, discount = coupon_discount(request.data.get("code", ""), subtotal, request.user)
        shipping = Decimal("0.00")
        return Response({"code": coupon.code, "discount_amount": f"{discount:.2f}", "subtotal": f"{subtotal:.2f}",
                         "shipping_fee": f"{shipping:.2f}", "total": f"{max(Decimal('0.00'), subtotal-discount+shipping):.2f}"})


class ShippingAddressListCreateView(APIView):
    permission_classes = [IsCustomer]

    def get(self, request):
        return Response(ShippingAddressSerializer(ShippingAddress.objects.filter(user=request.user), many=True).data)

    def post(self, request):
        serializer = ShippingAddressSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        if serializer.validated_data.get("is_default"):
            ShippingAddress.objects.filter(user=request.user).update(is_default=False)
        address = serializer.save(user=request.user)
        return Response(ShippingAddressSerializer(address).data, status=201)


class ShippingAddressDetailView(APIView):
    permission_classes = [IsCustomer]

    def patch(self, request, pk):
        address = get_object_or_404(ShippingAddress, pk=pk, user=request.user)
        serializer = ShippingAddressSerializer(address, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        if serializer.validated_data.get("is_default"):
            ShippingAddress.objects.filter(user=request.user).exclude(pk=pk).update(is_default=False)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, pk):
        get_object_or_404(ShippingAddress, pk=pk, user=request.user).delete()
        return Response(status=204)


class CouponManagementViewSet(viewsets.ModelViewSet):
    serializer_class = CouponSerializer

    def get_queryset(self):
        if getattr(self.request.user, "role", "") == "admin" or self.request.user.is_staff:
            return Coupon.objects.all()
        return Coupon.objects.filter(seller=self.request.user)

    def get_permissions(self):
        from users.permissions import IsSellerOrAdmin
        return [IsSellerOrAdmin()]

    def perform_create(self, serializer):
        user = self.request.user
        serializer.save(seller=None if getattr(user, "role", "") == "admin" or user.is_staff else user)


class SellerNotificationsView(APIView):
    from users.permissions import IsSeller
    permission_classes = [IsSeller]

    def get(self, request):
        qs = SellerNotification.objects.filter(seller=request.user)
        return Response({"unread_count": qs.filter(is_read=False).count(), "results": SellerNotificationSerializer(qs[:100], many=True).data})


class SellerNotificationReadView(APIView):
    from users.permissions import IsSeller
    permission_classes = [IsSeller]

    def patch(self, request, pk):
        note = get_object_or_404(SellerNotification, pk=pk, seller=request.user)
        note.is_read = True
        note.save(update_fields=["is_read"])
        return Response(SellerNotificationSerializer(note).data)


class PushSubscriptionView(APIView):
    from users.permissions import IsSeller
    permission_classes = [IsSeller]

    def post(self, request):
        data = request.data
        endpoint = data.get("endpoint")
        keys = data.get("keys") or {}
        if not endpoint or not keys.get("p256dh") or not keys.get("auth"):
            return Response({"message": "A valid browser push subscription is required."}, status=400)
        subscription, _ = PushSubscription.objects.update_or_create(endpoint=endpoint, defaults={
            "seller": request.user, "p256dh": keys["p256dh"], "auth": keys["auth"]})
        return Response({"message": "Push subscription saved."}, status=201)

    def delete(self, request):
        endpoint = request.data.get("endpoint")
        if endpoint:
            PushSubscription.objects.filter(seller=request.user, endpoint=endpoint).delete()
        return Response(status=204)


class RazorpayCreateView(APIView):
    permission_classes = [IsCustomer]

    def post(self, request, order_id):
        order = get_object_or_404(
            Order, pk=order_id, user=request.user, payment_method__in=["razorpay", "upi_qr"]
        )
        if order.payment_status == "paid":
            return Response({"message": "This order is already paid."}, status=409)
        key_id, key_secret = os.environ.get("RAZORPAY_KEY_ID"), os.environ.get("RAZORPAY_KEY_SECRET")
        if not key_id or not key_secret:
            return Response(
                {"message": "Razorpay is not configured. Add test credentials to backend/.env."},
                status=503,
            )
        try:
            import razorpay
            client = razorpay.Client(auth=(key_id, key_secret))
            if order.razorpay_order_id:
                return Response({
                    "key_id": key_id,
                    "razorpay_order_id": order.razorpay_order_id,
                    "amount": int(order.total * 100),
                    "currency": "INR",
                    "order_code": order.code,
                })
            payment_order = client.order.create({
                "amount": int(order.total * 100),
                "currency": "INR",
                "receipt": order.code,
                "notes": {"order_id": str(order.pk), "payment_method": order.payment_method},
            })
            order.razorpay_order_id = payment_order["id"]
            order.save(update_fields=["razorpay_order_id"])
            return Response({
                "key_id": key_id,
                "razorpay_order_id": payment_order["id"],
                "amount": payment_order["amount"],
                "currency": "INR",
                "order_code": order.code,
            })
        except ImportError:
            return Response({"message": "Install the Razorpay Python SDK to enable payments."}, status=503)
        except Exception:
            return Response({"message": "Unable to initiate payment. Please retry."}, status=502)


class RazorpayVerifyView(APIView):
    permission_classes = [IsCustomer]

    @transaction.atomic
    def post(self, request, order_id):
        order = get_object_or_404(Order.objects.select_for_update(), pk=order_id, user=request.user, payment_method__in=["razorpay", "upi_qr"])
        if order.payment_status == "paid":
            return Response({"message": "Payment already verified.", "order": OrderSerializer(order).data})
        if not order.items.exclude(status="cancelled").exists():
            return Response({"message": "This order was cancelled and cannot accept payment."}, status=409)
        key_secret = os.environ.get("RAZORPAY_KEY_SECRET", "")
        payment_id = str(request.data.get("razorpay_payment_id", ""))
        razorpay_order_id = str(request.data.get("razorpay_order_id", ""))
        signature = str(request.data.get("razorpay_signature", ""))
        expected = hmac.new(key_secret.encode(), f"{razorpay_order_id}|{payment_id}".encode(), hashlib.sha256).hexdigest()
        if not key_secret or not order.razorpay_order_id or razorpay_order_id != order.razorpay_order_id or not payment_id or not hmac.compare_digest(expected, signature):
            return Response({"message": "Payment signature verification failed."}, status=400)
        try:
            import razorpay
            gateway = razorpay.Client(auth=(os.environ.get("RAZORPAY_KEY_ID", ""), key_secret))
            payment = gateway.payment.fetch(payment_id)
            if (payment.get("order_id") != order.razorpay_order_id or payment.get("status") != "captured"
                    or int(payment.get("amount", -1)) != int(order.total * 100) or payment.get("currency") != "INR"):
                return Response({"message": "The gateway has not confirmed a captured payment for this order."}, status=409)
        except ImportError:
            return Response({"message": "Install the Razorpay Python SDK to verify payment status."}, status=503)
        except Exception:
            return Response({"message": "Could not confirm payment status with Razorpay. Check order status before retrying."}, status=502)
        order.payment_status = "paid"
        order.payment_reference = payment_id
        order.save(update_fields=["payment_status", "payment_reference"])
        OrderItem.objects.filter(order=order, status="pending").update(status="confirmed")
        # Schedule payment emails only after Razorpay verification succeeds.
        customer_email = order.email or getattr(order.user, "email", "")
        schedule_order_notification(order, customer_email, "payment_successful")

        seller_emails = (
            order.items.exclude(seller__isnull=True)
            .values_list("seller__email", flat=True)
            .distinct()
        )
        for seller_email in seller_emails:
            if seller_email:
                schedule_order_notification(order, seller_email, "payment_successful")


        if order.coupon_code:
            coupon = Coupon.objects.select_for_update().filter(code=order.coupon_code).first()
            if coupon:
                if order.coupon_reserved and coupon.reserved_count > 0:
                    coupon.reserved_count -= 1
                coupon.usage_count += 1
                coupon.save(update_fields=["reserved_count", "usage_count"])
                order.coupon_reserved = False
                order.save(update_fields=["coupon_reserved"])
        notify_sellers(order, "Payment confirmed", f"Payment for order {order.code} has been verified.")
        return Response({"message": "Payment verified successfully.", "order": OrderSerializer(order).data})


class RazorpayFailureView(APIView):
    permission_classes = [IsCustomer]

    def post(self, request, order_id):
        order = get_object_or_404(
            Order, pk=order_id, user=request.user, payment_method__in=["razorpay", "upi_qr"]
        )
        if order.payment_status != "paid":
            order.payment_status = "failed"
            order.save(update_fields=["payment_status"])
        return Response({"message": "Payment failure recorded. You can retry payment."})


class RazorpayQRCreateView(APIView):
    """
    Create / refresh a Razorpay Payment Link for Scan & Pay (UPI QR).

    Test Mode: Payment Links work with Razorpay test credentials. Actual phone UPI
    apps may not complete real UPI against test links — the UI shows a clear demo notice.
    Live Mode: set RAZORPAY_QR_LIVE=true with live keys to enable production QR.
    """
    permission_classes = [IsCustomer]

    def post(self, request, order_id):
        order = get_object_or_404(
            Order, pk=order_id, user=request.user, payment_method__in=["upi_qr", "razorpay"]
        )
        if order.payment_status == "paid":
            return Response({"message": "This order is already paid."}, status=409)
        key_id = os.environ.get("RAZORPAY_KEY_ID", "")
        key_secret = os.environ.get("RAZORPAY_KEY_SECRET", "")
        if not key_id or not key_secret:
            return Response(
                {"message": "Razorpay is not configured. Add test credentials to backend/.env."},
                status=503,
            )
        test_mode = key_id.startswith("rzp_test_") or os.environ.get("RAZORPAY_QR_LIVE", "").lower() not in ("1", "true", "yes")
        try:
            import razorpay
            from datetime import timedelta
            from django.utils import timezone as dj_tz

            client = razorpay.Client(auth=(key_id, key_secret))
            # Ensure a Razorpay order exists for amount integrity
            if not order.razorpay_order_id:
                payment_order = client.order.create({
                    "amount": int(order.total * 100),
                    "currency": "INR",
                    "receipt": order.code,
                    "notes": {"order_id": str(order.pk), "channel": "upi_qr"},
                })
                order.razorpay_order_id = payment_order["id"]
                order.save(update_fields=["razorpay_order_id"])

            expire_by = int((dj_tz.now() + timedelta(minutes=30)).timestamp())
            link = client.payment_link.create({
                "amount": int(order.total * 100),
                "currency": "INR",
                "accept_partial": False,
                "description": f"SmartCart order {order.code}",
                "customer": {
                    "name": order.shipping_name or "",
                    "email": order.email or getattr(order.user, "email", "") or "",
                    "contact": order.phone or "",
                },
                "notify": {"sms": False, "email": False},
                "reminder_enable": False,
                "notes": {
                    "order_id": str(order.pk),
                    "order_code": order.code,
                    "razorpay_order_id": order.razorpay_order_id,
                },
                "expire_by": expire_by,
            })
            short_url = link.get("short_url") or ""
            link_id = link.get("id") or ""
            # Store payment link id in payment_reference until paid (payment id overwrites on verify)
            if link_id and order.payment_status != "paid":
                order.payment_reference = f"plink:{link_id}"
                order.save(update_fields=["payment_reference"])

            qr_image = ""
            if short_url:
                from urllib.parse import quote
                qr_image = f"https://api.qrserver.com/v1/create-qr-code/?size=280x280&data={quote(short_url, safe='')}"

            return Response({
                "order_code": order.code,
                "amount": float(order.total),
                "amount_paise": int(order.total * 100),
                "currency": "INR",
                "payment_link_id": link_id,
                "payment_url": short_url,
                "qr_image_url": qr_image,
                "expires_in_seconds": 30 * 60,
                "razorpay_order_id": order.razorpay_order_id,
                "test_mode": test_mode,
                "test_mode_notice": (
                    "Razorpay Test Mode: this QR opens a Razorpay test payment link. "
                    "Use Razorpay test payment methods to complete payment. "
                    "Phone UPI apps may not process test-mode UPI QR scans."
                    if test_mode else ""
                ),
            })
        except ImportError:
            return Response({"message": "Install the Razorpay Python SDK to enable payments."}, status=503)
        except Exception as exc:
            return Response(
                {"message": f"Unable to create QR payment session. Please retry. ({type(exc).__name__})"},
                status=502,
            )


class RazorpayQRStatusView(APIView):
    """Poll payment-link / order payment status for Scan & Pay."""
    permission_classes = [IsCustomer]

    def get(self, request, order_id):
        order = get_object_or_404(
            Order, pk=order_id, user=request.user, payment_method__in=["upi_qr", "razorpay"]
        )
        if order.payment_status == "paid":
            return Response({
                "payment_status": "paid",
                "order": OrderSerializer(order).data,
                "message": "Payment already confirmed.",
            })
        key_id = os.environ.get("RAZORPAY_KEY_ID", "")
        key_secret = os.environ.get("RAZORPAY_KEY_SECRET", "")
        if not key_id or not key_secret:
            return Response({"payment_status": order.payment_status, "message": "Gateway not configured."})
        try:
            import razorpay
            client = razorpay.Client(auth=(key_id, key_secret))
            link_id = ""
            if (order.payment_reference or "").startswith("plink:"):
                link_id = order.payment_reference.split(":", 1)[1]
            if link_id:
                link = client.payment_link.fetch(link_id)
                status_val = (link.get("status") or "").lower()
                if status_val == "paid":
                    # Confirm order using gateway payments on the link
                    payments = (link.get("payments") or []) if isinstance(link.get("payments"), list) else []
                    payment_id = ""
                    for p in payments:
                        if p.get("status") in ("captured", "authorized") or p.get("amount"):
                            payment_id = p.get("payment_id") or p.get("id") or ""
                            if payment_id:
                                break
                    if not payment_id:
                        # Fallback: list payments for razorpay order
                        if order.razorpay_order_id:
                            plist = client.order.payments(order.razorpay_order_id)
                            for p in (plist.get("items") or []):
                                if p.get("status") == "captured":
                                    payment_id = p.get("id")
                                    break
                    if payment_id:
                        with transaction.atomic():
                            locked = Order.objects.select_for_update().get(pk=order.pk)
                            if locked.payment_status != "paid":
                                locked.payment_status = "paid"
                                locked.payment_reference = payment_id
                                locked.save(update_fields=["payment_status", "payment_reference"])
                                OrderItem.objects.filter(order=locked, status="pending").update(status="confirmed")
                                if locked.coupon_code:
                                    coupon = Coupon.objects.select_for_update().filter(code=locked.coupon_code).first()
                                    if coupon:
                                        if locked.coupon_reserved and coupon.reserved_count > 0:
                                            coupon.reserved_count -= 1
                                        coupon.usage_count += 1
                                        coupon.save(update_fields=["reserved_count", "usage_count"])
                                        locked.coupon_reserved = False
                                        locked.save(update_fields=["coupon_reserved"])
                                notify_sellers(locked, "Payment confirmed", f"Payment for order {locked.code} has been verified.")
                                customer_email = locked.email or getattr(locked.user, "email", "")
                                schedule_order_notification(locked, customer_email, "payment_successful")
                        order.refresh_from_db()
                        return Response({
                            "payment_status": "paid",
                            "order": OrderSerializer(order).data,
                            "message": "Payment verified successfully.",
                        })
                return Response({
                    "payment_status": status_val or order.payment_status,
                    "message": f"Payment link status: {status_val or 'created'}.",
                })
            # No link — check order payments
            if order.razorpay_order_id:
                plist = client.order.payments(order.razorpay_order_id)
                for p in (plist.get("items") or []):
                    if p.get("status") == "captured" and int(p.get("amount", -1)) == int(order.total * 100):
                        return Response({
                            "payment_status": "captured_pending_verify",
                            "message": "Payment captured. Confirm from checkout verify if needed.",
                            "razorpay_payment_id": p.get("id"),
                        })
            return Response({"payment_status": order.payment_status, "message": "Awaiting payment."})
        except Exception:
            return Response({"payment_status": order.payment_status, "message": "Could not refresh status from gateway."}, status=502)
