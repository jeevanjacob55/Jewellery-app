from django.core.exceptions import ObjectDoesNotExist
from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.regions.models import Association, RegionState

from .models import AssociationRate, ExternalMarketRate, GlobalTrendSnapshot
from .serializers import DashboardResponseSerializer, StateRatesResponseSerializer


QUICK_ACTIONS = [
    "Market Tiers",
    "Other Associations",
    "Reverse Search",
    "Services",
    "News & Alerts",
    "Advertiser Portal",
]

STATIC_GLOBAL_TRENDS = {"usd_inr": 83.50, "gold_oz": 2350.0, "silver_oz": 28.40}


def _rate_trend(current_value: float, previous_value: float | None) -> str:
    if previous_value is None:
        return "flat"
    if current_value > previous_value:
        return "up"
    if current_value < previous_value:
        return "down"
    return "flat"


def _format_effective_label(rate: AssociationRate | None) -> str:
    if rate is None:
        return "Pending"
    return rate.effective_at.strftime("%I:%M %p").lstrip("0")


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
        summaries.append(
            {
                "id": rate.association.id,
                "name": rate.association.name,
                "gold_22k": float(rate.gold_22k),
                "gold_24k": float(rate.gold_24k),
                "silver": float(rate.silver),
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
            association_summaries.append(
                {
                    "id": association.id,
                    "name": association.name,
                    "gold_22k": float(rate.gold_22k),
                    "gold_24k": float(rate.gold_24k),
                    "silver": float(rate.silver),
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
        try:
            member_profile = user.member_profile
        except ObjectDoesNotExist:
            member_profile = None
        if member_profile and member_profile.association_id:
            return member_profile.association
    return None


def build_dashboard_payload(request) -> dict:
    active_association = _resolve_active_association(request)
    latest_rate = _latest_rate_for_association(active_association)
    if latest_rate is None and active_association is not None:
        latest_rate = AssociationRate.objects.filter(association__isnull=False).select_related("association").order_by("-effective_at", "-id").first()
    previous_rate = _previous_rate_for_association(active_association if latest_rate and latest_rate.association_id else None, latest_rate)
    comparisons = ExternalMarketRate.objects.order_by("-effective_at", "-id")[:3]

    if not latest_rate:
        return {
            "association": {"id": active_association.id if active_association else None, "name": active_association.name if active_association else "Jewellery Association"},
            "updated_at_label": _format_effective_label(None),
            "headline_rates": {
                "gold_22k": {"value": 0.0, "trend": "flat"},
                "gold_24k": {"value": 0.0, "trend": "flat"},
                "silver": {"value": 0.0, "trend": "flat"},
            },
            "comparisons": [],
            "other_associations": _build_other_association_rates(active_association),
            "global_trends": STATIC_GLOBAL_TRENDS,
            "quick_actions": QUICK_ACTIONS,
        }

    return {
        "association": {
            "id": latest_rate.association.id if latest_rate.association_id else None,
            "name": latest_rate.association.name if latest_rate.association_id else latest_rate.region_label,
        },
        "updated_at_label": _format_effective_label(latest_rate),
        "headline_rates": {
            "gold_22k": {
                "value": float(latest_rate.gold_22k),
                "trend": _rate_trend(float(latest_rate.gold_22k), float(previous_rate.gold_22k) if previous_rate else None),
            },
            "gold_24k": {
                "value": float(latest_rate.gold_24k),
                "trend": _rate_trend(float(latest_rate.gold_24k), float(previous_rate.gold_24k) if previous_rate else None),
            },
            "silver": {
                "value": float(latest_rate.silver),
                "trend": _rate_trend(float(latest_rate.silver), float(previous_rate.silver) if previous_rate else None),
            },
        },
        "comparisons": [
            {
                "label": f"{comparison.source_name} ({comparison.region_label})",
                "gold_22k": float(comparison.gold_22k),
            }
            for comparison in comparisons
        ],
        "other_associations": _build_other_association_rates(latest_rate.association if latest_rate.association_id else active_association),
        "global_trends": STATIC_GLOBAL_TRENDS,
        "quick_actions": QUICK_ACTIONS,
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
