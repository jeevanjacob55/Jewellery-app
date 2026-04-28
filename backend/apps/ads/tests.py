from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.directory.models import MediaAsset

from .models import AdAsset, AdClick, AdImpression, Advertisement


class AdvertisementApiTests(APITestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(username="advertiser1", password="StrongPass123!")
        self.admin_user = get_user_model().objects.create_user(username="admin1", password="StrongPass123!")
        self.now = timezone.now()

    def create_advertisement(
        self,
        *,
        title="Dashboard Offer",
        placement=Advertisement.Placement.DASHBOARD_HERO,
        status_value=Advertisement.Status.APPROVED,
        is_active=True,
        start_offset_days=-1,
        end_offset_days=7,
        priority=10,
        image_url="https://example.com/banner.jpg",
        action_type=Advertisement.ActionType.EXTERNAL_URL,
        action_payload=None,
    ) -> Advertisement:
        advertisement = Advertisement.objects.create(
            advertiser=self.user,
            title=title,
            description="Promotional copy",
            label_text="ADVERTISEMENT",
            background_color="#92400E",
            placement=placement,
            action_type=action_type,
            action_payload=action_payload or {"url": "https://example.com"},
            priority=priority,
            is_active=is_active,
            reach="state",
            status=status_value,
            start_date=self.now + timedelta(days=start_offset_days),
            end_date=self.now + timedelta(days=end_offset_days),
            approved_by=self.admin_user,
            approved_at=self.now,
        )
        asset = MediaAsset.objects.create(
            uploader=self.user,
            object_key=f"ads/{advertisement.id}.jpg",
            bucket_name="demo-public-media",
            original_filename=f"{advertisement.id}.jpg",
            mime_type="image/jpeg",
            public_url=image_url,
            width=1200,
            height=675,
            file_size=123456,
            visibility=MediaAsset.Visibility.PUBLIC,
            moderation_status=MediaAsset.ModerationStatus.APPROVED,
        )
        AdAsset.objects.create(advertisement=advertisement, asset=asset, placement=placement)
        return advertisement

    def test_ads_overview_returns_only_live_ads_for_requested_placement(self):
        visible = self.create_advertisement(title="Visible", priority=25)
        self.create_advertisement(title="Different placement", placement=Advertisement.Placement.MARKET_BANNER)
        self.create_advertisement(title="Draft", status_value=Advertisement.Status.DRAFT)
        self.create_advertisement(title="Inactive", is_active=False)
        self.create_advertisement(title="Expired", end_offset_days=-1)
        self.create_advertisement(title="Future", start_offset_days=1)

        response = self.client.get(reverse("ads_overview"), {"placement": Advertisement.Placement.DASHBOARD_HERO})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual([item["id"] for item in response.data["results"]], [visible.id])
        self.assertEqual(response.data["results"][0]["image_url"], "https://example.com/banner.jpg")

    def test_ads_overview_orders_by_priority_then_newest(self):
        first = self.create_advertisement(title="First", priority=10)
        second = self.create_advertisement(title="Second", priority=40)
        third = self.create_advertisement(title="Third", priority=40)
        Advertisement.objects.filter(pk=second.pk).update(created_at=self.now)
        Advertisement.objects.filter(pk=third.pk).update(created_at=self.now + timedelta(seconds=1))

        response = self.client.get(reverse("ads_overview"), {"placement": Advertisement.Placement.DASHBOARD_HERO})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual([item["id"] for item in response.data["results"]], [third.id, second.id, first.id])

    def test_ad_impression_endpoint_creates_row(self):
        advertisement = self.create_advertisement()

        response = self.client.post(
            reverse("ads_impression", args=[advertisement.id]),
            {"placement": Advertisement.Placement.DASHBOARD_HERO, "guest_id": "guest-123"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)
        impression = AdImpression.objects.get(advertisement=advertisement)
        self.assertEqual(impression.placement, Advertisement.Placement.DASHBOARD_HERO)
        self.assertEqual(impression.guest_id, "guest-123")
        self.assertIsNone(impression.user)

    def test_ad_click_endpoint_copies_action_metadata(self):
        advertisement = self.create_advertisement(
            action_type=Advertisement.ActionType.COMPANY,
            action_payload={"company_id": 45},
        )
        self.client.force_authenticate(user=self.user)

        response = self.client.post(
            reverse("ads_click", args=[advertisement.id]),
            {"placement": Advertisement.Placement.DASHBOARD_HERO},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)
        click = AdClick.objects.get(advertisement=advertisement)
        self.assertEqual(click.user, self.user)
        self.assertEqual(click.action_type, Advertisement.ActionType.COMPANY)
        self.assertEqual(click.action_payload, {"company_id": 45})

    @override_settings(GCS_BUCKET_NAME="jewellery-association-public-media")
    def test_ads_upload_session_returns_public_upload_for_authenticated_user(self):
        self.client.force_authenticate(user=self.user)

        response = self.client.post(
            reverse("ads_upload_session"),
            {"campaign_id": "campaign-1", "filename": "banner.png"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["visibility"], "public")
        self.assertEqual(response.data["bucket_name"], "jewellery-association-public-media")
