from datetime import timedelta

from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import MemberAccessRequest, MemberProfile, UserRole
from apps.admin_ops.models import AuditLog
from apps.ads.models import AdTargeting, Advertisement
from apps.directory.models import Company, CompanyTier, Product, ProductCategory, ProductSubCategory
from apps.news.models import Meeting, News
from apps.rates.models import AssociationRate
from apps.regions.models import Association, DistrictOperationalUnit, RegionState, Unit


class AdminOverviewTests(APITestCase):
    def setUp(self):
        user_model = get_user_model()
        self.member = user_model.objects.create_user(username="member1", password="StrongPass123!")
        self.admin_user = user_model.objects.create_user(
            username="admin1",
            password="StrongPass123!",
        )
        self.company_admin = user_model.objects.create_user(username="company-admin", password="StrongPass123!")
        self.other_admin = user_model.objects.create_user(username="admin2", password="StrongPass123!")
        self.state = RegionState.objects.create(name="Kerala")
        self.other_state = RegionState.objects.create(name="Tamil Nadu")
        self.association = Association.objects.create(state=self.state, name="KGSMA")
        self.other_association = Association.objects.create(state=self.other_state, name="TNJA")
        self.district = DistrictOperationalUnit.objects.create(association=self.association, name="Ernakulam District Unit")
        self.unit = Unit.objects.create(district_operational_unit=self.district, name="Kadavanthra Unit")
        self.other_district = DistrictOperationalUnit.objects.create(association=self.other_association, name="Chennai District Unit")
        self.other_unit = Unit.objects.create(district_operational_unit=self.other_district, name="T Nagar Unit")
        UserRole.objects.create(
            user=self.admin_user,
            role=UserRole.Role.ASSOCIATION_ADMIN,
            scope_type=UserRole.ScopeType.ASSOCIATION,
            scope_id=self.association.id,
        )
        self.company_role = UserRole.objects.create(
            user=self.company_admin,
            role=UserRole.Role.COMPANY_ADMIN,
            scope_type=UserRole.ScopeType.COMPANY,
            scope_id=1,
        )

        self.tier = CompanyTier.objects.create(
            name="Prime",
            slug="prime",
            description="Prime tier",
            max_products=10,
            min_photos_per_product=1,
            max_photos_per_product=4,
            visibility_type=CompanyTier.VisibilityType.PRO,
        )
        self.category = ProductCategory.objects.create(name="Gold", icon_key="gold")
        self.subcategory = ProductSubCategory.objects.create(category=self.category, name="22K", slug="22k")
        self.company = Company.objects.create(
            name="Heritage Gold House",
            category="Retail",
            tier_ref=self.tier,
            city="Kochi",
            state=self.state.name,
            about="Core company",
            is_active=True,
            is_approved=True,
        )
        self.other_company = Company.objects.create(
            name="Chennai Crown Jewels",
            category="Retail",
            tier_ref=self.tier,
            city="Chennai",
            state=self.other_state.name,
            about="Other company",
            is_active=True,
            is_approved=True,
        )
        self.company_role.scope_id = self.company.id
        self.company_role.save(update_fields=["scope_id"])
        Product.objects.create(
            company=self.company,
            category=self.category,
            subcategory=self.subcategory,
            name="Temple Necklace",
            weight_grams="12.50",
            purity="22K",
            is_active=True,
        )
        Product.objects.create(
            company=self.other_company,
            category=self.category,
            subcategory=self.subcategory,
            name="Chennai Bangle",
            weight_grams="9.10",
            purity="22K",
            is_active=True,
        )
        MemberProfile.objects.create(
            user=self.member,
            company_name=self.company.name,
            state=self.state,
            association=self.association,
            district_operational_unit=self.district,
            unit=self.unit,
        )

        MemberAccessRequest.objects.create(
            full_name="Pending Member",
            phone_number="9999999999",
            email="pending@example.com",
            business_name="Pending Jewels",
            state=self.state,
            association=self.association,
            district_operational_unit=self.district,
            unit=self.unit,
            status=MemberAccessRequest.Status.PENDING,
        )
        MemberAccessRequest.objects.create(
            full_name="Other Pending Member",
            phone_number="8888888888",
            email="other@example.com",
            business_name="Other Pending Jewels",
            state=self.other_state,
            association=self.other_association,
            district_operational_unit=self.other_district,
            unit=self.other_unit,
            status=MemberAccessRequest.Status.PENDING,
        )

        company_pending_news = News.objects.create(
            title="Company news pending review",
            description="Pending",
            created_by=self.member,
            publisher_type=News.PublisherType.COMPANY,
            publisher_id=self.company.id,
            status=News.Status.PENDING_APPROVAL,
        )
        News.objects.create(
            title="Published association notice",
            description="Published",
            created_by=self.admin_user,
            publisher_type=News.PublisherType.ASSOCIATION,
            publisher_id=self.association.id,
            status=News.Status.PUBLISHED,
            published_at=timezone.now() - timedelta(hours=2),
        )
        News.objects.create(
            title="Published other association notice",
            description="Published",
            created_by=self.other_admin,
            publisher_type=News.PublisherType.ASSOCIATION,
            publisher_id=self.other_association.id,
            status=News.Status.PUBLISHED,
            published_at=timezone.now() - timedelta(hours=1),
        )

        submitted_ad = Advertisement.objects.create(
            advertiser=self.member,
            title="Pending association ad",
            status=Advertisement.Status.SUBMITTED,
        )
        AdTargeting.objects.create(
            advertisement=submitted_ad,
            state=self.state,
            association=self.association,
            district_operational_unit=self.district,
            unit=self.unit,
        )
        other_submitted_ad = Advertisement.objects.create(
            advertiser=self.member,
            title="Pending other ad",
            status=Advertisement.Status.SUBMITTED,
        )
        AdTargeting.objects.create(
            advertisement=other_submitted_ad,
            state=self.other_state,
            association=self.other_association,
            district_operational_unit=self.other_district,
            unit=self.other_unit,
        )

        Meeting.objects.create(
            title="Association meeting",
            description="Upcoming",
            created_by=self.admin_user,
            organizer_type=Meeting.OrganizerType.ASSOCIATION,
            organizer_id=self.association.id,
            start_datetime=timezone.now() + timedelta(days=2),
            end_datetime=timezone.now() + timedelta(days=2, hours=2),
            meeting_mode=Meeting.MeetingMode.PHYSICAL,
            status=Meeting.Status.PUBLISHED,
        )
        Meeting.objects.create(
            title="Other association meeting",
            description="Upcoming",
            created_by=self.other_admin,
            organizer_type=Meeting.OrganizerType.ASSOCIATION,
            organizer_id=self.other_association.id,
            start_datetime=timezone.now() + timedelta(days=4),
            end_datetime=timezone.now() + timedelta(days=4, hours=2),
            meeting_mode=Meeting.MeetingMode.PHYSICAL,
            status=Meeting.Status.PUBLISHED,
        )

        AssociationRate.objects.create(
            association=self.association,
            region_label="KGSMA Latest",
            gold_22k="6500.00",
            gold_24k="7050.00",
            silver="91.10",
            effective_at=timezone.now() - timedelta(minutes=20),
        )
        AssociationRate.objects.create(
            association=self.other_association,
            region_label="TNJA Latest",
            gold_22k="6400.00",
            gold_24k="6950.00",
            silver="88.00",
            effective_at=timezone.now() - timedelta(days=3),
        )

        AuditLog.objects.create(
            actor=self.admin_user,
            action="rate_updated",
            entity_type="association_rate",
            entity_id="kgsma-latest",
            metadata={"association": self.association.name, "state": self.state.name},
        )
        AuditLog.objects.create(
            actor=self.other_admin,
            action="ad_approved",
            entity_type="advertisement",
            entity_id="tnja-campaign",
            metadata={"association": self.other_association.name, "state": self.other_state.name},
        )

    def test_admin_overview_blocks_non_admin_users(self):
        self.client.force_authenticate(user=self.member)

        response = self.client.get(reverse("admin_overview"))

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_overview_returns_live_scope_aware_payload_for_association_admin(self):
        self.client.force_authenticate(user=self.admin_user)

        response = self.client.get(reverse("admin_overview"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["scope"]["label"], "KGSMA")
        self.assertEqual(response.data["scope"]["scope_type"], "association")
        self.assertEqual(response.data["kpis"]["pending_approvals"], 3)
        self.assertEqual(response.data["kpis"]["active_companies"], 1)
        self.assertEqual(response.data["kpis"]["active_products"], 1)
        self.assertEqual(response.data["kpis"]["published_news"], 1)
        self.assertEqual(response.data["kpis"]["upcoming_meetings"], 1)
        self.assertEqual(response.data["kpis"]["rate_freshness_label"], "Updated within the hour")
        self.assertEqual(len(response.data["pending_work"]), 3)
        self.assertEqual(response.data["recent_activity"][0]["entity_id"], "kgsma-latest")
        self.assertEqual(response.data["quick_actions"][0]["route"], "/admin/rates")

    def test_admin_overview_rejects_company_admin_dashboard_access(self):
        self.client.force_authenticate(user=self.company_admin)

        response = self.client.get(reverse("admin_overview"))

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_overview_returns_empty_sections_when_no_activity_or_pending_work(self):
        AuditLog.objects.all().delete()
        MemberAccessRequest.objects.all().delete()
        News.objects.filter(status=News.Status.PENDING_APPROVAL).delete()
        Advertisement.objects.filter(status=Advertisement.Status.SUBMITTED).delete()

        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get(reverse("admin_overview"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["pending_work"], [])
        self.assertEqual(response.data["recent_activity"], [])

    def test_association_admin_company_profiles_list_is_scope_aware(self):
        self.client.force_authenticate(user=self.admin_user)

        response = self.client.get(reverse("admin_company_profiles"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["companies"]), 1)
        self.assertEqual(response.data["companies"][0]["name"], "Heritage Gold House")
        self.assertEqual(response.data["companies"][0]["product_count"], 1)

    def test_company_admin_cannot_access_admin_company_profiles_list(self):
        self.client.force_authenticate(user=self.company_admin)

        response = self.client.get(reverse("admin_company_profiles"))

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


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
        UserRole.objects.create(
            user=self.admin_user,
            role=UserRole.Role.ASSOCIATION_ADMIN,
            scope_type=UserRole.ScopeType.ASSOCIATION,
            scope_id=self.kgsma.id,
        )
        UserRole.objects.create(
            user=self.super_admin,
            role=UserRole.Role.SUPER_ADMIN,
            scope_type=UserRole.ScopeType.PLATFORM,
            scope_id=None,
        )

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
