from django.test import override_settings
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.ads.models import Advertisement
from apps.directory.models import Company, CompanyTier
from apps.news.models import News
from apps.regions.models import Association, DistrictOperationalUnit, RegionState, Unit

from .models import AdminScopeAssignment, MemberAccessRequest, MemberProfile, Notification, NotificationPreference, UserNotification, UserRole


class AccountsApiTests(APITestCase):
    def setUp(self):
        self.password = "StrongPass123!"
        self.state = RegionState.objects.create(name="Kerala")
        self.association = Association.objects.create(state=self.state, name="KGSMA")
        self.district_unit = DistrictOperationalUnit.objects.create(association=self.association, name="Ernakulam District Unit")
        self.unit = Unit.objects.create(district_operational_unit=self.district_unit, name="Kadavanthra Unit")
        self.other_state = RegionState.objects.create(name="Tamil Nadu")
        self.other_association = Association.objects.create(state=self.other_state, name="TN Gold Federation")
        self.user = get_user_model().objects.create_user(
            username="member1",
            password=self.password,
            first_name="Asha",
            last_name="Nair",
            email="asha@example.com",
            corporate_email="asha@trade.example",
            jeweller_id="JWL-1001",
            onboarding_completed=True,
        )
        MemberProfile.objects.create(
            user=self.user,
            phone_number="9999999999",
            company_name="Asha Jewels",
            state=self.state,
            association=self.association,
            district_operational_unit=self.district_unit,
            unit=self.unit,
            membership_tier="Platinum",
        )
        NotificationPreference.objects.create(
            user=self.user,
            rate_alerts=True,
            news_alerts=True,
            ad_alerts=False,
            meeting_alerts=True,
            product_alerts=True,
        )
        self.other_user = get_user_model().objects.create_user(
            username="member2",
            password="StrongPass123!",
            first_name="Neha",
        )
        NotificationPreference.objects.create(
            user=self.other_user,
            rate_alerts=False,
            news_alerts=False,
            ad_alerts=True,
            meeting_alerts=False,
            product_alerts=False,
        )
        self.company_tier = CompanyTier.objects.create(
            name="Prime Elite Accounts Test",
            slug="prime-elite-accounts-test",
            description="Premium plan",
            max_products=25,
            min_photos_per_product=3,
            max_photos_per_product=5,
            visibility_type=CompanyTier.VisibilityType.PRO,
        )
        self.company = Company.objects.create(
            name="Asha Jewels Directory",
            category="Retail",
            tier_ref=self.company_tier,
            city="Kochi",
            state="Kerala",
        )

    def test_jwt_login_and_refresh_flow(self):
        response = self.client.post(
            reverse("token_obtain_pair"),
            {"username": self.user.username, "password": self.password},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)

        refresh_response = self.client.post(
            reverse("token_refresh"),
            {"refresh": response.data["refresh"]},
            format="json",
        )

        self.assertEqual(refresh_response.status_code, status.HTTP_200_OK)
        self.assertIn("access", refresh_response.data)

    def test_guest_access_returns_capabilities(self):
        response = self.client.post(
            reverse("guest_access"),
            {"guest_name": "Trade Visitor", "state_id": self.state.id, "association_id": self.association.id},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["access_type"], "guest")
        self.assertEqual(response.data["guest_profile"]["state"]["name"], "Kerala")
        self.assertEqual(response.data["guest_profile"]["association"]["name"], "KGSMA")
        self.assertIn("directory:browse", response.data["capabilities"])

    def test_guest_access_rejects_cross_branch_hierarchy(self):
        response = self.client.post(
            reverse("guest_access"),
            {
                "guest_name": "Trade Visitor",
                "state_id": self.state.id,
                "association_id": self.other_association.id,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_member_access_request_creates_pending_request(self):
        response = self.client.post(
            reverse("member_access_request"),
            {
                "full_name": "Trade Applicant",
                "phone_number": "9876540000",
                "email": "applicant@example.com",
                "business_name": "Applicant Gold House",
                "state_id": self.state.id,
                "association_id": self.association.id,
                "district_operational_unit_id": self.district_unit.id,
                "unit_id": self.unit.id,
                "notes": "Existing retail member applying for portal access.",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["message"], "Member access request submitted for review.")
        self.assertEqual(response.data["request"]["status"], "pending")
        self.assertEqual(response.data["request"]["association"]["name"], "KGSMA")
        self.assertTrue(MemberAccessRequest.objects.filter(email="applicant@example.com").exists())

    def test_member_access_request_rejects_cross_branch_hierarchy(self):
        response = self.client.post(
            reverse("member_access_request"),
            {
                "full_name": "Trade Applicant",
                "phone_number": "9876540000",
                "email": "applicant@example.com",
                "business_name": "Applicant Gold House",
                "state_id": self.state.id,
                "association_id": self.other_association.id,
                "district_operational_unit_id": self.district_unit.id,
                "unit_id": self.unit.id,
                "notes": "",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_me_requires_authentication(self):
        response = self.client.get(reverse("me"))

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    @override_settings(COMPANY_PLAN_UPGRADE_URL="https://example.com/upgrade")
    def test_me_returns_structured_profile_for_authenticated_user(self):
        self.client.force_authenticate(user=self.user)
        UserRole.objects.create(
            user=self.user,
            role=UserRole.Role.COMPANY_ADMIN,
            scope_type=UserRole.ScopeType.COMPANY,
            scope_id=self.company.id,
        )

        response = self.client.get(reverse("me"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["user"]["name"], "Asha Nair")
        self.assertEqual(response.data["user"]["email"], "asha@example.com")
        self.assertEqual(response.data["user"]["phone"], "9999999999")
        self.assertEqual(response.data["user"]["role"], "COMPANY_ADMIN")
        self.assertEqual(response.data["user"]["role_display_name"], "Company Admin")
        self.assertFalse(response.data["user"]["is_admin"])
        self.assertTrue(response.data["user"]["has_company"])
        self.assertTrue(response.data["user"]["can_manage_products"])
        self.assertEqual(response.data["hierarchy"]["state"], "Kerala")
        self.assertEqual(response.data["hierarchy"]["association"], "KGSMA")
        self.assertEqual(response.data["company"]["id"], self.company.id)
        self.assertEqual(response.data["company"]["name"], "Asha Jewels Directory")
        self.assertEqual(response.data["company"]["plan"], "Prime Elite Accounts Test")
        self.assertTrue(response.data["company"]["is_active"])
        self.assertTrue(response.data["company"]["is_approved"])
        self.assertEqual(response.data["company"]["upgrade_url"], "https://example.com/upgrade")
        self.assertEqual(response.data["counts"]["pending_approvals_count"], 0)
        self.assertEqual(response.data["counts"]["unread_notifications_count"], 0)

    def test_me_returns_admin_pending_approval_counts(self):
        self.client.force_authenticate(user=self.user)
        UserRole.objects.create(
            user=self.user,
            role=UserRole.Role.ASSOCIATION_ADMIN,
            scope_type=UserRole.ScopeType.ASSOCIATION,
            scope_id=self.association.id,
        )
        MemberAccessRequest.objects.create(
            full_name="Pending User",
            phone_number="9000000000",
            email="pending@example.com",
            business_name="Pending Jewels",
            state=self.state,
            association=self.association,
            district_operational_unit=self.district_unit,
            unit=self.unit,
            notes="Awaiting approval",
        )
        News.objects.create(
            title="Awaiting Review",
            description="Pending approval content",
            publisher_type=News.PublisherType.PLATFORM,
            status=News.Status.PENDING_APPROVAL,
        )
        Advertisement.objects.create(
            advertiser=self.other_user,
            title="Submitted Campaign",
            status=Advertisement.Status.SUBMITTED,
        )

        response = self.client.get(reverse("me"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["user"]["is_admin"])
        self.assertEqual(response.data["counts"]["pending_approvals_count"], 3)

    def test_me_patch_requires_authentication(self):
        response = self.client.patch(reverse("me"), {"first_name": "Updated"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_me_patch_updates_allowed_root_and_profile_fields(self):
        self.client.force_authenticate(user=self.user)

        updated_association = Association.objects.create(state=self.other_state, name="Coimbatore Gold Association")
        updated_district_unit = DistrictOperationalUnit.objects.create(
            association=updated_association,
            name="Coimbatore District Unit",
        )
        updated_unit = Unit.objects.create(district_operational_unit=updated_district_unit, name="RS Puram Unit")

        response = self.client.patch(
            reverse("me"),
            {
                "first_name": "Anu",
                "email": "anu@example.com",
                "corporate_email": "anu@trade.example",
                "onboarding_completed": False,
                "member_profile": {
                    "phone_number": "8888888888",
                    "company_name": "Anu Gold House",
                    "state_id": self.other_state.id,
                    "association_id": updated_association.id,
                    "district_operational_unit_id": updated_district_unit.id,
                    "unit_id": updated_unit.id,
                },
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.first_name, "Anu")
        self.assertEqual(self.user.email, "anu@example.com")
        self.assertEqual(self.user.corporate_email, "anu@trade.example")
        self.assertFalse(self.user.onboarding_completed)
        self.assertEqual(self.user.member_profile.phone_number, "8888888888")
        self.assertEqual(self.user.member_profile.unit.name, "RS Puram Unit")
        self.assertEqual(response.data["member_profile"]["state"]["name"], "Tamil Nadu")
        self.assertEqual(response.data["member_profile"]["unit"]["name"], "RS Puram Unit")

    def test_preferences_get_returns_current_user_preferences(self):
        self.client.force_authenticate(user=self.user)

        response = self.client.get(reverse("me_preferences"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["rate_alerts"])
        self.assertTrue(response.data["news_alerts"])
        self.assertFalse(response.data["ad_alerts"])
        self.assertTrue(response.data["product_alerts"])

    def test_me_patch_rejects_mismatched_hierarchy_ids(self):
        self.client.force_authenticate(user=self.user)

        response = self.client.patch(
            reverse("me"),
            {
                "member_profile": {
                    "state_id": self.state.id,
                    "association_id": self.other_association.id,
                    "district_operational_unit_id": self.district_unit.id,
                    "unit_id": self.unit.id,
                }
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_me_patch_ignores_read_only_fields(self):
        self.client.force_authenticate(user=self.user)

        response = self.client.patch(
            reverse("me"),
            {
                "role": "admin",
                "jeweller_id": "HACKED-ID",
                "member_profile": {"membership_tier": "Diamond"},
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.role, "member")
        self.assertEqual(self.user.jeweller_id, "JWL-1001")
        self.assertEqual(self.user.member_profile.membership_tier, "Platinum")

    def test_me_patch_creates_profile_when_missing(self):
        self.user.member_profile.delete()
        self.client.force_authenticate(user=self.user)

        response = self.client.patch(
            reverse("me"),
            {
                "member_profile": {
                    "company_name": "Fresh Profile Jewels",
                    "phone_number": "7777777777",
                }
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.member_profile.company_name, "Fresh Profile Jewels")
        self.assertEqual(self.user.member_profile.phone_number, "7777777777")

    def test_preferences_patch_requires_authentication(self):
        response = self.client.patch(reverse("me_preferences"), {"rate_alerts": False}, format="json")

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_preferences_patch_updates_only_current_user(self):
        self.client.force_authenticate(user=self.user)

        response = self.client.patch(
            reverse("me_preferences"),
            {
                "rate_alerts": False,
                "news_alerts": False,
                "ad_alerts": True,
                "product_alerts": False,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.notification_preferences.refresh_from_db()
        self.other_user.notification_preferences.refresh_from_db()
        self.assertFalse(self.user.notification_preferences.rate_alerts)
        self.assertFalse(self.user.notification_preferences.news_alerts)
        self.assertTrue(self.user.notification_preferences.ad_alerts)
        self.assertFalse(self.user.notification_preferences.product_alerts)
        self.assertFalse(self.other_user.notification_preferences.rate_alerts)
        self.assertTrue(self.other_user.notification_preferences.ad_alerts)
        self.assertFalse(self.other_user.notification_preferences.product_alerts)

    def test_preferences_patch_creates_preferences_when_missing(self):
        self.user.notification_preferences.delete()
        self.client.force_authenticate(user=self.user)

        response = self.client.patch(
            reverse("me_preferences"),
            {"meeting_alerts": False},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertFalse(self.user.notification_preferences.meeting_alerts)

    def test_me_unread_notification_count_reflects_user_notifications(self):
        unread_notification = Notification.objects.create(
            type=Notification.Type.NEWS,
            title="Published update",
            body="A new update is available.",
            target_route=Notification.TargetRoute.NEWS_DETAIL,
            target_payload={"newsId": 10},
            source_object_type="news",
            source_object_id=10,
        )
        read_notification = Notification.objects.create(
            type=Notification.Type.RATE,
            title="Rate update",
            body="Rates changed.",
            target_route=Notification.TargetRoute.RATE_DETAILS,
            target_payload={"associationId": self.association.id},
            source_object_type="rate",
            source_object_id=self.association.id,
        )
        UserNotification.objects.create(user=self.user, notification=unread_notification, is_read=False)
        UserNotification.objects.create(user=self.user, notification=read_notification, is_read=True)
        self.client.force_authenticate(user=self.user)

        response = self.client.get(reverse("me"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["counts"]["unread_notifications_count"], 1)

    def test_notification_feed_returns_results_and_filtering(self):
        product_notification = Notification.objects.create(
            type=Notification.Type.PRODUCT,
            title="New product",
            body="Explore the latest product.",
            target_route=Notification.TargetRoute.PRODUCT_DETAIL,
            target_payload={"productId": 1, "companyId": 2},
            source_object_type="product",
            source_object_id=1,
        )
        news_notification = Notification.objects.create(
            type=Notification.Type.NEWS,
            title="News",
            body="Association update.",
            target_route=Notification.TargetRoute.NEWS_DETAIL,
            target_payload={"newsId": 2},
            source_object_type="news",
            source_object_id=2,
        )
        UserNotification.objects.create(user=self.user, notification=product_notification)
        UserNotification.objects.create(user=self.user, notification=news_notification, is_read=True)
        self.client.force_authenticate(user=self.user)

        response = self.client.get(reverse("notifications_feed"), {"type": "product"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["unread_count"], 1)
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["type"], Notification.Type.PRODUCT)

    def test_notification_feed_rejects_invalid_filter(self):
        self.client.force_authenticate(user=self.user)

        response = self.client.get(reverse("notifications_feed"), {"type": "ads"})

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_notification_mark_read_marks_only_current_user_row(self):
        owned_notification = Notification.objects.create(
            type=Notification.Type.MEETING,
            title="Meeting",
            body="Review details.",
            target_route=Notification.TargetRoute.MEETING_DETAIL,
            target_payload={"meetingId": 7},
            source_object_type="meeting",
            source_object_id=7,
        )
        other_notification = Notification.objects.create(
            type=Notification.Type.NEWS,
            title="Other",
            body="Other user notification.",
            target_route=Notification.TargetRoute.NEWS_DETAIL,
            target_payload={"newsId": 8},
            source_object_type="news",
            source_object_id=8,
        )
        owned_row = UserNotification.objects.create(user=self.user, notification=owned_notification)
        other_row = UserNotification.objects.create(user=self.other_user, notification=other_notification)
        self.client.force_authenticate(user=self.user)

        response = self.client.post(reverse("notifications_mark_read", args=[owned_row.id]), format="json")
        missing_response = self.client.post(reverse("notifications_mark_read", args=[other_row.id]), format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        owned_row.refresh_from_db()
        self.assertTrue(owned_row.is_read)
        self.assertEqual(response.data["unread_count"], 0)
        self.assertEqual(missing_response.status_code, status.HTTP_404_NOT_FOUND)

    def test_notification_mark_all_read_marks_all_unread_rows(self):
        notification_one = Notification.objects.create(
            type=Notification.Type.NEWS,
            title="First",
            body="First notification.",
            target_route=Notification.TargetRoute.NEWS_DETAIL,
            target_payload={"newsId": 1},
            source_object_type="news",
            source_object_id=1,
        )
        notification_two = Notification.objects.create(
            type=Notification.Type.RATE,
            title="Second",
            body="Second notification.",
            target_route=Notification.TargetRoute.RATE_DETAILS,
            target_payload={"associationId": self.association.id},
            source_object_type="rate",
            source_object_id=self.association.id,
        )
        UserNotification.objects.create(user=self.user, notification=notification_one)
        UserNotification.objects.create(user=self.user, notification=notification_two)
        self.client.force_authenticate(user=self.user)

        response = self.client.post(reverse("notifications_mark_all_read"), format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["updated_count"], 2)
        self.assertEqual(response.data["unread_count"], 0)
        self.assertEqual(UserNotification.objects.filter(user=self.user, is_read=False).count(), 0)

    def test_session_info_is_public(self):
        response = self.client.get(reverse("session_info"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["auth_provider"], "jwt")
        self.assertTrue(response.data["supports_google_sso"])

    def test_admin_scope_assignment_requires_exactly_one_scope_for_admin_users(self):
        self.user.role = get_user_model().Role.ADMIN
        self.user.save(update_fields=["role"])
        assignment = AdminScopeAssignment(user=self.user, association=self.association, district_operational_unit=self.district_unit)

        with self.assertRaises(ValidationError):
            assignment.full_clean()

    def test_admin_scope_assignment_rejects_non_admin_user(self):
        assignment = AdminScopeAssignment(user=self.user, association=self.association)

        with self.assertRaises(ValidationError):
            assignment.full_clean()

    def test_user_role_requires_matching_scope_type(self):
        assignment = UserRole(
            user=self.user,
            role=UserRole.Role.ASSOCIATION_ADMIN,
            scope_type=UserRole.ScopeType.UNIT,
            scope_id=self.unit.id,
        )

        with self.assertRaises(ValidationError):
            assignment.full_clean()

    def test_user_role_requires_existing_scope_record(self):
        assignment = UserRole(
            user=self.user,
            role=UserRole.Role.COMPANY_ADMIN,
            scope_type=UserRole.ScopeType.COMPANY,
            scope_id=999999,
        )

        with self.assertRaises(ValidationError):
            assignment.full_clean()
