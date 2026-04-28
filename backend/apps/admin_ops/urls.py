from django.urls import path

from apps.directory.views import (
    AdminCompanyTierAssignmentConfirmView,
    AdminCompanyTierAssignmentView,
    AdminCompanyTierDetailView,
    AdminCompanyTierListCreateView,
    AdminCompanyTierToggleView,
)

from .views import (
    AdminOverviewView,
    AssociationCreateView,
    DistrictUnitBulkCreateView,
    HierarchyManagementView,
    UnitBulkCreateView,
)

urlpatterns = [
    path("", AdminOverviewView.as_view(), name="admin_overview"),
    path("hierarchy/", HierarchyManagementView.as_view(), name="admin_hierarchy"),
    path("directory/tiers/", AdminCompanyTierListCreateView.as_view(), name="admin_directory_tier_list_create"),
    path("directory/tiers/<int:tier_id>/", AdminCompanyTierDetailView.as_view(), name="admin_directory_tier_detail"),
    path(
        "directory/tiers/<int:tier_id>/<str:action>/",
        AdminCompanyTierToggleView.as_view(),
        name="admin_directory_tier_toggle",
    ),
    path("directory/companies/<int:company_id>/tier/", AdminCompanyTierAssignmentView.as_view(), name="admin_directory_company_tier_assign"),
    path(
        "directory/companies/<int:company_id>/tier/confirm/",
        AdminCompanyTierAssignmentConfirmView.as_view(),
        name="admin_directory_company_tier_confirm",
    ),
    path("associations/", AssociationCreateView.as_view(), name="admin_association_create"),
    path("district-units/bulk/", DistrictUnitBulkCreateView.as_view(), name="admin_district_unit_bulk_create"),
    path("units/bulk/", UnitBulkCreateView.as_view(), name="admin_unit_bulk_create"),
]
