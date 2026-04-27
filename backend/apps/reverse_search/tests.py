from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.directory.models import MediaAsset

from .models import ReverseSearchAttachment, ReverseSearchRequest, ReverseSearchResponse


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
        asset = MediaAsset.objects.create(
            uploader=self.user,
            object_key="reverse-search/1/original/upload/sample.jpg",
            bucket_name="jewellery-association-private-media",
            original_filename="sample.jpg",
            mime_type="image/jpeg",
            width=1200,
            height=1200,
            file_size=2048,
            visibility=MediaAsset.Visibility.PRIVATE,
            moderation_status=MediaAsset.ModerationStatus.PENDING,
        )
        ReverseSearchAttachment.objects.create(request=own_request, asset=asset)
        ReverseSearchRequest.objects.create(created_by=self.other_user, notes="Hidden from first member.")

        self.client.force_authenticate(user=self.user)
        response = self.client.get(reverse("reverse_search_list_create"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["notes"], "Looking for a bangle match.")
        self.assertEqual(response.data[0]["attachments"][0]["original_filename"], "sample.jpg")
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
        reverse_search_request = ReverseSearchRequest.objects.create(created_by=self.user, notes="Need a matching bridal necklace.")
        self.client.force_authenticate(user=self.user)

        response = self.client.post(
            reverse("reverse_search_upload_session"),
            {"request_id": reverse_search_request.id, "filename": "reference image.jpg"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["visibility"], "private")
        self.assertIn(f"reverse-search/{reverse_search_request.id}/original/", response.data["object_key"])

    def test_upload_session_requires_existing_owned_request(self):
        other_request = ReverseSearchRequest.objects.create(created_by=self.other_user, notes="Other member request.")
        self.client.force_authenticate(user=self.user)

        missing_response = self.client.post(
            reverse("reverse_search_upload_session"),
            {"filename": "reference.jpg"},
            format="json",
        )
        other_owner_response = self.client.post(
            reverse("reverse_search_upload_session"),
            {"request_id": other_request.id, "filename": "reference.jpg"},
            format="json",
        )

        self.assertEqual(missing_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(other_owner_response.status_code, status.HTTP_404_NOT_FOUND)

    def test_finalize_attachment_creates_media_asset_and_attachment(self):
        reverse_search_request = ReverseSearchRequest.objects.create(created_by=self.user, notes="Need a matching bridal necklace.")
        self.client.force_authenticate(user=self.user)
        upload_session_response = self.client.post(
            reverse("reverse_search_upload_session"),
            {"request_id": reverse_search_request.id, "filename": "reference-image.jpg"},
            format="json",
        )

        self.assertEqual(upload_session_response.status_code, status.HTTP_200_OK)

        upload_response = self.client.put(
            upload_session_response.data["upload_url"],
            b"mock-image-bytes",
            content_type="image/jpeg",
        )
        self.assertEqual(upload_response.status_code, status.HTTP_204_NO_CONTENT)

        finalize_response = self.client.post(
            reverse("reverse_search_finalize_attachment"),
            {
                "request_id": reverse_search_request.id,
                "object_key": upload_session_response.data["object_key"],
                "bucket_name": upload_session_response.data["bucket_name"],
                "original_filename": "reference-image.jpg",
                "mime_type": "image/jpeg",
                "file_size": len(b"mock-image-bytes"),
                "width": 640,
                "height": 480,
            },
            format="json",
        )

        self.assertEqual(finalize_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(MediaAsset.objects.count(), 1)
        self.assertEqual(ReverseSearchAttachment.objects.count(), 1)
        self.assertEqual(finalize_response.data["attachments"][0]["original_filename"], "reference-image.jpg")
        self.assertEqual(finalize_response.data["attachments"][0]["visibility"], "private")

    def test_finalize_attachment_rejects_duplicate_attachment_for_same_request(self):
        reverse_search_request = ReverseSearchRequest.objects.create(created_by=self.user, notes="Need a matching bridal necklace.")
        self.client.force_authenticate(user=self.user)
        upload_session_response = self.client.post(
            reverse("reverse_search_upload_session"),
            {"request_id": reverse_search_request.id, "filename": "reference-image.jpg"},
            format="json",
        )
        self.client.put(upload_session_response.data["upload_url"], b"mock-image-bytes", content_type="image/jpeg")

        finalize_payload = {
            "request_id": reverse_search_request.id,
            "object_key": upload_session_response.data["object_key"],
            "bucket_name": upload_session_response.data["bucket_name"],
            "original_filename": "reference-image.jpg",
            "mime_type": "image/jpeg",
            "file_size": len(b"mock-image-bytes"),
            "width": 640,
            "height": 480,
        }
        first_response = self.client.post(reverse("reverse_search_finalize_attachment"), finalize_payload, format="json")
        second_response = self.client.post(reverse("reverse_search_finalize_attachment"), finalize_payload, format="json")

        self.assertEqual(first_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(second_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(ReverseSearchAttachment.objects.count(), 1)
