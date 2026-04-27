from django.urls import path

from .views import MeView, NotificationPreferenceView

urlpatterns = [
    path("", MeView.as_view(), name="me"),
    path("preferences/", NotificationPreferenceView.as_view(), name="me_preferences"),
]
