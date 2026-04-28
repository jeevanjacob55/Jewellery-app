from django.urls import path

from .views import AdvertisementClickView, AdvertisementImpressionView, AdvertisementOverviewView, AdvertisementUploadSessionView

urlpatterns = [
    path("", AdvertisementOverviewView.as_view(), name="ads_overview"),
    path("upload-session/", AdvertisementUploadSessionView.as_view(), name="ads_upload_session"),
    path("<int:ad_id>/impression/", AdvertisementImpressionView.as_view(), name="ads_impression"),
    path("<int:ad_id>/click/", AdvertisementClickView.as_view(), name="ads_click"),
]
