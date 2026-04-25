from django.urls import path

from .views import NewsFeedView

urlpatterns = [
    path("", NewsFeedView.as_view(), name="news_feed"),
]
