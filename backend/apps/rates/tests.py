from datetime import datetime
from urllib.parse import urlsplit

from django.contrib.auth import get_user_model
from django.test import override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import MemberProfile, NotificationPreference, UserNotification, UserRole
from apps.directory.models import MediaAsset
from apps.regions.models import Association, DistrictOperationalUnit, RegionState, Unit

from .models import AssociationRate, AssociationSpotlightMedia, ExternalMarketRate, GlobalTrendSnapshot


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
        self.assertEqual(response.data["updated_at_label"], "21 Apr 2026, 9:00 AM")
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
        self.assertEqual(response.data["states"][0]["associations"][0]["updated_at_label"], "21 Apr 2026, 10:30 AM")
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
        self.assertEqual(response.data["updated_at_label"], "21 Apr 2026, 9:00 AM")
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

    def test_association_rate_detail_uses_custom_admin_managed_categories(self):
        kerala = RegionState.objects.create(name="Kerala")
        association = Association.objects.create(state=kerala, name="KGSMA")
        admin_user = get_user_model().objects.create_user(username="rates-admin", password="StrongPass123!")
        UserRole.objects.create(
            user=admin_user,
            role=UserRole.Role.ASSOCIATION_ADMIN,
            scope_type=UserRole.ScopeType.ASSOCIATION,
            scope_id=association.id,
        )

        self.client.force_authenticate(user=admin_user)
        save_response = self.client.put(
            reverse("admin_association_rate_catalog"),
            {
                "categories": [
                    {
                        "name": "Gold",
                        "unit_label": "1 Gram",
                        "subcategories": [
                            {"name": "22K", "unit_label": "1 Gram", "current_value": "5450.00"},
                            {"name": "24K", "unit_label": "1 Gram", "current_value": "5900.00"},
                        ],
                    },
                    {
                        "name": "Silver",
                        "unit_label": "1 Gram",
                        "current_value": "74.50",
                        "subcategories": [],
                    },
                    {
                        "name": "Diamond",
                        "unit_label": "1 Carat",
                        "current_value": "6250.00",
                        "subcategories": [],
                    },
                ]
            },
            format="json",
        )
        self.assertEqual(save_response.status_code, status.HTTP_200_OK)

        detail_response = self.client.get(reverse("dashboard_association_rate_detail", args=[association.id]))

        self.assertEqual(detail_response.status_code, status.HTTP_200_OK)
        self.assertEqual([group["title"] for group in detail_response.data["rate_groups"]], ["Gold", "Silver", "Diamond"])
        self.assertEqual(detail_response.data["rate_groups"][0]["items"][0]["label"], "22K")
        self.assertEqual(detail_response.data["rate_groups"][1]["items"][0]["label"], "Silver Rate")
        self.assertEqual(detail_response.data["rate_groups"][2]["items"][0]["unit_label"], "1 Carat")


class AssociationAdminRateCatalogApiTests(APITestCase):
    def setUp(self):
        self.state = RegionState.objects.create(name="Kerala")
        self.association = Association.objects.create(state=self.state, name="KGSMA")
        self.district = DistrictOperationalUnit.objects.create(association=self.association, name="Ernakulam District Unit")
        self.unit = Unit.objects.create(district_operational_unit=self.district, name="Kadavanthra Unit")

        user_model = get_user_model()
        self.association_admin = user_model.objects.create_user(username="association-admin", password="StrongPass123!")
        UserRole.objects.create(
            user=self.association_admin,
            role=UserRole.Role.ASSOCIATION_ADMIN,
            scope_type=UserRole.ScopeType.ASSOCIATION,
            scope_id=self.association.id,
        )
        MemberProfile.objects.create(
            user=self.association_admin,
            state=self.state,
            association=self.association,
            district_operational_unit=self.district,
            unit=self.unit,
        )

        self.member = user_model.objects.create_user(username="association-member", password="StrongPass123!")
        MemberProfile.objects.create(
            user=self.member,
            state=self.state,
            association=self.association,
            district_operational_unit=self.district,
            unit=self.unit,
        )
        NotificationPreference.objects.create(
            user=self.association_admin,
            rate_alerts=True,
            news_alerts=True,
            ad_alerts=False,
            meeting_alerts=True,
            product_alerts=True,
        )
        NotificationPreference.objects.create(
            user=self.member,
            rate_alerts=True,
            news_alerts=True,
            ad_alerts=False,
            meeting_alerts=True,
            product_alerts=True,
        )

    def test_association_admin_can_save_rate_catalog_and_members_see_updated_rates(self):
        self.client.force_authenticate(user=self.association_admin)
        response = self.client.put(
            reverse("admin_association_rate_catalog"),
            {
                "categories": [
                    {
                        "name": "Gold",
                        "unit_label": "1 Gram",
                        "subcategories": [
                            {"name": "18K", "unit_label": "1 Gram", "current_value": "4450.00"},
                            {"name": "22K", "unit_label": "1 Gram", "current_value": "5455.00"},
                            {"name": "24K", "unit_label": "1 Gram", "current_value": "5910.00"},
                        ],
                    },
                    {
                        "name": "Silver",
                        "unit_label": "1 Gram",
                        "current_value": "74.75",
                        "subcategories": [],
                    },
                ]
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["association"]["name"], "KGSMA")
        self.assertEqual(response.data["categories"][0]["subcategories"][1]["name"], "22K")

        self.client.force_authenticate(user=self.member)
        dashboard_response = self.client.get(reverse("dashboard"))
        detail_response = self.client.get(reverse("dashboard_association_rate_detail", args=[self.association.id]))

        self.assertEqual(dashboard_response.status_code, status.HTTP_200_OK)
        self.assertEqual(dashboard_response.data["association"]["name"], "KGSMA")
        self.assertEqual(dashboard_response.data["headline_rates"]["gold_22k"]["value"], 5455.0)
        self.assertEqual(dashboard_response.data["headline_rates"]["gold_24k"]["value"], 5910.0)
        self.assertEqual(
            UserNotification.objects.filter(
                user=self.member,
                notification__source_object_type="rate",
                notification__source_object_id=self.association.id,
            ).count(),
            1,
        )
        self.assertEqual(dashboard_response.data["headline_rates"]["silver"]["value"], 74.75)
        self.assertEqual(detail_response.status_code, status.HTTP_200_OK)
        self.assertEqual([group["title"] for group in detail_response.data["rate_groups"]], ["Gold", "Silver"])

    def test_association_admin_catalog_get_falls_back_to_legacy_rate_defaults(self):
        AssociationRate.objects.create(
            association=self.association,
            region_label="KGSMA Latest",
            gold_22k="5440.00",
            gold_24k="5890.00",
            silver="74.25",
            effective_at=timezone.make_aware(datetime(2026, 4, 21, 9, 0)),
        )

        self.client.force_authenticate(user=self.association_admin)
        response = self.client.get(reverse("admin_association_rate_catalog"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["categories"][0]["name"], "Gold")
        self.assertEqual(response.data["categories"][0]["subcategories"][0]["current_value"], "5440.00")
        self.assertEqual(response.data["categories"][1]["current_value"], "74.25")

    def test_non_association_admin_cannot_access_catalog(self):
        user_model = get_user_model()
        other_admin = user_model.objects.create_user(username="state-admin", password="StrongPass123!")
        UserRole.objects.create(
            user=other_admin,
            role=UserRole.Role.STATE_ADMIN,
            scope_type=UserRole.ScopeType.STATE,
            scope_id=self.state.id,
        )

        self.client.force_authenticate(user=other_admin)
        response = self.client.get(reverse("admin_association_rate_catalog"))

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class AssociationSpotlightApiTests(APITestCase):
    def setUp(self):
        self.state = RegionState.objects.create(name="Kerala")
        self.other_state = RegionState.objects.create(name="Tamil Nadu")
        self.association = Association.objects.create(state=self.state, name="KGSMA")
        self.other_association = Association.objects.create(state=self.other_state, name="TNJA")
        self.district = DistrictOperationalUnit.objects.create(association=self.association, name="Ernakulam District Unit")
        self.other_district = DistrictOperationalUnit.objects.create(association=self.other_association, name="Chennai District Unit")
        self.unit = Unit.objects.create(district_operational_unit=self.district, name="Kadavanthra Unit")
        self.other_unit = Unit.objects.create(district_operational_unit=self.other_district, name="T Nagar Unit")

        user_model = get_user_model()
        self.association_admin = user_model.objects.create_user(username="spotlight-association-admin", password="StrongPass123!")
        UserRole.objects.create(
            user=self.association_admin,
            role=UserRole.Role.ASSOCIATION_ADMIN,
            scope_type=UserRole.ScopeType.ASSOCIATION,
            scope_id=self.association.id,
        )
        MemberProfile.objects.create(
            user=self.association_admin,
            state=self.state,
            association=self.association,
            district_operational_unit=self.district,
            unit=self.unit,
        )

        self.member = user_model.objects.create_user(username="spotlight-member", password="StrongPass123!")
        MemberProfile.objects.create(
            user=self.member,
            state=self.state,
            association=self.association,
            district_operational_unit=self.district,
            unit=self.unit,
        )

        self.other_member = user_model.objects.create_user(username="other-spotlight-member", password="StrongPass123!")
        MemberProfile.objects.create(
            user=self.other_member,
            state=self.other_state,
            association=self.other_association,
            district_operational_unit=self.other_district,
            unit=self.other_unit,
        )

        self.super_admin = user_model.objects.create_user(
            username="spotlight-super-admin",
            password="StrongPass123!",
            role=user_model.Role.SUPER_ADMIN,
            is_staff=True,
        )
        UserRole.objects.create(
            user=self.super_admin,
            role=UserRole.Role.SUPER_ADMIN,
            scope_type=UserRole.ScopeType.PLATFORM,
            scope_id=None,
        )

    def _create_media_asset(self, *, name: str) -> MediaAsset:
        return MediaAsset.objects.create(
            uploader=self.association_admin,
            object_key=f"association-spotlights/test/{name}.jpg",
            bucket_name="demo-public-media",
            original_filename=f"{name}.jpg",
            mime_type="image/jpeg",
            public_url=f"https://example.com/{name}.jpg",
            width=1200,
            height=800,
            file_size=245760,
            visibility=MediaAsset.Visibility.PUBLIC,
            moderation_status=MediaAsset.ModerationStatus.APPROVED,
        )

    def _create_spotlight_item(self, *, association: Association, name: str, sort_order: int = 0, is_active: bool = True) -> AssociationSpotlightMedia:
        return AssociationSpotlightMedia.objects.create(
            association=association,
            asset=self._create_media_asset(name=name),
            title=f"{name} title",
            subtitle=f"{name} subtitle",
            sort_order=sort_order,
            is_active=is_active,
            created_by=self.association_admin,
        )

    @override_settings(
        DASHBOARD_WELCOME_FILMSTRIP_ENABLED=True,
        DASHBOARD_WELCOME_FILMSTRIP_DURATION_SECONDS=5,
        DASHBOARD_WELCOME_FILMSTRIP_SCROLL_SPEED="medium",
        DASHBOARD_WELCOME_FILMSTRIP_MAX_ITEMS=10,
        DASHBOARD_WELCOME_FILMSTRIP_RESHOW_POLICY="next_app_launch",
    )
    def test_dashboard_welcome_filmstrip_is_scoped_to_authenticated_member_association(self):
        self._create_spotlight_item(association=self.association, name="member-association-spotlight", sort_order=0)
        self._create_spotlight_item(association=self.other_association, name="other-association-spotlight", sort_order=0)

        guest_response = self.client.get(reverse("dashboard"))
        self.assertEqual(guest_response.status_code, status.HTTP_200_OK)
        self.assertIsNone(guest_response.data["dashboard_welcome_filmstrip"])

        self.client.force_authenticate(user=self.member)
        member_response = self.client.get(reverse("dashboard"))
        self.assertEqual(member_response.status_code, status.HTTP_200_OK)
        self.assertEqual(member_response.data["dashboard_welcome_filmstrip"]["association_id"], self.association.id)
        self.assertEqual(
            [item["title"] for item in member_response.data["dashboard_welcome_filmstrip"]["items"]],
            ["member-association-spotlight title"],
        )

        self.client.force_authenticate(user=self.other_member)
        other_member_response = self.client.get(reverse("dashboard"))
        self.assertEqual(other_member_response.status_code, status.HTTP_200_OK)
        self.assertEqual(other_member_response.data["dashboard_welcome_filmstrip"]["association_id"], self.other_association.id)
        self.assertEqual(
            [item["title"] for item in other_member_response.data["dashboard_welcome_filmstrip"]["items"]],
            ["other-association-spotlight title"],
        )

    @override_settings(DASHBOARD_WELCOME_FILMSTRIP_ENABLED=True)
    def test_dashboard_welcome_filmstrip_hides_when_association_has_no_active_items(self):
        self._create_spotlight_item(association=self.association, name="inactive-spotlight", is_active=False)

        self.client.force_authenticate(user=self.member)
        response = self.client.get(reverse("dashboard"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNone(response.data["dashboard_welcome_filmstrip"])

    def test_association_admin_can_upload_create_update_reorder_and_delete_spotlight_items(self):
        self.client.force_authenticate(user=self.association_admin)

        upload_session_response = self.client.post(
            reverse("admin_association_spotlight_upload_session"),
            {"filename": "welcome-filmstrip.jpg"},
            format="json",
        )
        self.assertEqual(upload_session_response.status_code, status.HTTP_200_OK)

        mock_upload_response = self.client.put(
            f"{reverse('mock_upload')}?object_key={upload_session_response.data['object_key']}",
            b"mock-spotlight-image",
            content_type="image/jpeg",
        )
        self.assertEqual(mock_upload_response.status_code, status.HTTP_204_NO_CONTENT)

        finalize_response = self.client.post(
            reverse("admin_association_spotlight_media_asset_finalize"),
            {
                "object_key": upload_session_response.data["object_key"],
                "bucket_name": upload_session_response.data["bucket_name"],
                "original_filename": "welcome-filmstrip.jpg",
                "mime_type": "image/jpeg",
                "file_size": len(b"mock-spotlight-image"),
                "width": 1280,
                "height": 720,
            },
            format="json",
        )
        self.assertEqual(finalize_response.status_code, status.HTTP_201_CREATED)
        parsed_media_url = urlsplit(finalize_response.data["public_url"])
        media_response = self.client.get(f"{parsed_media_url.path}?{parsed_media_url.query}")
        self.assertEqual(media_response.status_code, status.HTTP_200_OK)
        self.assertEqual(media_response.content, b"mock-spotlight-image")

        create_response = self.client.post(
            reverse("admin_association_spotlight_list_create"),
            {
                "asset_id": finalize_response.data["asset_id"],
                "title": "Welcome Board",
                "subtitle": "Association welcome visual",
                "is_active": True,
            },
            format="json",
        )
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        first_item_id = create_response.data["id"]

        second_item = self._create_spotlight_item(association=self.association, name="second-spotlight", sort_order=1)

        update_response = self.client.patch(
            reverse("admin_association_spotlight_detail", args=[first_item_id]),
            {"title": "Updated Welcome Board", "is_active": False},
            format="json",
        )
        self.assertEqual(update_response.status_code, status.HTTP_200_OK)
        self.assertEqual(update_response.data["title"], "Updated Welcome Board")
        self.assertFalse(update_response.data["is_active"])

        reorder_response = self.client.post(
            reverse("admin_association_spotlight_reorder"),
            {"item_ids": [second_item.id, first_item_id]},
            format="json",
        )
        self.assertEqual(reorder_response.status_code, status.HTTP_200_OK)
        self.assertEqual([item["id"] for item in reorder_response.data["items"]], [second_item.id, first_item_id])

        delete_response = self.client.delete(reverse("admin_association_spotlight_detail", args=[first_item_id]))
        self.assertEqual(delete_response.status_code, status.HTTP_200_OK)
        self.assertFalse(AssociationSpotlightMedia.objects.filter(pk=first_item_id).exists())

    def test_association_admin_cannot_manage_other_association_spotlights(self):
        other_item = self._create_spotlight_item(association=self.other_association, name="other-association-locked")
        self.client.force_authenticate(user=self.association_admin)

        response = self.client.patch(
            reverse("admin_association_spotlight_detail", args=[other_item.id]),
            {"title": "Should fail"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_super_admin_can_manage_selected_association_spotlights(self):
        self.client.force_authenticate(user=self.super_admin)
        asset = self._create_media_asset(name="super-admin-created")

        create_response = self.client.post(
            reverse("admin_association_spotlight_list_create"),
            {
                "association_id": self.other_association.id,
                "asset_id": asset.id,
                "title": "Platform-managed spotlight",
                "subtitle": "Managed by super admin",
            },
            format="json",
        )
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        created_item_id = create_response.data["id"]
        self.assertEqual(create_response.data["association"], self.other_association.id)

        list_response = self.client.get(
            f"{reverse('admin_association_spotlight_list_create')}?association_id={self.other_association.id}"
        )
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertEqual(list_response.data["association"]["id"], self.other_association.id)
        self.assertEqual([item["id"] for item in list_response.data["items"]], [created_item_id])
