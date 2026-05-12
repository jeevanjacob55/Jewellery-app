from django.urls import path

from .views import (
    AssociationAdminRateCatalogView,
    AssociationRateDetailView,
    AssociationSpotlightDetailView,
    AssociationSpotlightListCreateView,
    AssociationSpotlightMediaFinalizeView,
    AssociationSpotlightReorderView,
    AssociationSpotlightUploadSessionView,
    DashboardView,
    StateRatesView,
)

urlpatterns = [
    path("", DashboardView.as_view(), name="dashboard"),
    path("state-rates/", StateRatesView.as_view(), name="dashboard_state_rates"),
    path("associations/<int:association_id>/", AssociationRateDetailView.as_view(), name="dashboard_association_rate_detail"),
    path("admin/association-rate-catalog/", AssociationAdminRateCatalogView.as_view(), name="admin_association_rate_catalog"),
    path("admin/association-spotlights/", AssociationSpotlightListCreateView.as_view(), name="admin_association_spotlight_list_create"),
    path("admin/association-spotlights/upload-session/", AssociationSpotlightUploadSessionView.as_view(), name="admin_association_spotlight_upload_session"),
    path("admin/association-spotlights/media-assets/", AssociationSpotlightMediaFinalizeView.as_view(), name="admin_association_spotlight_media_asset_finalize"),
    path("admin/association-spotlights/reorder/", AssociationSpotlightReorderView.as_view(), name="admin_association_spotlight_reorder"),
    path("admin/association-spotlights/<int:item_id>/", AssociationSpotlightDetailView.as_view(), name="admin_association_spotlight_detail"),
]
