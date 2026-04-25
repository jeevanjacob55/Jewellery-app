from django.urls import path

from .views import ComplianceDashboardView

urlpatterns = [
    path("", ComplianceDashboardView.as_view(), name="services_dashboard"),
]
