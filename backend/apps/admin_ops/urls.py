from django.urls import path

from .views import AdminOverviewView

urlpatterns = [
    path("", AdminOverviewView.as_view(), name="admin_overview"),
]
