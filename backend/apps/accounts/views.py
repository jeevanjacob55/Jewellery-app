from django.conf import settings
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.ads.models import Advertisement
from apps.directory.models import Company
from apps.news.models import News

from .models import MemberAccessRequest, NotificationPreference, User, UserRole
from .serializers import (
    GuestAccessSerializer,
    MemberAccessRequestCreateSerializer,
    MemberAccessRequestResponseSerializer,
    NotificationPreferenceSerializer,
    UpdateNotificationPreferenceSerializer,
    UpdateUserSerializer,
    UserSerializer,
)


def _build_role_display(role: str) -> str:
    label = dict(UserRole.Role.choices).get(role)
    if label:
        return label

    return dict(User.Role.choices).get(role, role.replace("_", " ").title())


def _get_primary_role(user) -> str:
    scoped_roles = [role.role for role in user.scoped_roles.all()]
    role_priority = [
        "super_admin",
        "state_admin",
        "association_admin",
        "district_admin",
        "unit_admin",
        "company_admin",
    ]
    for role in role_priority:
        if role in scoped_roles:
            return role
    return user.role


def _get_linked_company(user):
    scoped_company_role = user.scoped_roles.filter(role="company_admin", scope_type="company").order_by("id").first()
    if scoped_company_role:
        company = Company.objects.select_related("tier_ref").filter(pk=scoped_company_role.scope_id).first()
        if company:
            return company

    member_profile = getattr(user, "member_profile", None)
    company_name = getattr(member_profile, "company_name", "").strip()
    if not company_name:
        return None

    matches = list(Company.objects.select_related("tier_ref").filter(name=company_name)[:2])
    if len(matches) == 1:
        return matches[0]
    return None


def _get_pending_approvals_count(*, is_admin: bool) -> int:
    if not is_admin:
        return 0

    return (
        MemberAccessRequest.objects.filter(status=MemberAccessRequest.Status.PENDING).count()
        + News.objects.filter(status=News.Status.PENDING_APPROVAL).count()
        + Advertisement.objects.filter(status=Advertisement.Status.SUBMITTED).count()
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
        user = request.user
        member_profile = getattr(user, "member_profile", None)
        primary_role = _get_primary_role(user)
        linked_company = _get_linked_company(user)
        is_admin = user.role in {"admin", "super_admin"} or user.scoped_roles.filter(
            role__in=["super_admin", "state_admin", "association_admin", "district_admin", "unit_admin"]
        ).exists()
        pending_approvals_count = _get_pending_approvals_count(is_admin=is_admin)
        upgrade_url = settings.COMPANY_PLAN_UPGRADE_URL or None

        return Response(
            {
                "user": {
                    "id": user.id,
                    "name": f"{user.first_name} {user.last_name}".strip() or user.username,
                    "email": user.email,
                    "phone": getattr(member_profile, "phone_number", "") or None,
                    "avatar": None,
                    "role": primary_role.upper(),
                    "role_display_name": _build_role_display(primary_role),
                    "is_admin": is_admin,
                    "has_company": linked_company is not None,
                    "can_manage_products": linked_company is not None
                    and user.scoped_roles.filter(role="company_admin", scope_type="company", scope_id=linked_company.id).exists(),
                },
                "hierarchy": {
                    "association": getattr(getattr(member_profile, "association", None), "name", None),
                    "state": getattr(getattr(member_profile, "state", None), "name", None),
                },
                "company": (
                    {
                        "id": linked_company.id,
                        "name": linked_company.name,
                        "plan": linked_company.tier_ref.name,
                        "is_active": linked_company.is_active,
                        "is_approved": linked_company.is_approved,
                        "upgrade_url": upgrade_url,
                    }
                    if linked_company
                    else None
                ),
                "counts": {
                    "pending_approvals_count": pending_approvals_count,
                    "unread_notifications_count": 0,
                },
            }
        )

    def patch(self, request):
        serializer = UpdateUserSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        user.refresh_from_db()
        return Response(UserSerializer(user).data)


class NotificationPreferenceView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        preferences, _ = NotificationPreference.objects.get_or_create(user=request.user)
        return Response(NotificationPreferenceSerializer(preferences).data)

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
