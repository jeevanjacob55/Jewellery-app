from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase


class ServicesDashboardTests(APITestCase):
    def test_services_dashboard_is_public(self):
        response = self.client.get(reverse("services_dashboard"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("overview", response.data)
        self.assertIn("services", response.data)
        self.assertIn("metrics", response.data)
