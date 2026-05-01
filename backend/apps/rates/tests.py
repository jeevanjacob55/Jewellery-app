from datetime import datetime

from django.contrib.auth import get_user_model
from django.utils import timezone
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import MemberProfile
from apps.regions.models import Association, DistrictOperationalUnit, RegionState, Unit

from .models import AssociationRate, ExternalMarketRate, GlobalTrendSnapshot


class DashboardApiTests(APITestCase):
    def test_dashboard_returns_empty_state_when_no_rate_data_exists(self):
        response = self.client.get(reverse("dashboard"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["association"]["name"], "Jewellery Association")
        self.assertEqual(response.data["headline_rates"]["gold_22k"]["value"], 0.0)
        self.assertEqual(response.data["headline_rates"]["gold_22k"]["trend"], "flat")
        self.assertEqual(response.data["comparisons"], [])
        self.assertEqual(response.data["other_associations"], [])
        self.assertEqual(response.data["global_trends"]["gold_oz"], 2350.0)
        self.assertEqual(response.data["quick_actions"][0], "Market Tiers")

    def test_dashboard_uses_latest_db_records_and_rate_ordering(self):
        previous_time = timezone.make_aware(datetime(2026, 4, 20, 9, 0))
        latest_time = timezone.make_aware(datetime(2026, 4, 21, 9, 0))
        trend_time = timezone.make_aware(datetime(2026, 4, 21, 8, 0))

        AssociationRate.objects.create(
            association=None,
            region_label="Previous",
            gold_22k="6765.00",
            gold_24k="7395.00",
            silver="90.25",
            effective_at=previous_time,
        )
        AssociationRate.objects.create(
            association=None,
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
        self.assertEqual(response.data["association"]["name"], "Latest")
        self.assertEqual(response.data["headline_rates"]["gold_22k"]["value"], 6785.0)
        self.assertEqual(response.data["headline_rates"]["gold_22k"]["trend"], "up")
        self.assertEqual(response.data["headline_rates"]["silver"]["trend"], "down")
        self.assertEqual(response.data["comparisons"][0]["label"], "Source 1 (Kerala)")
        self.assertEqual(len(response.data["comparisons"]), 3)
        self.assertEqual(response.data["global_trends"]["usd_inr"], 83.5)

    def test_authenticated_member_gets_association_specific_rates(self):
        state = RegionState.objects.create(name="Kerala")
        kgsma = Association.objects.create(state=state, name="KGSMA")
        akgsma = Association.objects.create(state=state, name="AKGSMA")
        kgsma_district = DistrictOperationalUnit.objects.create(association=kgsma, name="Ernakulam District Unit")
        akgsma_district = DistrictOperationalUnit.objects.create(association=akgsma, name="Kozhikode District Unit")
        kgsma_unit = Unit.objects.create(district_operational_unit=kgsma_district, name="Kadavanthra Unit")
        akgsma_unit = Unit.objects.create(district_operational_unit=akgsma_district, name="Nadakkavu Unit")

        user_model = get_user_model()
        kgsma_member = user_model.objects.create_user(username="kgsma-member", password="StrongPass123!")
        akgsma_member = user_model.objects.create_user(username="akgsma-member", password="StrongPass123!")
        MemberProfile.objects.create(
            user=kgsma_member,
            state=state,
            association=kgsma,
            district_operational_unit=kgsma_district,
            unit=kgsma_unit,
        )
        MemberProfile.objects.create(
            user=akgsma_member,
            state=state,
            association=akgsma,
            district_operational_unit=akgsma_district,
            unit=akgsma_unit,
        )

        AssociationRate.objects.create(
            association=kgsma,
            region_label="KGSMA Previous",
            gold_22k="5440.00",
            gold_24k="5890.00",
            silver="74.25",
            effective_at=timezone.make_aware(datetime(2026, 4, 20, 9, 0)),
        )
        AssociationRate.objects.create(
            association=kgsma,
            region_label="KGSMA Latest",
            gold_22k="5450.00",
            gold_24k="5900.00",
            silver="75.00",
            effective_at=timezone.make_aware(datetime(2026, 4, 21, 10, 30)),
        )
        AssociationRate.objects.create(
            association=akgsma,
            region_label="AKGSMA Latest",
            gold_22k="5435.00",
            gold_24k="5880.00",
            silver="74.50",
            effective_at=timezone.make_aware(datetime(2026, 4, 21, 10, 30)),
        )

        self.client.force_authenticate(user=kgsma_member)
        response = self.client.get(reverse("dashboard"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["association"]["name"], "KGSMA")
        self.assertEqual(response.data["headline_rates"]["gold_22k"]["value"], 5450.0)
        self.assertEqual(response.data["headline_rates"]["gold_22k"]["trend"], "up")
        self.assertEqual(response.data["other_associations"][0]["name"], "AKGSMA")
        self.assertEqual(response.data["other_associations"][0]["state_name"], "Kerala")
        self.assertEqual(response.data["other_associations"][0]["headline_rates"]["gold_22k"]["trend"], "flat")

        self.client.force_authenticate(user=akgsma_member)
        response = self.client.get(reverse("dashboard"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["association"]["name"], "AKGSMA")
        self.assertEqual(response.data["headline_rates"]["gold_22k"]["value"], 5435.0)

    def test_dashboard_other_associations_only_include_member_state(self):
        kerala = RegionState.objects.create(name="Kerala")
        tamil_nadu = RegionState.objects.create(name="Tamil Nadu")
        kgsma = Association.objects.create(state=kerala, name="KGSMA")
        akgsma = Association.objects.create(state=kerala, name="AKGSMA")
        tnja = Association.objects.create(state=tamil_nadu, name="Tamil Nadu Jewellers Association")
        kgsma_district = DistrictOperationalUnit.objects.create(association=kgsma, name="Ernakulam District Unit")
        kgsma_unit = Unit.objects.create(district_operational_unit=kgsma_district, name="Kadavanthra Unit")

        user_model = get_user_model()
        member = user_model.objects.create_user(username="scoped-member", password="StrongPass123!")
        MemberProfile.objects.create(
            user=member,
            state=kerala,
            association=kgsma,
            district_operational_unit=kgsma_district,
            unit=kgsma_unit,
        )

        AssociationRate.objects.create(
            association=kgsma,
            region_label="KGSMA Latest",
            gold_22k="5450.00",
            gold_24k="5900.00",
            silver="75.00",
            effective_at=timezone.make_aware(datetime(2026, 4, 21, 10, 30)),
        )
        AssociationRate.objects.create(
            association=akgsma,
            region_label="AKGSMA Latest",
            gold_22k="5435.00",
            gold_24k="5880.00",
            silver="74.50",
            effective_at=timezone.make_aware(datetime(2026, 4, 21, 10, 30)),
        )
        AssociationRate.objects.create(
            association=tnja,
            region_label="TNJA Latest",
            gold_22k="5495.00",
            gold_24k="5950.00",
            silver="76.10",
            effective_at=timezone.make_aware(datetime(2026, 4, 21, 10, 30)),
        )

        self.client.force_authenticate(user=member)
        response = self.client.get(reverse("dashboard"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual([item["name"] for item in response.data["other_associations"]], ["AKGSMA"])

    def test_state_rates_returns_states_with_latest_association_rates(self):
        kerala = RegionState.objects.create(name="Kerala")
        tamil_nadu = RegionState.objects.create(name="Tamil Nadu")
        kgsma = Association.objects.create(state=kerala, name="KGSMA")
        akgsma = Association.objects.create(state=kerala, name="AKGSMA")
        tnja = Association.objects.create(state=tamil_nadu, name="Tamil Nadu Jewellers Association")

        AssociationRate.objects.create(
            association=kgsma,
            region_label="KGSMA Latest",
            gold_22k="5450.00",
            gold_24k="5900.00",
            silver="75.00",
            effective_at=timezone.make_aware(datetime(2026, 4, 21, 10, 30)),
        )
        AssociationRate.objects.create(
            association=akgsma,
            region_label="AKGSMA Latest",
            gold_22k="5435.00",
            gold_24k="5880.00",
            silver="74.50",
            effective_at=timezone.make_aware(datetime(2026, 4, 21, 10, 30)),
        )
        AssociationRate.objects.create(
            association=tnja,
            region_label="TNJA Latest",
            gold_22k="5495.00",
            gold_24k="5950.00",
            silver="76.10",
            effective_at=timezone.make_aware(datetime(2026, 4, 21, 10, 30)),
        )

        response = self.client.get(reverse("dashboard_state_rates"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual([state["name"] for state in response.data["states"]], ["Kerala", "Tamil Nadu"])
        self.assertEqual([association["name"] for association in response.data["states"][0]["associations"]], ["AKGSMA", "KGSMA"])
        self.assertEqual(response.data["states"][1]["associations"][0]["gold_24k"], 5950.0)
        self.assertEqual(response.data["states"][1]["associations"][0]["state_name"], "Tamil Nadu")
        self.assertEqual(response.data["states"][1]["associations"][0]["headline_rates"]["gold_24k"]["trend"], "flat")

    def test_association_rate_detail_returns_gold_and_silver_groups(self):
        kerala = RegionState.objects.create(name="Kerala")
        kgsma = Association.objects.create(state=kerala, name="KGSMA")
        previous_time = timezone.make_aware(datetime(2026, 4, 20, 9, 0))
        latest_time = timezone.make_aware(datetime(2026, 4, 21, 9, 0))

        AssociationRate.objects.create(
            association=kgsma,
            region_label="KGSMA Previous",
            gold_22k="5440.00",
            gold_24k="5890.00",
            silver="74.25",
            effective_at=previous_time,
        )
        AssociationRate.objects.create(
            association=kgsma,
            region_label="KGSMA Latest",
            gold_22k="5455.00",
            gold_24k="5910.00",
            silver="74.50",
            effective_at=latest_time,
        )

        response = self.client.get(reverse("dashboard_association_rate_detail", args=[kgsma.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["association"]["name"], "KGSMA")
        self.assertEqual(response.data["association"]["state_name"], "Kerala")
        self.assertEqual(response.data["hero_badge_label"], "Live Market")
        self.assertEqual([group["title"] for group in response.data["rate_groups"]], ["Gold Bullion Rates", "Silver Market"])
        self.assertEqual(response.data["rate_groups"][0]["items"][0]["label"], "24K Purity (999)")
        self.assertEqual(response.data["rate_groups"][0]["items"][0]["trend"], "up")
        self.assertEqual(response.data["rate_groups"][1]["items"][0]["label"], "Silver Market Rate")
        self.assertEqual(response.data["notice"]["eyebrow"], "Institutional Notice")

    def test_association_rate_detail_returns_404_for_invalid_association(self):
        response = self.client.get(reverse("dashboard_association_rate_detail", args=[999999]))

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_association_rate_detail_uses_flat_trend_when_no_previous_rate_exists(self):
        kerala = RegionState.objects.create(name="Kerala")
        association = Association.objects.create(state=kerala, name="Solo Association")
        AssociationRate.objects.create(
            association=association,
            region_label="Solo Latest",
            gold_22k="5450.00",
            gold_24k="5900.00",
            silver="75.00",
            effective_at=timezone.make_aware(datetime(2026, 4, 21, 10, 30)),
        )

        response = self.client.get(reverse("dashboard_association_rate_detail", args=[association.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["rate_groups"][0]["items"][0]["trend"], "flat")
        self.assertEqual(response.data["rate_groups"][0]["items"][0]["change_percent_label"], "0.00%")
