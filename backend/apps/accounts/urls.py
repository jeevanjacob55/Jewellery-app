from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .views import GuestAccessView, SessionInfoView

urlpatterns = [
    path("login/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("guest/", GuestAccessView.as_view(), name="guest_access"),
    path("session/", SessionInfoView.as_view(), name="session_info"),
]
