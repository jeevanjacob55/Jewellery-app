from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .models import MemberProfile, NotificationPreference


class AccountsApiTests(APITestCase):
    def setUp(self):
        self.password = "StrongPass123!"
        self.user = get_user_model().objects.create_user(
            username="member1",
            password=self.password,
            first_name="Asha",
            last_name="Nair",
            email="asha@example.com",
            corporate_email="asha@trade.example",
            jeweller_id="JWL-1001",
            onboarding_completed=True,
        )
        MemberProfile.objects.create(
            user=self.user,
            phone_number="9999999999",
            company_name="Asha Jewels",
            state_name="Kerala",
            district_name="Thrissur",
            local_chapter_name="Thrissur Central",
            membership_tier="Platinum",
        )
        NotificationPreference.objects.create(
            user=self.user,
            rate_alerts=True,
            news_alerts=True,
            ad_alerts=False,
            meeting_alerts=True,
        )

    def test_jwt_login_and_refresh_flow(self):
        response = self.client.post(
            reverse("token_obtain_pair"),
            {"username": self.user.username, "password": self.password},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)

        refresh_response = self.client.post(
            reverse("token_refresh"),
            {"refresh": response.data["refresh"]},
            format="json",
        )

        self.assertEqual(refresh_response.status_code, status.HTTP_200_OK)
        self.assertIn("access", refresh_response.data)

    def test_guest_access_returns_capabilities(self):
        response = self.client.post(
            reverse("guest_access"),
            {"guest_name": "Trade Visitor", "state": "Kerala", "district": "Thrissur"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["access_type"], "guest")
        self.assertIn("directory:browse", response.data["capabilities"])

    def test_me_requires_authentication(self):
        response = self.client.get(reverse("me"))

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_me_returns_nested_profile_for_authenticated_user(self):
        self.client.force_authenticate(user=self.user)

        response = self.client.get(reverse("me"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["username"], "member1")
        self.assertEqual(response.data["member_profile"]["company_name"], "Asha Jewels")
        self.assertTrue(response.data["notification_preferences"]["rate_alerts"])

    def test_session_info_is_public(self):
        response = self.client.get(reverse("session_info"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["auth_provider"], "jwt")
        self.assertTrue(response.data["supports_google_sso"])
