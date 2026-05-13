from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.notification_services import notify_published_meeting, notify_published_news
from apps.media_platform.models import MediaAsset
from apps.media_platform.service import build_media_asset_response, create_upload_session, finalize_media_asset
from apps.rates.models import AssociationRate

from .models import Alert, Meeting, News, NewsBookmark, NewsItem
from .serializers import (
    CreateMeetingSerializer,
    CreateNewsSerializer,
    MeetingRespondSerializer,
    MeetingSerializer,
    NewsDetailSerializer,
    NewsFeedResponseSerializer,
    NewsMediaAssetFinalizeSerializer,
    NewsSerializer,
    NewsUploadSessionSerializer,
    RejectNewsSerializer,
    UpdateMeetingSerializer,
)
from .services import (
    NewsValidationError,
    user_can_create_news,
    can_manage_meeting,
    can_user_review_news,
    create_meeting_with_targets,
    create_news_with_targets,
    get_visible_meetings_for_user,
    is_meeting_visible_to_user,
    is_news_visible_to_user,
    respond_to_meeting,
    update_meeting_with_targets,
)


def _build_meeting_queryset_with_relations():
    return Meeting.objects.prefetch_related("targets", "responses").select_related("created_by")


def _build_news_queryset_with_relations():
    return News.objects.prefetch_related("targets").select_related("created_by", "approved_by", "image_asset")


def _get_visible_published_news(user, *, exclude_news_id: int | None = None) -> list[News]:
    published_news = list(
        _build_news_queryset_with_relations()
        .filter(status=News.Status.PUBLISHED)
        .order_by("-published_at", "-updated_at", "-id")
    )
    visible_news = [news for news in published_news if is_news_visible_to_user(news, user)]
    if exclude_news_id is None:
        return visible_news
    return [news for news in visible_news if news.id != exclude_news_id]


def _get_bookmarked_news_ids(user, news_ids: list[int] | tuple[int, ...] | set[int]) -> set[int]:
    if not user or not getattr(user, "is_authenticated", False) or not news_ids:
        return set()
    return set(NewsBookmark.objects.filter(user=user, news_id__in=news_ids).values_list("news_id", flat=True))


def build_news_feed_payload(user) -> dict:
    visible_news = _get_visible_published_news(user)
    active_alert = Alert.objects.filter(active=True).order_by("-id").first()
    latest_news_item = NewsItem.objects.order_by("-published_at", "-id").first()
    latest_rate = AssociationRate.objects.order_by("-effective_at", "-id").first()
    upcoming_meetings = get_visible_meetings_for_user(user)
    upcoming_meetings = [
        meeting
        for meeting in upcoming_meetings
        if meeting.status == Meeting.Status.PUBLISHED and meeting.start_datetime >= timezone.now()
    ][:5]

    if visible_news:
        urgent_alert = {"title": visible_news[0].title, "summary": visible_news[0].description}
    elif active_alert:
        urgent_alert = {"title": active_alert.title, "summary": active_alert.body}
    elif latest_news_item:
        urgent_alert = {"title": latest_news_item.title, "summary": latest_news_item.summary}
    else:
        urgent_alert = {"title": "No active alerts", "summary": ""}

    return {
        "urgent_alert": urgent_alert,
        "featured_news": visible_news[0] if visible_news else None,
        "meetings": upcoming_meetings,
        "ticker": {
            "gold": float(latest_rate.gold_24k) if latest_rate else 0.0,
            "silver": float(latest_rate.silver) if latest_rate else 0.0,
        },
        "items": visible_news[:10],
    }


class NewsFeedView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        payload = build_news_feed_payload(request.user)
        news_ids = [item.id for item in payload["items"]]
        if payload["featured_news"] is not None:
            news_ids.append(payload["featured_news"].id)
        bookmarked_news_ids = _get_bookmarked_news_ids(request.user, news_ids)
        return Response(
            NewsFeedResponseSerializer(
                payload,
                context={
                    "user": request.user,
                    "request": request,
                    "bookmarked_news_ids": bookmarked_news_ids,
                },
            ).data
        )

    def post(self, request):
        if not request.user or not request.user.is_authenticated:
            return Response({"detail": "Authentication credentials were not provided."}, status=status.HTTP_401_UNAUTHORIZED)

        serializer = CreateNewsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            news = create_news_with_targets(
                user=request.user,
                title=serializer.validated_data["title"],
                description=serializer.validated_data["description"],
                publisher_type=serializer.validated_data["publisher_type"],
                publisher_id=serializer.validated_data.get("publisher_id"),
                include_targets=serializer.validated_data["include_targets"],
                exclude_targets=serializer.validated_data.get("exclude_targets", []),
                save_as_draft=serializer.validated_data.get("save_as_draft", False),
                image_asset=serializer.validated_data.get("image_asset"),
            )
        except NewsValidationError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        response_data = NewsSerializer(news, context={"request": request}).data
        if news.status == News.Status.PENDING_APPROVAL:
            response_data["message"] = "This audience is outside your permission scope. Your news was sent for approval."
        elif news.status == News.Status.DRAFT:
            response_data["message"] = "News saved as draft."
        else:
            notify_published_news(news)
            response_data["message"] = "News published successfully."
        return Response(response_data, status=status.HTTP_201_CREATED)


class NewsDetailView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, pk: int):
        news = _build_news_queryset_with_relations().filter(pk=pk, status=News.Status.PUBLISHED).first()
        if news is None or not is_news_visible_to_user(news, request.user):
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        related_items = _get_visible_published_news(request.user, exclude_news_id=news.id)[:2]
        bookmarked_news_ids = _get_bookmarked_news_ids(request.user, [news.id, *[item.id for item in related_items]])
        return Response(
            NewsDetailSerializer(
                news,
                context={
                    "request": request,
                    "related_items": related_items,
                    "bookmarked_news_ids": bookmarked_news_ids,
                },
            ).data
        )


class NewsImageUploadSessionView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        if not user_can_create_news(request.user):
            return Response({"detail": "You do not have permission to upload news images."}, status=status.HTTP_403_FORBIDDEN)
        serializer = NewsUploadSessionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        session = create_upload_session(
            prefix="news/images",
            owner_id=request.user.id,
            filename=serializer.validated_data["filename"],
            visibility="public",
        )
        return Response(session.__dict__)


class NewsMediaAssetFinalizeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        if not user_can_create_news(request.user):
            return Response({"detail": "You do not have permission to upload news images."}, status=status.HTTP_403_FORBIDDEN)
        serializer = NewsMediaAssetFinalizeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            media_asset = finalize_media_asset(
                payload=serializer.validated_data,
                request=request,
                uploader=request.user,
                expected_prefix=f"news/images/{request.user.id}/",
                expected_prefix_error="Object key does not match the news upload path.",
                visibility=MediaAsset.Visibility.PUBLIC,
                moderation_status=MediaAsset.ModerationStatus.APPROVED,
            )
        except ValidationError as exc:
            return Response(exc.detail, status=status.HTTP_400_BAD_REQUEST)
        return Response(build_media_asset_response(media_asset, request=request), status=status.HTTP_201_CREATED)


class NewsBookmarkToggleView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk: int):
        news = _build_news_queryset_with_relations().filter(pk=pk, status=News.Status.PUBLISHED).first()
        if news is None or not is_news_visible_to_user(news, request.user):
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        bookmark, created = NewsBookmark.objects.get_or_create(user=request.user, news=news)
        if not created:
            bookmark.delete()

        return Response({"news_id": news.id, "is_bookmarked": created})


class NewsApproveView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk: int):
        news = News.objects.prefetch_related("targets").select_related("created_by", "image_asset").filter(pk=pk).first()
        if news is None:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        if news.status != News.Status.PENDING_APPROVAL:
            return Response({"detail": "Only pending news can be approved."}, status=status.HTTP_400_BAD_REQUEST)
        if not can_user_review_news(request.user, news):
            return Response({"detail": "You do not have permission to approve this news item."}, status=status.HTTP_403_FORBIDDEN)

        news.publish(approved_by=request.user)
        news.save(update_fields=["status", "approved_by", "published_at", "rejection_reason"])
        notify_published_news(news)
        return Response(NewsSerializer(news, context={"request": request}).data)


class NewsRejectView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk: int):
        news = News.objects.prefetch_related("targets").select_related("created_by", "image_asset").filter(pk=pk).first()
        if news is None:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        if news.status != News.Status.PENDING_APPROVAL:
            return Response({"detail": "Only pending news can be rejected."}, status=status.HTTP_400_BAD_REQUEST)
        if not can_user_review_news(request.user, news):
            return Response({"detail": "You do not have permission to reject this news item."}, status=status.HTTP_403_FORBIDDEN)

        serializer = RejectNewsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        news.status = News.Status.REJECTED
        news.approved_by = request.user
        news.rejection_reason = serializer.validated_data.get("rejection_reason", "")
        news.save(update_fields=["status", "approved_by", "rejection_reason", "updated_at"])
        return Response(NewsSerializer(news, context={"request": request}).data)


class MeetingListCreateView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        view_mode = request.query_params.get("view", "upcoming")
        now = timezone.now()

        if view_mode == "upcoming":
            visible_meetings = get_visible_meetings_for_user(request.user, statuses=[Meeting.Status.PUBLISHED])
            meetings = [meeting for meeting in visible_meetings if meeting.start_datetime >= now and meeting.status == Meeting.Status.PUBLISHED]
            meetings.sort(key=lambda meeting: (meeting.start_datetime, meeting.id))
        elif view_mode == "past":
            visible_meetings = get_visible_meetings_for_user(request.user, statuses=[Meeting.Status.PUBLISHED, Meeting.Status.COMPLETED])
            meetings = [meeting for meeting in visible_meetings if meeting.end_datetime < now or meeting.status == Meeting.Status.COMPLETED]
            meetings.sort(key=lambda meeting: (meeting.start_datetime, meeting.id), reverse=True)
        elif view_mode == "my_responses":
            if not request.user or not request.user.is_authenticated:
                return Response({"detail": "Authentication credentials were not provided."}, status=status.HTTP_401_UNAUTHORIZED)
            visible_meetings = get_visible_meetings_for_user(request.user, statuses=[Meeting.Status.PUBLISHED, Meeting.Status.COMPLETED])
            meetings = [meeting for meeting in visible_meetings if any(response.user_id == request.user.id for response in meeting.responses.all())]
            meetings.sort(key=lambda meeting: (meeting.start_datetime, meeting.id))
        elif view_mode == "organized_by_me":
            if not request.user or not request.user.is_authenticated:
                return Response({"detail": "Authentication credentials were not provided."}, status=status.HTTP_401_UNAUTHORIZED)
            meetings = [meeting for meeting in _build_meeting_queryset_with_relations() if can_manage_meeting(request.user, meeting)]
            meetings.sort(key=lambda meeting: (meeting.start_datetime, meeting.id))
        else:
            return Response({"detail": "Unsupported meeting filter."}, status=status.HTTP_400_BAD_REQUEST)

        return Response(MeetingSerializer(meetings, many=True, context={"user": request.user}).data)

    def post(self, request):
        if not request.user or not request.user.is_authenticated:
            return Response({"detail": "Authentication credentials were not provided."}, status=status.HTTP_401_UNAUTHORIZED)

        serializer = CreateMeetingSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            meeting = create_meeting_with_targets(
                user=request.user,
                title=serializer.validated_data["title"],
                description=serializer.validated_data["description"],
                organizer_type=serializer.validated_data["organizer_type"],
                organizer_id=serializer.validated_data.get("organizer_id"),
                start_datetime=serializer.validated_data["start_datetime"],
                end_datetime=serializer.validated_data["end_datetime"],
                venue_name=serializer.validated_data.get("venue_name", ""),
                venue_address=serializer.validated_data.get("venue_address", ""),
                google_maps_link=serializer.validated_data.get("google_maps_link", ""),
                meeting_mode=serializer.validated_data["meeting_mode"],
                online_meeting_link=serializer.validated_data.get("online_meeting_link", ""),
                include_targets=serializer.validated_data["include_targets"],
                exclude_targets=serializer.validated_data.get("exclude_targets", []),
                save_as_draft=serializer.validated_data.get("save_as_draft", False),
            )
        except NewsValidationError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        response_data = MeetingSerializer(meeting, context={"user": request.user}).data
        if meeting.status == Meeting.Status.PUBLISHED:
            notify_published_meeting(meeting)
        response_data["message"] = "Meeting saved as draft." if meeting.status == Meeting.Status.DRAFT else "Meeting published successfully."
        return Response(response_data, status=status.HTTP_201_CREATED)


class MeetingDetailView(APIView):
    permission_classes = [permissions.AllowAny]

    def get_object(self, pk: int) -> Meeting:
        return get_object_or_404(_build_meeting_queryset_with_relations(), pk=pk)

    def get(self, request, pk: int):
        meeting = self.get_object(pk)
        if meeting.status not in {Meeting.Status.PUBLISHED, Meeting.Status.COMPLETED} and not can_manage_meeting(request.user, meeting):
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        if meeting.status in {Meeting.Status.PUBLISHED, Meeting.Status.COMPLETED} and not is_meeting_visible_to_user(meeting, request.user) and not can_manage_meeting(request.user, meeting):
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(MeetingSerializer(meeting, context={"user": request.user}).data)

    def patch(self, request, pk: int):
        if not request.user or not request.user.is_authenticated:
            return Response({"detail": "Authentication credentials were not provided."}, status=status.HTTP_401_UNAUTHORIZED)

        meeting = self.get_object(pk)
        if not can_manage_meeting(request.user, meeting):
            return Response({"detail": "You do not have permission to manage this meeting."}, status=status.HTTP_403_FORBIDDEN)
        previous_status = meeting.status

        serializer = UpdateMeetingSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        payload = {key: value for key, value in serializer.validated_data.items() if key not in {"include_targets", "exclude_targets"}}

        try:
            updated_meeting = update_meeting_with_targets(
                meeting=meeting,
                user=request.user,
                payload=payload,
                include_targets=serializer.validated_data.get("include_targets"),
                exclude_targets=serializer.validated_data.get("exclude_targets"),
            )
        except NewsValidationError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        if previous_status != Meeting.Status.PUBLISHED and updated_meeting.status == Meeting.Status.PUBLISHED:
            notify_published_meeting(updated_meeting)
        return Response(MeetingSerializer(updated_meeting, context={"user": request.user}).data)


class MeetingCancelView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk: int):
        meeting = get_object_or_404(_build_meeting_queryset_with_relations(), pk=pk)
        if not can_manage_meeting(request.user, meeting):
            return Response({"detail": "You do not have permission to manage this meeting."}, status=status.HTTP_403_FORBIDDEN)

        meeting.status = Meeting.Status.CANCELLED
        meeting.save(update_fields=["status", "updated_at"])
        return Response(MeetingSerializer(meeting, context={"user": request.user}).data)


class MeetingRespondView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk: int):
        meeting = get_object_or_404(_build_meeting_queryset_with_relations(), pk=pk)
        serializer = MeetingRespondSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            respond_to_meeting(meeting=meeting, user=request.user, response=serializer.validated_data["response"])
        except NewsValidationError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        meeting.refresh_from_db()
        return Response(MeetingSerializer(meeting, context={"user": request.user}).data)
