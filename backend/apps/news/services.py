from __future__ import annotations

from collections.abc import Iterable

from django.db import transaction
from django.utils import timezone

from apps.accounts.models import MemberProfile, UserRole
from apps.directory.access import get_company_association_ids, get_company_state_ids, get_company_unit_ids, get_user_company_ids
from apps.directory.models import Company
from apps.media_platform.models import MediaAsset
from apps.regions.models import Association, RegionState, Unit

from .models import Meeting, MeetingResponse, MeetingTarget, News, NewsTarget


class NewsValidationError(Exception):
    pass


CREATOR_ROLE_BY_PUBLISHER_TYPE = {
    News.PublisherType.PLATFORM: UserRole.Role.SUPER_ADMIN,
    News.PublisherType.ASSOCIATION: UserRole.Role.ASSOCIATION_ADMIN,
    News.PublisherType.UNIT: UserRole.Role.UNIT_ADMIN,
    News.PublisherType.COMPANY: UserRole.Role.COMPANY_ADMIN,
}
TARGET_MODEL_BY_TYPE = {
    NewsTarget.TargetType.STATE: RegionState,
    NewsTarget.TargetType.ASSOCIATION: Association,
    NewsTarget.TargetType.UNIT: Unit,
    NewsTarget.TargetType.COMPANY: Company,
}
MEETING_CREATOR_ROLES = (
    UserRole.Role.SUPER_ADMIN,
    UserRole.Role.ASSOCIATION_ADMIN,
    UserRole.Role.UNIT_ADMIN,
    UserRole.Role.COMPANY_ADMIN,
)


def user_can_create_news(user) -> bool:
    if not user or not user.is_authenticated:
        return False
    if getattr(user, "is_super_admin_user", False):
        return True
    return user.scoped_roles.filter(
        role__in=[
            UserRole.Role.ASSOCIATION_ADMIN,
            UserRole.Role.UNIT_ADMIN,
            UserRole.Role.COMPANY_ADMIN,
        ]
    ).exists()


def validate_news_publisher_scope(user, *, publisher_type: str, publisher_id: int | None) -> None:
    if not user_can_create_news(user):
        raise NewsValidationError("You do not have permission to create news.")

    expected_role = CREATOR_ROLE_BY_PUBLISHER_TYPE.get(publisher_type)
    if expected_role is None:
        raise NewsValidationError("Unsupported publisher type.")

    if publisher_type == News.PublisherType.PLATFORM:
        if publisher_id is not None:
            raise NewsValidationError("Platform news must not define a publisher id.")
        if not getattr(user, "is_super_admin_user", False):
            raise NewsValidationError("Only super admins can publish platform news.")
        return

    if publisher_id is None:
        raise NewsValidationError("A publisher id is required for this publisher type.")

    scope_type = {
        News.PublisherType.ASSOCIATION: UserRole.ScopeType.ASSOCIATION,
        News.PublisherType.UNIT: UserRole.ScopeType.UNIT,
        News.PublisherType.COMPANY: UserRole.ScopeType.COMPANY,
    }[publisher_type]
    if not user.has_scoped_role(expected_role, scope_type=scope_type, scope_id=publisher_id):
        raise NewsValidationError("You cannot create news for a publisher scope you do not manage.")


def validate_news_image_asset(user, image_asset: MediaAsset | None) -> None:
    if image_asset is None:
        return
    if image_asset.visibility != MediaAsset.Visibility.PUBLIC:
        raise NewsValidationError("News images must use a public media asset.")
    if image_asset.uploader_id is not None and image_asset.uploader_id != user.id:
        raise NewsValidationError("You can only attach image media that you uploaded.")
    attached_news = getattr(image_asset, "news_item", None)
    if attached_news is not None:
        raise NewsValidationError("This image asset is already attached to another news item.")


def validate_target_payload(target_type: str, target_id: int | None) -> None:
    if target_type == NewsTarget.TargetType.PLATFORM:
        if target_id is not None:
            raise NewsValidationError("Platform targets must not include a target id.")
        return

    if target_id is None:
        raise NewsValidationError("A target id is required for this target type.")

    if target_type == NewsTarget.TargetType.USER:
        from django.contrib.auth import get_user_model

        if not get_user_model().objects.filter(pk=target_id).exists():
            raise NewsValidationError("Selected user target does not exist.")
        return

    model_class = TARGET_MODEL_BY_TYPE.get(target_type)
    if model_class is None:
        raise NewsValidationError("Unsupported target type.")
    if not model_class.objects.filter(pk=target_id).exists():
        raise NewsValidationError(f"Selected {target_type} target does not exist.")

def _company_association_ids(company_id: int) -> set[int]:
    return get_company_association_ids(company_id)


def _company_unit_ids(company_id: int) -> set[int]:
    return get_company_unit_ids(company_id)


def _company_state_ids(company_id: int) -> set[int]:
    return get_company_state_ids(company_id)


def _user_company_ids(user) -> set[int]:
    return get_user_company_ids(user)


def is_target_within_publisher_scope(*, publisher_type: str, publisher_id: int | None, target_type: str, target_id: int | None) -> bool:
    if publisher_type == News.PublisherType.PLATFORM:
        return True

    if publisher_type == News.PublisherType.ASSOCIATION:
        if publisher_id is None:
            return False
        if target_type == NewsTarget.TargetType.ASSOCIATION:
            return target_id == publisher_id
        if target_type == NewsTarget.TargetType.UNIT:
            return Unit.objects.filter(pk=target_id, district_operational_unit__association_id=publisher_id).exists()
        if target_type == NewsTarget.TargetType.USER:
            return MemberProfile.objects.filter(user_id=target_id, association_id=publisher_id).exists()
        if target_type == NewsTarget.TargetType.COMPANY:
            return publisher_id in _company_association_ids(target_id or 0)
        return False

    if publisher_type == News.PublisherType.UNIT:
        if publisher_id is None:
            return False
        if target_type == NewsTarget.TargetType.UNIT:
            return target_id == publisher_id
        if target_type == NewsTarget.TargetType.USER:
            return MemberProfile.objects.filter(user_id=target_id, unit_id=publisher_id).exists()
        if target_type == NewsTarget.TargetType.COMPANY:
            return publisher_id in _company_unit_ids(target_id or 0)
        return False

    if publisher_type == News.PublisherType.COMPANY:
        if publisher_id is None:
            return False
        if target_type == NewsTarget.TargetType.COMPANY:
            return target_id == publisher_id
        if target_type == NewsTarget.TargetType.USER:
            from django.contrib.auth import get_user_model

            target_user = get_user_model().objects.filter(pk=target_id).first()
            if target_user is None:
                return False
            return publisher_id in _user_company_ids(target_user)
        return False

    return False


def can_publish_directly(*, publisher_type: str, publisher_id: int | None, include_targets: Iterable[dict], exclude_targets: Iterable[dict]) -> bool:
    for target in [*include_targets, *exclude_targets]:
        if not is_target_within_publisher_scope(
            publisher_type=publisher_type,
            publisher_id=publisher_id,
            target_type=target["target_type"],
            target_id=target.get("target_id"),
        ):
            return False
    return True


def _required_approver_for_news(news: News) -> tuple[str, str, int | None]:
    if news.publisher_type == News.PublisherType.UNIT:
        association_id = Unit.objects.get(pk=news.publisher_id).district_operational_unit.association_id
        return (UserRole.Role.ASSOCIATION_ADMIN, UserRole.ScopeType.ASSOCIATION, association_id)

    if news.publisher_type == News.PublisherType.COMPANY:
        company_association_ids = list(_company_association_ids(news.publisher_id or 0))
        if len(company_association_ids) == 1:
            return (UserRole.Role.ASSOCIATION_ADMIN, UserRole.ScopeType.ASSOCIATION, company_association_ids[0])

    return (UserRole.Role.SUPER_ADMIN, UserRole.ScopeType.PLATFORM, None)


def can_user_review_news(user, news: News) -> bool:
    if not user or not user.is_authenticated:
        return False
    if getattr(user, "is_super_admin_user", False):
        return True
    role, scope_type, scope_id = _required_approver_for_news(news)
    return user.has_scoped_role(role, scope_type=scope_type, scope_id=scope_id)


def resolve_news_status(*, publisher_type: str, publisher_id: int | None, include_targets: list[dict], exclude_targets: list[dict], save_as_draft: bool) -> str:
    if save_as_draft:
        return News.Status.DRAFT
    if can_publish_directly(
        publisher_type=publisher_type,
        publisher_id=publisher_id,
        include_targets=include_targets,
        exclude_targets=exclude_targets,
    ):
        return News.Status.PUBLISHED
    return News.Status.PENDING_APPROVAL


@transaction.atomic
def create_news_with_targets(
    *,
    user,
    title: str,
    description: str,
    publisher_type: str,
    publisher_id: int | None,
    include_targets: list[dict],
    exclude_targets: list[dict],
    save_as_draft: bool,
    image_asset: MediaAsset | None = None,
) -> News:
    validate_news_publisher_scope(user, publisher_type=publisher_type, publisher_id=publisher_id)
    validate_news_image_asset(user, image_asset)
    if not include_targets:
        raise NewsValidationError("At least one include target is required.")

    for target in [*include_targets, *exclude_targets]:
        validate_target_payload(target["target_type"], target.get("target_id"))

    status = resolve_news_status(
        publisher_type=publisher_type,
        publisher_id=publisher_id,
        include_targets=include_targets,
        exclude_targets=exclude_targets,
        save_as_draft=save_as_draft,
    )
    news = News.objects.create(
        title=title,
        description=description,
        image_asset=image_asset,
        created_by=user,
        publisher_type=publisher_type,
        publisher_id=publisher_id,
        status=status,
        published_at=timezone.now() if status == News.Status.PUBLISHED else None,
    )
    NewsTarget.objects.bulk_create(
        [
            NewsTarget(news=news, target_type=target["target_type"], target_id=target.get("target_id"), mode=NewsTarget.Mode.INCLUDE)
            for target in include_targets
        ]
        + [
            NewsTarget(news=news, target_type=target["target_type"], target_id=target.get("target_id"), mode=NewsTarget.Mode.EXCLUDE)
            for target in exclude_targets
        ]
    )
    return news


def _user_visibility_tokens(user) -> set[tuple[str, int | None]]:
    tokens: set[tuple[str, int | None]] = {(NewsTarget.TargetType.PLATFORM, None)}
    if not user or not user.is_authenticated:
        return tokens

    tokens.add((NewsTarget.TargetType.USER, user.id))

    member_profile = getattr(user, "member_profile", None)
    if member_profile:
        if member_profile.state_id:
            tokens.add((NewsTarget.TargetType.STATE, member_profile.state_id))
        if member_profile.association_id:
            tokens.add((NewsTarget.TargetType.ASSOCIATION, member_profile.association_id))
        if member_profile.unit_id:
            tokens.add((NewsTarget.TargetType.UNIT, member_profile.unit_id))

    for company_id in _user_company_ids(user):
        tokens.add((NewsTarget.TargetType.COMPANY, company_id))
        for association_id in _company_association_ids(company_id):
            tokens.add((NewsTarget.TargetType.ASSOCIATION, association_id))
        for unit_id in _company_unit_ids(company_id):
            tokens.add((NewsTarget.TargetType.UNIT, unit_id))
        for state_id in _company_state_ids(company_id):
            tokens.add((NewsTarget.TargetType.STATE, state_id))

    return tokens


def is_news_visible_to_user(news: News, user) -> bool:
    visibility_tokens = _user_visibility_tokens(user)
    include_targets = [target for target in news.targets.all() if target.mode == NewsTarget.Mode.INCLUDE]
    exclude_targets = [target for target in news.targets.all() if target.mode == NewsTarget.Mode.EXCLUDE]

    is_included = any((target.target_type, target.target_id) in visibility_tokens for target in include_targets)
    if not is_included:
        return False
    is_excluded = any((target.target_type, target.target_id) in visibility_tokens for target in exclude_targets)
    return not is_excluded


def _meeting_target_within_organizer_scope(*, organizer_type: str, organizer_id: int | None, target_type: str, target_id: int | None) -> bool:
    if organizer_type == Meeting.OrganizerType.PLATFORM:
        return True

    if organizer_type == Meeting.OrganizerType.ASSOCIATION:
        if organizer_id is None:
            return False
        if target_type == MeetingTarget.TargetType.ASSOCIATION:
            return target_id == organizer_id
        if target_type == MeetingTarget.TargetType.UNIT:
            return Unit.objects.filter(pk=target_id, district_operational_unit__association_id=organizer_id).exists()
        if target_type == MeetingTarget.TargetType.COMPANY:
            return organizer_id in _company_association_ids(target_id or 0)
        if target_type == MeetingTarget.TargetType.USER:
            return MemberProfile.objects.filter(user_id=target_id, association_id=organizer_id).exists()
        return False

    if organizer_type == Meeting.OrganizerType.UNIT:
        if organizer_id is None:
            return False
        if target_type == MeetingTarget.TargetType.UNIT:
            return target_id == organizer_id
        if target_type == MeetingTarget.TargetType.COMPANY:
            return organizer_id in _company_unit_ids(target_id or 0)
        if target_type == MeetingTarget.TargetType.USER:
            return MemberProfile.objects.filter(user_id=target_id, unit_id=organizer_id).exists()
        return False

    if organizer_type == Meeting.OrganizerType.COMPANY:
        if organizer_id is None:
            return False
        if target_type == MeetingTarget.TargetType.COMPANY:
            return target_id == organizer_id
        if target_type == MeetingTarget.TargetType.USER:
            from django.contrib.auth import get_user_model

            target_user = get_user_model().objects.filter(pk=target_id).first()
            if target_user is None:
                return False
            return organizer_id in _user_company_ids(target_user)
        return False

    return False


def _validate_meeting_target_payload(target_type: str, target_id: int | None) -> None:
    if target_type == MeetingTarget.TargetType.PLATFORM:
        if target_id is not None:
            raise NewsValidationError("Platform targets must not include a target id.")
        return

    if target_id is None:
        raise NewsValidationError("A target id is required for this target type.")

    if target_type == MeetingTarget.TargetType.USER:
        from django.contrib.auth import get_user_model

        if not get_user_model().objects.filter(pk=target_id).exists():
            raise NewsValidationError("Selected user target does not exist.")
        return

    model_class = TARGET_MODEL_BY_TYPE.get(target_type)
    if model_class is None:
        raise NewsValidationError("Unsupported target type.")
    if not model_class.objects.filter(pk=target_id).exists():
        raise NewsValidationError(f"Selected {target_type} target does not exist.")


def can_create_meeting(user) -> bool:
    if not user or not user.is_authenticated:
        return False
    if getattr(user, "is_super_admin_user", False):
        return True
    return user.scoped_roles.filter(role__in=MEETING_CREATOR_ROLES[1:]).exists()


def _can_user_manage_meeting_scope(user, *, organizer_type: str, organizer_id: int | None) -> bool:
    if not user or not user.is_authenticated:
        return False
    if getattr(user, "is_super_admin_user", False):
        return True

    if organizer_type == Meeting.OrganizerType.PLATFORM:
        return False
    if organizer_id is None:
        return False

    if organizer_type == Meeting.OrganizerType.ASSOCIATION:
        return user.has_scoped_role(
            UserRole.Role.ASSOCIATION_ADMIN,
            scope_type=UserRole.ScopeType.ASSOCIATION,
            scope_id=organizer_id,
        )

    if organizer_type == Meeting.OrganizerType.UNIT:
        if user.has_scoped_role(UserRole.Role.UNIT_ADMIN, scope_type=UserRole.ScopeType.UNIT, scope_id=organizer_id):
            return True
        association_id = Unit.objects.filter(pk=organizer_id).values_list("district_operational_unit__association_id", flat=True).first()
        if association_id is None:
            return False
        return user.has_scoped_role(
            UserRole.Role.ASSOCIATION_ADMIN,
            scope_type=UserRole.ScopeType.ASSOCIATION,
            scope_id=association_id,
        )

    if organizer_type == Meeting.OrganizerType.COMPANY:
        return user.has_scoped_role(
            UserRole.Role.COMPANY_ADMIN,
            scope_type=UserRole.ScopeType.COMPANY,
            scope_id=organizer_id,
        )

    return False


def can_manage_meeting(user, meeting: Meeting) -> bool:
    if not user or not user.is_authenticated:
        return False
    if meeting.created_by_id == user.id:
        return True
    return _can_user_manage_meeting_scope(user, organizer_type=meeting.organizer_type, organizer_id=meeting.organizer_id)


def is_meeting_target_within_user_scope(user, *, target_type: str, target_id: int | None) -> bool:
    if not user or not user.is_authenticated:
        return False
    if getattr(user, "is_super_admin_user", False):
        return True

    if target_type in {MeetingTarget.TargetType.PLATFORM, MeetingTarget.TargetType.STATE}:
        return False
    if target_id is None:
        return False

    if target_type == MeetingTarget.TargetType.ASSOCIATION:
        return user.has_scoped_role(
            UserRole.Role.ASSOCIATION_ADMIN,
            scope_type=UserRole.ScopeType.ASSOCIATION,
            scope_id=target_id,
        )

    if target_type == MeetingTarget.TargetType.UNIT:
        if user.has_scoped_role(UserRole.Role.UNIT_ADMIN, scope_type=UserRole.ScopeType.UNIT, scope_id=target_id):
            return True
        association_id = Unit.objects.filter(pk=target_id).values_list("district_operational_unit__association_id", flat=True).first()
        if association_id is None:
            return False
        return user.has_scoped_role(
            UserRole.Role.ASSOCIATION_ADMIN,
            scope_type=UserRole.ScopeType.ASSOCIATION,
            scope_id=association_id,
        )

    if target_type == MeetingTarget.TargetType.COMPANY:
        if user.has_scoped_role(UserRole.Role.COMPANY_ADMIN, scope_type=UserRole.ScopeType.COMPANY, scope_id=target_id):
            return True
        company_association_ids = _company_association_ids(target_id)
        if company_association_ids and user.scoped_roles.filter(
            role=UserRole.Role.ASSOCIATION_ADMIN,
            scope_type=UserRole.ScopeType.ASSOCIATION,
            scope_id__in=company_association_ids,
        ).exists():
            return True
        company_unit_ids = _company_unit_ids(target_id)
        if company_unit_ids and user.scoped_roles.filter(
            role=UserRole.Role.UNIT_ADMIN,
            scope_type=UserRole.ScopeType.UNIT,
            scope_id__in=company_unit_ids,
        ).exists():
            return True
        return False

    if target_type == MeetingTarget.TargetType.USER:
        from django.contrib.auth import get_user_model

        target_user = get_user_model().objects.filter(pk=target_id).first()
        member_profile = MemberProfile.objects.filter(user_id=target_id).first()
        if member_profile is None:
            return False
        company_ids = get_user_company_ids(target_user) if target_user is not None else set()
        if company_ids and user.scoped_roles.filter(
                role=UserRole.Role.COMPANY_ADMIN,
                scope_type=UserRole.ScopeType.COMPANY,
                scope_id__in=company_ids,
            ).exists():
            return True
        if member_profile.unit_id and user.has_scoped_role(
            UserRole.Role.UNIT_ADMIN,
            scope_type=UserRole.ScopeType.UNIT,
            scope_id=member_profile.unit_id,
        ):
            return True
        if member_profile.association_id and user.has_scoped_role(
            UserRole.Role.ASSOCIATION_ADMIN,
            scope_type=UserRole.ScopeType.ASSOCIATION,
            scope_id=member_profile.association_id,
        ):
            return True
        return False

    return False


def validate_meeting_targets(
    user,
    *,
    organizer_type: str,
    organizer_id: int | None,
    include_targets: list[dict],
    exclude_targets: list[dict],
) -> None:
    if not can_create_meeting(user):
        raise NewsValidationError("You do not have permission to create meetings.")
    if not _can_user_manage_meeting_scope(user, organizer_type=organizer_type, organizer_id=organizer_id):
        raise NewsValidationError("You cannot create a meeting for this organizer scope.")
    if not include_targets:
        raise NewsValidationError("At least one include target is required.")

    for target in [*include_targets, *exclude_targets]:
        target_type = target["target_type"]
        target_id = target.get("target_id")
        _validate_meeting_target_payload(target_type, target_id)
        if not is_meeting_target_within_user_scope(user, target_type=target_type, target_id=target_id):
            raise NewsValidationError("You cannot create a meeting for this audience. Please contact a higher-level admin.")
        if not _meeting_target_within_organizer_scope(
            organizer_type=organizer_type,
            organizer_id=organizer_id,
            target_type=target_type,
            target_id=target_id,
        ):
            raise NewsValidationError("Selected audience must stay within the meeting organizer scope.")


@transaction.atomic
def create_meeting_with_targets(
    *,
    user,
    title: str,
    description: str,
    organizer_type: str,
    organizer_id: int | None,
    start_datetime,
    end_datetime,
    venue_name: str,
    venue_address: str,
    google_maps_link: str,
    meeting_mode: str,
    online_meeting_link: str,
    include_targets: list[dict],
    exclude_targets: list[dict],
    save_as_draft: bool,
) -> Meeting:
    validate_meeting_targets(
        user,
        organizer_type=organizer_type,
        organizer_id=organizer_id,
        include_targets=include_targets,
        exclude_targets=exclude_targets,
    )
    meeting = Meeting.objects.create(
        title=title,
        description=description,
        created_by=user,
        organizer_type=organizer_type,
        organizer_id=organizer_id,
        start_datetime=start_datetime,
        end_datetime=end_datetime,
        venue_name=venue_name,
        venue_address=venue_address,
        google_maps_link=google_maps_link,
        meeting_mode=meeting_mode,
        online_meeting_link=online_meeting_link,
        status=Meeting.Status.DRAFT if save_as_draft else Meeting.Status.PUBLISHED,
    )
    MeetingTarget.objects.bulk_create(
        [
            MeetingTarget(meeting=meeting, target_type=target["target_type"], target_id=target.get("target_id"), mode=MeetingTarget.Mode.INCLUDE)
            for target in include_targets
        ]
        + [
            MeetingTarget(meeting=meeting, target_type=target["target_type"], target_id=target.get("target_id"), mode=MeetingTarget.Mode.EXCLUDE)
            for target in exclude_targets
        ]
    )
    return meeting


def update_meeting_with_targets(
    *,
    meeting: Meeting,
    user,
    payload: dict,
    include_targets: list[dict] | None = None,
    exclude_targets: list[dict] | None = None,
) -> Meeting:
    organizer_type = payload.get("organizer_type", meeting.organizer_type)
    organizer_id = payload.get("organizer_id", meeting.organizer_id)
    next_include_targets = include_targets if include_targets is not None else [
        {"target_type": target.target_type, "target_id": target.target_id}
        for target in meeting.targets.filter(mode=MeetingTarget.Mode.INCLUDE)
    ]
    next_exclude_targets = exclude_targets if exclude_targets is not None else [
        {"target_type": target.target_type, "target_id": target.target_id}
        for target in meeting.targets.filter(mode=MeetingTarget.Mode.EXCLUDE)
    ]
    validate_meeting_targets(
        user,
        organizer_type=organizer_type,
        organizer_id=organizer_id,
        include_targets=next_include_targets,
        exclude_targets=next_exclude_targets,
    )

    for field_name, value in payload.items():
        setattr(meeting, field_name, value)
    meeting.save()

    if include_targets is not None or exclude_targets is not None:
        meeting.targets.all().delete()
        MeetingTarget.objects.bulk_create(
            [
                MeetingTarget(meeting=meeting, target_type=target["target_type"], target_id=target.get("target_id"), mode=MeetingTarget.Mode.INCLUDE)
                for target in next_include_targets
            ]
            + [
                MeetingTarget(meeting=meeting, target_type=target["target_type"], target_id=target.get("target_id"), mode=MeetingTarget.Mode.EXCLUDE)
                for target in next_exclude_targets
            ]
        )
    meeting.refresh_from_db()
    return meeting


def is_meeting_visible_to_user(meeting: Meeting, user) -> bool:
    visibility_tokens = _user_visibility_tokens(user)
    include_targets = [target for target in meeting.targets.all() if target.mode == MeetingTarget.Mode.INCLUDE]
    exclude_targets = [target for target in meeting.targets.all() if target.mode == MeetingTarget.Mode.EXCLUDE]

    is_included = any((target.target_type, target.target_id) in visibility_tokens for target in include_targets)
    if not is_included:
        return False
    is_excluded = any((target.target_type, target.target_id) in visibility_tokens for target in exclude_targets)
    return not is_excluded


def get_visible_meetings_for_user(user, *, statuses: Iterable[str] | None = None) -> list[Meeting]:
    allowed_statuses = list(statuses or [Meeting.Status.PUBLISHED])
    meetings = list(
        Meeting.objects.filter(status__in=allowed_statuses)
        .prefetch_related("targets", "responses")
        .select_related("created_by")
        .order_by("start_datetime", "id")
    )
    return [meeting for meeting in meetings if is_meeting_visible_to_user(meeting, user)]


def respond_to_meeting(*, meeting: Meeting, user, response: str) -> MeetingResponse:
    if not user or not user.is_authenticated:
        raise NewsValidationError("Authentication is required to respond to a meeting.")
    if meeting.status != Meeting.Status.PUBLISHED:
        raise NewsValidationError("You can only respond to published meetings.")
    if not is_meeting_visible_to_user(meeting, user):
        raise NewsValidationError("You cannot respond to a meeting that is not visible to you.")

    meeting_response, _ = MeetingResponse.objects.update_or_create(
        meeting=meeting,
        user=user,
        defaults={"response": response, "responded_at": timezone.now()},
    )
    return meeting_response
