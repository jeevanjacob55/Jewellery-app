from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .models import ReverseSearchRequest, ReverseSearchResponse


class ReverseSearchApiTests(APITestCase):
    def setUp(self):
        user_model = get_user_model()
        self.user = user_model.objects.create_user(username="member1", password="StrongPass123!")
        self.other_user = user_model.objects.create_user(username="member2", password="StrongPass123!")

    def test_reverse_search_requires_authentication(self):
        response = self.client.get(reverse("reverse_search_list_create"))

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_authenticated_user_only_sees_own_requests(self):
        own_request = ReverseSearchRequest.objects.create(created_by=self.user, notes="Looking for a bangle match.")
        ReverseSearchResponse.objects.create(
            request=own_request,
            responder=self.other_user,
            message="Supplier can produce within 10 days.",
            availability_label="Available",
        )
        ReverseSearchRequest.objects.create(created_by=self.other_user, notes="Hidden from first member.")

        self.client.force_authenticate(user=self.user)
        response = self.client.get(reverse("reverse_search_list_create"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["notes"], "Looking for a bangle match.")
        self.assertEqual(response.data[0]["responses"][0]["availability_label"], "Available")

    def test_create_request_assigns_current_user(self):
        self.client.force_authenticate(user=self.user)

        response = self.client.post(
            reverse("reverse_search_list_create"),
            {"notes": "Need a matching bridal necklace."},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(ReverseSearchRequest.objects.get().created_by, self.user)

    def test_upload_session_returns_private_visibility_for_authenticated_user(self):
        self.client.force_authenticate(user=self.user)

        response = self.client.post(
            reverse("reverse_search_upload_session"),
            {"request_id": "draft-1", "filename": "reference image.jpg"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["visibility"], "private")
        self.assertIn("draft-1", response.data["object_key"])
