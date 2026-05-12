from django.urls import path

from .views import NotificationFeedView, NotificationMarkAllReadView, NotificationMarkReadView

urlpatterns = [
    path("", NotificationFeedView.as_view(), name="notifications_feed"),
    path("read-all/", NotificationMarkAllReadView.as_view(), name="notifications_mark_all_read"),
    path("<int:notification_id>/read/", NotificationMarkReadView.as_view(), name="notifications_mark_read"),
]
