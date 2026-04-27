from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .views import GuestAccessView, MemberAccessRequestView, SessionInfoView

urlpatterns = [
    path("login/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("guest/", GuestAccessView.as_view(), name="guest_access"),
    path("member-access-request/", MemberAccessRequestView.as_view(), name="member_access_request"),
    path("session/", SessionInfoView.as_view(), name="session_info"),
]
