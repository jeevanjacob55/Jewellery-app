import logging

from django.conf import settings
from django.db.models import Prefetch
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from apps.ads.models import Advertisement
from apps.ads.views import _approval_queryset_for_user
from apps.admin_ops.views import _resolve_admin_scope, _scoped_member_access_request_queryset
from apps.directory.access import MANAGEABLE_MEMBERSHIP_ROLES, get_linked_company_context
from apps.directory.models import CompanyImage, CompanyNotificationSubscription
from apps.news.services import can_user_review_news
from apps.news.models import News

from .access_services import get_association_admin_access_requests_for_user, get_company_admin_access_requests_for_user
from .google_auth import GoogleAuthError, verify_google_id_token
from .models import AssociationAdminAccessRequest, CompanyAdminAccessRequest, MemberAccessRequest, NotificationPreference, User, UserNotification, UserRole
from .notification_services import get_unread_notification_count, mark_all_user_notifications_read, mark_user_notification_read
from .serializers import (
    GuestAccessSerializer,
    GoogleLoginSerializer,
    MemberAccessRequestCreateSerializer,
    MemberAccessRequestResponseSerializer,
    NotificationPreferenceSerializer,
    CompanyNotificationSubscriptionSerializer,
    UserNotificationFeedSerializer,
    UserNotificationSerializer,
    UpdateNotificationPreferenceSerializer,
    UpdateUserSerializer,
    UserSerializer,
)

logger = logging.getLogger(__name__)


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


def _get_pending_approvals_count(*, user, is_admin: bool) -> int:
    if not is_admin:
        return 0
    if getattr(user, "is_super_admin_user", False):
        pending_news = News.objects.filter(status=News.Status.PENDING_APPROVAL).count()
        pending_ads = Advertisement.objects.filter(status=Advertisement.Status.SUBMITTED).count()
        pending_member_access_requests = MemberAccessRequest.objects.filter(status=MemberAccessRequest.Status.PENDING).count()
    else:
        try:
            scope = _resolve_admin_scope(user)
        except PermissionDenied:
            return 0
        pending_member_access_requests = _scoped_member_access_request_queryset(scope).filter(status=MemberAccessRequest.Status.PENDING).count()
        pending_news = sum(
            1
            for news in News.objects.filter(status=News.Status.PENDING_APPROVAL).only("id", "publisher_type", "publisher_id", "created_by_id")
            if can_user_review_news(user, news)
        )
        pending_ads = _approval_queryset_for_user(user).count()

    return (
        pending_member_access_requests
        + pending_news
        + pending_ads
        + get_company_admin_access_requests_for_user(user).filter(status=CompanyAdminAccessRequest.Status.PENDING).count()
        + get_association_admin_access_requests_for_user(user).filter(status=AssociationAdminAccessRequest.Status.PENDING).count()
    )


def _build_notification_feed_queryset(user, *, filter_type: str | None = None):
    queryset = UserNotification.objects.filter(user=user).select_related("notification")
    if filter_type and filter_type != "all":
        queryset = queryset.filter(notification__type=filter_type)
    return queryset.order_by("-notification__created_at", "-id")


def _build_me_payload(user) -> dict:
    member_profile = getattr(user, "member_profile", None)
    primary_role = _get_primary_role(user)
    linked_company_context = get_linked_company_context(user)
    linked_company = linked_company_context.company
    is_admin = user.role in {"admin", "super_admin"} or user.scoped_roles.filter(
        role__in=["super_admin", "state_admin", "association_admin", "district_admin", "unit_admin"]
    ).exists()
    pending_approvals_count = _get_pending_approvals_count(user=user, is_admin=is_admin)
    upgrade_url = settings.COMPANY_PLAN_UPGRADE_URL or None
    membership = linked_company_context.membership
    can_manage_products = False
    if linked_company is not None:
        if membership is not None and membership.role in MANAGEABLE_MEMBERSHIP_ROLES:
            can_manage_products = True
        elif user.scoped_roles.filter(role="company_admin", scope_type="company", scope_id=linked_company.id).exists():
            can_manage_products = True

    if linked_company is not None:
        hierarchy_state = linked_company.state_ref.name if linked_company.state_ref_id else linked_company.state or getattr(getattr(member_profile, "state", None), "name", None)
        if linked_company.association_ref_id:
            hierarchy_association = linked_company.association_ref.name
            has_association_context = True
        elif linked_company.company_type == linked_company.CompanyType.INDEPENDENT:
            hierarchy_association = None
            has_association_context = False
        else:
            hierarchy_association = getattr(getattr(member_profile, "association", None), "name", None)
            has_association_context = bool(getattr(member_profile, "association_id", None))
    else:
        hierarchy_state = getattr(getattr(member_profile, "state", None), "name", None)
        hierarchy_association = getattr(getattr(member_profile, "association", None), "name", None)
        has_association_context = bool(getattr(member_profile, "association_id", None))

    return {
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
            "can_manage_products": can_manage_products,
        },
        "hierarchy": {
            "association": hierarchy_association,
            "state": hierarchy_state,
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
        "company_type": getattr(linked_company, "company_type", "") or None,
        "company_membership_role": getattr(membership, "role", None),
        "has_association_context": has_association_context,
        "company_source": linked_company_context.source,
        "counts": {
            "pending_approvals_count": pending_approvals_count,
            "unread_notifications_count": get_unread_notification_count(user),
        },
    }


def _build_login_success_response(*, user, access_token: str, refresh_token: str) -> dict:
    payload = _build_me_payload(user)
    return {
        "status": "success",
        "access": access_token,
        "refresh": refresh_token,
        "me": payload,
    }


def _latest_access_request_for_email(email: str):
    normalized_email = email.strip().lower()
    latest_requests = []
    member_request = MemberAccessRequest.objects.filter(email__iexact=normalized_email).order_by("-created_at", "-id").first()
    if member_request is not None:
        latest_requests.append((member_request.created_at, member_request))
    company_request = CompanyAdminAccessRequest.objects.filter(requester_email__iexact=normalized_email).order_by("-updated_at", "-created_at", "-id").first()
    if company_request is not None:
        latest_requests.append((company_request.updated_at or company_request.created_at, company_request))
    association_request = AssociationAdminAccessRequest.objects.filter(requester_email__iexact=normalized_email).order_by("-updated_at", "-created_at", "-id").first()
    if association_request is not None:
        latest_requests.append((association_request.updated_at or association_request.created_at, association_request))
    if not latest_requests:
        return None
    latest_requests.sort(key=lambda item: (item[0], getattr(item[1], "id", 0)), reverse=True)
    return latest_requests[0][1]


def _resolve_google_access(email: str):
    users = list(User.objects.filter(email__iexact=email).order_by("id")[:2])
    if len(users) > 1:
        logger.warning("Google login blocked because multiple users matched email '%s'.", email)
        return {
            "status": "account_conflict",
            "message": "Multiple accounts were found for this Google email. Please contact admin.",
        }
    if users:
        user = users[0]
        if not user.is_active:
            return {
                "status": "inactive",
                "message": "Your account is inactive. Please contact admin.",
            }
        return {
            "status": "success",
            "user": user,
        }

    latest_request = _latest_access_request_for_email(email)
    if latest_request is None:
        logger.info("Google login requires access request for unknown email '%s'.", email)
        return {
            "status": "access_required",
            "message": "No approved account found for this Google email. Please submit an access request.",
        }
    if latest_request.status == "pending":
        return {
            "status": "pending_approval",
            "message": "Your access request is still pending approval.",
        }
    if latest_request.status == "rejected":
        return {
            "status": "rejected",
            "message": "Your access request was rejected. Please contact support or submit a new request.",
        }
    return {
        "status": "inactive",
        "message": "Your account is inactive. Please contact admin.",
    }


def _link_google_identity(user: User, token_payload: dict) -> None:
    google_sub = (token_payload.get("sub") or "").strip()
    google_email = (token_payload.get("email") or "").strip().lower()
    if not google_sub:
        raise GoogleAuthError("Google token did not include an account subject.")
    if user.google_sub and user.google_sub != google_sub:
        raise GoogleAuthError("A different Google account is already linked to this user.")
    conflicting_user = User.objects.exclude(pk=user.pk).filter(google_sub=google_sub).first()
    if conflicting_user is not None:
        raise GoogleAuthError("This Google account is already linked to another user.")

    update_fields: list[str] = []
    if user.google_sub != google_sub:
        user.google_sub = google_sub
        update_fields.append("google_sub")
    if user.google_email != google_email:
        user.google_email = google_email
        update_fields.append("google_email")
    if not user.google_auth_enabled:
        user.google_auth_enabled = True
        update_fields.append("google_auth_enabled")
    user.last_google_login_at = timezone.now()
    update_fields.append("last_google_login_at")
    if update_fields:
        user.save(update_fields=update_fields)


class PasswordLoginView(TokenObtainPairView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.user
        return Response(
            _build_login_success_response(
                user=user,
                access_token=serializer.validated_data["access"],
                refresh_token=serializer.validated_data["refresh"],
            ),
            status=status.HTTP_200_OK,
        )


class GoogleLoginView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = GoogleLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            token_payload = verify_google_id_token(serializer.validated_data["id_token"])
        except GoogleAuthError as exc:
            logger.warning("Google login token verification failed: %s", exc)
            return Response(
                {
                    "status": "invalid_token",
                    "message": str(exc),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        email = token_payload["email"].strip().lower()
        outcome = _resolve_google_access(email)
        if outcome["status"] != "success":
            logger.info("Google login blocked for '%s' with status '%s'.", email, outcome["status"])
            return Response(
                {
                    **outcome,
                    "email": email,
                },
                status=status.HTTP_200_OK,
            )

        user = outcome["user"]
        try:
            _link_google_identity(user, token_payload)
        except GoogleAuthError as exc:
            logger.warning("Google login account-linking conflict for '%s': %s", email, exc)
            return Response(
                {
                    "status": "account_conflict",
                    "message": str(exc),
                    "email": email,
                },
                status=status.HTTP_409_CONFLICT,
            )

        refresh = RefreshToken.for_user(user)
        return Response(
            _build_login_success_response(
                user=user,
                access_token=str(refresh.access_token),
                refresh_token=str(refresh),
            ),
            status=status.HTTP_200_OK,
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
        return Response(_build_me_payload(request.user))

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


class CompanyNotificationSubscriptionListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        subscriptions = (
            CompanyNotificationSubscription.objects.filter(
                user=request.user,
                company__is_active=True,
                company__is_approved=True,
            )
            .select_related("company")
            .prefetch_related(
                Prefetch("company__images", queryset=CompanyImage.objects.select_related("asset").order_by("is_logo", "id"))
            )
            .order_by("-created_at", "-id")
        )
        return Response(CompanyNotificationSubscriptionSerializer(subscriptions, many=True, context={"request": request}).data)


class NotificationFeedView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    ALLOWED_FILTERS = {"all", "product", "news", "meeting", "rate"}

    def get(self, request):
        filter_type = request.query_params.get("type", "all")
        if filter_type not in self.ALLOWED_FILTERS:
            return Response({"type": ["Unsupported notification filter."]}, status=status.HTTP_400_BAD_REQUEST)

        queryset = _build_notification_feed_queryset(request.user, filter_type=filter_type)[:50]
        payload = {
            "results": queryset,
            "unread_count": get_unread_notification_count(request.user),
        }
        return Response(UserNotificationFeedSerializer(payload).data)


class NotificationMarkReadView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, notification_id: int):
        user_notification = UserNotification.objects.filter(user=request.user).select_related("notification").filter(pk=notification_id).first()
        if user_notification is None:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        mark_user_notification_read(user_notification)
        return Response(
            {
                "notification": UserNotificationSerializer(user_notification).data,
                "unread_count": get_unread_notification_count(request.user),
            }
        )


class NotificationMarkAllReadView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        updated_count = mark_all_user_notifications_read(request.user)
        return Response(
            {
                "updated_count": updated_count,
                "unread_count": get_unread_notification_count(request.user),
            }
        )


class SessionInfoView(APIView):
    def get(self, request):
        return Response(
            {
                "auth_provider": "jwt",
                "supports_google_sso": bool(settings.GOOGLE_OAUTH_CLIENT_IDS),
                "play_store_target": "android",
                "firebase_messaging_enabled": True,
            }
        )
