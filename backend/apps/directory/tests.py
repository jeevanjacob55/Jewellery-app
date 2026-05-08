from datetime import datetime, timedelta, timezone as dt_timezone
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.test import override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import UserRole

from .models import (
    Company,
    CompanyImage,
    CompanyTier,
    CompanyVerification,
    ExposureLedger,
    Enquiry,
    MarketRow,
    MarketZone,
    MediaAsset,
    PlacementOverride,
    Product,
    ProductAttributeDefinition,
    ProductAttributeValue,
    ProductCategory,
    ProductImage,
    ProductSubCategory,
    ProductWishlist,
    ZoneEligibilityRule,
)


class DirectoryApiTests(APITestCase):
    def setUp(self):
        user_model = get_user_model()
        self.user = user_model.objects.create_user(username="media_owner", password="DemoPass123!")
        self.company_admin = user_model.objects.create_user(username="company_admin", password="DemoPass123!")
        self.super_admin = user_model.objects.create_user(
            username="super_admin",
            password="DemoPass123!",
            role=user_model.Role.SUPER_ADMIN,
            is_staff=True,
        )
        UserRole.objects.create(
            user=self.super_admin,
            role=UserRole.Role.SUPER_ADMIN,
            scope_type=UserRole.ScopeType.PLATFORM,
            scope_id=None,
        )
        self.featured_tier = self._configure_tier(
            "prime-signature",
            max_products=1,
            min_photos_per_product=1,
            max_photos_per_product=4,
            max_companies_allowed=2,
            display_priority=10,
            visibility_type=CompanyTier.VisibilityType.FEATURED,
        )
        self.pro_tier = self._configure_tier(
            "prime-premier",
            max_products=2,
            min_photos_per_product=2,
            max_photos_per_product=4,
            display_priority=20,
            visibility_type=CompanyTier.VisibilityType.PRO,
        )
        self.normal_tier = self._configure_tier(
            "prime-circle",
            max_products=1,
            min_photos_per_product=1,
            max_photos_per_product=2,
            display_priority=30,
            visibility_type=CompanyTier.VisibilityType.NORMAL,
        )
        self.company = Company.objects.create(
            name="Heritage Gold House",
            category="Wholesale",
            tier_ref=self.featured_tier,
            city="Thrissur",
            state="Kerala",
            about="High-volume manufacturing and wholesale supply.",
            daily_capacity="15kg",
            specialization="Temple jewellery",
            admin_priority=90,
            is_active=True,
            is_approved=True,
        )
        UserRole.objects.create(
            user=self.company_admin,
            role=UserRole.Role.COMPANY_ADMIN,
            scope_type=UserRole.ScopeType.COMPANY,
            scope_id=self.company.id,
        )
        CompanyVerification.objects.create(
            company=self.company,
            gst_registered=True,
            bis_hallmarked=True,
            export_licensed=False,
        )
        category = ProductCategory.objects.create(name="Rings", icon_key="rings", display_order=1)
        self.chain_category = ProductCategory.objects.create(name="Chains", icon_key="chains", display_order=2)
        self.chain_subcategory = ProductSubCategory.objects.create(
            category=self.chain_category,
            name="Link Chain",
            slug="link-chain",
            display_order=1,
        )
        self.chain_length_attribute = ProductAttributeDefinition.objects.create(
            category=self.chain_category,
            key="length",
            label="Chain Length",
            type=ProductAttributeDefinition.AttributeType.RANGE,
            options_json=["16 inch", "18 inch", "20 inch", "22 inch"],
            display_order=1,
        )
        self.product = Product.objects.create(
            company=self.company,
            category=category,
            name="Lakshmi Kasu Mala",
            weight_grams="48.50",
            purity="22K",
            description="Hand-finished temple necklace.",
        )
        self._attach_company_image(self.company, is_logo=False, public_url="https://example.com/company-hero.jpg")
        self._attach_company_image(self.company, is_logo=True, public_url="https://example.com/company-logo.jpg")
        self._attach_product_image(self.product, public_url="https://example.com/product.jpg")
        self.chain_product = Product.objects.create(
            company=self.company,
            category=self.chain_category,
            subcategory=self.chain_subcategory,
            name="Curb Link Chain",
            weight_grams="42.50",
            purity="22K",
            price="2840.00",
            description="Premium curb chain.",
        )
        ProductAttributeValue.objects.create(
            product=self.chain_product,
            attribute_definition=self.chain_length_attribute,
            value="18 inch",
        )
        self._attach_product_image(self.chain_product, public_url="https://example.com/curb-link-chain.jpg")

    def _configure_tier(self, slug: str, **updates) -> CompanyTier:
        tier = CompanyTier.objects.get(slug=slug)
        for field_name, value in updates.items():
            setattr(tier, field_name, value)
        tier.save(update_fields=list(updates.keys()))
        return tier

    def _create_media_asset(self, *, object_key: str, public_url: str) -> MediaAsset:
        return MediaAsset.objects.create(
            uploader=self.user,
            object_key=object_key,
            bucket_name="demo-public-media",
            original_filename=object_key.split("/")[-1],
            mime_type="image/jpeg",
            public_url=public_url,
            width=1200,
            height=1200,
            file_size=245760,
            visibility=MediaAsset.Visibility.PUBLIC,
            moderation_status=MediaAsset.ModerationStatus.APPROVED,
        )

    def _attach_company_image(self, company: Company, *, is_logo: bool, public_url: str) -> None:
        asset = self._create_media_asset(
            object_key=f"companies/{company.id}/{'logo' if is_logo else 'hero'}.jpg",
            public_url=public_url,
        )
        CompanyImage.objects.create(company=company, asset=asset, is_logo=is_logo)

    def _attach_product_image(self, product: Product, *, public_url: str) -> None:
        asset = self._create_media_asset(
            object_key=f"products/{product.id}/hero.jpg",
            public_url=public_url,
        )
        ProductImage.objects.create(product=product, asset=asset)

    def _configure_zone(self, key: str, **updates) -> MarketZone:
        zone = MarketZone.objects.get(key=key)
        for field_name, value in updates.items():
            setattr(zone, field_name, value)
        zone.save(update_fields=list(updates.keys()))
        return zone

    def _create_override(
        self,
        *,
        company: Company,
        zone: MarketZone,
        action: str,
        starts_at: datetime | None = None,
        ends_at: datetime | None = None,
        priority: int = 0,
    ) -> PlacementOverride:
        return PlacementOverride.objects.create(
            company=company,
            zone=zone,
            action=action,
            starts_at=starts_at or datetime(2026, 1, 1, tzinfo=dt_timezone.utc),
            ends_at=ends_at or datetime(2026, 12, 31, tzinfo=dt_timezone.utc),
            priority=priority,
            notes="test override",
            is_active=True,
        )

    def _create_company_with_product(
        self,
        *,
        name: str,
        tier: CompanyTier,
        category_name: str,
        product_name: str,
        product_public_url: str,
        company_public_url: str,
        admin_priority: int = 0,
        is_active: bool = True,
        is_approved: bool = True,
    ) -> Company:
        company = Company.objects.create(
            name=name,
            category="Retail",
            tier_ref=tier,
            city="Kochi",
            state="Kerala",
            about=f"{name} profile",
            daily_capacity="5kg",
            specialization=category_name,
            admin_priority=admin_priority,
            is_active=is_active,
            is_approved=is_approved,
        )
        CompanyVerification.objects.create(company=company, gst_registered=True, bis_hallmarked=True, export_licensed=False)
        category, _ = ProductCategory.objects.get_or_create(name=category_name)
        product = Product.objects.create(
            company=company,
            category=category,
            name=product_name,
            weight_grams="10.00",
            purity="22K",
            description=f"{product_name} description",
        )
        self._attach_company_image(company, is_logo=False, public_url=company_public_url)
        self._attach_company_image(company, is_logo=True, public_url=f"{company_public_url}?logo=1")
        self._attach_product_image(product, public_url=product_public_url)
        return company

    def test_company_list_returns_nested_products_and_verification(self):
        response = self.client.get(reverse("company_list"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data[0]["name"], "Heritage Gold House")
        self.assertTrue(response.data[0]["verification"]["gst_registered"])
        self.assertEqual({product["name"] for product in response.data[0]["products"]}, {"Lakshmi Kasu Mala", "Curb Link Chain"})
        self.assertEqual(response.data[0]["hero_image_url"], "https://example.com/company-hero.jpg")
        self.assertEqual(response.data[0]["logo_image_url"], "https://example.com/company-logo.jpg")
        self.assertTrue(all(product["image_url"] for product in response.data[0]["products"]))

    def test_company_detail_returns_company_payload(self):
        response = self.client.get(reverse("company_detail", args=[self.company.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["city"], "Thrissur")
        self.assertEqual(len(response.data["products"]), 2)
        self.assertEqual({product["category_name"] for product in response.data["products"]}, {"Rings", "Chains"})

    def test_company_admin_can_get_company_management_detail(self):
        self.client.force_authenticate(user=self.company_admin)

        response = self.client.get(reverse("company_manage_detail", args=[self.company.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["company"]["name"], "Heritage Gold House")
        self.assertEqual(response.data["company"]["tier"]["name"], self.featured_tier.name)
        self.assertEqual(response.data["company"]["active_product_count"], 2)
        self.assertEqual(response.data["company"]["total_product_count"], 2)
        self.assertEqual(response.data["products"][0]["image_count"], 1)
        self.assertIn("asset_id", response.data["products"][0]["images"][0])

    def test_company_admin_cannot_get_other_company_management_detail(self):
        other_company = self._create_company_with_product(
            name="Other Scope House",
            tier=self.pro_tier,
            category_name="Rings",
            product_name="Other Scope Ring",
            product_public_url="https://example.com/other-scope-product.jpg",
            company_public_url="https://example.com/other-scope-company.jpg",
        )
        self.client.force_authenticate(user=self.company_admin)

        response = self.client.get(reverse("company_manage_detail", args=[other_company.id]))

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_company_admin_can_patch_company_management_fields(self):
        self.client.force_authenticate(user=self.company_admin)

        response = self.client.patch(
            reverse("company_manage_detail", args=[self.company.id]),
            {
                "about": "Updated profile copy for wholesale buyers.",
                "specialization": "Bridal jewellery",
                "daily_capacity": "18kg",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.company.refresh_from_db()
        self.assertEqual(self.company.about, "Updated profile copy for wholesale buyers.")
        self.assertEqual(self.company.specialization, "Bridal jewellery")
        self.assertEqual(self.company.daily_capacity, "18kg")

    def test_company_admin_can_finalize_media_asset_and_replace_logo(self):
        self.client.force_authenticate(user=self.company_admin)
        upload_session_response = self.client.post(
            reverse("company_upload_session", args=[self.company.id]),
            {"filename": "brand-logo.png"},
            format="json",
        )

        self.assertEqual(upload_session_response.status_code, status.HTTP_200_OK)
        mock_upload_response = self.client.put(
            f"{reverse('mock_upload')}?object_key={upload_session_response.data['object_key']}",
            b"mock-image-binary",
            content_type="image/png",
        )
        self.assertEqual(mock_upload_response.status_code, status.HTTP_204_NO_CONTENT)

        finalize_response = self.client.post(
            reverse("company_media_asset_finalize", args=[self.company.id]),
            {
                "object_key": upload_session_response.data["object_key"],
                "bucket_name": upload_session_response.data["bucket_name"],
                "original_filename": "brand-logo.png",
                "mime_type": "image/png",
                "file_size": len(b"mock-image-binary"),
                "width": 640,
                "height": 640,
            },
            format="json",
        )

        self.assertEqual(finalize_response.status_code, status.HTTP_201_CREATED)
        attach_response = self.client.post(
            reverse("company_image_attach", args=[self.company.id]),
            {"asset_id": finalize_response.data["asset_id"], "slot": "logo"},
            format="json",
        )

        self.assertEqual(attach_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(attach_response.data["company"]["logo_image_url"], finalize_response.data["public_url"])
        self.assertEqual(CompanyImage.objects.filter(company=self.company, is_logo=True).count(), 1)

    def test_company_upload_session_requires_company_scope(self):
        other_company = self._create_company_with_product(
            name="Locked Upload House",
            tier=self.pro_tier,
            category_name="Chains",
            product_name="Locked Upload Chain",
            product_public_url="https://example.com/locked-upload-product.jpg",
            company_public_url="https://example.com/locked-upload-company.jpg",
        )
        self.client.force_authenticate(user=self.company_admin)

        response = self.client.post(
            reverse("company_upload_session", args=[other_company.id]),
            {"filename": "not-allowed.png"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_market_feed_returns_row_payload(self):
        self._create_company_with_product(
            name="Metro Diamond Studio",
            tier=self.featured_tier,
            category_name="Diamonds",
            product_name="Etoile Pendant",
            product_public_url="https://example.com/diamond.jpg",
            company_public_url="https://example.com/metro-hero.jpg",
        )
        self._create_company_with_product(
            name="Coastal Bullion Works",
            tier=self.pro_tier,
            category_name="Chains",
            product_name="Singapore Twist Chain",
            product_public_url="https://example.com/chain.jpg",
            company_public_url="https://example.com/coastal-hero.jpg",
            admin_priority=70,
        )
        self._create_company_with_product(
            name="Auric Ring Atelier",
            tier=self.pro_tier,
            category_name="Rings",
            product_name="Solitaire Stack Ring",
            product_public_url="https://example.com/stack-ring.jpg",
            company_public_url="https://example.com/auric-hero.jpg",
            admin_priority=65,
        )
        self._create_company_with_product(
            name="Kaveri Ornament Hub",
            tier=self.normal_tier,
            category_name="Bangles",
            product_name="Antiquity Bangles",
            product_public_url="https://example.com/bangle.jpg",
            company_public_url="https://example.com/kaveri-hero.jpg",
        )
        hidden_company = self._create_company_with_product(
            name="Inactive House",
            tier=self.featured_tier,
            category_name="Coins",
            product_name="Hidden Coin",
            product_public_url="https://example.com/hidden.jpg",
            company_public_url="https://example.com/hidden-hero.jpg",
            is_active=False,
        )
        hidden_company.products.update(is_active=False)

        response = self.client.get(reverse("market_feed"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        rows = response.data["rows"]
        self.assertEqual([row["title"] for row in rows], ["Premium Companies", "Pro Companies", "Normal Companies"])
        self.assertEqual([row["layout"] for row in rows], ["hero_company", "rail_company", "grid_company"])
        self.assertEqual(rows[0]["items"][0]["hero_image_url"], "https://example.com/company-hero.jpg")
        self.assertEqual(rows[0]["items"][0]["logo_image_url"], "https://example.com/company-logo.jpg")
        self.assertEqual(rows[1]["items"][0]["name"], "Coastal Bullion Works")
        self.assertTrue(rows[1]["items"][0]["is_verified"])
        self.assertEqual(rows[2]["items"][0]["tier_visibility_type"], CompanyTier.VisibilityType.NORMAL)
        self.assertNotIn("Inactive House", [item["name"] for item in rows[0]["items"]])

    def test_market_feed_omits_disabled_and_empty_rows(self):
        self._create_company_with_product(
            name="Coastal Bullion Works",
            tier=self.pro_tier,
            category_name="Chains",
            product_name="Singapore Twist Chain",
            product_public_url="https://example.com/chain.jpg",
            company_public_url="https://example.com/coastal-hero.jpg",
            admin_priority=70,
        )
        featured_row = MarketRow.objects.get(target_visibility_type=CompanyTier.VisibilityType.FEATURED)
        featured_row.is_enabled = False
        featured_row.save(update_fields=["is_enabled"])
        Company.objects.filter(tier_ref=self.normal_tier).update(is_active=False)

        response = self.client.get(reverse("market_feed"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual([row["title"] for row in response.data["rows"]], ["Pro Companies"])

    @override_settings(DIRECTORY_MARKET_ZONE_FEED_ENABLED=True)
    def test_market_feed_returns_zone_payload_when_zone_feed_enabled(self):
        self._create_company_with_product(
            name="Coastal Bullion Works",
            tier=self.pro_tier,
            category_name="Chains",
            product_name="Singapore Twist Chain",
            product_public_url="https://example.com/chain.jpg",
            company_public_url="https://example.com/coastal-hero.jpg",
            admin_priority=70,
        )
        self._create_company_with_product(
            name="Kaveri Ornament Hub",
            tier=self.normal_tier,
            category_name="Bangles",
            product_name="Antiquity Bangles",
            product_public_url="https://example.com/bangle.jpg",
            company_public_url="https://example.com/kaveri-hero.jpg",
        )

        response = self.client.get(reverse("market_feed"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        rows = response.data["rows"]
        self.assertEqual([row["title"] for row in rows], ["Hero Spotlight", "Featured Companies", "Rising Companies"])
        self.assertEqual(rows[0]["zone_key"], "hero_spotlight")
        self.assertEqual(rows[0]["serving_mode"], "scheduled_hero")
        self.assertEqual(rows[1]["zone_key"], "featured_companies")
        self.assertTrue(all(row["zone_key"] != "latest_products" for row in rows))

    @override_settings(DIRECTORY_MARKET_ZONE_FEED_ENABLED=True, DIRECTORY_MARKET_MIXED_FEED_ENABLED=True)
    def test_market_feed_returns_mixed_payload_when_mixed_feed_enabled(self):
        self._configure_zone(
            "latest_products",
            serving_mode=MarketZone.ServingMode.LATEST_PRODUCTS,
            layout=MarketZone.Layout.GRID_PRODUCT,
            capacity=2,
        )
        newest_visible_company = self._create_company_with_product(
            name="Temple Ring House",
            tier=self.pro_tier,
            category_name="Rings",
            product_name="Temple Ring",
            product_public_url="https://example.com/temple-ring.jpg",
            company_public_url="https://example.com/temple-ring-house.jpg",
            admin_priority=70,
        )
        hidden_company = self._create_company_with_product(
            name="Hidden Chain House",
            tier=self.normal_tier,
            category_name="Chains",
            product_name="Hidden Chain",
            product_public_url="https://example.com/hidden-chain.jpg",
            company_public_url="https://example.com/hidden-chain-house.jpg",
        )
        hidden_company.is_market_visible = False
        hidden_company.save(update_fields=["is_market_visible"])
        self._create_company_with_product(
            name="Royal Twist House",
            tier=self.pro_tier,
            category_name="Chains",
            product_name="Royal Twist Chain",
            product_public_url="https://example.com/royal-twist-chain.jpg",
            company_public_url="https://example.com/royal-twist-house.jpg",
            admin_priority=60,
        )

        response = self.client.get(reverse("market_feed"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        rows = response.data["rows"]
        self.assertEqual(
            [row["title"] for row in rows],
            ["Hero Spotlight", "Featured Companies", "Browse Categories", "Rising Companies", "Latest Products"],
        )
        self.assertEqual(
            [row["row_type"] for row in rows],
            ["company_tier", "company_tier", "category_collection", "company_tier", "product_collection"],
        )
        category_row = rows[2]
        self.assertIsNone(category_row["zone_key"])
        self.assertIsNone(category_row["serving_mode"])
        self.assertEqual([item["name"] for item in category_row["items"]], ["Rings", "Chains"])

        latest_products_row = rows[4]
        self.assertEqual(latest_products_row["zone_key"], "latest_products")
        self.assertEqual(latest_products_row["serving_mode"], "latest_products")
        self.assertEqual(latest_products_row["layout"], "grid_product")
        self.assertEqual(
            [item["title"] for item in latest_products_row["items"]],
            ["Royal Twist Chain", "Temple Ring"],
        )
        self.assertNotIn("Hidden Chain", [item["title"] for item in latest_products_row["items"]])
        self.assertEqual(latest_products_row["items"][0]["company_name"], "Royal Twist House")
        self.assertEqual(latest_products_row["items"][1]["company_id"], newest_visible_company.id)

    @override_settings(DIRECTORY_MARKET_ZONE_FEED_ENABLED=True, DIRECTORY_MARKET_MIXED_FEED_ENABLED=True)
    def test_market_feed_falls_back_to_zone_payload_when_mixed_feed_errors(self):
        self._create_company_with_product(
            name="Coastal Bullion Works",
            tier=self.pro_tier,
            category_name="Chains",
            product_name="Singapore Twist Chain",
            product_public_url="https://example.com/chain.jpg",
            company_public_url="https://example.com/coastal-hero.jpg",
            admin_priority=70,
        )

        with patch("apps.directory.views.build_mixed_market_feed_payload", side_effect=RuntimeError("mixed feed failed")):
            response = self.client.get(reverse("market_feed"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual([row["title"] for row in response.data["rows"]], ["Hero Spotlight", "Featured Companies", "Rising Companies"])
        self.assertTrue(all(row["row_type"] == "company_tier" for row in response.data["rows"]))

    @override_settings(DIRECTORY_MARKET_ZONE_FEED_ENABLED=True, DIRECTORY_MARKET_MIXED_FEED_ENABLED=True)
    def test_market_feed_omits_empty_category_and_product_rows_in_mixed_feed(self):
        self._configure_zone(
            "latest_products",
            serving_mode=MarketZone.ServingMode.LATEST_PRODUCTS,
            layout=MarketZone.Layout.GRID_PRODUCT,
            capacity=2,
        )
        ProductCategory.objects.update(is_active=False)
        Product.objects.update(is_active=False)

        response = self.client.get(reverse("market_feed"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual([row["title"] for row in response.data["rows"]], ["Hero Spotlight", "Featured Companies", "Rising Companies"])
        self.assertTrue(all(row["row_type"] == "company_tier" for row in response.data["rows"]))

    @override_settings(DIRECTORY_MARKET_ZONE_FEED_ENABLED=True)
    def test_market_feed_falls_back_to_legacy_when_zone_service_errors(self):
        self._create_company_with_product(
            name="Coastal Bullion Works",
            tier=self.pro_tier,
            category_name="Chains",
            product_name="Singapore Twist Chain",
            product_public_url="https://example.com/chain.jpg",
            company_public_url="https://example.com/coastal-hero.jpg",
            admin_priority=70,
        )
        self._create_company_with_product(
            name="Kaveri Ornament Hub",
            tier=self.normal_tier,
            category_name="Bangles",
            product_name="Antiquity Bangles",
            product_public_url="https://example.com/bangle.jpg",
            company_public_url="https://example.com/kaveri-hero.jpg",
        )

        with patch("apps.directory.views.build_market_zone_feed", side_effect=RuntimeError("zone feed failed")):
            response = self.client.get(reverse("market_feed"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual([row["title"] for row in response.data["rows"]], ["Premium Companies", "Pro Companies", "Normal Companies"])

    @override_settings(DIRECTORY_MARKET_ZONE_FEED_ENABLED=True)
    def test_market_feed_uses_wildcard_hero_slot_on_every_fifth_slot(self):
        self._create_company_with_product(
            name="Wildcard House",
            tier=self.normal_tier,
            category_name="Chains",
            product_name="Wildcard Chain",
            product_public_url="https://example.com/wildcard-chain.jpg",
            company_public_url="https://example.com/wildcard-hero.jpg",
            admin_priority=25,
        )

        with patch("apps.directory.services.timezone.now", return_value=datetime(1970, 1, 1, 0, 0, tzinfo=dt_timezone.utc)):
            normal_response = self.client.get(reverse("market_feed"))

        with patch("apps.directory.services.timezone.now", return_value=datetime(1970, 1, 2, 0, 0, tzinfo=dt_timezone.utc)):
            wildcard_response = self.client.get(reverse("market_feed"))

        self.assertEqual(normal_response.data["rows"][0]["items"][0]["name"], "Heritage Gold House")
        self.assertEqual(wildcard_response.data["rows"][0]["items"][0]["name"], "Wildcard House")

    @override_settings(DIRECTORY_MARKET_ZONE_FEED_ENABLED=True)
    def test_market_feed_respects_hero_cooldown_when_alternative_exists(self):
        second_featured = self._create_company_with_product(
            name="Second Featured",
            tier=self.featured_tier,
            category_name="Rings",
            product_name="Second Ring",
            product_public_url="https://example.com/second-ring.jpg",
            company_public_url="https://example.com/second-hero.jpg",
            admin_priority=10,
        )
        current_time = datetime(2026, 5, 1, 12, 0, tzinfo=dt_timezone.utc)
        self.company.last_featured_at = current_time - timedelta(hours=1)
        self.company.save(update_fields=["last_featured_at"])

        with patch("apps.directory.services.timezone.now", return_value=current_time):
            response = self.client.get(reverse("market_feed"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["rows"][0]["items"][0]["name"], second_featured.name)

    @override_settings(DIRECTORY_MARKET_ZONE_FEED_ENABLED=True)
    def test_market_feed_weighted_zone_applies_pin_boost_and_block_overrides(self):
        featured_zone = self._configure_zone("featured_companies", capacity=4)
        pinned_company = self._create_company_with_product(
            name="Pinned Company",
            tier=self.normal_tier,
            category_name="Bangles",
            product_name="Pinned Bangle",
            product_public_url="https://example.com/pinned-bangle.jpg",
            company_public_url="https://example.com/pinned-hero.jpg",
        )
        boosted_company = self._create_company_with_product(
            name="Boosted Company",
            tier=self.pro_tier,
            category_name="Chains",
            product_name="Boosted Chain",
            product_public_url="https://example.com/boosted-chain.jpg",
            company_public_url="https://example.com/boosted-hero.jpg",
        )
        blocked_company = self._create_company_with_product(
            name="Blocked Company",
            tier=self.featured_tier,
            category_name="Rings",
            product_name="Blocked Ring",
            product_public_url="https://example.com/blocked-ring.jpg",
            company_public_url="https://example.com/blocked-hero.jpg",
        )
        current_time = datetime(2026, 5, 1, 12, 0, tzinfo=dt_timezone.utc)
        self._create_override(company=pinned_company, zone=featured_zone, action=PlacementOverride.Action.PIN, priority=100)
        self._create_override(company=boosted_company, zone=featured_zone, action=PlacementOverride.Action.BOOST, priority=90)
        self._create_override(company=blocked_company, zone=featured_zone, action=PlacementOverride.Action.BLOCK, priority=80)

        with patch("apps.directory.services.timezone.now", return_value=current_time):
            response = self.client.get(reverse("market_feed"))

        featured_row = next(row for row in response.data["rows"] if row["zone_key"] == "featured_companies")
        names = [item["name"] for item in featured_row["items"]]
        self.assertEqual(names[0], pinned_company.name)
        self.assertEqual(names[1], boosted_company.name)
        self.assertNotIn(blocked_company.name, names)

    @override_settings(DIRECTORY_MARKET_ZONE_FEED_ENABLED=True, DIRECTORY_MARKET_FAIRNESS_ENABLED=True, DIRECTORY_MARKET_FAIRNESS_WINDOW_DAYS=7)
    def test_market_feed_weighted_zone_promotes_under_served_company_when_fairness_enabled(self):
        featured_zone = self._configure_zone("featured_companies", capacity=5)
        balanced_featured = self._create_company_with_product(
            name="Balanced Featured",
            tier=self.featured_tier,
            category_name="Rings",
            product_name="Balanced Ring",
            product_public_url="https://example.com/balanced-ring.jpg",
            company_public_url="https://example.com/balanced-company.jpg",
            admin_priority=5,
        )
        under_served_pro = self._create_company_with_product(
            name="Under Served Pro",
            tier=self.pro_tier,
            category_name="Chains",
            product_name="Under Served Chain",
            product_public_url="https://example.com/under-served-chain.jpg",
            company_public_url="https://example.com/under-served-company.jpg",
            admin_priority=5,
        )
        over_served_pro = self._create_company_with_product(
            name="Over Served Pro",
            tier=self.pro_tier,
            category_name="Chains",
            product_name="Over Served Chain",
            product_public_url="https://example.com/over-served-chain.jpg",
            company_public_url="https://example.com/over-served-company.jpg",
            admin_priority=80,
        )
        current_time = datetime(2026, 5, 1, 12, 0, tzinfo=dt_timezone.utc)
        for _ in range(8):
            ExposureLedger.objects.create(
                company=over_served_pro,
                tier=over_served_pro.tier_ref,
                zone=featured_zone,
                event_type=ExposureLedger.EventType.SERVED,
                served_at=current_time - timedelta(days=1),
                metadata={"source": "test", "selection_reason": "weight"},
            )
        for _ in range(2):
            ExposureLedger.objects.create(
                company=balanced_featured,
                tier=balanced_featured.tier_ref,
                zone=featured_zone,
                event_type=ExposureLedger.EventType.SERVED,
                served_at=current_time - timedelta(days=2),
                metadata={"source": "test", "selection_reason": "weight"},
            )

        with patch("apps.directory.services.timezone.now", return_value=current_time):
            response = self.client.get(reverse("market_feed"))

        featured_row = next(row for row in response.data["rows"] if row["zone_key"] == "featured_companies")
        names = [item["name"] for item in featured_row["items"]]
        self.assertIn(under_served_pro.name, names)
        self.assertIn(over_served_pro.name, names)
        self.assertLess(names.index(under_served_pro.name), names.index(over_served_pro.name))

    @override_settings(DIRECTORY_MARKET_ZONE_FEED_ENABLED=True, DIRECTORY_MARKET_FAIRNESS_ENABLED=True, DIRECTORY_MARKET_FAIRNESS_WINDOW_DAYS=7)
    def test_market_feed_weighted_zone_override_precedence_beats_fairness(self):
        featured_zone = self._configure_zone("featured_companies", capacity=3)
        fairness_candidate = self._create_company_with_product(
            name="Fairness Candidate",
            tier=self.pro_tier,
            category_name="Chains",
            product_name="Fairness Chain",
            product_public_url="https://example.com/fairness-chain.jpg",
            company_public_url="https://example.com/fairness-company.jpg",
        )
        boosted_company = self._create_company_with_product(
            name="Boosted Ahead",
            tier=self.normal_tier,
            category_name="Bangles",
            product_name="Boosted Bangle",
            product_public_url="https://example.com/boosted-bangle.jpg",
            company_public_url="https://example.com/boosted-bangle-company.jpg",
        )
        pinned_company = self._create_company_with_product(
            name="Pinned Ahead",
            tier=self.normal_tier,
            category_name="Coins",
            product_name="Pinned Coin",
            product_public_url="https://example.com/pinned-coin.jpg",
            company_public_url="https://example.com/pinned-coin-company.jpg",
        )
        blocked_company = self._create_company_with_product(
            name="Blocked Even If Fair",
            tier=self.pro_tier,
            category_name="Chains",
            product_name="Blocked Fair Chain",
            product_public_url="https://example.com/blocked-fair-chain.jpg",
            company_public_url="https://example.com/blocked-fair-company.jpg",
        )
        current_time = datetime(2026, 5, 1, 12, 0, tzinfo=dt_timezone.utc)
        for _ in range(6):
            ExposureLedger.objects.create(
                company=self.company,
                tier=self.company.tier_ref,
                zone=featured_zone,
                event_type=ExposureLedger.EventType.SERVED,
                served_at=current_time - timedelta(days=1),
                metadata={"source": "test", "selection_reason": "weight"},
            )
        self._create_override(company=boosted_company, zone=featured_zone, action=PlacementOverride.Action.BOOST, priority=50)
        self._create_override(company=pinned_company, zone=featured_zone, action=PlacementOverride.Action.PIN, priority=60)
        self._create_override(company=blocked_company, zone=featured_zone, action=PlacementOverride.Action.BLOCK, priority=70)

        with patch("apps.directory.services.timezone.now", return_value=current_time):
            response = self.client.get(reverse("market_feed"))

        featured_row = next(row for row in response.data["rows"] if row["zone_key"] == "featured_companies")
        names = [item["name"] for item in featured_row["items"]]
        self.assertEqual(names[0], pinned_company.name)
        self.assertEqual(names[1], boosted_company.name)
        self.assertIn(fairness_candidate.name, names)
        self.assertNotIn(blocked_company.name, names)

    @override_settings(DIRECTORY_MARKET_ZONE_FEED_ENABLED=True)
    def test_market_feed_logs_exposure_and_updates_last_featured_at_for_live_zone_feed(self):
        self._create_company_with_product(
            name="Coastal Bullion Works",
            tier=self.pro_tier,
            category_name="Chains",
            product_name="Singapore Twist Chain",
            product_public_url="https://example.com/chain.jpg",
            company_public_url="https://example.com/coastal-hero.jpg",
            admin_priority=70,
        )
        current_time = datetime(1970, 1, 1, 0, 0, tzinfo=dt_timezone.utc)

        with patch("apps.directory.services.timezone.now", return_value=current_time):
            response = self.client.get(reverse("market_feed"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.company.refresh_from_db()
        self.assertEqual(self.company.last_featured_at, current_time)
        served_item_count = sum(len(row["items"]) for row in response.data["rows"])
        self.assertEqual(ExposureLedger.objects.count(), served_item_count)
        self.assertTrue(
            ExposureLedger.objects.filter(
                zone__key="hero_spotlight",
                metadata__source="public_market_feed",
            ).exists()
        )
        self.assertTrue(
            ExposureLedger.objects.filter(
                zone__key="featured_companies",
                metadata__selection_reason="weight",
            ).exists()
        )

    def test_product_filter_config_returns_dynamic_market_filters(self):
        response = self.client.get(reverse("product_filter_config"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        categories = {item["slug"]: item for item in response.data["categories"]}
        self.assertIn("chains", categories)
        self.assertEqual(categories["chains"]["subcategories"][0]["slug"], "link-chain")
        self.assertEqual(categories["chains"]["attributes"][0]["key"], "length")
        self.assertIn("22K", response.data["purity_options"])

    def test_product_search_supports_category_purity_and_dynamic_attribute_filters(self):
        rope_subcategory = ProductSubCategory.objects.create(
            category=self.chain_category,
            name="Rope Chain",
            slug="rope-chain",
            display_order=2,
        )
        rope_product = Product.objects.create(
            company=self.company,
            category=self.chain_category,
            subcategory=rope_subcategory,
            name="Pure Rope Chain",
            weight_grams="38.20",
            purity="24K",
            price="3120.00",
            description="Premium rope chain.",
        )
        ProductAttributeValue.objects.create(
            product=rope_product,
            attribute_definition=self.chain_length_attribute,
            value="20 inch",
        )
        self._attach_product_image(rope_product, public_url="https://example.com/pure-rope-chain.jpg")

        response = self.client.get(
            reverse("product_search"),
            {"category": "chains", "purity": "22K", "length": "18 inch"},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["title"], "Curb Link Chain")
        self.assertEqual(response.data["results"][0]["attribute_value"], "18 inch")
        self.assertEqual(response.data["results"][0]["price"], "2840.00")

    def test_product_search_returns_empty_list_for_non_matching_query(self):
        response = self.client.get(reverse("product_search"), {"search": "Rare Pink Argyle Diamond"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 0)
        self.assertEqual(response.data["results"], [])

    def test_product_detail_returns_full_enquiry_payload(self):
        response = self.client.get(reverse("product_detail", args=[self.chain_product.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["name"], "Curb Link Chain")
        self.assertEqual(response.data["weight"], "42.50g")
        self.assertEqual(response.data["length"], "18 inch")
        self.assertEqual(response.data["category"], "Chains")
        self.assertEqual(response.data["subcategory"], "Link Chain")
        self.assertEqual(response.data["availability"], "In Stock")
        self.assertEqual(response.data["price_min"], "2840.00")
        self.assertEqual(response.data["price_max"], "2840.00")
        self.assertEqual(response.data["images"][0]["url"], "https://example.com/curb-link-chain.jpg")
        self.assertEqual(response.data["company"]["name"], "Heritage Gold House")
        self.assertEqual(response.data["company"]["location"], "Thrissur, Kerala")
        self.assertIsNone(response.data["company"]["phone"])
        self.assertFalse(response.data["is_wishlisted"])
        self.assertIn(f"/api/products/{self.chain_product.id}/", response.data["share_url"])

    def test_product_wishlist_toggle_toggles_state_for_authenticated_user(self):
        self.client.force_authenticate(user=self.user)

        create_response = self.client.post(reverse("product_wishlist_toggle", args=[self.chain_product.id]), {}, format="json")

        self.assertEqual(create_response.status_code, status.HTTP_200_OK)
        self.assertTrue(create_response.data["is_wishlisted"])
        self.assertTrue(ProductWishlist.objects.filter(user=self.user, product=self.chain_product).exists())

        detail_response = self.client.get(reverse("product_detail", args=[self.chain_product.id]))
        self.assertEqual(detail_response.status_code, status.HTTP_200_OK)
        self.assertTrue(detail_response.data["is_wishlisted"])

        self.client.force_authenticate(user=self.company_admin)
        other_user_detail = self.client.get(reverse("product_detail", args=[self.chain_product.id]))
        self.assertEqual(other_user_detail.status_code, status.HTTP_200_OK)
        self.assertFalse(other_user_detail.data["is_wishlisted"])

        self.client.force_authenticate(user=self.user)

        remove_response = self.client.post(reverse("product_wishlist_toggle", args=[self.chain_product.id]), {}, format="json")
        self.assertEqual(remove_response.status_code, status.HTTP_200_OK)
        self.assertFalse(remove_response.data["is_wishlisted"])
        self.assertFalse(ProductWishlist.objects.filter(user=self.user, product=self.chain_product).exists())

    def test_product_wishlist_requires_authentication(self):
        response = self.client.post(reverse("product_wishlist_toggle", args=[self.chain_product.id]), {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_enquiry_create_persists_record(self):
        response = self.client.post(
            reverse("enquiry_create"),
            {
                "company": self.company.id,
                "product": self.product.id,
                "requester_name": "Meera",
                "requester_phone": "9000000000",
                "notes": "Need pricing for 25 pieces.",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Enquiry.objects.count(), 1)
        self.assertEqual(Enquiry.objects.get().requester_name, "Meera")

    def test_product_enquiry_create_persists_record(self):
        response = self.client.post(
            reverse("product_enquiry_create", args=[self.chain_product.id]),
            {
                "type": "FINAL_PRICE_REQUEST",
                "message": "Please share the final price and availability.",
                "requester_name": "Riya",
                "requester_phone": "9888888888",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Enquiry.objects.count(), 1)
        enquiry = Enquiry.objects.get()
        self.assertEqual(enquiry.company_id, self.company.id)
        self.assertEqual(enquiry.product_id, self.chain_product.id)
        self.assertEqual(enquiry.requester_name, "Riya")
        self.assertEqual(enquiry.notes, "Please share the final price and availability.")

    def test_company_tier_visibility_type_is_validated(self):
        tier = CompanyTier(
            name="Broken Tier",
            slug="broken-tier",
            description="invalid tier",
            max_products=1,
            min_photos_per_product=1,
            max_photos_per_product=1,
            price="0.00",
            is_free=True,
            is_active=True,
            display_priority=99,
            visibility_type="invalid",
        )

        with self.assertRaises(ValidationError):
            tier.full_clean()

    def test_company_admin_cannot_create_active_product_beyond_tier_limit(self):
        self.client.force_authenticate(user=self.company_admin)
        extra_asset = self._create_media_asset(object_key="products/new/product-two.jpg", public_url="https://example.com/product-two.jpg")

        response = self.client.post(
            reverse("company_product_create", args=[self.company.id]),
            {
                "category": self.product.category_id,
                "name": "Temple Coin",
                "weight_grams": "12.00",
                "purity": "22K",
                "description": "Second active product",
                "is_active": True,
                "image_asset_ids": [extra_asset.id],
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data["is_active"][0],
            "You have reached your product showcase limit for your current tier.",
        )

    def test_company_admin_cannot_activate_product_with_too_few_images(self):
        self.company.tier_ref = self.pro_tier
        self.company.save(update_fields=["tier_ref"])
        self.product.is_active = False
        self.product.save(update_fields=["is_active"])
        self.client.force_authenticate(user=self.company_admin)
        asset = self._create_media_asset(object_key="products/few-images/one.jpg", public_url="https://example.com/few-one.jpg")

        response = self.client.post(
            reverse("company_product_create", args=[self.company.id]),
            {
                "category": self.product.category_id,
                "name": "Lightweight Chain",
                "weight_grams": "8.00",
                "purity": "22K",
                "description": "Needs more images",
                "is_active": True,
                "image_asset_ids": [asset.id],
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data["image_asset_ids"][0],
            "At least 2 product image(s) are required for your current tier.",
        )

    def test_company_admin_cannot_activate_product_with_too_many_images(self):
        self.company.tier_ref = self.normal_tier
        self.company.save(update_fields=["tier_ref"])
        self.product.is_active = False
        self.product.save(update_fields=["is_active"])
        self.chain_product.is_active = False
        self.chain_product.save(update_fields=["is_active"])
        self.client.force_authenticate(user=self.company_admin)
        asset_ids = [
            self._create_media_asset(
                object_key=f"products/many-images/{index}.jpg",
                public_url=f"https://example.com/many-{index}.jpg",
            ).id
            for index in range(1, 4)
        ]

        response = self.client.post(
            reverse("company_product_create", args=[self.company.id]),
            {
                "category": self.product.category_id,
                "name": "Coin Set",
                "weight_grams": "15.00",
                "purity": "24K",
                "description": "Too many photos",
                "is_active": True,
                "image_asset_ids": asset_ids,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data["image_asset_ids"][0],
            "No more than 2 product image(s) are allowed for your current tier.",
        )


class CompanyTierAdminApiTests(APITestCase):
    def setUp(self):
        user_model = get_user_model()
        self.super_admin = user_model.objects.create_user(
            username="tier_super_admin",
            password="DemoPass123!",
            role=user_model.Role.SUPER_ADMIN,
            is_staff=True,
        )
        UserRole.objects.create(
            user=self.super_admin,
            role=UserRole.Role.SUPER_ADMIN,
            scope_type=UserRole.ScopeType.PLATFORM,
            scope_id=None,
        )
        self.user = user_model.objects.create_user(username="tier_media_owner", password="DemoPass123!")
        self.featured_tier = CompanyTier.objects.get(slug="prime-signature")
        self.featured_tier.max_products = 4
        self.featured_tier.min_photos_per_product = 1
        self.featured_tier.max_photos_per_product = 4
        self.featured_tier.max_companies_allowed = 1
        self.featured_tier.display_priority = 10
        self.featured_tier.save(
            update_fields=[
                "max_products",
                "min_photos_per_product",
                "max_photos_per_product",
                "max_companies_allowed",
                "display_priority",
            ]
        )
        self.pro_tier = CompanyTier.objects.get(slug="prime-premier")
        self.pro_tier.max_products = 3
        self.pro_tier.min_photos_per_product = 1
        self.pro_tier.max_photos_per_product = 3
        self.pro_tier.display_priority = 20
        self.pro_tier.save(
            update_fields=[
                "max_products",
                "min_photos_per_product",
                "max_photos_per_product",
                "display_priority",
            ]
        )
        self.normal_tier = CompanyTier.objects.get(slug="prime-circle")
        self.normal_tier.max_products = 1
        self.normal_tier.min_photos_per_product = 1
        self.normal_tier.max_photos_per_product = 2
        self.normal_tier.display_priority = 30
        self.normal_tier.save(
            update_fields=[
                "max_products",
                "min_photos_per_product",
                "max_photos_per_product",
                "display_priority",
            ]
        )
        self.hero_zone = MarketZone.objects.get(key="hero_spotlight")
        self.featured_zone = MarketZone.objects.get(key="featured_companies")
        self.rising_zone = MarketZone.objects.get(key="rising_companies")
        self.occupied_featured_company = Company.objects.create(
            name="Occupied Featured",
            category="Retail",
            tier_ref=self.featured_tier,
            city="Kochi",
            state="Kerala",
            about="Occupies the featured slot",
            daily_capacity="5kg",
            specialization="Rings",
            is_active=True,
            is_approved=True,
        )
        CompanyVerification.objects.create(company=self.occupied_featured_company, gst_registered=True, bis_hallmarked=True)
        self.company = Company.objects.create(
            name="Target Company",
            category="Retail",
            tier_ref=self.pro_tier,
            city="Thrissur",
            state="Kerala",
            about="Tier assignment target",
            daily_capacity="4kg",
            specialization="Chains",
            is_active=True,
            is_approved=True,
        )
        CompanyVerification.objects.create(company=self.company, gst_registered=True, bis_hallmarked=True)
        self.category = ProductCategory.objects.create(name="Chains")
        self.product_one = Product.objects.create(
            company=self.company,
            category=self.category,
            name="Chain One",
            weight_grams="10.00",
            purity="22K",
            description="First active product",
            is_active=True,
        )
        self.product_two = Product.objects.create(
            company=self.company,
            category=self.category,
            name="Chain Two",
            weight_grams="12.00",
            purity="22K",
            description="Second active product",
            is_active=True,
        )

    def _create_override(
        self,
        *,
        company: Company,
        zone: MarketZone,
        action: str,
        starts_at: datetime | None = None,
        ends_at: datetime | None = None,
        priority: int = 0,
    ) -> PlacementOverride:
        return PlacementOverride.objects.create(
            company=company,
            zone=zone,
            action=action,
            starts_at=starts_at or datetime(2026, 1, 1, tzinfo=dt_timezone.utc),
            ends_at=ends_at or datetime(2026, 12, 31, tzinfo=dt_timezone.utc),
            priority=priority,
            notes="test override",
            is_active=True,
        )

    def test_super_admin_can_create_and_toggle_tier(self):
        self.client.force_authenticate(user=self.super_admin)

        create_response = self.client.post(
            reverse("admin_directory_tier_list_create"),
            {
                "name": "Prime Spotlight",
                "slug": "prime-spotlight",
                "description": "Special campaign tier",
                "max_products": 6,
                "min_photos_per_product": 1,
                "max_photos_per_product": 6,
                "max_companies_allowed": 3,
                "price": "30000.00",
                "is_free": False,
                "is_active": True,
                "base_weight": 14,
                "hero_eligible": True,
                "premium_floor_share": "22.50",
                "cooldown_hours": 48,
                "display_priority": 5,
                "visibility_type": CompanyTier.VisibilityType.FEATURED,
            },
            format="json",
        )

        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(create_response.data["base_weight"], 14)
        self.assertTrue(create_response.data["hero_eligible"])
        self.assertEqual(create_response.data["premium_floor_share"], "22.50")
        self.assertEqual(create_response.data["cooldown_hours"], 48)
        created_tier_id = create_response.data["id"]

        deactivate_response = self.client.post(reverse("admin_directory_tier_toggle", args=[created_tier_id, "deactivate"]))
        self.assertEqual(deactivate_response.status_code, status.HTTP_200_OK)
        self.assertFalse(deactivate_response.data["is_active"])

    def test_super_admin_can_reorder_market_rows(self):
        self.client.force_authenticate(user=self.super_admin)
        row = MarketRow.objects.get(target_visibility_type=CompanyTier.VisibilityType.PRO)

        response = self.client.patch(
            reverse("admin_market_row_detail", args=[row.id]),
            {"title": "Featured Pro Houses", "sort_order": 5, "layout": "grid_company"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        row.refresh_from_db()
        self.assertEqual(row.title, "Featured Pro Houses")
        self.assertEqual(row.sort_order, 5)
        self.assertEqual(row.layout, "grid_company")

    def test_tier_slot_limit_rejects_overflow_assignment(self):
        self.client.force_authenticate(user=self.super_admin)

        response = self.client.patch(
            reverse("admin_directory_company_tier_assign", args=[self.company.id]),
            {"tier_id": self.featured_tier.id},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["tier_id"][0], "This tier has reached its company slot limit.")

    def test_tier_downgrade_requires_confirmation_and_deactivates_overflow_products(self):
        self.client.force_authenticate(user=self.super_admin)

        warning_response = self.client.patch(
            reverse("admin_directory_company_tier_assign", args=[self.company.id]),
            {"tier_id": self.normal_tier.id},
            format="json",
        )

        self.assertEqual(warning_response.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(warning_response.data["allowed_active_products"], 1)
        overflow_ids = warning_response.data["overflow_product_ids"]
        self.assertEqual(len(overflow_ids), 1)

        confirm_response = self.client.post(
            reverse("admin_directory_company_tier_confirm", args=[self.company.id]),
            {"tier_id": self.normal_tier.id, "retain_active_product_ids": [self.product_two.id]},
            format="json",
        )

        self.assertEqual(confirm_response.status_code, status.HTTP_200_OK)
        self.company.refresh_from_db()
        self.product_one.refresh_from_db()
        self.product_two.refresh_from_db()
        self.assertEqual(self.company.tier_ref_id, self.normal_tier.id)
        self.assertFalse(self.product_one.is_active)
        self.assertTrue(self.product_two.is_active)

    def test_super_admin_can_manage_market_zones_and_rules(self):
        self.client.force_authenticate(user=self.super_admin)

        list_response = self.client.get(reverse("admin_market_zone_list_create"))
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(list_response.data), 4)

        create_response = self.client.post(
            reverse("admin_market_zone_list_create"),
            {
                "key": "seasonal_spotlight",
                "title": "Seasonal Spotlight",
                "description": "Temporary seasonal company rail",
                "layout": "rail_company",
                "capacity": 3,
                "sort_order": 45,
                "is_enabled": True,
                "serving_mode": "weighted_companies",
                "slot_interval_hours": 0,
                "cooldown_override_hours": 12,
            },
            format="json",
        )
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)

        patch_response = self.client.patch(
            reverse("admin_market_zone_detail", args=[self.hero_zone.id]),
            {"title": "Hero Control", "slot_interval_hours": 12},
            format="json",
        )
        self.assertEqual(patch_response.status_code, status.HTTP_200_OK)
        self.assertEqual(patch_response.data["title"], "Hero Control")
        self.assertEqual(patch_response.data["slot_interval_hours"], 12)

        rules_response = self.client.get(reverse("admin_market_zone_eligibility_rules", args=[self.hero_zone.id]))
        self.assertEqual(rules_response.status_code, status.HTTP_200_OK)
        first_rule_id = rules_response.data[0]["id"]

        update_rules_response = self.client.patch(
            reverse("admin_market_zone_eligibility_rules", args=[self.hero_zone.id]),
            {"rules": [{"id": first_rule_id, "weight_multiplier": "2.50", "is_wildcard": True}]},
            format="json",
        )
        self.assertEqual(update_rules_response.status_code, status.HTTP_200_OK)
        updated_rule = ZoneEligibilityRule.objects.get(id=first_rule_id)
        self.assertEqual(str(updated_rule.weight_multiplier), "2.50")
        self.assertTrue(updated_rule.is_wildcard)

    def test_super_admin_can_manage_placement_overrides(self):
        self.client.force_authenticate(user=self.super_admin)

        create_response = self.client.post(
            reverse("admin_placement_override_list_create"),
            {
                "company_id": self.company.id,
                "zone_id": self.featured_zone.id,
                "action": PlacementOverride.Action.PIN,
                "starts_at": "2026-05-01T00:00:00Z",
                "ends_at": "2026-05-02T00:00:00Z",
                "priority": 120,
                "notes": "Festival boost",
                "is_active": True,
            },
            format="json",
        )
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        override_id = create_response.data["id"]

        list_response = self.client.get(reverse("admin_placement_override_list_create"))
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertTrue(any(item["id"] == override_id for item in list_response.data))

        patch_response = self.client.patch(
            reverse("admin_placement_override_detail", args=[override_id]),
            {"priority": 140, "notes": "Festival hero pin"},
            format="json",
        )
        self.assertEqual(patch_response.status_code, status.HTTP_200_OK)
        self.assertEqual(patch_response.data["priority"], 140)
        self.assertEqual(patch_response.data["notes"], "Festival hero pin")

    @override_settings(DIRECTORY_MARKET_ZONE_FEED_ENABLED=True)
    def test_super_admin_can_update_company_market_visibility(self):
        self.client.force_authenticate(user=self.super_admin)
        visible_company = Company.objects.create(
            name="Visible Featured",
            category="Retail",
            tier_ref=self.featured_tier,
            city="Kochi",
            state="Kerala",
            about="Visible company",
            daily_capacity="4kg",
            specialization="Rings",
            is_active=True,
            is_approved=True,
        )
        CompanyVerification.objects.create(company=visible_company, gst_registered=True, bis_hallmarked=True)

        patch_response = self.client.patch(
            reverse("admin_directory_company_market_visibility", args=[self.occupied_featured_company.id]),
            {"is_market_visible": False, "admin_priority": 0},
            format="json",
        )
        self.assertEqual(patch_response.status_code, status.HTTP_200_OK)

        response = self.client.get(reverse("market_feed"))
        visible_names = [item["name"] for row in response.data["rows"] for item in row["items"]]
        self.assertNotIn(self.occupied_featured_company.name, visible_names)
        self.assertIn(visible_company.name, visible_names)

    def test_market_preview_returns_lineup_without_side_effects(self):
        self.client.force_authenticate(user=self.super_admin)
        self._create_override(
            company=self.occupied_featured_company,
            zone=self.featured_zone,
            action=PlacementOverride.Action.PIN,
            priority=100,
        )

        response = self.client.get(reverse("admin_market_preview"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreater(response.data["candidate_count"], 0)
        self.assertGreaterEqual(response.data["applied_override_count"], 1)
        self.assertFalse(response.data["fallback_used"])
        self.assertEqual(ExposureLedger.objects.count(), 0)
        self.occupied_featured_company.refresh_from_db()
        self.assertIsNone(self.occupied_featured_company.last_featured_at)

    @override_settings(DIRECTORY_MARKET_FAIRNESS_ENABLED=True)
    def test_market_preview_can_include_hero_schedule_without_side_effects(self):
        self.client.force_authenticate(user=self.super_admin)
        current_time = datetime(2026, 5, 1, 12, 0, tzinfo=dt_timezone.utc)

        with patch("apps.directory.services.timezone.now", return_value=current_time):
            response = self.client.get(reverse("admin_market_preview"), {"hero_days": 2})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreater(len(response.data["hero_schedule"]), 0)
        first_entry = response.data["hero_schedule"][0]
        self.assertIn("slot_key", first_entry)
        self.assertIn("wildcard_slot", first_entry)
        self.assertEqual(ExposureLedger.objects.count(), 0)
        self.occupied_featured_company.refresh_from_db()
        self.assertIsNone(self.occupied_featured_company.last_featured_at)

    @override_settings(DIRECTORY_MARKET_FAIRNESS_ENABLED=True, DIRECTORY_MARKET_FAIRNESS_WINDOW_DAYS=7)
    def test_market_report_summary_returns_zone_tier_and_selection_reason_totals(self):
        self.client.force_authenticate(user=self.super_admin)
        current_time = datetime(2026, 5, 1, 12, 0, tzinfo=dt_timezone.utc)
        ExposureLedger.objects.create(
            company=self.occupied_featured_company,
            tier=self.featured_tier,
            zone=self.hero_zone,
            event_type=ExposureLedger.EventType.SERVED,
            served_at=current_time - timedelta(days=1),
            metadata={"source": "public_market_feed", "selection_reason": "pin"},
        )
        ExposureLedger.objects.create(
            company=self.company,
            tier=self.pro_tier,
            zone=self.featured_zone,
            event_type=ExposureLedger.EventType.SERVED,
            served_at=current_time - timedelta(days=1),
            metadata={"source": "public_market_feed", "selection_reason": "fairness"},
        )

        with patch("apps.directory.services.timezone.now", return_value=current_time):
            response = self.client.get(reverse("admin_market_report_summary"), {"days": 7})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["days"], 7)
        zone_lookup = {item["zone_key"]: item for item in response.data["zones"]}
        self.assertEqual(zone_lookup["hero_spotlight"]["selection_reasons"]["pin"], 1)
        self.assertEqual(zone_lookup["featured_companies"]["selection_reasons"]["fairness"], 1)
        tier_lookup = {item["tier_slug"]: item for item in response.data["tiers"]}
        self.assertEqual(tier_lookup["prime-signature"]["total_serves"], 1)
        self.assertEqual(tier_lookup["prime-premier"]["total_serves"], 1)

    @override_settings(DIRECTORY_MARKET_FAIRNESS_ENABLED=True, DIRECTORY_MARKET_FAIRNESS_WINDOW_DAYS=7)
    def test_market_under_served_report_returns_positive_deficits_only(self):
        self.client.force_authenticate(user=self.super_admin)
        current_time = datetime(2026, 5, 1, 12, 0, tzinfo=dt_timezone.utc)
        under_served_company = Company.objects.create(
            name="Under Served Admin View",
            category="Retail",
            tier_ref=self.pro_tier,
            city="Kollam",
            state="Kerala",
            about="Needs exposure",
            daily_capacity="2kg",
            specialization="Chains",
            is_active=True,
            is_approved=True,
        )
        CompanyVerification.objects.create(company=under_served_company, gst_registered=True, bis_hallmarked=True)
        for _ in range(8):
            ExposureLedger.objects.create(
                company=self.company,
                tier=self.pro_tier,
                zone=self.featured_zone,
                event_type=ExposureLedger.EventType.SERVED,
                served_at=current_time - timedelta(days=1),
                metadata={"source": "public_market_feed", "selection_reason": "weight"},
            )

        with patch("apps.directory.services.timezone.now", return_value=current_time):
            response = self.client.get(reverse("admin_market_report_under_served"), {"days": 7})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["fairness_enabled"])
        results = response.data["results"]
        self.assertTrue(any(item["company_name"] == under_served_company.name for item in results))
        self.assertTrue(all(item["deficit"] != "0.00" for item in results))
