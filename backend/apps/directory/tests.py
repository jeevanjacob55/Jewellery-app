from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Company, CompanyVerification, Enquiry, Product, ProductCategory


class DirectoryApiTests(APITestCase):
    def setUp(self):
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
        category = ProductCategory.objects.create(name="Temple Jewellery")
        self.product = Product.objects.create(
            company=self.company,
            category=category,
            name="Lakshmi Kasu Mala",
            weight_grams="48.50",
            purity="22K",
            description="Hand-finished temple necklace.",
        )

    def test_company_list_returns_nested_products_and_verification(self):
        response = self.client.get(reverse("company_list"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data[0]["name"], "Heritage Gold House")
        self.assertTrue(response.data[0]["verification"]["gst_registered"])
        self.assertEqual(response.data[0]["products"][0]["name"], "Lakshmi Kasu Mala")

    def test_company_detail_returns_company_payload(self):
        response = self.client.get(reverse("company_detail", args=[self.company.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["city"], "Thrissur")
        self.assertEqual(len(response.data["products"]), 1)

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
