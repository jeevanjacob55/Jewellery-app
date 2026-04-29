from django.urls import path

from .views import ProductDetailView, ProductEnquiryCreateView, ProductFilterConfigView, ProductSearchView, ProductWishlistToggleView

urlpatterns = [
    path("", ProductSearchView.as_view(), name="product_search"),
    path("filter-config/", ProductFilterConfigView.as_view(), name="product_filter_config"),
    path("<int:product_id>/", ProductDetailView.as_view(), name="product_detail"),
    path("<int:product_id>/wishlist/", ProductWishlistToggleView.as_view(), name="product_wishlist_toggle"),
    path("<int:product_id>/enquiries/", ProductEnquiryCreateView.as_view(), name="product_enquiry_create"),
]
