from __future__ import annotations

from datetime import datetime

from django.contrib.auth import get_user_model
from django.core.exceptions import ObjectDoesNotExist
from django.db import transaction
from django.utils import timezone

from apps.directory.models import Company, Product
from apps.directory.services import is_product_visible_to_user
from apps.news.models import Meeting, News
from apps.news.services import is_meeting_visible_to_user, is_news_visible_to_user
from apps.rates.models import AssociationRate
from apps.regions.models import Association

from .models import Notification, NotificationPreference, UserNotification


def get_unread_notification_count(user) -> int:
    if not user or not getattr(user, "is_authenticated", False):
        return 0
    return UserNotification.objects.filter(user=user, is_read=False).count()


def _notification_preference_enabled(user, field_name: str) -> bool:
    try:
        preferences = user.notification_preferences
    except ObjectDoesNotExist:
        return bool(NotificationPreference._meta.get_field(field_name).default)
    return bool(getattr(preferences, field_name))


def _build_notification_body_from_description(description: str, fallback: str) -> str:
    cleaned = " ".join((description or "").split()).strip()
    if not cleaned:
        return fallback
    return cleaned[:157] + "..." if len(cleaned) > 160 else cleaned


def _create_notification_with_recipients(
    *,
    notification_type: str,
    title: str,
    body: str,
    target_route: str,
    target_payload: dict,
    source_object_type: str,
    source_object_id: int,
    recipients: list,
) -> Notification | None:
    if not recipients:
        return None

    with transaction.atomic():
        notification = Notification.objects.create(
            type=notification_type,
            title=title,
            body=body,
            target_route=target_route,
            target_payload=target_payload,
            source_object_type=source_object_type,
            source_object_id=source_object_id,
        )
        UserNotification.objects.bulk_create(
            [UserNotification(user=user, notification=notification) for user in recipients],
            ignore_conflicts=True,
        )
        return notification


def _candidate_users_for_preference(field_name: str):
    user_model = get_user_model()
    return (
        user_model.objects.filter(is_active=True)
        .exclude(role=user_model.Role.GUEST)
        .select_related("member_profile", "notification_preferences")
        .prefetch_related("scoped_roles")
    )


def notify_new_product(product: Product) -> Notification | None:
    product = (
        Product.objects.select_related("company", "category", "subcategory")
        .prefetch_related("visibility_targets")
        .filter(pk=product.pk)
        .first()
    )
    if product is None:
        return None
    if not product.is_active or not product.company.is_active or not product.company.is_approved:
        return None

    recipients = [
        user
        for user in _candidate_users_for_preference("product_alerts")
        if _notification_preference_enabled(user, "product_alerts") and is_product_visible_to_user(product, user)
    ]
    return _create_notification_with_recipients(
        notification_type=Notification.Type.PRODUCT,
        title=f"New product from {product.company.name}",
        body=f"{product.name} is now available for you to explore.",
        target_route=Notification.TargetRoute.PRODUCT_DETAIL,
        target_payload={"productId": product.id, "companyId": product.company_id},
        source_object_type=Notification.Type.PRODUCT,
        source_object_id=product.id,
        recipients=recipients,
    )


def notify_published_news(news: News) -> Notification | None:
    news = News.objects.prefetch_related("targets").select_related("created_by", "approved_by").filter(pk=news.pk).first()
    if news is None or news.status != News.Status.PUBLISHED:
        return None

    recipients = [
        user
        for user in _candidate_users_for_preference("news_alerts")
        if _notification_preference_enabled(user, "news_alerts") and is_news_visible_to_user(news, user)
    ]
    return _create_notification_with_recipients(
        notification_type=Notification.Type.NEWS,
        title=news.title,
        body=_build_notification_body_from_description(news.description, "A new news update is now available."),
        target_route=Notification.TargetRoute.NEWS_DETAIL,
        target_payload={"newsId": news.id},
        source_object_type=Notification.Type.NEWS,
        source_object_id=news.id,
        recipients=recipients,
    )


def notify_published_meeting(meeting: Meeting) -> Notification | None:
    meeting = Meeting.objects.prefetch_related("targets", "responses").select_related("created_by").filter(pk=meeting.pk).first()
    if meeting is None or meeting.status != Meeting.Status.PUBLISHED:
        return None

    start_label = timezone.localtime(meeting.start_datetime).strftime("%d %b, %I:%M %p").replace(" 0", " ")
    recipients = [
        user
        for user in _candidate_users_for_preference("meeting_alerts")
        if _notification_preference_enabled(user, "meeting_alerts") and is_meeting_visible_to_user(meeting, user)
    ]
    return _create_notification_with_recipients(
        notification_type=Notification.Type.MEETING,
        title=meeting.title,
        body=f"Meeting scheduled for {start_label}. Open to review the details and RSVP.",
        target_route=Notification.TargetRoute.MEETING_DETAIL,
        target_payload={"meetingId": meeting.id},
        source_object_type=Notification.Type.MEETING,
        source_object_id=meeting.id,
        recipients=recipients,
    )


def notify_association_rate_update(association: Association, rate: AssociationRate | None = None) -> Notification | None:
    if association is None:
        return None

    recipients = [
        user
        for user in _candidate_users_for_preference("rate_alerts").filter(member_profile__association=association)
        if _notification_preference_enabled(user, "rate_alerts")
    ]
    latest_rate = rate or (
        AssociationRate.objects.filter(association=association)
        .order_by("-effective_at", "-id")
        .first()
    )
    body = "Fresh bullion rates are now live for your association."
    if latest_rate is not None:
        body = f"Updated bullion rates are live for {association.name}. 22K gold: Rs. {latest_rate.gold_22k}."
    return _create_notification_with_recipients(
        notification_type=Notification.Type.RATE,
        title=f"{association.name} rate update",
        body=body,
        target_route=Notification.TargetRoute.RATE_DETAILS,
        target_payload={"associationId": association.id, "associationName": association.name},
        source_object_type=Notification.Type.RATE,
        source_object_id=association.id,
        recipients=recipients,
    )


def mark_user_notification_read(user_notification: UserNotification) -> UserNotification:
    if not user_notification.is_read:
        user_notification.is_read = True
        user_notification.read_at = timezone.now()
        user_notification.save(update_fields=["is_read", "read_at"])
    return user_notification


def mark_all_user_notifications_read(user) -> int:
    now = timezone.now()
    updated_count = UserNotification.objects.filter(user=user, is_read=False).update(is_read=True, read_at=now)
    return updated_count
