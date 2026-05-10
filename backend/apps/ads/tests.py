from datetime import timedelta
from urllib.parse import urlsplit

from django.contrib.auth import get_user_model
from django.test import override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import UserRole
from apps.directory.models import Company, CompanyTier, MediaAsset
from apps.regions.models import Association, DistrictOperationalUnit, RegionState, Unit

from .models import AdAsset, AdClick, AdImpression, Advertisement


class AdvertisementApiTests(APITestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(username="advertiser1", password="StrongPass123!")
        self.admin_user = get_user_model().objects.create_user(
            username="admin1",
            password="StrongPass123!",
            role=get_user_model().Role.ADMIN,
        )
        self.now = timezone.now()
        self.state = RegionState.objects.create(name="Kerala")
        self.association = Association.objects.create(state=self.state, name="KGSMA")
        self.district_unit = DistrictOperationalUnit.objects.create(association=self.association, name="Ernakulam District Unit")
        self.unit = Unit.objects.create(district_operational_unit=self.district_unit, name="Kadavanthra Unit")
        self.company_tier = CompanyTier.objects.create(
            name="Prime Elite Ads Test",
            slug="prime-elite-ads-test",
            description="Premium plan",
            max_products=25,
            min_photos_per_product=3,
            max_photos_per_product=5,
            visibility_type=CompanyTier.VisibilityType.PRO,
        )
        self.company = Company.objects.create(
            name="Advertiser One Jewels",
            category="Retail",
            tier_ref=self.company_tier,
            city="Kochi",
            state="Kerala",
            is_active=True,
            is_approved=True,
        )
        UserRole.objects.create(
            user=self.user,
            role=UserRole.Role.COMPANY_ADMIN,
            scope_type=UserRole.ScopeType.COMPANY,
            scope_id=self.company.id,
        )

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
            company=self.company,
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
            {"filename": "banner.png"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["visibility"], "public")
        self.assertEqual(response.data["bucket_name"], "jewellery-association-public-media")

    def test_company_admin_can_finalize_ad_media_asset_with_fetchable_public_url(self):
        self.client.force_authenticate(user=self.user)
        upload_session_response = self.client.post(
            reverse("ads_upload_session"),
            {"filename": "banner.png"},
            format="json",
        )

        self.assertEqual(upload_session_response.status_code, status.HTTP_200_OK)
        mock_upload_response = self.client.put(
            f"{reverse('mock_upload')}?object_key={upload_session_response.data['object_key']}",
            b"mock-ad-image-binary",
            content_type="image/png",
        )
        self.assertEqual(mock_upload_response.status_code, status.HTTP_204_NO_CONTENT)

        finalize_response = self.client.post(
            reverse("ads_media_asset_finalize"),
            {
                "object_key": upload_session_response.data["object_key"],
                "bucket_name": upload_session_response.data["bucket_name"],
                "original_filename": "banner.png",
                "mime_type": "image/png",
                "file_size": len(b"mock-ad-image-binary"),
                "width": 1200,
                "height": 675,
            },
            format="json",
        )

        self.assertEqual(finalize_response.status_code, status.HTTP_201_CREATED)
        parsed_media_url = urlsplit(finalize_response.data["public_url"])
        media_response = self.client.get(f"{parsed_media_url.path}?{parsed_media_url.query}")
        self.assertEqual(media_response.status_code, status.HTTP_200_OK)
        self.assertEqual(media_response.content, b"mock-ad-image-binary")

    def test_company_admin_can_create_and_submit_ad_without_products(self):
        asset = MediaAsset.objects.create(
            uploader=self.user,
            object_key="ads/banners/test-company/banner.png",
            bucket_name="demo-public-media",
            original_filename="banner.png",
            mime_type="image/png",
            public_url="https://mock-storage.local/ads/banners/test-company/banner.png",
            width=1200,
            height=675,
            file_size=98765,
            visibility=MediaAsset.Visibility.PUBLIC,
            moderation_status=MediaAsset.ModerationStatus.APPROVED,
        )
        self.client.force_authenticate(user=self.user)

        response = self.client.post(
            reverse("ads_campaigns"),
            {
                "title": "Company Linked Banner",
                "description": "Submitted by a company with no products.",
                "label_text": "ADVERTISEMENT",
                "background_color": "#A94B08",
                "placement": Advertisement.Placement.DASHBOARD_HERO,
                "action_type": Advertisement.ActionType.EXTERNAL_URL,
                "action_value": "https://example.com/offer",
                "priority": 20,
                "is_active": True,
                "status": Advertisement.Status.SUBMITTED,
                "start_date": (self.now - timedelta(days=1)).isoformat(),
                "end_date": (self.now + timedelta(days=7)).isoformat(),
                "asset_id": asset.id,
                "targeting": {
                    "state_id": self.state.id,
                    "association_id": self.association.id,
                    "district_operational_unit_id": self.district_unit.id,
                    "unit_id": self.unit.id,
                },
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        advertisement = Advertisement.objects.get(pk=response.data["advertisement"]["id"])
        self.assertEqual(advertisement.company, self.company)
        self.assertEqual(advertisement.status, Advertisement.Status.SUBMITTED)
        self.assertEqual(advertisement.assets.count(), 1)
        self.assertEqual(advertisement.action_payload, {"url": "https://example.com/offer"})

    def test_unapproved_company_cannot_create_campaign(self):
        self.company.is_approved = False
        self.company.save(update_fields=["is_approved"])
        self.client.force_authenticate(user=self.user)

        response = self.client.post(
            reverse("ads_campaigns"),
            {
                "title": "Blocked Banner",
                "status": Advertisement.Status.DRAFT,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_review_submitted_advertisement(self):
        submitted = self.create_advertisement(status_value=Advertisement.Status.SUBMITTED)
        self.client.force_authenticate(user=self.admin_user)

        list_response = self.client.get(reverse("ads_submitted_list"))
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertEqual([item["id"] for item in list_response.data["results"]], [submitted.id])

        approve_response = self.client.post(reverse("ads_approve", args=[submitted.id]), {}, format="json")
        self.assertEqual(approve_response.status_code, status.HTTP_200_OK)
        submitted.refresh_from_db()
        self.assertEqual(submitted.status, Advertisement.Status.APPROVED)
        self.assertEqual(submitted.approved_by, self.admin_user)
