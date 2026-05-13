from django.urls import path

from .views import CompanyNotificationSubscriptionListView, MeView, NotificationPreferenceView

urlpatterns = [
    path("", MeView.as_view(), name="me"),
    path("preferences/", NotificationPreferenceView.as_view(), name="me_preferences"),
    path("company-notifications/", CompanyNotificationSubscriptionListView.as_view(), name="me_company_notifications"),
]
