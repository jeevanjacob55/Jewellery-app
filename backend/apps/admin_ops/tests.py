from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.regions.models import Association, DistrictOperationalUnit, RegionState, Unit


class AdminOverviewTests(APITestCase):
    def setUp(self):
        user_model = get_user_model()
        self.member = user_model.objects.create_user(username="member1", password="StrongPass123!")
        self.admin_user = user_model.objects.create_user(
            username="admin1",
            password="StrongPass123!",
            is_staff=True,
        )

    def test_admin_overview_blocks_non_admin_users(self):
        self.client.force_authenticate(user=self.member)

        response = self.client.get(reverse("admin_overview"))

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_overview_allows_staff_users(self):
        self.client.force_authenticate(user=self.admin_user)

        response = self.client.get(reverse("admin_overview"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("analytics", response.data)
        self.assertIn("system_logs", response.data)


class HierarchyManagementApiTests(APITestCase):
    def setUp(self):
        user_model = get_user_model()
        self.member = user_model.objects.create_user(username="member2", password="StrongPass123!")
        self.admin_user = user_model.objects.create_user(
            username="admin2",
            password="StrongPass123!",
            role=user_model.Role.ADMIN,
            is_staff=True,
        )
        self.super_admin = user_model.objects.create_user(
            username="superadmin1",
            password="StrongPass123!",
            role=user_model.Role.SUPER_ADMIN,
            is_staff=True,
        )

        self.kerala = RegionState.objects.create(name="Kerala")
        self.tamil_nadu = RegionState.objects.create(name="Tamil Nadu")
        self.kgsma = Association.objects.create(state=self.kerala, name="KGSMA")
        self.ernakulam = DistrictOperationalUnit.objects.create(association=self.kgsma, name="Ernakulam District Unit")
        self.kadavanthra = Unit.objects.create(district_operational_unit=self.ernakulam, name="Kadavanthra Unit")

    def test_hierarchy_management_requires_super_admin(self):
        self.client.force_authenticate(user=self.admin_user)

        response = self.client.get(reverse("admin_hierarchy"))

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_super_admin_can_fetch_hierarchy(self):
        self.client.force_authenticate(user=self.super_admin)

        response = self.client.get(reverse("admin_hierarchy"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["states"][0]["name"], "Kerala")
        self.assertEqual(response.data["states"][0]["associations"][0]["name"], "KGSMA")

    def test_super_admin_can_create_association_under_any_state(self):
        self.client.force_authenticate(user=self.super_admin)

        response = self.client.post(
            reverse("admin_association_create"),
            {"state_id": self.tamil_nadu.id, "name": "Chennai Gold Association"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Association.objects.filter(state=self.tamil_nadu, name="Chennai Gold Association").exists())

    def test_association_create_rejects_duplicates(self):
        self.client.force_authenticate(user=self.super_admin)

        response = self.client.post(
            reverse("admin_association_create"),
            {"state_id": self.kerala.id, "name": "kgsma"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_super_admin_can_bulk_create_district_units(self):
        self.client.force_authenticate(user=self.super_admin)

        response = self.client.post(
            reverse("admin_district_unit_bulk_create"),
            {
                "association_id": self.kgsma.id,
                "names": ["Thrissur District Unit", "Kottayam District Unit", "Ernakulam District Unit"],
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["created_count"], 2)
        self.assertEqual(response.data["skipped_existing"], ["Ernakulam District Unit"])
        self.assertTrue(DistrictOperationalUnit.objects.filter(association=self.kgsma, name="Thrissur District Unit").exists())

    def test_bulk_district_unit_create_rejects_duplicate_names_in_request(self):
        self.client.force_authenticate(user=self.super_admin)

        response = self.client.post(
            reverse("admin_district_unit_bulk_create"),
            {
                "association_id": self.kgsma.id,
                "names": ["Thrissur District Unit", "thrissur district unit"],
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_super_admin_can_bulk_create_units(self):
        self.client.force_authenticate(user=self.super_admin)

        response = self.client.post(
            reverse("admin_unit_bulk_create"),
            {
                "district_operational_unit_id": self.ernakulam.id,
                "names": ["Aluva Unit", "Angamaly Unit", "Kadavanthra Unit"],
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["created_count"], 2)
        self.assertEqual(response.data["skipped_existing"], ["Kadavanthra Unit"])
        self.assertTrue(Unit.objects.filter(district_operational_unit=self.ernakulam, name="Aluva Unit").exists())

    def test_member_cannot_create_units(self):
        self.client.force_authenticate(user=self.member)

        response = self.client.post(
            reverse("admin_unit_bulk_create"),
            {
                "district_operational_unit_id": self.ernakulam.id,
                "names": ["MG Road Unit"],
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
