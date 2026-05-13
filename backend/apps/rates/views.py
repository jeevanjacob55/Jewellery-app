from django.core.exceptions import ObjectDoesNotExist
from django.db import transaction
from django.db.models import Q
from django.http import Http404
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.text import slugify
from rest_framework import permissions, status
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.notification_services import notify_association_rate_update
from apps.accounts.models import UserRole
from apps.admin_ops.permissions import HasAdminAccess
from apps.directory.access import get_linked_company_context
from apps.media_platform.models import MediaAsset
from apps.media_platform.service import build_media_asset_response, create_upload_session, finalize_media_asset, resolve_media_asset_url
from apps.regions.models import Association, RegionState

from .models import (
    AssociationRate,
    AssociationRateCategory,
    AssociationRateSubcategory,
    AssociationSpotlightMedia,
    ExternalMarketRate,
    GlobalTrendSnapshot,
)
from .serializers import (
    AssociationRateCatalogPayloadSerializer,
    AssociationRateCatalogResponseSerializer,
    AssociationRateDetailResponseSerializer,
    AssociationSpotlightAssociationSelectorSerializer,
    AssociationSpotlightCollectionSerializer,
    AssociationSpotlightMediaFinalizeSerializer,
    AssociationSpotlightMediaReorderSerializer,
    AssociationSpotlightMediaSerializer,
    AssociationSpotlightMediaWriteSerializer,
    AssociationSpotlightUploadSessionSerializer,
    DashboardResponseSerializer,
    StateRatesResponseSerializer,
)
from django.conf import settings


QUICK_ACTIONS = [
    "Market Tiers",
    "Other Associations",
    "Reverse Search",
    "Services",
    "News & Alerts",
    "Advertiser Portal",
]

STATIC_GLOBAL_TRENDS = {"usd_inr": 83.50, "gold_oz": 2350.0, "silver_oz": 28.40}
DEFAULT_FILMSTRIP_SCROLL_SPEED = "medium"
ALLOWED_FILMSTRIP_SCROLL_SPEEDS = {"slow", "medium", "fast"}
DEFAULT_FILMSTRIP_RESHOW_POLICY = "next_app_launch"
ALLOWED_FILMSTRIP_RESHOW_POLICIES = {"next_app_launch", "every_dashboard_visit"}


def _rate_trend(current_value: float, previous_value: float | None) -> str:
    if previous_value is None:
        return "flat"
    if current_value > previous_value:
        return "up"
    if current_value < previous_value:
        return "down"
    return "flat"


def _build_metric_payload(current_value: float, previous_value: float | None) -> dict:
    trend = _rate_trend(current_value, previous_value)
    change_value = round(current_value - previous_value, 2) if previous_value is not None else 0.0
    change_percent = round((change_value / previous_value) * 100, 2) if previous_value not in {None, 0} else 0.0
    sign = "+" if change_value > 0 else "-" if change_value < 0 else ""
    abs_change_value = abs(change_value)
    abs_change_percent = abs(change_percent)
    return {
        "value": current_value,
        "trend": trend,
        "change_value": abs_change_value,
        "change_percent": abs_change_percent,
        "change_label": f"{sign}Rs. {abs_change_value:.2f}" if sign else "Rs. 0.00",
        "change_percent_label": f"{sign}{abs_change_percent:.2f}%" if sign else "0.00%",
    }


def _format_effective_label(rate: AssociationRate | None) -> str:
    if rate is None:
        return "Pending"
    return _format_datetime_label(rate.effective_at)


def _format_timestamp_label(value) -> str:
    if value is None:
        return "Pending"
    return _format_datetime_label(value)


def _format_datetime_label(value) -> str:
    localized_value = timezone.localtime(value)
    date_part = localized_value.strftime("%d %b %Y")
    time_part = localized_value.strftime("%I:%M %p").lstrip("0")
    return f"{date_part}, {time_part}"


def _latest_rate_for_association(association: Association | None):
    if association is None:
        return AssociationRate.objects.filter(association__isnull=True).order_by("-effective_at", "-id").first()
    return (
        AssociationRate.objects.filter(association=association)
        .order_by("-effective_at", "-id")
        .first()
    )


def _previous_rate_for_association(association: Association | None, latest_rate: AssociationRate | None):
    queryset = AssociationRate.objects.exclude(id=getattr(latest_rate, "id", None))
    if association is None:
        queryset = queryset.filter(association__isnull=True)
    else:
        queryset = queryset.filter(association=association)
    return queryset.order_by("-effective_at", "-id").first()


def _build_latest_rates_by_association(*, state: RegionState | None = None) -> dict[int, AssociationRate]:
    latest_by_association: dict[int, AssociationRate] = {}
    queryset = AssociationRate.objects.filter(association__isnull=False).select_related("association", "association__state")
    if state is not None:
        queryset = queryset.filter(association__state=state)
    queryset = queryset.order_by("association__name", "-effective_at", "-id")

    for rate in queryset:
        if rate.association_id not in latest_by_association:
            latest_by_association[rate.association_id] = rate

    return latest_by_association


def _build_other_association_rates(current_association: Association | None) -> list[dict]:
    state = current_association.state if current_association else None
    latest_by_association = _build_latest_rates_by_association(state=state)

    summaries = []
    for association_id, rate in latest_by_association.items():
        if current_association and association_id == current_association.id:
            continue
        previous_rate = _previous_rate_for_association(rate.association, rate)
        summaries.append(
            {
                "id": rate.association.id,
                "name": rate.association.name,
                "state_name": rate.association.state.name,
                "updated_at_label": _format_effective_label(rate),
                "gold_22k": float(rate.gold_22k),
                "gold_24k": float(rate.gold_24k),
                "silver": float(rate.silver),
                "headline_rates": {
                    "gold_22k": _build_metric_payload(float(rate.gold_22k), float(previous_rate.gold_22k) if previous_rate else None),
                    "gold_24k": _build_metric_payload(float(rate.gold_24k), float(previous_rate.gold_24k) if previous_rate else None),
                    "silver": _build_metric_payload(float(rate.silver), float(previous_rate.silver) if previous_rate else None),
                },
            }
        )

    return sorted(summaries, key=lambda item: item["name"])


def build_state_rates_payload() -> dict:
    latest_by_association = _build_latest_rates_by_association()
    states = []
    queryset = RegionState.objects.prefetch_related("associations").order_by("name")

    for state in queryset:
        association_summaries = []
        for association in state.associations.all().order_by("name"):
            rate = latest_by_association.get(association.id)
            if rate is None:
                continue
            previous_rate = _previous_rate_for_association(association, rate)
            association_summaries.append(
                {
                    "id": association.id,
                    "name": association.name,
                    "state_name": association.state.name,
                    "updated_at_label": _format_effective_label(rate),
                    "gold_22k": float(rate.gold_22k),
                    "gold_24k": float(rate.gold_24k),
                    "silver": float(rate.silver),
                    "headline_rates": {
                        "gold_22k": _build_metric_payload(float(rate.gold_22k), float(previous_rate.gold_22k) if previous_rate else None),
                        "gold_24k": _build_metric_payload(float(rate.gold_24k), float(previous_rate.gold_24k) if previous_rate else None),
                        "silver": _build_metric_payload(float(rate.silver), float(previous_rate.silver) if previous_rate else None),
                    },
                }
            )

        states.append(
            {
                "id": state.id,
                "name": state.name,
                "associations": association_summaries,
            }
        )

    return {"states": states}


def _resolve_active_association(request) -> Association | None:
    user = getattr(request, "user", None)
    if user and getattr(user, "is_authenticated", False):
        linked_company = get_linked_company_context(user).company
        if linked_company is not None:
            if linked_company.association_ref_id:
                return linked_company.association_ref
            if linked_company.company_type == linked_company.CompanyType.INDEPENDENT:
                return None
        try:
            member_profile = user.member_profile
        except ObjectDoesNotExist:
            member_profile = None
        if member_profile and member_profile.association_id:
            return member_profile.association
    return None


def _resolve_admin_association(request) -> Association:
    user = request.user
    scoped_role = (
        user.scoped_roles.filter(
            role=UserRole.Role.ASSOCIATION_ADMIN,
            scope_type=UserRole.ScopeType.ASSOCIATION,
        )
        .order_by("id")
        .first()
    )
    if not scoped_role or not scoped_role.scope_id:
        raise PermissionDenied("Association-admin scope is required for rate management.")
    association = Association.objects.select_related("state").filter(pk=scoped_role.scope_id).first()
    if association is None:
        raise PermissionDenied("Assigned association could not be resolved.")
    return association


def _resolve_spotlight_admin_association(request, association_id: int | None = None) -> Association:
    user = request.user
    if getattr(user, "is_super_admin_user", False):
        if association_id is None:
            raise PermissionDenied("Association selection is required for super-admin spotlight management.")
        association = Association.objects.select_related("state").filter(pk=association_id).first()
        if association is None:
            raise PermissionDenied("Selected association could not be resolved.")
        return association
    return _resolve_admin_association(request)


def _user_can_manage_spotlights(user) -> bool:
    if not user or not user.is_authenticated:
        return False
    if getattr(user, "is_super_admin_user", False):
        return True
    return user.scoped_roles.filter(
        role=UserRole.Role.ASSOCIATION_ADMIN,
        scope_type=UserRole.ScopeType.ASSOCIATION,
    ).exists()


def _filmstrip_config_payload() -> dict:
    scroll_speed = settings.DASHBOARD_WELCOME_FILMSTRIP_SCROLL_SPEED
    if scroll_speed not in ALLOWED_FILMSTRIP_SCROLL_SPEEDS:
        scroll_speed = DEFAULT_FILMSTRIP_SCROLL_SPEED
    reshow_policy = settings.DASHBOARD_WELCOME_FILMSTRIP_RESHOW_POLICY
    if reshow_policy not in ALLOWED_FILMSTRIP_RESHOW_POLICIES:
        reshow_policy = DEFAULT_FILMSTRIP_RESHOW_POLICY
    return {
        "enabled": bool(settings.DASHBOARD_WELCOME_FILMSTRIP_ENABLED),
        "duration_seconds": max(int(settings.DASHBOARD_WELCOME_FILMSTRIP_DURATION_SECONDS), 1),
        "scroll_speed": scroll_speed,
        "max_items": max(int(settings.DASHBOARD_WELCOME_FILMSTRIP_MAX_ITEMS), 1),
        "reshow_policy": reshow_policy,
    }


def _serialize_association_context(association: Association) -> dict:
    return {
        "id": association.id,
        "name": association.name,
        "state_name": association.state.name,
    }


def _get_active_spotlight_items(association: Association, *, now=None) -> list[AssociationSpotlightMedia]:
    current_time = now or timezone.now()
    return list(
        AssociationSpotlightMedia.objects.filter(
            association=association,
            is_active=True,
        )
        .filter(Q(starts_at__isnull=True) | Q(starts_at__lte=current_time))
        .filter(Q(ends_at__isnull=True) | Q(ends_at__gt=current_time))
        .select_related("asset", "association", "association__state")
        .order_by("sort_order", "id")[: _filmstrip_config_payload()["max_items"]]
    )


def _build_dashboard_welcome_filmstrip_payload(request, association: Association | None) -> dict | None:
    config = _filmstrip_config_payload()
    if not config["enabled"] or association is None:
        return None

    items = _get_active_spotlight_items(association)
    if not items:
        return None

    return {
        "enabled": True,
        "association_id": association.id,
        "duration_seconds": config["duration_seconds"],
        "scroll_speed": config["scroll_speed"],
        "reshow_policy": config["reshow_policy"],
        "items": [
            {
                "id": item.id,
                "image_url": resolve_media_asset_url(item.asset, request=request),
                "title": item.title,
                "subtitle": item.subtitle,
            }
            for item in items
        ],
    }


def _build_spotlight_collection_payload(association: Association) -> dict:
    config = _filmstrip_config_payload()
    items = list(
        AssociationSpotlightMedia.objects.filter(association=association)
        .select_related("asset", "association", "association__state")
        .order_by("sort_order", "id")
    )
    return {
        "association": _serialize_association_context(association),
        "config": {
            "enabled": config["enabled"],
            "duration_seconds": config["duration_seconds"],
            "scroll_speed": config["scroll_speed"],
            "max_items": config["max_items"],
            "reshow_policy": config["reshow_policy"],
        },
        "items": items,
    }


def _get_custom_rate_categories(association: Association):
    return (
        AssociationRateCategory.objects.filter(association=association)
        .prefetch_related("subcategories")
        .order_by("display_order", "id")
    )


def _build_default_rate_catalog(association: Association) -> list[dict]:
    latest_rate = _latest_rate_for_association(association)
    categories = [
        {
            "name": "Gold",
            "unit_label": "1 Gram",
            "current_value": None,
            "subcategories": [
                {"name": "22K", "unit_label": "1 Gram", "current_value": float(latest_rate.gold_22k) if latest_rate else None},
                {"name": "24K", "unit_label": "1 Gram", "current_value": float(latest_rate.gold_24k) if latest_rate else None},
            ],
        },
        {
            "name": "Silver",
            "unit_label": "1 Gram",
            "current_value": float(latest_rate.silver) if latest_rate else None,
            "subcategories": [],
        },
        {
            "name": "Diamond",
            "unit_label": "1 Carat",
            "current_value": None,
            "subcategories": [],
        },
    ]
    return categories


def _serialize_rate_catalog(association: Association) -> dict:
    categories = list(_get_custom_rate_categories(association))
    latest_custom_timestamp = None
    if categories:
        serialized_categories = []
        for category in categories:
            latest_custom_timestamp = max(
                [value for value in [latest_custom_timestamp, category.updated_at] if value is not None],
                default=category.updated_at,
            )
            serialized_subcategories = []
            for subcategory in category.subcategories.all():
                latest_custom_timestamp = max(
                    [value for value in [latest_custom_timestamp, subcategory.updated_at] if value is not None],
                    default=subcategory.updated_at,
                )
                serialized_subcategories.append(
                    {
                        "id": subcategory.id,
                        "name": subcategory.name,
                        "unit_label": subcategory.unit_label,
                        "current_value": float(subcategory.current_value) if subcategory.current_value is not None else None,
                    }
                )
            serialized_categories.append(
                {
                    "id": category.id,
                    "name": category.name,
                    "unit_label": category.unit_label,
                    "current_value": float(category.current_value) if category.current_value is not None else None,
                    "subcategories": serialized_subcategories,
                }
            )
        updated_at_label = _format_timestamp_label(latest_custom_timestamp)
    else:
        serialized_categories = _build_default_rate_catalog(association)
        updated_at_label = _format_effective_label(_latest_rate_for_association(association))

    return {
        "association": {
            "id": association.id,
            "name": association.name,
            "state_name": association.state.name,
        },
        "updated_at_label": updated_at_label,
        "categories": serialized_categories,
    }


def _match_subcategory_value(*, subcategories_by_slug: dict[str, AssociationRateSubcategory], slugs: tuple[str, ...]) -> float | None:
    for slug in slugs:
        subcategory = subcategories_by_slug.get(slug)
        if subcategory and subcategory.current_value is not None:
            return float(subcategory.current_value)
    return None


def _derive_legacy_rate_values(association: Association) -> tuple[float | None, float | None, float | None]:
    categories = list(_get_custom_rate_categories(association))
    values = {"gold_22k": None, "gold_24k": None, "silver": None}

    for category in categories:
        category_slug = slugify(category.name)
        subcategories = list(category.subcategories.all())
        subcategories_by_slug = {slugify(subcategory.name): subcategory for subcategory in subcategories}

        if category_slug == "gold":
            values["gold_22k"] = _match_subcategory_value(subcategories_by_slug=subcategories_by_slug, slugs=("22k", "22-k", "916"))
            values["gold_24k"] = _match_subcategory_value(subcategories_by_slug=subcategories_by_slug, slugs=("24k", "24-k", "999"))
        elif category_slug == "silver":
            if category.current_value is not None:
                values["silver"] = float(category.current_value)
            else:
                values["silver"] = _match_subcategory_value(subcategories_by_slug=subcategories_by_slug, slugs=("999", "silver", "925"))
                if values["silver"] is None and len(subcategories) == 1 and subcategories[0].current_value is not None:
                    values["silver"] = float(subcategories[0].current_value)

    return values["gold_22k"], values["gold_24k"], values["silver"]


def _publish_legacy_association_rate(association: Association) -> AssociationRate | None:
    previous_rate = _latest_rate_for_association(association)
    gold_22k, gold_24k, silver = _derive_legacy_rate_values(association)

    if previous_rate is None and None in {gold_22k, gold_24k, silver}:
        return None

    return AssociationRate.objects.create(
        association=association,
        region_label=f"{association.name} Admin Update",
        gold_22k=gold_22k if gold_22k is not None else previous_rate.gold_22k,
        gold_24k=gold_24k if gold_24k is not None else previous_rate.gold_24k,
        silver=silver if silver is not None else previous_rate.silver,
        effective_at=timezone.now(),
    )


def _category_metric_payload(*, category_slug: str, category_value: float, previous_rate: AssociationRate | None) -> dict:
    previous_value = None
    if category_slug == "silver" and previous_rate is not None:
        previous_value = float(previous_rate.silver)
    return _build_metric_payload(category_value, previous_value)


def _subcategory_metric_payload(*, category_slug: str, subcategory_slug: str, current_value: float, previous_rate: AssociationRate | None) -> dict:
    previous_value = None
    if previous_rate is not None and category_slug == "gold":
        if subcategory_slug in {"24k", "24-k", "999"}:
            previous_value = float(previous_rate.gold_24k)
        elif subcategory_slug in {"22k", "22-k", "916"}:
            previous_value = float(previous_rate.gold_22k)
    elif previous_rate is not None and category_slug == "silver" and subcategory_slug in {"silver", "999", "925"}:
        previous_value = float(previous_rate.silver)
    return _build_metric_payload(current_value, previous_value)


def build_dashboard_payload(request) -> dict:
    active_association = _resolve_active_association(request)
    linked_company = get_linked_company_context(getattr(request, "user", None)).company
    has_association_context = active_association is not None
    latest_rate = _latest_rate_for_association(active_association)
    if latest_rate is None and active_association is not None:
        latest_rate = AssociationRate.objects.filter(association__isnull=False).select_related("association").order_by("-effective_at", "-id").first()
    previous_rate = _previous_rate_for_association(active_association if latest_rate and latest_rate.association_id else None, latest_rate)
    comparisons = ExternalMarketRate.objects.order_by("-effective_at", "-id")[:3]

    if not latest_rate:
        return {
            "association": {
                "id": active_association.id if active_association else None,
                "name": (
                    active_association.name
                    if active_association
                    else (linked_company.state_ref.name if linked_company and linked_company.state_ref_id else "Jewellery Association")
                ),
            },
            "updated_at_label": _format_effective_label(None),
            "headline_rates": {
                "gold_22k": _build_metric_payload(0.0, None),
                "gold_24k": _build_metric_payload(0.0, None),
                "silver": _build_metric_payload(0.0, None),
            },
            "comparisons": [],
            "other_associations": _build_other_association_rates(active_association) if has_association_context else [],
            "global_trends": STATIC_GLOBAL_TRENDS,
            "quick_actions": QUICK_ACTIONS,
            "dashboard_welcome_filmstrip": _build_dashboard_welcome_filmstrip_payload(request, active_association) if has_association_context else None,
        }

    return {
        "association": {
            "id": latest_rate.association.id if latest_rate.association_id else None,
            "name": latest_rate.association.name if latest_rate.association_id else latest_rate.region_label,
        },
        "updated_at_label": _format_effective_label(latest_rate),
        "headline_rates": {
            "gold_22k": _build_metric_payload(float(latest_rate.gold_22k), float(previous_rate.gold_22k) if previous_rate else None),
            "gold_24k": _build_metric_payload(float(latest_rate.gold_24k), float(previous_rate.gold_24k) if previous_rate else None),
            "silver": _build_metric_payload(float(latest_rate.silver), float(previous_rate.silver) if previous_rate else None),
        },
        "comparisons": [
            {
                "label": f"{comparison.source_name} ({comparison.region_label})",
                "gold_22k": float(comparison.gold_22k),
            }
            for comparison in comparisons
        ],
        "other_associations": (
            _build_other_association_rates(latest_rate.association if latest_rate.association_id else active_association)
            if has_association_context
            else []
        ),
        "global_trends": STATIC_GLOBAL_TRENDS,
        "quick_actions": QUICK_ACTIONS,
        "dashboard_welcome_filmstrip": _build_dashboard_welcome_filmstrip_payload(request, active_association) if has_association_context else None,
    }


class DashboardView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        payload = build_dashboard_payload(request)
        return Response(DashboardResponseSerializer(payload).data)


class StateRatesView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        payload = build_state_rates_payload()
        return Response(StateRatesResponseSerializer(payload).data)


def build_association_rate_detail_payload(association: Association) -> dict:
    custom_categories = list(_get_custom_rate_categories(association))
    latest_rate = _latest_rate_for_association(association)
    if latest_rate is None and not custom_categories:
        raise AssociationRate.DoesNotExist
    previous_rate = _previous_rate_for_association(association, latest_rate)

    if custom_categories:
        rate_groups = []
        for category in custom_categories:
            category_slug = slugify(category.name)
            items = []
            subcategories = list(category.subcategories.all())

            for subcategory in subcategories:
                if subcategory.current_value is None:
                    continue
                current_value = float(subcategory.current_value)
                items.append(
                    {
                        "key": f"{category_slug}-{slugify(subcategory.name)}",
                        "label": subcategory.name,
                        "unit_label": subcategory.unit_label,
                        **_subcategory_metric_payload(
                            category_slug=category_slug,
                            subcategory_slug=slugify(subcategory.name),
                            current_value=current_value,
                            previous_rate=previous_rate,
                        ),
                    }
                )

            if not items and category.current_value is not None:
                current_value = float(category.current_value)
                items.append(
                    {
                        "key": category_slug,
                        "label": f"{category.name} Rate",
                        "unit_label": category.unit_label,
                        **_category_metric_payload(
                            category_slug=category_slug,
                            category_value=current_value,
                            previous_rate=previous_rate,
                        ),
                    }
                )

            if not items:
                continue

            rate_groups.append(
                {
                    "key": category_slug,
                    "title": category.name,
                    "icon_key": category_slug,
                    "items": items,
                }
            )

        latest_custom_timestamp = max(
            [value.updated_at for value in custom_categories] +
            [subcategory.updated_at for value in custom_categories for subcategory in value.subcategories.all()],
            default=getattr(latest_rate, "effective_at", None),
        )
        return {
            "association": {
                "id": association.id,
                "name": association.name,
                "state_name": association.state.name,
            },
            "updated_at_label": _format_timestamp_label(getattr(latest_rate, "effective_at", latest_custom_timestamp) or latest_custom_timestamp),
            "hero_badge_label": "Live Market",
            "rate_groups": rate_groups,
            "notice": {
                "eyebrow": "Institutional Notice",
                "body": "Rates displayed are live market indications for association members. Taxes and local making charges may apply at the point of sale.",
            },
        }

    gold_items = [
        {
            "key": "gold_24k",
            "label": "24K Purity (999)",
            "unit_label": "1 Gram",
            **_build_metric_payload(float(latest_rate.gold_24k), float(previous_rate.gold_24k) if previous_rate else None),
        },
        {
            "key": "gold_22k",
            "label": "22K Purity (916)",
            "unit_label": "1 Gram",
            **_build_metric_payload(float(latest_rate.gold_22k), float(previous_rate.gold_22k) if previous_rate else None),
        },
    ]
    silver_items = [
        {
            "key": "silver",
            "label": "Silver Market Rate",
            "unit_label": "1 Gram",
            **_build_metric_payload(float(latest_rate.silver), float(previous_rate.silver) if previous_rate else None),
        }
    ]

    rate_groups = []
    if gold_items:
        rate_groups.append(
            {
                "key": "gold",
                "title": "Gold Bullion Rates",
                "icon_key": "gold",
                "items": gold_items,
            }
        )
    if silver_items:
        rate_groups.append(
            {
                "key": "silver",
                "title": "Silver Market",
                "icon_key": "silver",
                "items": silver_items,
            }
        )

    return {
        "association": {
            "id": association.id,
            "name": association.name,
            "state_name": association.state.name,
        },
        "updated_at_label": _format_effective_label(latest_rate),
        "hero_badge_label": "Live Market",
        "rate_groups": rate_groups,
        "notice": {
            "eyebrow": "Institutional Notice",
            "body": "Rates displayed are live market indications for association members. Taxes and local making charges may apply at the point of sale.",
        },
    }


class AssociationRateDetailView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, association_id: int):
        association = get_object_or_404(Association.objects.select_related("state"), pk=association_id)
        try:
            payload = build_association_rate_detail_payload(association)
        except AssociationRate.DoesNotExist as exc:
            raise Http404("Rate details are not available for this association.") from exc
        return Response(AssociationRateDetailResponseSerializer(payload).data)


class AssociationAdminRateCatalogView(APIView):
    permission_classes = [HasAdminAccess]

    def get(self, request):
        association = _resolve_admin_association(request)
        payload = _serialize_rate_catalog(association)
        return Response(AssociationRateCatalogResponseSerializer(payload).data)

    def put(self, request):
        association = _resolve_admin_association(request)
        serializer = AssociationRateCatalogPayloadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            AssociationRateCategory.objects.filter(association=association).delete()

            for category_index, category_data in enumerate(serializer.validated_data["categories"]):
                category = AssociationRateCategory.objects.create(
                    association=association,
                    name=category_data["name"].strip(),
                    slug=slugify(category_data["name"]),
                    unit_label=category_data.get("unit_label") or "1 Gram",
                    current_value=category_data.get("current_value"),
                    display_order=category_index,
                    updated_by=request.user,
                )
                for subcategory_index, subcategory_data in enumerate(category_data.get("subcategories") or []):
                    AssociationRateSubcategory.objects.create(
                        category=category,
                        name=subcategory_data["name"].strip(),
                        slug=slugify(subcategory_data["name"]),
                        unit_label=subcategory_data.get("unit_label") or category.unit_label,
                        current_value=subcategory_data.get("current_value"),
                        display_order=subcategory_index,
                        updated_by=request.user,
                    )

            published_rate = _publish_legacy_association_rate(association)

        payload = _serialize_rate_catalog(association)
        if published_rate is not None:
            notify_association_rate_update(association, published_rate)
        return Response(AssociationRateCatalogResponseSerializer(payload).data)


class AssociationSpotlightUploadSessionView(APIView):
    permission_classes = [HasAdminAccess]

    def post(self, request):
        if not _user_can_manage_spotlights(request.user):
            raise PermissionDenied("Only association admins and super admins can manage dashboard welcome spotlights.")
        selector_serializer = AssociationSpotlightAssociationSelectorSerializer(data=request.data)
        selector_serializer.is_valid(raise_exception=True)
        association = _resolve_spotlight_admin_association(
            request,
            association_id=getattr(selector_serializer.validated_data.get("association"), "id", None),
        )
        serializer = AssociationSpotlightUploadSessionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        session = create_upload_session(
            prefix="association-spotlights",
            owner_id=association.id,
            filename=serializer.validated_data["filename"],
            visibility="public",
        )
        return Response(session.__dict__)


class AssociationSpotlightMediaFinalizeView(APIView):
    permission_classes = [HasAdminAccess]

    def post(self, request):
        if not _user_can_manage_spotlights(request.user):
            raise PermissionDenied("Only association admins and super admins can manage dashboard welcome spotlights.")
        selector_serializer = AssociationSpotlightAssociationSelectorSerializer(data=request.data)
        selector_serializer.is_valid(raise_exception=True)
        association = _resolve_spotlight_admin_association(
            request,
            association_id=getattr(selector_serializer.validated_data.get("association"), "id", None),
        )
        serializer = AssociationSpotlightMediaFinalizeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payload = serializer.validated_data
        try:
            media_asset = finalize_media_asset(
                payload=payload,
                request=request,
                uploader=request.user,
                expected_prefix=f"association-spotlights/{association.id}/",
                expected_prefix_error="Object key does not match the association spotlight upload path.",
                visibility=MediaAsset.Visibility.PUBLIC,
                moderation_status=MediaAsset.ModerationStatus.APPROVED,
            )
        except ValidationError as exc:
            return Response(exc.detail, status=status.HTTP_400_BAD_REQUEST)
        return Response(build_media_asset_response(media_asset, request=request), status=status.HTTP_201_CREATED)


class AssociationSpotlightListCreateView(APIView):
    permission_classes = [HasAdminAccess]

    def get(self, request):
        if not _user_can_manage_spotlights(request.user):
            raise PermissionDenied("Only association admins and super admins can manage dashboard welcome spotlights.")
        selector_serializer = AssociationSpotlightAssociationSelectorSerializer(data=request.query_params)
        selector_serializer.is_valid(raise_exception=True)
        association = _resolve_spotlight_admin_association(
            request,
            association_id=getattr(selector_serializer.validated_data.get("association"), "id", None),
        )
        return Response(AssociationSpotlightCollectionSerializer(_build_spotlight_collection_payload(association)).data)

    def post(self, request):
        if not _user_can_manage_spotlights(request.user):
            raise PermissionDenied("Only association admins and super admins can manage dashboard welcome spotlights.")
        selector_serializer = AssociationSpotlightAssociationSelectorSerializer(data=request.data)
        selector_serializer.is_valid(raise_exception=True)
        association = _resolve_spotlight_admin_association(
            request,
            association_id=getattr(selector_serializer.validated_data.get("association"), "id", None),
        )
        serializer = AssociationSpotlightMediaWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        next_sort_order = (
            AssociationSpotlightMedia.objects.filter(association=association).order_by("-sort_order", "-id").values_list("sort_order", flat=True).first()
        )
        spotlight_item = AssociationSpotlightMedia.objects.create(
            association=association,
            created_by=request.user,
            sort_order=(next_sort_order + 1) if next_sort_order is not None else 0,
            **serializer.validated_data,
        )
        spotlight_item = AssociationSpotlightMedia.objects.select_related("asset", "association", "association__state").get(pk=spotlight_item.id)
        return Response(AssociationSpotlightMediaSerializer(spotlight_item).data, status=status.HTTP_201_CREATED)


class AssociationSpotlightDetailView(APIView):
    permission_classes = [HasAdminAccess]

    def patch(self, request, item_id: int):
        if not _user_can_manage_spotlights(request.user):
            raise PermissionDenied("Only association admins and super admins can manage dashboard welcome spotlights.")
        spotlight_item = get_object_or_404(
            AssociationSpotlightMedia.objects.select_related("association", "association__state", "asset"),
            pk=item_id,
        )
        association = _resolve_spotlight_admin_association(request, association_id=spotlight_item.association_id)
        if spotlight_item.association_id != association.id:
            raise PermissionDenied("You do not have access to this association spotlight item.")
        serializer = AssociationSpotlightMediaWriteSerializer(spotlight_item, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        for field_name, value in serializer.validated_data.items():
            setattr(spotlight_item, field_name, value)
        spotlight_item.save()
        spotlight_item.refresh_from_db()
        return Response(AssociationSpotlightMediaSerializer(spotlight_item).data)

    def delete(self, request, item_id: int):
        if not _user_can_manage_spotlights(request.user):
            raise PermissionDenied("Only association admins and super admins can manage dashboard welcome spotlights.")
        spotlight_item = get_object_or_404(AssociationSpotlightMedia.objects.select_related("association"), pk=item_id)
        association = _resolve_spotlight_admin_association(request, association_id=spotlight_item.association_id)
        if spotlight_item.association_id != association.id:
            raise PermissionDenied("You do not have access to this association spotlight item.")
        asset = spotlight_item.asset
        spotlight_item.delete()
        asset.delete()
        return Response({"message": "Spotlight item deleted."}, status=status.HTTP_200_OK)


class AssociationSpotlightReorderView(APIView):
    permission_classes = [HasAdminAccess]

    def post(self, request):
        if not _user_can_manage_spotlights(request.user):
            raise PermissionDenied("Only association admins and super admins can manage dashboard welcome spotlights.")
        selector_serializer = AssociationSpotlightAssociationSelectorSerializer(data=request.data)
        selector_serializer.is_valid(raise_exception=True)
        association = _resolve_spotlight_admin_association(
            request,
            association_id=getattr(selector_serializer.validated_data.get("association"), "id", None),
        )
        serializer = AssociationSpotlightMediaReorderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        item_ids = serializer.validated_data["item_ids"]
        existing_ids = list(
            AssociationSpotlightMedia.objects.filter(association=association).order_by("sort_order", "id").values_list("id", flat=True)
        )
        if sorted(existing_ids) != sorted(item_ids):
            return Response({"item_ids": ["Reorder payload must include every spotlight item for the selected association exactly once."]}, status=status.HTTP_400_BAD_REQUEST)
        with transaction.atomic():
            for index, item_id in enumerate(item_ids):
                AssociationSpotlightMedia.objects.filter(association=association, pk=item_id).update(sort_order=index)
        items = list(
            AssociationSpotlightMedia.objects.filter(association=association)
            .select_related("asset", "association", "association__state")
            .order_by("sort_order", "id")
        )
        return Response({"items": AssociationSpotlightMediaSerializer(items, many=True).data})
