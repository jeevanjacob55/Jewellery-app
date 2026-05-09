from django.urls import path

from .views import (
    AdvertisementApproveView,
    AdvertisementCampaignDetailView,
    AdvertisementCampaignListCreateView,
    AdvertisementClickView,
    AdvertisementImpressionView,
    AdvertisementMediaAssetFinalizeView,
    AdvertisementOverviewView,
    AdvertisementRejectView,
    AdvertisementUploadSessionView,
    SubmittedAdvertisementApprovalListView,
)

urlpatterns = [
    path("", AdvertisementOverviewView.as_view(), name="ads_overview"),
    path("upload-session/", AdvertisementUploadSessionView.as_view(), name="ads_upload_session"),
    path("media-assets/", AdvertisementMediaAssetFinalizeView.as_view(), name="ads_media_asset_finalize"),
    path("campaigns/", AdvertisementCampaignListCreateView.as_view(), name="ads_campaigns"),
    path("campaigns/<int:ad_id>/", AdvertisementCampaignDetailView.as_view(), name="ads_campaign_detail"),
    path("submitted/", SubmittedAdvertisementApprovalListView.as_view(), name="ads_submitted_list"),
    path("<int:ad_id>/approve/", AdvertisementApproveView.as_view(), name="ads_approve"),
    path("<int:ad_id>/reject/", AdvertisementRejectView.as_view(), name="ads_reject"),
    path("<int:ad_id>/impression/", AdvertisementImpressionView.as_view(), name="ads_impression"),
    path("<int:ad_id>/click/", AdvertisementClickView.as_view(), name="ads_click"),
]
