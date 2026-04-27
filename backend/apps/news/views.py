from django.utils import timezone
from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.rates.models import AssociationRate

from .models import Alert, MeetingEvent, NewsItem
from .serializers import NewsFeedResponseSerializer


def build_news_feed_payload() -> dict:
    active_alert = Alert.objects.filter(active=True).order_by("-id").first()
    latest_news_item = NewsItem.objects.order_by("-published_at", "-id").first()
    latest_rate = AssociationRate.objects.order_by("-effective_at", "-id").first()
    upcoming_meetings = MeetingEvent.objects.filter(starts_at__gte=timezone.now()).order_by("starts_at", "id")[:5]

    if active_alert:
        urgent_alert = {"title": active_alert.title, "summary": active_alert.body}
    elif latest_news_item:
        urgent_alert = {"title": latest_news_item.title, "summary": latest_news_item.summary}
    else:
        urgent_alert = {"title": "No active alerts", "summary": ""}

    return {
        "urgent_alert": urgent_alert,
        "meetings": [
            {
                "title": meeting.title,
                "venue": meeting.venue,
                "calendar_url": meeting.calendar_url,
            }
            for meeting in upcoming_meetings
        ],
        "ticker": {
            "gold": float(latest_rate.gold_24k) if latest_rate else 0.0,
            "silver": float(latest_rate.silver) if latest_rate else 0.0,
        },
    }


class NewsFeedView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        payload = build_news_feed_payload()
        return Response(NewsFeedResponseSerializer(payload).data)
