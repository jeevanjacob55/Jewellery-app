from django.urls import path

from .views import NewsApproveView, NewsFeedView, NewsRejectView

urlpatterns = [
    path("", NewsFeedView.as_view(), name="news_feed"),
    path("<int:pk>/approve/", NewsApproveView.as_view(), name="news_approve"),
    path("<int:pk>/reject/", NewsRejectView.as_view(), name="news_reject"),
]
