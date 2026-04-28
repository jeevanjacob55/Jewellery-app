from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Company, CompanyImage, CompanyVerification, Enquiry, MediaAsset, Product, ProductCategory, ProductImage


class DirectoryApiTests(APITestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(username="media_owner", password="DemoPass123!")
        self.company = Company.objects.create(
            name="Heritage Gold House",
            category="Wholesale",
            tier=Company.Tier.PREMIUM,
            city="Thrissur",
            state="Kerala",
            about="High-volume manufacturing and wholesale supply.",
            daily_capacity="15kg",
            specialization="Temple jewellery",
        )
        CompanyVerification.objects.create(
            company=self.company,
            gst_registered=True,
            bis_hallmarked=True,
            export_licensed=False,
        )
        category = ProductCategory.objects.create(name="Rings")
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
        tier: str,
        category_name: str,
        product_name: str,
        product_public_url: str,
        company_public_url: str,
    ) -> Company:
        company = Company.objects.create(
            name=name,
            category="Retail",
            tier=tier,
            city="Kochi",
            state="Kerala",
            about=f"{name} profile",
            daily_capacity="5kg",
            specialization=category_name,
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
        self.assertEqual(response.data[0]["products"][0]["name"], "Lakshmi Kasu Mala")
        self.assertEqual(response.data[0]["hero_image_url"], "https://example.com/company-hero.jpg")
        self.assertEqual(response.data[0]["logo_image_url"], "https://example.com/company-logo.jpg")
        self.assertEqual(response.data[0]["products"][0]["image_url"], "https://example.com/product.jpg")

    def test_company_detail_returns_company_payload(self):
        response = self.client.get(reverse("company_detail", args=[self.company.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["city"], "Thrissur")
        self.assertEqual(len(response.data["products"]), 1)
        self.assertEqual(response.data["products"][0]["category_name"], "Rings")

    def test_market_feed_returns_sectioned_payload(self):
        self._create_company_with_product(
            name="Metro Diamond Studio",
            tier=Company.Tier.PREMIUM,
            category_name="Diamonds",
            product_name="Etoile Pendant",
            product_public_url="https://example.com/diamond.jpg",
            company_public_url="https://example.com/metro-hero.jpg",
        )
        self._create_company_with_product(
            name="Coastal Bullion Works",
            tier=Company.Tier.PRO,
            category_name="Chains",
            product_name="Singapore Twist Chain",
            product_public_url="https://example.com/chain.jpg",
            company_public_url="https://example.com/coastal-hero.jpg",
        )
        self._create_company_with_product(
            name="Auric Ring Atelier",
            tier=Company.Tier.PRO,
            category_name="Rings",
            product_name="Solitaire Stack Ring",
            product_public_url="https://example.com/stack-ring.jpg",
            company_public_url="https://example.com/auric-hero.jpg",
        )
        self._create_company_with_product(
            name="Kaveri Ornament Hub",
            tier=Company.Tier.NORMAL,
            category_name="Bangles",
            product_name="Antiquity Bangles",
            product_public_url="https://example.com/bangle.jpg",
            company_public_url="https://example.com/kaveri-hero.jpg",
        )

        response = self.client.get(reverse("market_feed"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["featured_partners"]), 2)
        self.assertEqual(len(response.data["pro_companies"]), 2)
        self.assertEqual(len(response.data["normal_companies"]), 1)
        self.assertGreaterEqual(len(response.data["categories"]), 3)
        self.assertEqual(response.data["featured_partners"][0]["hero_image_url"], "https://example.com/company-hero.jpg")
        self.assertEqual(response.data["featured_partners"][0]["logo_image_url"], "https://example.com/company-logo.jpg")
        self.assertTrue(response.data["pro_companies"][0]["is_verified"])
        self.assertIn(response.data["categories"][0]["icon_key"], {"diamond", "rings", "chains", "diamonds", "bangles"})
        latest_product_ids = [item["product_id"] for item in response.data["latest_products"]]
        self.assertEqual(latest_product_ids, sorted(latest_product_ids, reverse=True))
        self.assertTrue(all(item["image_url"] for item in response.data["latest_products"]))

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
