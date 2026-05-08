from django.urls import path

from .views import AssociationAdminRateCatalogView, AssociationRateDetailView, DashboardView, StateRatesView

urlpatterns = [
    path("", DashboardView.as_view(), name="dashboard"),
    path("state-rates/", StateRatesView.as_view(), name="dashboard_state_rates"),
    path("associations/<int:association_id>/", AssociationRateDetailView.as_view(), name="dashboard_association_rate_detail"),
    path("admin/association-rate-catalog/", AssociationAdminRateCatalogView.as_view(), name="admin_association_rate_catalog"),
]
