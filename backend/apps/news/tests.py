from datetime import timedelta

from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import MemberProfile, UserRole
from apps.directory.models import Company, CompanyTier
from apps.rates.models import AssociationRate
from apps.regions.models import Association, DistrictOperationalUnit, RegionState, Unit

from .models import Alert, Meeting, MeetingResponse, MeetingTarget, News, NewsItem, NewsTarget


class ScopedNewsMeetingBase(APITestCase):
    def setUp(self):
        user_model = get_user_model()
        self.super_admin = user_model.objects.create_user(
            username="news_super_admin",
            password="DemoPass123!",
            role=user_model.Role.SUPER_ADMIN,
            is_staff=True,
        )
        self.association_admin = user_model.objects.create_user(username="association_admin", password="DemoPass123!")
        self.unit_admin = user_model.objects.create_user(username="unit_admin", password="DemoPass123!")
        self.company_admin = user_model.objects.create_user(username="company_admin", password="DemoPass123!")
        self.member = user_model.objects.create_user(username="member", password="DemoPass123!")
        self.other_member = user_model.objects.create_user(username="other_member", password="DemoPass123!")

        self.kerala = RegionState.objects.create(name="Kerala")
        self.tamil_nadu = RegionState.objects.create(name="Tamil Nadu")
        self.kgsma = Association.objects.create(state=self.kerala, name="KGSMA")
        self.tnja = Association.objects.create(state=self.tamil_nadu, name="TNJA")
        self.ernakulam = DistrictOperationalUnit.objects.create(association=self.kgsma, name="Ernakulam District Unit")
        self.kadavanthra = Unit.objects.create(district_operational_unit=self.ernakulam, name="Kadavanthra Unit")
        self.chennai_district = DistrictOperationalUnit.objects.create(association=self.tnja, name="Chennai District Unit")
        self.t_nagar = Unit.objects.create(district_operational_unit=self.chennai_district, name="T Nagar Unit")
        self.tier, _ = CompanyTier.objects.get_or_create(
            slug="prime-circle",
            defaults={
                "name": "Prime Circle",
                "description": "Test tier",
                "max_products": 12,
                "min_photos_per_product": 2,
                "max_photos_per_product": 5,
                "max_companies_allowed": None,
                "price": "0.00",
                "is_free": True,
                "is_active": True,
                "display_priority": 10,
                "visibility_type": CompanyTier.VisibilityType.NORMAL,
            },
        )
        self.company = Company.objects.create(
            name="Heritage Gold House",
            category="Retail",
            tier_ref=self.tier,
            city="Thrissur",
            state="Kerala",
            about="Member company",
            daily_capacity="2kg",
            specialization="Rings",
            is_active=True,
            is_approved=True,
        )
        self.other_company = Company.objects.create(
            name="Other House",
            category="Retail",
            tier_ref=self.tier,
            city="Chennai",
            state="Tamil Nadu",
            about="Other member company",
            daily_capacity="1kg",
            specialization="Chains",
            is_active=True,
            is_approved=True,
        )

        UserRole.objects.create(
            user=self.super_admin,
            role=UserRole.Role.SUPER_ADMIN,
            scope_type=UserRole.ScopeType.PLATFORM,
            scope_id=None,
        )
        UserRole.objects.create(
            user=self.association_admin,
            role=UserRole.Role.ASSOCIATION_ADMIN,
            scope_type=UserRole.ScopeType.ASSOCIATION,
            scope_id=self.kgsma.id,
        )
        UserRole.objects.create(
            user=self.unit_admin,
            role=UserRole.Role.UNIT_ADMIN,
            scope_type=UserRole.ScopeType.UNIT,
            scope_id=self.kadavanthra.id,
        )
        UserRole.objects.create(
            user=self.company_admin,
            role=UserRole.Role.COMPANY_ADMIN,
            scope_type=UserRole.ScopeType.COMPANY,
            scope_id=self.company.id,
        )

        MemberProfile.objects.create(
            user=self.company_admin,
            phone_number="9999999999",
            company_name=self.company.name,
            state=self.kerala,
            association=self.kgsma,
            district_operational_unit=self.ernakulam,
            unit=self.kadavanthra,
            membership_tier="Gold",
        )
        MemberProfile.objects.create(
            user=self.member,
            phone_number="8888888888",
            company_name=self.company.name,
            state=self.kerala,
            association=self.kgsma,
            district_operational_unit=self.ernakulam,
            unit=self.kadavanthra,
            membership_tier="Gold",
        )
        MemberProfile.objects.create(
            user=self.other_member,
            phone_number="7777777777",
            company_name=self.other_company.name,
            state=self.tamil_nadu,
            association=self.tnja,
            district_operational_unit=self.chennai_district,
            unit=self.t_nagar,
            membership_tier="Silver",
        )

    def _create_published_news(
        self,
        *,
        title: str,
        description: str,
        created_by,
        publisher_type: str,
        publisher_id: int | None,
        include_targets: list[tuple[str, int | None]],
        exclude_targets: list[tuple[str, int | None]] | None = None,
    ) -> News:
        news = News.objects.create(
            title=title,
            description=description,
            created_by=created_by,
            publisher_type=publisher_type,
            publisher_id=publisher_id,
            status=News.Status.PUBLISHED,
            published_at=timezone.now(),
        )
        for target_type, target_id in include_targets:
            NewsTarget.objects.create(news=news, target_type=target_type, target_id=target_id, mode=NewsTarget.Mode.INCLUDE)
        for target_type, target_id in exclude_targets or []:
            NewsTarget.objects.create(news=news, target_type=target_type, target_id=target_id, mode=NewsTarget.Mode.EXCLUDE)
        return news

    def _create_meeting(
        self,
        *,
        title: str,
        organizer_type: str,
        organizer_id: int | None,
        include_targets: list[tuple[str, int | None]],
        exclude_targets: list[tuple[str, int | None]] | None = None,
        created_by=None,
        status_value: str = Meeting.Status.PUBLISHED,
        days_ahead: int = 2,
        meeting_mode: str = Meeting.MeetingMode.PHYSICAL,
        online_meeting_link: str = "",
    ) -> Meeting:
        start_datetime = timezone.now() + timedelta(days=days_ahead)
        meeting = Meeting.objects.create(
            title=title,
            description=f"{title} description",
            created_by=created_by,
            organizer_type=organizer_type,
            organizer_id=organizer_id,
            start_datetime=start_datetime,
            end_datetime=start_datetime + timedelta(hours=2),
            venue_name="Association Hall",
            venue_address="Demo venue address",
            google_maps_link="https://maps.google.com/?q=Association+Hall",
            meeting_mode=meeting_mode,
            online_meeting_link=online_meeting_link,
            status=status_value,
        )
        for target_type, target_id in include_targets:
            MeetingTarget.objects.create(
                meeting=meeting,
                target_type=target_type,
                target_id=target_id,
                mode=MeetingTarget.Mode.INCLUDE,
            )
        for target_type, target_id in exclude_targets or []:
            MeetingTarget.objects.create(
                meeting=meeting,
                target_type=target_type,
                target_id=target_id,
                mode=MeetingTarget.Mode.EXCLUDE,
            )
        return meeting


class NewsFeedTests(ScopedNewsMeetingBase):
    def test_news_feed_returns_empty_state_when_no_records_exist(self):
        response = self.client.get(reverse("news_feed"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["urgent_alert"]["title"], "No active alerts")
        self.assertEqual(response.data["urgent_alert"]["summary"], "")
        self.assertEqual(response.data["meetings"], [])
        self.assertEqual(response.data["ticker"]["gold"], 0.0)
        self.assertEqual(response.data["ticker"]["silver"], 0.0)
        self.assertEqual(response.data["items"], [])

    def test_association_admin_can_publish_directly_within_scope(self):
        self.client.force_authenticate(user=self.association_admin)

        response = self.client.post(
            reverse("news_feed"),
            {
                "title": "Association Circular",
                "description": "Published directly for the association.",
                "publisher_type": News.PublisherType.ASSOCIATION,
                "publisher_id": self.kgsma.id,
                "include_targets": [{"target_type": NewsTarget.TargetType.ASSOCIATION, "target_id": self.kgsma.id}],
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["status"], News.Status.PUBLISHED)
        self.assertEqual(response.data["message"], "News published successfully.")

        self.client.force_authenticate(user=self.member)
        feed_response = self.client.get(reverse("news_feed"))
        self.assertEqual(feed_response.data["urgent_alert"]["title"], "Association Circular")
        self.assertEqual(feed_response.data["items"][0]["title"], "Association Circular")

    def test_unit_admin_out_of_scope_news_requires_association_approval(self):
        self.client.force_authenticate(user=self.unit_admin)

        create_response = self.client.post(
            reverse("news_feed"),
            {
                "title": "Association-wide Unit Update",
                "description": "Needs approval before broader publishing.",
                "publisher_type": News.PublisherType.UNIT,
                "publisher_id": self.kadavanthra.id,
                "include_targets": [{"target_type": NewsTarget.TargetType.ASSOCIATION, "target_id": self.kgsma.id}],
            },
            format="json",
        )

        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(create_response.data["status"], News.Status.PENDING_APPROVAL)
        self.assertIn("sent for approval", create_response.data["message"])

        news_id = create_response.data["id"]
        self.client.force_authenticate(user=self.member)
        pre_approval_feed = self.client.get(reverse("news_feed"))
        self.assertEqual(pre_approval_feed.data["items"], [])

        self.client.force_authenticate(user=self.association_admin)
        approve_response = self.client.post(reverse("news_approve", args=[news_id]), format="json")
        self.assertEqual(approve_response.status_code, status.HTTP_200_OK)
        self.assertEqual(approve_response.data["status"], News.Status.PUBLISHED)

        self.client.force_authenticate(user=self.member)
        post_approval_feed = self.client.get(reverse("news_feed"))
        self.assertEqual(post_approval_feed.data["urgent_alert"]["title"], "Association-wide Unit Update")

    def test_company_admin_out_of_scope_news_can_be_rejected(self):
        self.client.force_authenticate(user=self.company_admin)

        create_response = self.client.post(
            reverse("news_feed"),
            {
                "title": "Cross-scope Company Bulletin",
                "description": "Should not publish directly.",
                "publisher_type": News.PublisherType.COMPANY,
                "publisher_id": self.company.id,
                "include_targets": [{"target_type": NewsTarget.TargetType.ASSOCIATION, "target_id": self.kgsma.id}],
            },
            format="json",
        )

        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(create_response.data["status"], News.Status.PENDING_APPROVAL)

        news_id = create_response.data["id"]
        self.client.force_authenticate(user=self.association_admin)
        reject_response = self.client.post(
            reverse("news_reject", args=[news_id]),
            {"rejection_reason": "Association-wide bulletin needs association ownership."},
            format="json",
        )

        self.assertEqual(reject_response.status_code, status.HTTP_200_OK)
        self.assertEqual(reject_response.data["status"], News.Status.REJECTED)
        self.assertEqual(reject_response.data["rejection_reason"], "Association-wide bulletin needs association ownership.")

    def test_feed_respects_include_and_exclude_targets(self):
        self._create_published_news(
            title="Public But Excluded",
            description="Visible to everyone except one user.",
            created_by=self.super_admin,
            publisher_type=News.PublisherType.PLATFORM,
            publisher_id=None,
            include_targets=[(NewsTarget.TargetType.PLATFORM, None)],
            exclude_targets=[(NewsTarget.TargetType.USER, self.other_member.id)],
        )

        self.client.force_authenticate(user=self.member)
        member_response = self.client.get(reverse("news_feed"))
        self.assertEqual(member_response.data["urgent_alert"]["title"], "Public But Excluded")
        self.assertEqual(len(member_response.data["items"]), 1)

        self.client.force_authenticate(user=self.other_member)
        excluded_response = self.client.get(reverse("news_feed"))
        self.assertEqual(excluded_response.data["urgent_alert"]["title"], "No active alerts")
        self.assertEqual(excluded_response.data["items"], [])

    def test_news_feed_prefers_visible_news_then_falls_back_to_legacy_alert_and_meetings_come_from_new_model(self):
        now = timezone.now()
        AssociationRate.objects.create(
            region_label="Latest",
            gold_22k="6785.00",
            gold_24k="7410.00",
            silver="89.40",
            effective_at=now,
        )
        Alert.objects.create(
            title="Legacy Alert",
            body="Used when no scoped news is visible.",
            severity="urgent",
            active=True,
        )
        NewsItem.objects.create(title="Fallback news", summary="Older fallback", is_urgent=True)
        for index in range(6):
            self._create_meeting(
                title=f"Meeting {index}",
                organizer_type=Meeting.OrganizerType.PLATFORM,
                organizer_id=None,
                include_targets=[(MeetingTarget.TargetType.PLATFORM, None)],
                created_by=self.super_admin,
                days_ahead=index + 1,
            )
        self._create_meeting(
            title="Past Meeting",
            organizer_type=Meeting.OrganizerType.PLATFORM,
            organizer_id=None,
            include_targets=[(MeetingTarget.TargetType.PLATFORM, None)],
            created_by=self.super_admin,
            days_ahead=-1,
        )

        self.client.force_authenticate(user=self.other_member)
        response = self.client.get(reverse("news_feed"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["urgent_alert"]["title"], "Legacy Alert")
        self.assertEqual(len(response.data["meetings"]), 5)
        self.assertEqual(response.data["meetings"][0]["title"], "Meeting 0")
        self.assertEqual(response.data["ticker"]["gold"], 7410.0)
        self.assertEqual(response.data["ticker"]["silver"], 89.4)

    def test_only_eligible_admins_can_create_or_review_news(self):
        self.client.force_authenticate(user=self.member)
        create_response = self.client.post(
            reverse("news_feed"),
            {
                "title": "Member Post",
                "description": "Should fail.",
                "publisher_type": News.PublisherType.COMPANY,
                "publisher_id": self.company.id,
                "include_targets": [{"target_type": NewsTarget.TargetType.COMPANY, "target_id": self.company.id}],
            },
            format="json",
        )
        self.assertEqual(create_response.status_code, status.HTTP_400_BAD_REQUEST)

        self.client.force_authenticate(user=self.unit_admin)
        pending_response = self.client.post(
            reverse("news_feed"),
            {
                "title": "Needs Review",
                "description": "Pending review.",
                "publisher_type": News.PublisherType.UNIT,
                "publisher_id": self.kadavanthra.id,
                "include_targets": [{"target_type": NewsTarget.TargetType.ASSOCIATION, "target_id": self.kgsma.id}],
            },
            format="json",
        )
        news_id = pending_response.data["id"]

        self.client.force_authenticate(user=self.company_admin)
        reject_response = self.client.post(reverse("news_reject", args=[news_id]), {"rejection_reason": "Nope"}, format="json")
        self.assertEqual(reject_response.status_code, status.HTTP_403_FORBIDDEN)


class MeetingApiTests(ScopedNewsMeetingBase):
    def test_super_admin_can_create_platform_meeting(self):
        self.client.force_authenticate(user=self.super_admin)

        response = self.client.post(
            reverse("meeting_list_create"),
            {
                "title": "Platform Meeting",
                "description": "All hands platform meeting",
                "organizer_type": Meeting.OrganizerType.PLATFORM,
                "organizer_id": None,
                "start_datetime": (timezone.now() + timedelta(days=3)).isoformat(),
                "end_datetime": (timezone.now() + timedelta(days=3, hours=2)).isoformat(),
                "venue_name": "Virtual Session",
                "venue_address": "",
                "google_maps_link": "",
                "meeting_mode": Meeting.MeetingMode.ONLINE,
                "online_meeting_link": "https://meet.google.com/platform-meeting",
                "include_targets": [{"target_type": MeetingTarget.TargetType.PLATFORM, "target_id": None}],
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["status"], Meeting.Status.PUBLISHED)
        self.assertEqual(response.data["message"], "Meeting published successfully.")

    def test_association_admin_can_create_for_own_association_and_unit(self):
        self.client.force_authenticate(user=self.association_admin)

        response = self.client.post(
            reverse("meeting_list_create"),
            {
                "title": "Association Event",
                "description": "Own-scope meeting",
                "organizer_type": Meeting.OrganizerType.ASSOCIATION,
                "organizer_id": self.kgsma.id,
                "start_datetime": (timezone.now() + timedelta(days=2)).isoformat(),
                "end_datetime": (timezone.now() + timedelta(days=2, hours=2)).isoformat(),
                "venue_name": "Association Hall",
                "venue_address": "Thrissur",
                "google_maps_link": "https://maps.google.com/?q=Association+Hall",
                "meeting_mode": Meeting.MeetingMode.PHYSICAL,
                "online_meeting_link": "",
                "include_targets": [{"target_type": MeetingTarget.TargetType.UNIT, "target_id": self.kadavanthra.id}],
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["organizer_id"], self.kgsma.id)

    def test_association_admin_cannot_create_for_other_association(self):
        self.client.force_authenticate(user=self.association_admin)

        response = self.client.post(
            reverse("meeting_list_create"),
            {
                "title": "Cross Association Event",
                "description": "Should fail",
                "organizer_type": Meeting.OrganizerType.ASSOCIATION,
                "organizer_id": self.kgsma.id,
                "start_datetime": (timezone.now() + timedelta(days=2)).isoformat(),
                "end_datetime": (timezone.now() + timedelta(days=2, hours=2)).isoformat(),
                "venue_name": "Association Hall",
                "venue_address": "Thrissur",
                "google_maps_link": "https://maps.google.com/?q=Association+Hall",
                "meeting_mode": Meeting.MeetingMode.PHYSICAL,
                "online_meeting_link": "",
                "include_targets": [{"target_type": MeetingTarget.TargetType.ASSOCIATION, "target_id": self.tnja.id}],
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data["detail"],
            "You cannot create a meeting for this audience. Please contact a higher-level admin.",
        )

    def test_unit_admin_can_create_for_own_unit_only(self):
        self.client.force_authenticate(user=self.unit_admin)

        success_response = self.client.post(
            reverse("meeting_list_create"),
            {
                "title": "Unit Event",
                "description": "Own unit meeting",
                "organizer_type": Meeting.OrganizerType.UNIT,
                "organizer_id": self.kadavanthra.id,
                "start_datetime": (timezone.now() + timedelta(days=1)).isoformat(),
                "end_datetime": (timezone.now() + timedelta(days=1, hours=1)).isoformat(),
                "venue_name": "Unit Hall",
                "venue_address": "Kadavanthra",
                "google_maps_link": "https://maps.google.com/?q=Unit+Hall",
                "meeting_mode": Meeting.MeetingMode.PHYSICAL,
                "include_targets": [{"target_type": MeetingTarget.TargetType.UNIT, "target_id": self.kadavanthra.id}],
            },
            format="json",
        )
        self.assertEqual(success_response.status_code, status.HTTP_201_CREATED)

        failure_response = self.client.post(
            reverse("meeting_list_create"),
            {
                "title": "Association Scope Event",
                "description": "Should fail",
                "organizer_type": Meeting.OrganizerType.UNIT,
                "organizer_id": self.kadavanthra.id,
                "start_datetime": (timezone.now() + timedelta(days=1)).isoformat(),
                "end_datetime": (timezone.now() + timedelta(days=1, hours=1)).isoformat(),
                "venue_name": "Unit Hall",
                "venue_address": "Kadavanthra",
                "google_maps_link": "https://maps.google.com/?q=Unit+Hall",
                "meeting_mode": Meeting.MeetingMode.PHYSICAL,
                "include_targets": [{"target_type": MeetingTarget.TargetType.ASSOCIATION, "target_id": self.kgsma.id}],
            },
            format="json",
        )
        self.assertEqual(failure_response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_company_admin_can_create_for_own_company_only(self):
        self.client.force_authenticate(user=self.company_admin)

        success_response = self.client.post(
            reverse("meeting_list_create"),
            {
                "title": "Company Briefing",
                "description": "Own company meeting",
                "organizer_type": Meeting.OrganizerType.COMPANY,
                "organizer_id": self.company.id,
                "start_datetime": (timezone.now() + timedelta(days=1)).isoformat(),
                "end_datetime": (timezone.now() + timedelta(days=1, hours=1)).isoformat(),
                "venue_name": "Showroom",
                "venue_address": "Thrissur",
                "google_maps_link": "https://maps.google.com/?q=Showroom",
                "meeting_mode": Meeting.MeetingMode.HYBRID,
                "online_meeting_link": "https://meet.google.com/company-briefing",
                "include_targets": [{"target_type": MeetingTarget.TargetType.COMPANY, "target_id": self.company.id}],
            },
            format="json",
        )
        self.assertEqual(success_response.status_code, status.HTTP_201_CREATED)

        failure_response = self.client.post(
            reverse("meeting_list_create"),
            {
                "title": "Other Company Briefing",
                "description": "Should fail",
                "organizer_type": Meeting.OrganizerType.COMPANY,
                "organizer_id": self.company.id,
                "start_datetime": (timezone.now() + timedelta(days=1)).isoformat(),
                "end_datetime": (timezone.now() + timedelta(days=1, hours=1)).isoformat(),
                "venue_name": "Showroom",
                "venue_address": "Thrissur",
                "google_maps_link": "https://maps.google.com/?q=Showroom",
                "meeting_mode": Meeting.MeetingMode.HYBRID,
                "online_meeting_link": "https://meet.google.com/company-briefing",
                "include_targets": [{"target_type": MeetingTarget.TargetType.COMPANY, "target_id": self.other_company.id}],
            },
            format="json",
        )
        self.assertEqual(failure_response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_meeting_visibility_respects_include_and_exclude_targets(self):
        included_meeting = self._create_meeting(
            title="Association Meeting",
            organizer_type=Meeting.OrganizerType.ASSOCIATION,
            organizer_id=self.kgsma.id,
            include_targets=[(MeetingTarget.TargetType.ASSOCIATION, self.kgsma.id)],
            created_by=self.association_admin,
        )
        self._create_meeting(
            title="Excluded Meeting",
            organizer_type=Meeting.OrganizerType.PLATFORM,
            organizer_id=None,
            include_targets=[(MeetingTarget.TargetType.PLATFORM, None)],
            exclude_targets=[(MeetingTarget.TargetType.USER, self.member.id)],
            created_by=self.super_admin,
        )

        self.client.force_authenticate(user=self.member)
        member_response = self.client.get(reverse("meeting_list_create"))
        self.assertEqual(member_response.status_code, status.HTTP_200_OK)
        self.assertTrue(any(item["id"] == included_meeting.id for item in member_response.data))
        self.assertFalse(any(item["title"] == "Excluded Meeting" for item in member_response.data))

        self.client.force_authenticate(user=self.other_member)
        other_response = self.client.get(reverse("meeting_list_create"))
        self.assertFalse(any(item["id"] == included_meeting.id for item in other_response.data))

    def test_unauthenticated_users_only_see_platform_meetings(self):
        self._create_meeting(
            title="Platform Meeting",
            organizer_type=Meeting.OrganizerType.PLATFORM,
            organizer_id=None,
            include_targets=[(MeetingTarget.TargetType.PLATFORM, None)],
            created_by=self.super_admin,
        )
        self._create_meeting(
            title="Association Meeting",
            organizer_type=Meeting.OrganizerType.ASSOCIATION,
            organizer_id=self.kgsma.id,
            include_targets=[(MeetingTarget.TargetType.ASSOCIATION, self.kgsma.id)],
            created_by=self.association_admin,
        )

        response = self.client.get(reverse("meeting_list_create"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual([meeting["title"] for meeting in response.data], ["Platform Meeting"])

    def test_rsvp_requires_visibility_and_updates_existing_response(self):
        meeting = self._create_meeting(
            title="RSVP Meeting",
            organizer_type=Meeting.OrganizerType.ASSOCIATION,
            organizer_id=self.kgsma.id,
            include_targets=[(MeetingTarget.TargetType.ASSOCIATION, self.kgsma.id)],
            created_by=self.association_admin,
        )

        self.client.force_authenticate(user=self.member)
        first_response = self.client.post(
            reverse("meeting_respond", args=[meeting.id]),
            {"response": MeetingResponse.ResponseType.ATTENDING},
            format="json",
        )
        self.assertEqual(first_response.status_code, status.HTTP_200_OK)
        self.assertEqual(MeetingResponse.objects.filter(meeting=meeting, user=self.member).count(), 1)

        second_response = self.client.post(
            reverse("meeting_respond", args=[meeting.id]),
            {"response": MeetingResponse.ResponseType.MAYBE},
            format="json",
        )
        self.assertEqual(second_response.status_code, status.HTTP_200_OK)
        self.assertEqual(MeetingResponse.objects.filter(meeting=meeting, user=self.member).count(), 1)
        self.assertEqual(MeetingResponse.objects.get(meeting=meeting, user=self.member).response, MeetingResponse.ResponseType.MAYBE)

        self.client.force_authenticate(user=self.other_member)
        forbidden_response = self.client.post(
            reverse("meeting_respond", args=[meeting.id]),
            {"response": MeetingResponse.ResponseType.ATTENDING},
            format="json",
        )
        self.assertEqual(forbidden_response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_cancelled_meetings_do_not_appear_in_upcoming_results(self):
        upcoming_meeting = self._create_meeting(
            title="Upcoming Meeting",
            organizer_type=Meeting.OrganizerType.PLATFORM,
            organizer_id=None,
            include_targets=[(MeetingTarget.TargetType.PLATFORM, None)],
            created_by=self.super_admin,
            days_ahead=1,
        )
        self._create_meeting(
            title="Cancelled Meeting",
            organizer_type=Meeting.OrganizerType.PLATFORM,
            organizer_id=None,
            include_targets=[(MeetingTarget.TargetType.PLATFORM, None)],
            created_by=self.super_admin,
            status_value=Meeting.Status.CANCELLED,
            days_ahead=2,
        )

        response = self.client.get(reverse("meeting_list_create"), {"view": "upcoming"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual([item["id"] for item in response.data], [upcoming_meeting.id])

    def test_news_feed_meetings_are_backed_by_new_meeting_model(self):
        meeting = self._create_meeting(
            title="Dashboard Meeting",
            organizer_type=Meeting.OrganizerType.PLATFORM,
            organizer_id=None,
            include_targets=[(MeetingTarget.TargetType.PLATFORM, None)],
            created_by=self.super_admin,
            days_ahead=1,
            meeting_mode=Meeting.MeetingMode.HYBRID,
            online_meeting_link="https://meet.google.com/dashboard-meeting",
        )

        response = self.client.get(reverse("news_feed"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["meetings"][0]["id"], meeting.id)
        self.assertEqual(response.data["meetings"][0]["meeting_mode"], Meeting.MeetingMode.HYBRID)

    def test_meeting_detail_and_filtered_views_work_for_authenticated_member(self):
        meeting = self._create_meeting(
            title="Detailed Meeting",
            organizer_type=Meeting.OrganizerType.ASSOCIATION,
            organizer_id=self.kgsma.id,
            include_targets=[(MeetingTarget.TargetType.ASSOCIATION, self.kgsma.id)],
            created_by=self.association_admin,
        )
        MeetingResponse.objects.create(meeting=meeting, user=self.member, response=MeetingResponse.ResponseType.ATTENDING)

        self.client.force_authenticate(user=self.member)
        detail_response = self.client.get(reverse("meeting_detail", args=[meeting.id]))
        self.assertEqual(detail_response.status_code, status.HTTP_200_OK)
        self.assertEqual(detail_response.data["current_user_response"], MeetingResponse.ResponseType.ATTENDING)

        my_responses = self.client.get(reverse("meeting_list_create"), {"view": "my_responses"})
        self.assertEqual(my_responses.status_code, status.HTTP_200_OK)
        self.assertEqual([item["id"] for item in my_responses.data], [meeting.id])

    def test_completed_meeting_remains_visible_in_past_and_detail_views(self):
        meeting = self._create_meeting(
            title="Completed Meeting",
            organizer_type=Meeting.OrganizerType.ASSOCIATION,
            organizer_id=self.kgsma.id,
            include_targets=[(MeetingTarget.TargetType.ASSOCIATION, self.kgsma.id)],
            created_by=self.association_admin,
            status_value=Meeting.Status.COMPLETED,
            days_ahead=-2,
        )

        self.client.force_authenticate(user=self.member)
        past_response = self.client.get(reverse("meeting_list_create"), {"view": "past"})
        self.assertEqual(past_response.status_code, status.HTTP_200_OK)
        self.assertEqual([item["id"] for item in past_response.data], [meeting.id])

        detail_response = self.client.get(reverse("meeting_detail", args=[meeting.id]))
        self.assertEqual(detail_response.status_code, status.HTTP_200_OK)
        self.assertEqual(detail_response.data["status"], Meeting.Status.COMPLETED)
