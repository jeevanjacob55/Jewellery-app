from django.urls import path

from .views import AssociationRateDetailView, DashboardView, StateRatesView

urlpatterns = [
    path("", DashboardView.as_view(), name="dashboard"),
    path("state-rates/", StateRatesView.as_view(), name="dashboard_state_rates"),
    path("associations/<int:association_id>/", AssociationRateDetailView.as_view(), name="dashboard_association_rate_detail"),
]
