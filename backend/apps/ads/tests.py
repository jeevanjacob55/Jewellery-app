from django.contrib.auth import get_user_model
from django.test import override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase


class AdvertisementApiTests(APITestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(username="advertiser1", password="StrongPass123!")

    def test_ads_overview_requires_authentication(self):
        response = self.client.get(reverse("ads_overview"))

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    @override_settings(GCS_PRIVATE_BUCKET_NAME="jewellery-association-private-media")
    def test_ads_upload_session_returns_private_upload_for_authenticated_user(self):
        self.client.force_authenticate(user=self.user)

        response = self.client.post(
            reverse("ads_upload_session"),
            {"campaign_id": "campaign-1", "filename": "banner.png"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["visibility"], "private")
        self.assertEqual(response.data["bucket_name"], "jewellery-association-private-media")
