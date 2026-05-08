from dataclasses import dataclass
from datetime import timedelta

from django.db.models import Q
from django.utils import timezone
from rest_framework import status
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import MemberAccessRequest, UserRole
from apps.ads.models import Advertisement
from apps.directory.models import Company, Product
from apps.directory.services import get_admin_manageable_company_queryset
from apps.news.models import Meeting, News
from apps.news.services import can_user_review_news
from apps.rates.models import AssociationRate
from apps.regions.models import Association, DistrictOperationalUnit, RegionState, Unit

from .models import AuditLog
from .permissions import HasAdminAccess, IsSuperAdmin
from .serializers import (
    AdminCompanyProfilesResponseSerializer,
    AdminOverviewResponseSerializer,
    AssociationCreateSerializer,
    DistrictUnitBulkCreateSerializer,
    SuperAdminHierarchySerializer,
    UnitBulkCreateSerializer,
    build_bulk_create_result,
    serialize_bulk_district_units,
    serialize_bulk_units,
)


@dataclass
class AdminScopeContext:
    role: str
    scope_type: str
    scope_id: int | None
    label: str
    state: RegionState | None = None
    association: Association | None = None
    district_operational_unit: DistrictOperationalUnit | None = None
    unit: Unit | None = None


def _normalize_role_label(role: str) -> str:
    return role.replace("_", " ")


def _resolve_admin_scope(user) -> AdminScopeContext:
    if getattr(user, "is_super_admin_user", False):
        return AdminScopeContext(
            role=UserRole.Role.SUPER_ADMIN,
            scope_type=UserRole.ScopeType.PLATFORM,
            scope_id=None,
            label="Platform",
        )

    priority = [
        UserRole.Role.STATE_ADMIN,
        UserRole.Role.ASSOCIATION_ADMIN,
        UserRole.Role.DISTRICT_ADMIN,
        UserRole.Role.UNIT_ADMIN,
        UserRole.Role.COMPANY_ADMIN,
    ]
    scoped_roles = list(user.scoped_roles.order_by("id"))
    for role_name in priority:
        scoped_role = next((item for item in scoped_roles if item.role == role_name), None)
        if scoped_role is None:
            continue

        if scoped_role.role == UserRole.Role.COMPANY_ADMIN:
            raise PermissionDenied("Company admins do not use the admin overview dashboard.")

        if scoped_role.scope_type == UserRole.ScopeType.STATE:
            state = RegionState.objects.filter(pk=scoped_role.scope_id).first()
            if state is None:
                raise PermissionDenied("Assigned state scope could not be resolved.")
            return AdminScopeContext(
                role=scoped_role.role,
                scope_type=scoped_role.scope_type,
                scope_id=state.id,
                label=state.name,
                state=state,
            )

        if scoped_role.scope_type == UserRole.ScopeType.ASSOCIATION:
            association = Association.objects.select_related("state").filter(pk=scoped_role.scope_id).first()
            if association is None:
                raise PermissionDenied("Assigned association scope could not be resolved.")
            return AdminScopeContext(
                role=scoped_role.role,
                scope_type=scoped_role.scope_type,
                scope_id=association.id,
                label=association.name,
                state=association.state,
                association=association,
            )

        if scoped_role.scope_type == UserRole.ScopeType.DISTRICT_OPERATIONAL_UNIT:
            district_operational_unit = DistrictOperationalUnit.objects.select_related("association__state").filter(pk=scoped_role.scope_id).first()
            if district_operational_unit is None:
                raise PermissionDenied("Assigned district scope could not be resolved.")
            return AdminScopeContext(
                role=scoped_role.role,
                scope_type=scoped_role.scope_type,
                scope_id=district_operational_unit.id,
                label=district_operational_unit.name,
                state=district_operational_unit.association.state,
                association=district_operational_unit.association,
                district_operational_unit=district_operational_unit,
            )

        if scoped_role.scope_type == UserRole.ScopeType.UNIT:
            unit = Unit.objects.select_related("district_operational_unit__association__state").filter(pk=scoped_role.scope_id).first()
            if unit is None:
                raise PermissionDenied("Assigned unit scope could not be resolved.")
            return AdminScopeContext(
                role=scoped_role.role,
                scope_type=scoped_role.scope_type,
                scope_id=unit.id,
                label=unit.name,
                state=unit.district_operational_unit.association.state,
                association=unit.district_operational_unit.association,
                district_operational_unit=unit.district_operational_unit,
                unit=unit,
            )

    if user.is_staff:
        return AdminScopeContext(
            role=UserRole.Role.SUPER_ADMIN,
            scope_type=UserRole.ScopeType.PLATFORM,
            scope_id=None,
            label="Platform",
        )

    raise PermissionDenied("A supported admin scope is required for the overview dashboard.")


def _scoped_company_queryset(scope: AdminScopeContext):
    queryset = Company.objects.all()

    if scope.scope_type == UserRole.ScopeType.PLATFORM:
        return queryset
    if scope.scope_type == UserRole.ScopeType.STATE and scope.state is not None:
        return queryset.filter(state__iexact=scope.state.name)

    company_name_queryset = None
    if scope.scope_type == UserRole.ScopeType.ASSOCIATION and scope.association is not None:
        company_name_queryset = scope.association.member_profiles.exclude(company_name="").values_list("company_name", flat=True)
    elif scope.scope_type == UserRole.ScopeType.DISTRICT_OPERATIONAL_UNIT and scope.district_operational_unit is not None:
        company_name_queryset = scope.district_operational_unit.member_profiles.exclude(company_name="").values_list("company_name", flat=True)
    elif scope.scope_type == UserRole.ScopeType.UNIT and scope.unit is not None:
        company_name_queryset = scope.unit.member_profiles.exclude(company_name="").values_list("company_name", flat=True)

    if company_name_queryset is None:
        return queryset.none()
    return queryset.filter(name__in=company_name_queryset).distinct()


def _scoped_product_queryset(scope: AdminScopeContext):
    company_queryset = _scoped_company_queryset(scope)
    return Product.objects.filter(company__in=company_queryset)


def _scoped_member_access_request_queryset(scope: AdminScopeContext):
    queryset = MemberAccessRequest.objects.all()
    if scope.scope_type == UserRole.ScopeType.PLATFORM:
        return queryset
    if scope.scope_type == UserRole.ScopeType.STATE and scope.state is not None:
        return queryset.filter(state=scope.state)
    if scope.scope_type == UserRole.ScopeType.ASSOCIATION and scope.association is not None:
        return queryset.filter(association=scope.association)
    if scope.scope_type == UserRole.ScopeType.DISTRICT_OPERATIONAL_UNIT and scope.district_operational_unit is not None:
        return queryset.filter(district_operational_unit=scope.district_operational_unit)
    if scope.scope_type == UserRole.ScopeType.UNIT and scope.unit is not None:
        return queryset.filter(unit=scope.unit)
    return queryset.none()


def _scoped_advertisement_queryset(scope: AdminScopeContext):
    queryset = Advertisement.objects.all()
    if scope.scope_type == UserRole.ScopeType.PLATFORM:
        return queryset
    if scope.scope_type == UserRole.ScopeType.STATE and scope.state is not None:
        return queryset.filter(targeting__state=scope.state)
    if scope.scope_type == UserRole.ScopeType.ASSOCIATION and scope.association is not None:
        return queryset.filter(targeting__association=scope.association)
    if scope.scope_type == UserRole.ScopeType.DISTRICT_OPERATIONAL_UNIT and scope.district_operational_unit is not None:
        return queryset.filter(targeting__district_operational_unit=scope.district_operational_unit)
    if scope.scope_type == UserRole.ScopeType.UNIT and scope.unit is not None:
        return queryset.filter(targeting__unit=scope.unit)
    return queryset.none()


def _scoped_published_news_queryset(scope: AdminScopeContext):
    queryset = News.objects.filter(status=News.Status.PUBLISHED)
    if scope.scope_type == UserRole.ScopeType.PLATFORM:
        return queryset
    if scope.scope_type == UserRole.ScopeType.STATE and scope.state is not None:
        association_ids = scope.state.associations.values_list("id", flat=True)
        unit_ids = Unit.objects.filter(district_operational_unit__association__state=scope.state).values_list("id", flat=True)
        company_ids = _scoped_company_queryset(scope).values_list("id", flat=True)
        return queryset.filter(
            Q(publisher_type=News.PublisherType.ASSOCIATION, publisher_id__in=association_ids)
            | Q(publisher_type=News.PublisherType.UNIT, publisher_id__in=unit_ids)
            | Q(publisher_type=News.PublisherType.COMPANY, publisher_id__in=company_ids)
        )
    if scope.scope_type == UserRole.ScopeType.ASSOCIATION and scope.association is not None:
        unit_ids = Unit.objects.filter(district_operational_unit__association=scope.association).values_list("id", flat=True)
        company_ids = _scoped_company_queryset(scope).values_list("id", flat=True)
        return queryset.filter(
            Q(publisher_type=News.PublisherType.ASSOCIATION, publisher_id=scope.association.id)
            | Q(publisher_type=News.PublisherType.UNIT, publisher_id__in=unit_ids)
            | Q(publisher_type=News.PublisherType.COMPANY, publisher_id__in=company_ids)
        )
    if scope.scope_type == UserRole.ScopeType.DISTRICT_OPERATIONAL_UNIT and scope.district_operational_unit is not None:
        unit_ids = scope.district_operational_unit.units.values_list("id", flat=True)
        company_ids = _scoped_company_queryset(scope).values_list("id", flat=True)
        return queryset.filter(
            Q(publisher_type=News.PublisherType.UNIT, publisher_id__in=unit_ids)
            | Q(publisher_type=News.PublisherType.COMPANY, publisher_id__in=company_ids)
        )
    if scope.scope_type == UserRole.ScopeType.UNIT and scope.unit is not None:
        company_ids = _scoped_company_queryset(scope).values_list("id", flat=True)
        return queryset.filter(
            Q(publisher_type=News.PublisherType.UNIT, publisher_id=scope.unit.id)
            | Q(publisher_type=News.PublisherType.COMPANY, publisher_id__in=company_ids)
        )
    return queryset.none()


def _scoped_upcoming_meeting_queryset(scope: AdminScopeContext):
    queryset = Meeting.objects.filter(status=Meeting.Status.PUBLISHED, start_datetime__gte=timezone.now())
    if scope.scope_type == UserRole.ScopeType.PLATFORM:
        return queryset
    if scope.scope_type == UserRole.ScopeType.STATE and scope.state is not None:
        association_ids = scope.state.associations.values_list("id", flat=True)
        unit_ids = Unit.objects.filter(district_operational_unit__association__state=scope.state).values_list("id", flat=True)
        company_ids = _scoped_company_queryset(scope).values_list("id", flat=True)
        return queryset.filter(
            Q(organizer_type=Meeting.OrganizerType.ASSOCIATION, organizer_id__in=association_ids)
            | Q(organizer_type=Meeting.OrganizerType.UNIT, organizer_id__in=unit_ids)
            | Q(organizer_type=Meeting.OrganizerType.COMPANY, organizer_id__in=company_ids)
        )
    if scope.scope_type == UserRole.ScopeType.ASSOCIATION and scope.association is not None:
        unit_ids = Unit.objects.filter(district_operational_unit__association=scope.association).values_list("id", flat=True)
        company_ids = _scoped_company_queryset(scope).values_list("id", flat=True)
        return queryset.filter(
            Q(organizer_type=Meeting.OrganizerType.ASSOCIATION, organizer_id=scope.association.id)
            | Q(organizer_type=Meeting.OrganizerType.UNIT, organizer_id__in=unit_ids)
            | Q(organizer_type=Meeting.OrganizerType.COMPANY, organizer_id__in=company_ids)
        )
    if scope.scope_type == UserRole.ScopeType.DISTRICT_OPERATIONAL_UNIT and scope.district_operational_unit is not None:
        unit_ids = scope.district_operational_unit.units.values_list("id", flat=True)
        company_ids = _scoped_company_queryset(scope).values_list("id", flat=True)
        return queryset.filter(
            Q(organizer_type=Meeting.OrganizerType.UNIT, organizer_id__in=unit_ids)
            | Q(organizer_type=Meeting.OrganizerType.COMPANY, organizer_id__in=company_ids)
        )
    if scope.scope_type == UserRole.ScopeType.UNIT and scope.unit is not None:
        company_ids = _scoped_company_queryset(scope).values_list("id", flat=True)
        return queryset.filter(
            Q(organizer_type=Meeting.OrganizerType.UNIT, organizer_id=scope.unit.id)
            | Q(organizer_type=Meeting.OrganizerType.COMPANY, organizer_id__in=company_ids)
        )
    return queryset.none()


def _pending_news_count(user) -> int:
    pending_news = News.objects.filter(status=News.Status.PENDING_APPROVAL).prefetch_related("targets").select_related("created_by")
    return sum(1 for news in pending_news if can_user_review_news(user, news))


def _latest_rate_timestamp(scope: AdminScopeContext):
    queryset = AssociationRate.objects.all()
    if scope.scope_type == UserRole.ScopeType.PLATFORM:
        return queryset.order_by("-effective_at", "-id").values_list("effective_at", flat=True).first()
    if scope.association is not None:
        return queryset.filter(association=scope.association).order_by("-effective_at", "-id").values_list("effective_at", flat=True).first()
    if scope.scope_type == UserRole.ScopeType.STATE and scope.state is not None:
        return queryset.filter(association__state=scope.state).order_by("-effective_at", "-id").values_list("effective_at", flat=True).first()
    return queryset.none().values_list("effective_at", flat=True).first()


def _build_rate_freshness_label(value) -> str:
    if value is None:
        return "No rate published"
    local_value = timezone.localtime(value)
    now = timezone.localtime(timezone.now())
    delta = now - local_value
    if delta <= timedelta(hours=1):
        return "Updated within the hour"
    if local_value.date() == now.date():
        return "Updated today"
    if local_value.date() == (now - timedelta(days=1)).date():
        return "Updated yesterday"
    return f"Updated {max(delta.days, 1)} days ago"


def _filter_audit_logs_for_scope(queryset, scope: AdminScopeContext):
    if scope.scope_type == UserRole.ScopeType.PLATFORM:
        return queryset
    if scope.scope_type == UserRole.ScopeType.STATE and scope.state is not None:
        return queryset.filter(metadata__state=scope.state.name)
    if scope.scope_type == UserRole.ScopeType.ASSOCIATION and scope.association is not None:
        return queryset.filter(metadata__association=scope.association.name)
    if scope.scope_type == UserRole.ScopeType.DISTRICT_OPERATIONAL_UNIT and scope.district_operational_unit is not None:
        return queryset.filter(metadata__district_unit=scope.district_operational_unit.name)
    if scope.scope_type == UserRole.ScopeType.UNIT and scope.unit is not None:
        return queryset.filter(metadata__unit=scope.unit.name)
    return queryset.none()


def _build_activity_summary(log: AuditLog) -> str:
    metadata = log.metadata or {}
    if metadata.get("region"):
        return str(metadata["region"])
    if metadata.get("association"):
        return str(metadata["association"])
    if metadata.get("placement"):
        return f"Placement: {metadata['placement']}"
    return f"{log.entity_type.replace('_', ' ').title()} update"


def build_admin_overview_payload(user) -> dict:
    scope = _resolve_admin_scope(user)
    active_companies = _scoped_company_queryset(scope).filter(is_active=True, is_approved=True)
    active_products = _scoped_product_queryset(scope).filter(
        is_active=True,
        company__is_active=True,
        company__is_approved=True,
    )
    pending_member_access_requests = _scoped_member_access_request_queryset(scope).filter(status=MemberAccessRequest.Status.PENDING).count()
    pending_news = _pending_news_count(user)
    submitted_ads = _scoped_advertisement_queryset(scope).filter(status=Advertisement.Status.SUBMITTED).distinct().count()
    latest_rate_timestamp = _latest_rate_timestamp(scope)

    pending_work = [
        {"key": "member_access_requests", "label": "Member access requests", "count": pending_member_access_requests, "route": None},
        {"key": "pending_news", "label": "News awaiting approval", "count": pending_news, "route": None},
        {"key": "submitted_ads", "label": "Advertisements awaiting approval", "count": submitted_ads, "route": None},
    ]
    pending_work = [item for item in pending_work if item["count"] > 0]

    recent_activity_queryset = _filter_audit_logs_for_scope(
        AuditLog.objects.select_related("actor").order_by("-created_at", "-id"),
        scope,
    )[:6]
    recent_activity = [
        {
            "id": log.id,
            "actor_name": (
                f"{log.actor.first_name} {log.actor.last_name}".strip()
                if log.actor_id
                else "System"
            )
            or getattr(getattr(log, "actor", None), "username", "System"),
            "action": log.action.replace("_", " ").title(),
            "entity_type": log.entity_type,
            "entity_id": log.entity_id,
            "summary": _build_activity_summary(log),
            "created_at": log.created_at,
        }
        for log in recent_activity_queryset
    ]

    quick_actions = []
    if scope.role == UserRole.Role.ASSOCIATION_ADMIN:
        quick_actions.append(
            {
                "label": "Update Rates",
                "description": "Review and publish the current association rate catalog.",
                "route": "/admin/rates",
            }
        )

    return {
        "scope": {
            "label": scope.label,
            "scope_type": scope.scope_type,
            "role": _normalize_role_label(scope.role),
        },
        "kpis": {
            "pending_approvals": pending_member_access_requests + pending_news + submitted_ads,
            "active_companies": active_companies.count(),
            "active_products": active_products.count(),
            "published_news": _scoped_published_news_queryset(scope).count(),
            "upcoming_meetings": _scoped_upcoming_meeting_queryset(scope).count(),
            "rate_last_updated_at": latest_rate_timestamp,
            "rate_freshness_label": _build_rate_freshness_label(latest_rate_timestamp),
        },
        "pending_work": pending_work,
        "recent_activity": recent_activity,
        "quick_actions": quick_actions,
    }


class AdminOverviewView(APIView):
    permission_classes = [HasAdminAccess]

    def get(self, request):
        payload = build_admin_overview_payload(request.user)
        return Response(AdminOverviewResponseSerializer(payload).data)


class AdminCompanyProfilesView(APIView):
    permission_classes = [HasAdminAccess]

    def get(self, request):
        _resolve_admin_scope(request.user)
        queryset = (
            get_admin_manageable_company_queryset(request.user)
            .select_related("verification", "tier_ref")
            .prefetch_related("products", "images__asset")
            .order_by("name", "id")
        )
        payload = {
            "companies": list(queryset),
        }
        return Response(AdminCompanyProfilesResponseSerializer(payload).data)


class HierarchyManagementView(APIView):
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        states = RegionState.objects.prefetch_related("associations__district_units__units").all()
        return Response(SuperAdminHierarchySerializer({"states": states}).data)


class AssociationCreateView(APIView):
    permission_classes = [IsSuperAdmin]

    def post(self, request):
        serializer = AssociationCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        association = serializer.save()
        return Response(
            {
                "id": association.id,
                "name": association.name,
                "state": {"id": association.state.id, "name": association.state.name},
            },
            status=status.HTTP_201_CREATED,
        )


class DistrictUnitBulkCreateView(APIView):
    permission_classes = [IsSuperAdmin]

    def post(self, request):
        serializer = DistrictUnitBulkCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        association = serializer.validated_data["association"]
        names = serializer.validated_data["names"]
        existing_lookup = {
            district_unit.name.casefold(): district_unit
            for district_unit in DistrictOperationalUnit.objects.filter(association=association)
        }
        result = build_bulk_create_result(
            names=names,
            existing_lookup=existing_lookup,
            create_callback=lambda name: DistrictOperationalUnit.objects.create(association=association, name=name),
        )

        return Response(
            {
                "association": {"id": association.id, "name": association.name},
                **serialize_bulk_district_units(result),
            },
            status=status.HTTP_201_CREATED,
        )


class UnitBulkCreateView(APIView):
    permission_classes = [IsSuperAdmin]

    def post(self, request):
        serializer = UnitBulkCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        district_operational_unit = serializer.validated_data["district_operational_unit"]
        names = serializer.validated_data["names"]
        existing_lookup = {
            unit.name.casefold(): unit
            for unit in Unit.objects.filter(district_operational_unit=district_operational_unit)
        }
        result = build_bulk_create_result(
            names=names,
            existing_lookup=existing_lookup,
            create_callback=lambda name: Unit.objects.create(district_operational_unit=district_operational_unit, name=name),
        )

        return Response(
            {
                "district_operational_unit": {
                    "id": district_operational_unit.id,
                    "name": district_operational_unit.name,
                },
                **serialize_bulk_units(result),
            },
            status=status.HTTP_201_CREATED,
        )
