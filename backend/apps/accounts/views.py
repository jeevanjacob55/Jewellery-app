from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import MemberAccessRequest, NotificationPreference
from .serializers import (
    GuestAccessSerializer,
    MemberAccessRequestCreateSerializer,
    MemberAccessRequestResponseSerializer,
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
                "guest_profile": {
                    "guest_name": payload["guest_name"],
                    "state": {"id": payload["state"].id, "name": payload["state"].name},
                    "association": (
                        {"id": payload["association"].id, "name": payload["association"].name}
                        if payload.get("association")
                        else None
                    ),
                    "district_operational_unit": (
                        {
                            "id": payload["district_operational_unit"].id,
                            "name": payload["district_operational_unit"].name,
                        }
                        if payload.get("district_operational_unit")
                        else None
                    ),
                    "unit": {"id": payload["unit"].id, "name": payload["unit"].name} if payload.get("unit") else None,
                },
                "capabilities": ["directory:browse", "market_tiers:view", "company_profiles:view"],
            },
            status=status.HTTP_200_OK,
        )


class MemberAccessRequestView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = MemberAccessRequestCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        access_request = serializer.save()
        return Response(
            {
                "message": "Member access request submitted for review.",
                "request": MemberAccessRequestResponseSerializer(access_request).data,
            },
            status=status.HTTP_201_CREATED,
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
