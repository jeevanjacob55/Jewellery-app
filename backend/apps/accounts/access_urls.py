from django.urls import path

from .access_views import (
    AccountActivationView,
    AssociationAdminAccessRequestSubmitView,
    CompanyAdminAccessRequestSubmitView,
)

urlpatterns = [
    path("company-admin/request/", CompanyAdminAccessRequestSubmitView.as_view(), name="company_admin_access_request_submit"),
    path("association-admin/request/", AssociationAdminAccessRequestSubmitView.as_view(), name="association_admin_access_request_submit"),
    path("activation/<uuid:token>/", AccountActivationView.as_view(), name="access_activation"),
]
