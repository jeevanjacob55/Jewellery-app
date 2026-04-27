from datetime import datetime

from django.utils import timezone
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .models import AssociationRate, ExternalMarketRate, GlobalTrendSnapshot


class DashboardApiTests(APITestCase):
    def test_dashboard_returns_empty_state_when_no_rate_data_exists(self):
        response = self.client.get(reverse("dashboard"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["headline_rates"]["gold_22k"]["value"], 0.0)
        self.assertEqual(response.data["headline_rates"]["gold_22k"]["trend"], "flat")
        self.assertEqual(response.data["comparisons"], [])
        self.assertEqual(response.data["global_trends"]["gold_oz"], 0.0)
        self.assertEqual(response.data["quick_actions"][0], "Market Tiers")

    def test_dashboard_uses_latest_db_records_and_rate_ordering(self):
        previous_time = timezone.make_aware(datetime(2026, 4, 20, 9, 0))
        latest_time = timezone.make_aware(datetime(2026, 4, 21, 9, 0))
        trend_time = timezone.make_aware(datetime(2026, 4, 21, 8, 0))

        AssociationRate.objects.create(
            region_label="Previous",
            gold_22k="6765.00",
            gold_24k="7395.00",
            silver="90.25",
            effective_at=previous_time,
        )
        AssociationRate.objects.create(
            region_label="Latest",
            gold_22k="6785.00",
            gold_24k="7410.00",
            silver="89.40",
            effective_at=latest_time,
        )
        ExternalMarketRate.objects.create(
            source_name="Source 1",
            region_label="Kerala",
            gold_22k="6778.00",
            gold_24k="7402.00",
            silver="89.65",
            effective_at=timezone.make_aware(datetime(2026, 4, 21, 8, 45)),
        )
        ExternalMarketRate.objects.create(
            source_name="Source 2",
            region_label="Tamil Nadu",
            gold_22k="6792.00",
            gold_24k="7418.00",
            silver="89.20",
            effective_at=timezone.make_aware(datetime(2026, 4, 21, 8, 30)),
        )
        ExternalMarketRate.objects.create(
            source_name="Source 3",
            region_label="Karnataka",
            gold_22k="6769.00",
            gold_24k="7398.00",
            silver="89.85",
            effective_at=timezone.make_aware(datetime(2026, 4, 21, 8, 15)),
        )
        GlobalTrendSnapshot.objects.create(usd_inr="83.22", gold_oz="2362.11", silver_oz="28.41", captured_at=trend_time)

        response = self.client.get(reverse("dashboard"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["headline_rates"]["gold_22k"]["value"], 6785.0)
        self.assertEqual(response.data["headline_rates"]["gold_22k"]["trend"], "up")
        self.assertEqual(response.data["headline_rates"]["silver"]["trend"], "down")
        self.assertEqual(response.data["comparisons"][0]["label"], "Source 1 (Kerala)")
        self.assertEqual(len(response.data["comparisons"]), 3)
        self.assertEqual(response.data["global_trends"]["usd_inr"], 83.22)
