from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.views import APIView


class ComplianceDashboardView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response(
            {
                "overview": [
                    {"title": "Weighing Machine Calibration", "status": "Due in 5 days"},
                    {"title": "License Renewal", "status": "Action Required"},
                ],
                "services": [
                    "Hallmarking",
                    "Diamond Certification",
                    "Calibration",
                    "Compliance Support",
                ],
                "metrics": {"average_tat_days": 4.2, "accuracy": "98.6%"},
            }
        )
