from django.urls import path

from .views import RegionHierarchyView

urlpatterns = [
    path("", RegionHierarchyView.as_view(), name="region_hierarchy"),
]
