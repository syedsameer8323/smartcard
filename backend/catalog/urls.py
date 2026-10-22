from django.urls import path
from rest_framework.routers import SimpleRouter

from . import views

router = SimpleRouter()
router.register("seller/products", views.SellerProductViewSet, basename="seller-products")
router.register("seller/offers", views.SellerOfferViewSet, basename="seller-offers")

urlpatterns = [
    path("categories/", views.CategoryListView.as_view()),
    path("products/", views.ProductListView.as_view()),
    path("products/<int:pk>/", views.ProductDetailView.as_view()),
    path("offers/active/", views.ActiveOffersView.as_view()),
    path("seller/upload-image/", views.SellerImageUploadView.as_view()),
] + router.urls
