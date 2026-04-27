from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import NotificationPreference
from .serializers import (
    GuestAccessSerializer,
    NotificationPreferenceSerializer,
    UpdateNotificationPreferenceSerializer,
    UpdateUserSerializer,
    UserSerializer,
)


class GuestAccessView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = GuestAccessSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payload = serializer.validated_data
        return Response(
            {
                "access_type": "guest",
                "guest_profile": payload,
                "capabilities": ["directory:browse", "market_tiers:view", "company_profiles:view"],
            },
            status=status.HTTP_200_OK,
        )


class MeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)

    def patch(self, request):
        serializer = UpdateUserSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        user.refresh_from_db()
        return Response(UserSerializer(user).data)


class NotificationPreferenceView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request):
        preferences, _ = NotificationPreference.objects.get_or_create(user=request.user)
        serializer = UpdateNotificationPreferenceSerializer(preferences, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        updated_preferences = serializer.save()
        return Response(NotificationPreferenceSerializer(updated_preferences).data)


class SessionInfoView(APIView):
    def get(self, request):
        return Response(
            {
                "auth_provider": "jwt",
                "supports_google_sso": True,
                "play_store_target": "android",
                "firebase_messaging_enabled": True,
            }
        )
