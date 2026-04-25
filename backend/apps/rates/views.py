from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.views import APIView


class DashboardView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response(
            {
                "headline_rates": {
                    "gold_22k": {"value": 6785.0, "trend": "up"},
                    "gold_24k": {"value": 7400.0, "trend": "up"},
                    "silver": {"value": 89.5, "trend": "down"},
                },
                "comparisons": [
                    {"label": "Other Associations", "gold_22k": 6762.5},
                    {"label": "Other States", "gold_22k": 6804.0},
                ],
                "global_trends": {"usd_inr": 83.22, "gold_oz": 2362.11, "silver_oz": 28.41},
                "quick_actions": [
                    "Market Tiers",
                    "Reverse Search",
                    "Services",
                    "News & Alerts",
                    "Advertiser Portal",
                ],
            }
        )
