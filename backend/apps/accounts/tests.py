from django.test import override_settings
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase
from datetime import timedelta
from unittest.mock import patch

from apps.ads.models import Advertisement
from apps.directory.models import Company, CompanyMembership, CompanyNotificationSubscription, CompanyTier
from apps.news.models import News
from apps.regions.models import Association, DistrictOperationalUnit, RegionState, Unit

from .google_auth import GoogleAuthError
from .models import (
    AccountActivationToken,
    AdminScopeAssignment,
    AssociationAdminAccessRequest,
    CompanyAdminAccessRequest,
    MemberAccessRequest,
    MemberProfile,
    Notification,
    NotificationPreference,
    UserNotification,
    UserRole,
)


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

    def _google_payload(self, **overrides):
        payload = {
            "email": "asha@example.com",
            "email_verified": True,
            "iss": "https://accounts.google.com",
            "sub": "google-sub-001",
        }
        payload.update(overrides)
        return payload

    def test_jwt_login_and_refresh_flow(self):
        response = self.client.post(
            reverse("token_obtain_pair"),
            {"username": self.user.username, "password": self.password},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "success")
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)
        self.assertIn("me", response.data)

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
        other_company = Company.objects.create(
            name="Shadow Role Company",
            category="Wholesale",
            tier_ref=self.company_tier,
            city="Thrissur",
            state="Kerala",
        )
        UserRole.objects.create(
            user=self.user,
            role=UserRole.Role.COMPANY_ADMIN,
            scope_type=UserRole.ScopeType.COMPANY,
            scope_id=other_company.id,
        )
        CompanyMembership.objects.create(
            user=self.user,
            company=self.company,
            role=CompanyMembership.Role.PRIMARY_ADMIN,
            status=CompanyMembership.Status.ACTIVE,
            is_primary_admin=True,
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
        self.assertEqual(response.data["company_source"], "membership")
        self.assertEqual(response.data["company_membership_role"], "primary_admin")
        self.assertIsNone(response.data["company_type"])
        self.assertTrue(response.data["has_association_context"])
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
        self.assertEqual(response.data["counts"]["pending_approvals_count"], 1)

    def test_company_admin_access_request_accepts_independent_company_submission(self):
        response = self.client.post(
            reverse("company_admin_access_request_submit"),
            {
                "requester_name": "Trade Owner",
                "requester_phone": "9000011111",
                "requester_email": "owner@example.com",
                "company_name": "Independent Gold House",
                "business_type": "Retail",
                "state_id": self.state.id,
                "notes": "Independent jeweller onboarding",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        access_request = CompanyAdminAccessRequest.objects.get(requester_email="owner@example.com")
        self.assertEqual(access_request.company_type, CompanyAdminAccessRequest.CompanyType.INDEPENDENT)
        self.assertEqual(access_request.approval_owner_type, CompanyAdminAccessRequest.ApprovalOwnerType.STATE_ADMIN)
        self.assertEqual(access_request.approval_owner_scope_id, self.state.id)

    def test_association_admin_access_request_accepts_association_scoped_submission(self):
        response = self.client.post(
            reverse("association_admin_access_request_submit"),
            {
                "requester_name": "Regional Reviewer",
                "requester_phone": "9000022222",
                "requester_email": "reviewer@example.com",
                "requested_role": "association_admin",
                "state_id": self.state.id,
                "association_id": self.association.id,
                "notes": "Association dashboard access",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        access_request = AssociationAdminAccessRequest.objects.get(requester_email="reviewer@example.com")
        self.assertEqual(access_request.approval_owner_type, AssociationAdminAccessRequest.ApprovalOwnerType.STATE_ADMIN)
        self.assertEqual(access_request.approval_owner_scope_id, self.state.id)

    def test_activation_endpoint_sets_password_and_marks_token_used(self):
        activation_user = get_user_model().objects.create_user(
            username="activation-user",
            email="activation@example.com",
            password="TempPass123!",
        )
        activation_user.set_unusable_password()
        activation_user.save(update_fields=["password"])
        token = AccountActivationToken.objects.create(
            user=activation_user,
            expires_at=timezone.now() + timedelta(days=1),
        )

        status_response = self.client.get(reverse("access_activation", args=[token.token]))
        self.assertEqual(status_response.status_code, status.HTTP_200_OK)
        self.assertTrue(status_response.data["is_active"])

        response = self.client.post(
            reverse("access_activation", args=[token.token]),
            {"password": "NewSecurePass123!"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        token.refresh_from_db()
        activation_user.refresh_from_db()
        self.assertIsNotNone(token.used_at)
        self.assertTrue(activation_user.check_password("NewSecurePass123!"))

    @patch("apps.accounts.views.verify_google_id_token")
    def test_google_login_allows_approved_active_user(self, verify_google_id_token_mock):
        verify_google_id_token_mock.return_value = self._google_payload()

        response = self.client.post(
            reverse("google_login"),
            {"id_token": "valid-google-token"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "success")
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)
        self.assertIn("me", response.data)
        self.assertEqual(response.data["me"]["user"]["email"], self.user.email)
        self.user.refresh_from_db()
        self.assertTrue(self.user.google_auth_enabled)
        self.assertEqual(self.user.google_sub, "google-sub-001")
        self.assertEqual(self.user.google_email, self.user.email)
        self.assertIsNotNone(self.user.last_google_login_at)

    @patch("apps.accounts.views.verify_google_id_token")
    def test_google_login_unknown_email_requires_access_request(self, verify_google_id_token_mock):
        verify_google_id_token_mock.return_value = self._google_payload(
            email="unknown@example.com",
            sub="google-sub-unknown",
        )

        response = self.client.post(
            reverse("google_login"),
            {"id_token": "valid-google-token"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "access_required")
        self.assertEqual(response.data["email"], "unknown@example.com")

    @patch("apps.accounts.views.verify_google_id_token")
    def test_google_login_unknown_email_does_not_create_user(self, verify_google_id_token_mock):
        email = "fresh-google@example.com"
        verify_google_id_token_mock.return_value = self._google_payload(
            email=email,
            sub="google-sub-fresh",
        )

        response = self.client.post(
            reverse("google_login"),
            {"id_token": "valid-google-token"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "access_required")
        self.assertFalse(get_user_model().objects.filter(email__iexact=email).exists())

    @patch("apps.accounts.views.verify_google_id_token")
    def test_google_login_pending_access_request_cannot_sign_in(self, verify_google_id_token_mock):
        email = "pending-google@example.com"
        verify_google_id_token_mock.return_value = self._google_payload(
            email=email,
            sub="google-sub-pending",
        )
        CompanyAdminAccessRequest.objects.create(
            requester_name="Pending Owner",
            requester_phone="9000011111",
            requester_email=email,
            company_name="Pending House",
            business_type="Retail",
            state=self.state,
            company_type=CompanyAdminAccessRequest.CompanyType.INDEPENDENT,
            approval_owner_type=CompanyAdminAccessRequest.ApprovalOwnerType.STATE_ADMIN,
            approval_owner_scope_id=self.state.id,
            status=CompanyAdminAccessRequest.Status.PENDING,
        )

        response = self.client.post(
            reverse("google_login"),
            {"id_token": "valid-google-token"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "pending_approval")

    @patch("apps.accounts.views.verify_google_id_token")
    def test_google_login_rejected_access_request_cannot_sign_in(self, verify_google_id_token_mock):
        email = "rejected-google@example.com"
        verify_google_id_token_mock.return_value = self._google_payload(
            email=email,
            sub="google-sub-rejected",
        )
        AssociationAdminAccessRequest.objects.create(
            requester_name="Rejected Reviewer",
            requester_phone="9000022222",
            requester_email=email,
            requested_role=AssociationAdminAccessRequest.RequestedRole.ASSOCIATION_ADMIN,
            state=self.state,
            association=self.association,
            status=AssociationAdminAccessRequest.Status.REJECTED,
            approval_owner_type=AssociationAdminAccessRequest.ApprovalOwnerType.STATE_ADMIN,
            approval_owner_scope_id=self.state.id,
            rejection_reason="Missing verification",
        )

        response = self.client.post(
            reverse("google_login"),
            {"id_token": "valid-google-token"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "rejected")

    @patch("apps.accounts.views.verify_google_id_token")
    def test_google_login_inactive_user_cannot_sign_in(self, verify_google_id_token_mock):
        self.user.is_active = False
        self.user.save(update_fields=["is_active"])
        verify_google_id_token_mock.return_value = self._google_payload()

        response = self.client.post(
            reverse("google_login"),
            {"id_token": "valid-google-token"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "inactive")

    @patch("apps.accounts.views.verify_google_id_token")
    def test_google_login_rejects_unverified_google_email(self, verify_google_id_token_mock):
        verify_google_id_token_mock.side_effect = GoogleAuthError("Google account email must be verified before sign-in.")

        response = self.client.post(
            reverse("google_login"),
            {"id_token": "unverified-google-token"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["status"], "invalid_token")

    @patch("apps.accounts.views.verify_google_id_token")
    def test_google_login_rejects_invalid_google_token(self, verify_google_id_token_mock):
        verify_google_id_token_mock.side_effect = GoogleAuthError("Invalid Google token.")

        response = self.client.post(
            reverse("google_login"),
            {"id_token": "invalid-google-token"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["status"], "invalid_token")

    @patch("apps.accounts.views.verify_google_id_token")
    def test_google_login_matches_password_login_response_shape(self, verify_google_id_token_mock):
        verify_google_id_token_mock.return_value = self._google_payload()

        password_response = self.client.post(
            reverse("token_obtain_pair"),
            {"username": self.user.username, "password": self.password},
            format="json",
        )
        google_response = self.client.post(
            reverse("google_login"),
            {"id_token": "valid-google-token"},
            format="json",
        )

        self.assertEqual(password_response.status_code, status.HTTP_200_OK)
        self.assertEqual(google_response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(password_response.data.keys()), set(google_response.data.keys()))
        self.assertEqual(password_response.data["status"], "success")
        self.assertEqual(google_response.data["status"], "success")

    @patch("apps.accounts.views.verify_google_id_token")
    def test_google_login_does_not_assign_roles_automatically(self, verify_google_id_token_mock):
        role_count_before = self.user.scoped_roles.count()
        verify_google_id_token_mock.return_value = self._google_payload()

        response = self.client.post(
            reverse("google_login"),
            {"id_token": "valid-google-token"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.scoped_roles.count(), role_count_before)

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

    def test_company_notifications_list_requires_authentication(self):
        response = self.client.get(reverse("me_company_notifications"))

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_company_notifications_list_returns_only_current_user_subscriptions(self):
        other_company = Company.objects.create(
            name="Kerala Crown House",
            category="Retail",
            tier_ref=self.company_tier,
            city="Thrissur",
            state="Kerala",
        )
        CompanyNotificationSubscription.objects.create(user=self.user, company=self.company)
        CompanyNotificationSubscription.objects.create(user=self.other_user, company=other_company)
        self.client.force_authenticate(user=self.user)

        response = self.client.get(reverse("me_company_notifications"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["company_id"], self.company.id)
        self.assertEqual(response.data[0]["name"], "Asha Jewels Directory")

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

    @override_settings(GOOGLE_OAUTH_CLIENT_IDS="test-client-id")
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
