from io import StringIO

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.urls import reverse
from rest_framework.test import APITestCase

from apps.directory.models import Company, CompanyTier
from apps.news.models import Alert
from apps.regions.models import Association, RegionState

from .models import AuditLog


class SeedDemoDataCommandTests(APITestCase):
    def test_seed_demo_data_is_idempotent(self):
        call_command("seed_demo_data")
        first_counts = {
            "users": get_user_model().objects.filter(username__startswith="demo_").count(),
            "states": RegionState.objects.count(),
            "companies": Company.objects.count(),
            "alerts": Alert.objects.count(),
            "audit_logs": AuditLog.objects.count(),
        }

        call_command("seed_demo_data")
        second_counts = {
            "users": get_user_model().objects.filter(username__startswith="demo_").count(),
            "states": RegionState.objects.count(),
            "companies": Company.objects.count(),
            "alerts": Alert.objects.count(),
            "audit_logs": AuditLog.objects.count(),
        }

        self.assertEqual(first_counts, second_counts)

    def test_seed_demo_data_reset_replaces_existing_domain_rows(self):
        call_command("seed_demo_data")
        tier = CompanyTier.objects.get(slug="prime-circle")
        Company.objects.create(
            name="Temporary Local Entry",
            category="Retail",
            tier_ref=tier,
            city="Test City",
            state="Test State",
            about="Ad-hoc local row",
            daily_capacity="1kg",
            specialization="Testing",
        )

        call_command("seed_demo_data", "--reset")

        self.assertFalse(Company.objects.filter(name="Temporary Local Entry").exists())
        self.assertTrue(Company.objects.filter(name="Heritage Gold House").exists())
        self.assertEqual(get_user_model().objects.filter(username__startswith="demo_").count(), 15)
        self.assertEqual(CompanyTier.objects.filter(slug__in=["prime-signature", "prime-classic", "prime-premier", "prime-elite", "prime-circle", "prime-unique"]).count(), 6)

    def test_seed_demo_data_command_prints_demo_password(self):
        stdout = StringIO()

        call_command("seed_demo_data", stdout=stdout)

        self.assertIn("Demo login password", stdout.getvalue())


class SeededApiIntegrationTests(APITestCase):
    def test_seeded_endpoints_return_realistic_member_facing_payloads(self):
        call_command("seed_demo_data", "--reset")

        regions_response = self.client.get(reverse("region_hierarchy"))
        dashboard_response = self.client.get(reverse("dashboard"))
        directory_response = self.client.get(reverse("company_list"))
        market_response = self.client.get(reverse("market_feed"))
        services_response = self.client.get(reverse("services_dashboard"))
        news_response = self.client.get(reverse("news_feed"))
        meetings_response = self.client.get(reverse("meeting_list_create"))

        self.assertEqual(regions_response.status_code, 200)
        self.assertGreaterEqual(len(regions_response.data), 3)
        kerala = next(state for state in regions_response.data if state["name"] == "Kerala")
        kgsma = next(association for association in kerala["associations"] if association["name"] == "KGSMA")
        self.assertTrue(any(unit["name"] == "Kadavanthra Unit" for district_unit in kgsma["district_units"] for unit in district_unit["units"]))
        self.assertTrue(Association.objects.filter(name="KGSMA").exists())
        self.assertEqual(dashboard_response.status_code, 200)
        self.assertGreater(len(dashboard_response.data["comparisons"]), 0)
        self.assertEqual(directory_response.status_code, 200)
        self.assertGreaterEqual(len(directory_response.data), 10)
        self.assertTrue(any(company["products"] for company in directory_response.data))
        self.assertTrue(
            any(
                product["name"] == "Singapore Twist Chain"
                for company in directory_response.data
                for product in company["products"]
            )
        )
        self.assertEqual(market_response.status_code, 200)
        self.assertGreaterEqual(len(market_response.data["featured_companies"]), 2)
        self.assertGreaterEqual(len(market_response.data["pro_companies"]), 4)
        self.assertGreaterEqual(len(market_response.data["normal_companies"]), 4)
        self.assertGreaterEqual(len(market_response.data["categories"]), 6)
        self.assertTrue(all(item["hero_image_url"] for item in market_response.data["featured_companies"]))
        self.assertTrue(all(item["image_url"] for item in market_response.data["latest_products"]))
        self.assertEqual(CompanyTier.objects.count(), 6)
        self.assertTrue(Company.objects.exclude(tier_ref=None).count() >= 10)
        self.assertEqual(services_response.status_code, 200)
        self.assertGreater(len(services_response.data["overview"]), 0)
        self.assertEqual(news_response.status_code, 200)
        self.assertEqual(news_response.data["urgent_alert"]["title"], "GST update issued for bullion traders")
        self.assertGreaterEqual(len(news_response.data["meetings"]), 2)
        self.assertEqual(meetings_response.status_code, 200)
        self.assertGreaterEqual(len(meetings_response.data), 2)
        self.assertTrue(any(item["google_maps_link"] or item["online_meeting_link"] for item in meetings_response.data))
