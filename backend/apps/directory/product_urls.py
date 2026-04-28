from django.urls import path

from .views import ProductFilterConfigView, ProductSearchView

urlpatterns = [
    path("", ProductSearchView.as_view(), name="product_search"),
    path("filter-config/", ProductFilterConfigView.as_view(), name="product_filter_config"),
]
