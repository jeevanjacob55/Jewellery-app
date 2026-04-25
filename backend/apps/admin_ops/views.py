from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView


class AdminOverviewView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        return Response(
            {
                "actions": ["Ad Approval", "User Verification", "Manual Rate Update"],
                "analytics": {"active_members": 482, "annual_target": 600, "estimated_revenue": 1240000},
                "system_logs": [
                    "Reverse search assigned to supplier cluster",
                    "Manual 24K rate update recorded",
                    "Advertiser creative awaiting approval",
                ],
            }
        )
