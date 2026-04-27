from django.urls import path

from .views import DashboardView, StateRatesView

urlpatterns = [
    path("", DashboardView.as_view(), name="dashboard"),
    path("state-rates/", StateRatesView.as_view(), name="dashboard_state_rates"),
]
