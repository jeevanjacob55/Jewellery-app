from django.urls import path

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
    path("associations/", AssociationCreateView.as_view(), name="admin_association_create"),
    path("district-units/bulk/", DistrictUnitBulkCreateView.as_view(), name="admin_district_unit_bulk_create"),
    path("units/bulk/", UnitBulkCreateView.as_view(), name="admin_unit_bulk_create"),
]
