from django.urls import path

from .views import (
    NewsApproveView,
    NewsBookmarkToggleView,
    NewsDetailView,
    NewsFeedView,
    NewsImageUploadSessionView,
    NewsMediaAssetFinalizeView,
    NewsRejectView,
)

urlpatterns = [
    path("", NewsFeedView.as_view(), name="news_feed"),
    path("upload-session/", NewsImageUploadSessionView.as_view(), name="news_upload_session"),
    path("media-assets/", NewsMediaAssetFinalizeView.as_view(), name="news_media_asset_finalize"),
    path("<int:pk>/", NewsDetailView.as_view(), name="news_detail"),
    path("<int:pk>/bookmark/", NewsBookmarkToggleView.as_view(), name="news_bookmark_toggle"),
    path("<int:pk>/approve/", NewsApproveView.as_view(), name="news_approve"),
    path("<int:pk>/reject/", NewsRejectView.as_view(), name="news_reject"),
]
