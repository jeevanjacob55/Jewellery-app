from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.views import APIView


class NewsFeedView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response(
            {
                "urgent_alert": {
                    "title": "GST update issued for bullion traders",
                    "summary": "Updated tax guidance is now available for member businesses.",
                },
                "meetings": [
                    {
                        "title": "Association Trade Meet",
                        "venue": "Thrissur Trade Hall",
                        "calendar_url": "https://calendar.google.com",
                    }
                ],
                "ticker": {"gold": 7400.0, "silver": 89.5},
            }
        )
