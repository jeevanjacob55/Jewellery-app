from datetime import timedelta

from django.utils import timezone
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.rates.models import AssociationRate

from .models import Alert, MeetingEvent, NewsItem


class NewsFeedTests(APITestCase):
    def test_news_feed_returns_empty_state_when_no_records_exist(self):
        response = self.client.get(reverse("news_feed"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["urgent_alert"]["title"], "No active alerts")
        self.assertEqual(response.data["urgent_alert"]["summary"], "")
        self.assertEqual(response.data["meetings"], [])
        self.assertEqual(response.data["ticker"]["gold"], 0.0)
        self.assertEqual(response.data["ticker"]["silver"], 0.0)

    def test_news_feed_prefers_active_alert_and_limits_upcoming_meetings(self):
        now = timezone.now()
        AssociationRate.objects.create(
            region_label="Latest",
            gold_22k="6785.00",
            gold_24k="7410.00",
            silver="89.40",
            effective_at=now,
        )
        NewsItem.objects.create(
            title="Fallback news",
            summary="Used only when no active alert exists.",
            is_urgent=False,
        )
        Alert.objects.create(
            title="Latest active alert",
            body="Urgent compliance update for members.",
            severity="urgent",
            active=True,
        )
        Alert.objects.create(
            title="Inactive alert",
            body="Should be ignored.",
            severity="info",
            active=False,
        )
        for index in range(6):
            MeetingEvent.objects.create(
                title=f"Meeting {index}",
                venue="Association Hall",
                starts_at=now + timedelta(days=index + 1),
                calendar_url="https://calendar.google.com",
            )
        MeetingEvent.objects.create(
            title="Past Meeting",
            venue="Old Hall",
            starts_at=now - timedelta(days=1),
            calendar_url="https://calendar.google.com",
        )

        response = self.client.get(reverse("news_feed"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["urgent_alert"]["title"], "Latest active alert")
        self.assertEqual(response.data["urgent_alert"]["summary"], "Urgent compliance update for members.")
        self.assertEqual(len(response.data["meetings"]), 5)
        self.assertEqual(response.data["meetings"][0]["title"], "Meeting 0")
        self.assertEqual(response.data["ticker"]["gold"], 7410.0)
        self.assertEqual(response.data["ticker"]["silver"], 89.4)

    def test_news_feed_falls_back_to_latest_news_item_when_no_active_alert_exists(self):
        NewsItem.objects.create(title="Older news", summary="Older summary", is_urgent=False)
        NewsItem.objects.create(title="Latest news", summary="Newest summary", is_urgent=True)

        response = self.client.get(reverse("news_feed"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["urgent_alert"]["title"], "Latest news")
        self.assertEqual(response.data["urgent_alert"]["summary"], "Newest summary")
