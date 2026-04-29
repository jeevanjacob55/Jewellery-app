from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import UserRole

from .models import (
    Company,
    CompanyImage,
    MarketRow,
    CompanyTier,
    CompanyVerification,
    Enquiry,
    MediaAsset,
    Product,
    ProductAttributeDefinition,
    ProductAttributeValue,
    ProductCategory,
    ProductImage,
    ProductSubCategory,
    ProductWishlist,
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
                "display_priority": 5,
                "visibility_type": CompanyTier.VisibilityType.FEATURED,
            },
            format="json",
        )

        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
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
