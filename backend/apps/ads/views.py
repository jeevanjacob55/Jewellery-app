from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from config.storage import build_mock_signed_upload


class AdvertisementOverviewView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(
            {
                "creative_requirements": {
                    "formats": ["jpg", "png", "webp"],
                    "max_size_mb": 5,
                    "recommended_ratio": "16:9",
                },
                "reach_options": ["global", "state", "local"],
                "preview_placements": ["dashboard_hero", "market_tiers_banner", "news_inline"],
            }
        )


class AdvertisementUploadSessionView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        advertiser_id = request.user.id or "advertiser"
        campaign_id = request.data.get("campaign_id", "draft")
        filename = request.data.get("filename", "campaign-banner.jpg")
        session = build_mock_signed_upload(f"ads/{advertiser_id}", campaign_id, filename, visibility="private")
        return Response(session.__dict__)
