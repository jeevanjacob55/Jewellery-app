from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase


class DashboardApiTests(APITestCase):
    def test_dashboard_payload_contains_expected_sections(self):
        response = self.client.get(reverse("dashboard"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("headline_rates", response.data)
        self.assertIn("comparisons", response.data)
        self.assertIn("global_trends", response.data)
        self.assertIn("quick_actions", response.data)
