from django.urls import path
from rest_framework.routers import SimpleRouter

from . import views

router = SimpleRouter()
router.register("seller/products", views.SellerProductViewSet, basename="seller-products")

urlpatterns = [
    path("categories/", views.CategoryListView.as_view()),
    path("products/", views.ProductListView.as_view()),
    path("products/<int:pk>/", views.ProductDetailView.as_view()),
] + router.urls
