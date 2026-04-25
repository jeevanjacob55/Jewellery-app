from django.urls import path

from .views import CompanyDetailView, CompanyImageUploadSessionView, CompanyListView, EnquiryCreateView

urlpatterns = [
    path("companies/", CompanyListView.as_view(), name="company_list"),
    path("companies/<int:pk>/", CompanyDetailView.as_view(), name="company_detail"),
    path("companies/<int:company_id>/upload-session/", CompanyImageUploadSessionView.as_view(), name="company_upload_session"),
    path("enquiries/", EnquiryCreateView.as_view(), name="enquiry_create"),
]
