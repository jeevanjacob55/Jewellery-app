from django.urls import path

from .views import AdvertisementOverviewView, AdvertisementUploadSessionView

urlpatterns = [
    path("", AdvertisementOverviewView.as_view(), name="ads_overview"),
    path("upload-session/", AdvertisementUploadSessionView.as_view(), name="ads_upload_session"),
]
