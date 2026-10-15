from django.urls import path
from rest_framework.routers import SimpleRouter

from . import seller_views, views

router = SimpleRouter()
router.register("seller/coupons", views.CouponManagementViewSet, basename="seller-coupons")

urlpatterns = [
    path("cart/", views.CartView.as_view()),
    path("cart/items/", views.CartItemAddView.as_view()),
    path("cart/items/<int:pk>/", views.CartItemDetailView.as_view()),
    path("wishlist/", views.WishlistView.as_view()),
    path("wishlist/<int:product_id>/", views.WishlistDetailView.as_view()),
    path("orders/", views.OrderListCreateView.as_view()),
    path("orders/<int:pk>/", views.OrderDetailView.as_view()),
    path("orders/<int:pk>/cancel/", views.CustomerOrderCancelView.as_view()),
    path("coupons/apply/", views.CouponApplyView.as_view()),
    path("shipping-addresses/", views.ShippingAddressListCreateView.as_view()),
    path("shipping-addresses/<int:pk>/", views.ShippingAddressDetailView.as_view()),
    path("payments/razorpay/<int:order_id>/create/", views.RazorpayCreateView.as_view()),
    path("payments/razorpay/<int:order_id>/verify/", views.RazorpayVerifyView.as_view()),
    path("payments/razorpay/<int:order_id>/failure/", views.RazorpayFailureView.as_view()),
    path("seller/notifications/", views.SellerNotificationsView.as_view()),
    path("seller/notifications/<int:pk>/read/", views.SellerNotificationReadView.as_view()),
    path("seller/push-subscription/", views.PushSubscriptionView.as_view()),
    path("seller/stats/", seller_views.SellerStatsView.as_view()),
    path("seller/orders/", seller_views.SellerOrderListView.as_view()),
    path("seller/orders/<int:pk>/", seller_views.SellerOrderUpdateView.as_view()),
] + router.urls
