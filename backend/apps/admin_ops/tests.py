from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase


class AdminOverviewTests(APITestCase):
    def setUp(self):
        user_model = get_user_model()
        self.member = user_model.objects.create_user(username="member1", password="StrongPass123!")
        self.admin_user = user_model.objects.create_user(
            username="admin1",
            password="StrongPass123!",
            is_staff=True,
        )

    def test_admin_overview_blocks_non_admin_users(self):
        self.client.force_authenticate(user=self.member)

        response = self.client.get(reverse("admin_overview"))

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_overview_allows_staff_users(self):
        self.client.force_authenticate(user=self.admin_user)

        response = self.client.get(reverse("admin_overview"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("analytics", response.data)
        self.assertIn("system_logs", response.data)
