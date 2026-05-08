from django.urls import path

from .views import (
    CompanyDetailView,
    CompanyImageAttachView,
    CompanyImageUploadSessionView,
    CompanyListView,
    CompanyManagementDetailView,
    CompanyMediaAssetFinalizeView,
    CompanyProductDetailView,
    CompanyProductListCreateView,
    EnquiryCreateView,
    MarketFeedView,
    ProductImageAttachView,
    ProductImageUploadSessionView,
)

urlpatterns = [
    path("market/", MarketFeedView.as_view(), name="market_feed"),
    path("companies/", CompanyListView.as_view(), name="company_list"),
    path("companies/<int:pk>/", CompanyDetailView.as_view(), name="company_detail"),
    path("companies/<int:company_id>/manage/", CompanyManagementDetailView.as_view(), name="company_manage_detail"),
    path("companies/<int:company_id>/upload-session/", CompanyImageUploadSessionView.as_view(), name="company_upload_session"),
    path("companies/<int:company_id>/media-assets/", CompanyMediaAssetFinalizeView.as_view(), name="company_media_asset_finalize"),
    path("companies/<int:company_id>/images/", CompanyImageAttachView.as_view(), name="company_image_attach"),
    path("companies/<int:company_id>/products/", CompanyProductListCreateView.as_view(), name="company_product_create"),
    path("companies/<int:company_id>/products/<int:product_id>/", CompanyProductDetailView.as_view(), name="company_product_detail"),
    path(
        "companies/<int:company_id>/products/<int:product_id>/images/upload-session/",
        ProductImageUploadSessionView.as_view(),
        name="product_image_upload_session",
    ),
    path(
        "companies/<int:company_id>/products/<int:product_id>/images/",
        ProductImageAttachView.as_view(),
        name="product_image_attach",
    ),
    path("enquiries/", EnquiryCreateView.as_view(), name="enquiry_create"),
]
