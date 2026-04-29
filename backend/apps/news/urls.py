from django.urls import path

from .views import NewsApproveView, NewsBookmarkToggleView, NewsDetailView, NewsFeedView, NewsRejectView

urlpatterns = [
    path("", NewsFeedView.as_view(), name="news_feed"),
    path("<int:pk>/", NewsDetailView.as_view(), name="news_detail"),
    path("<int:pk>/bookmark/", NewsBookmarkToggleView.as_view(), name="news_bookmark_toggle"),
    path("<int:pk>/approve/", NewsApproveView.as_view(), name="news_approve"),
    path("<int:pk>/reject/", NewsRejectView.as_view(), name="news_reject"),
]
