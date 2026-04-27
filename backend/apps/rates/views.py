from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import AssociationRate, ExternalMarketRate, GlobalTrendSnapshot
from .serializers import DashboardResponseSerializer


QUICK_ACTIONS = [
    "Market Tiers",
    "Reverse Search",
    "Services",
    "News & Alerts",
    "Advertiser Portal",
]


def _rate_trend(current_value: float, previous_value: float | None) -> str:
    if previous_value is None:
        return "flat"
    if current_value > previous_value:
        return "up"
    if current_value < previous_value:
        return "down"
    return "flat"


def build_dashboard_payload() -> dict:
    latest_rate = AssociationRate.objects.order_by("-effective_at", "-id").first()
    previous_rate = AssociationRate.objects.exclude(id=getattr(latest_rate, "id", None)).order_by("-effective_at", "-id").first()
    latest_trend = GlobalTrendSnapshot.objects.order_by("-captured_at", "-id").first()
    comparisons = ExternalMarketRate.objects.order_by("-effective_at", "-id")[:3]

    if not latest_rate:
        return {
            "headline_rates": {
                "gold_22k": {"value": 0.0, "trend": "flat"},
                "gold_24k": {"value": 0.0, "trend": "flat"},
                "silver": {"value": 0.0, "trend": "flat"},
            },
            "comparisons": [],
            "global_trends": {"usd_inr": 0.0, "gold_oz": 0.0, "silver_oz": 0.0},
            "quick_actions": QUICK_ACTIONS,
        }

    return {
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
        "global_trends": {
            "usd_inr": float(latest_trend.usd_inr) if latest_trend else 0.0,
            "gold_oz": float(latest_trend.gold_oz) if latest_trend else 0.0,
            "silver_oz": float(latest_trend.silver_oz) if latest_trend else 0.0,
        },
        "quick_actions": QUICK_ACTIONS,
    }


class DashboardView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        payload = build_dashboard_payload()
        return Response(DashboardResponseSerializer(payload).data)
