from rest_framework import serializers

from apps.media_platform.models import MediaAsset
from apps.media_platform.service import resolve_media_asset_url

from .models import Meeting, MeetingResponse, MeetingTarget, News, NewsTarget


def get_news_image_url(news: News, *, request) -> str | None:
    image_asset_url = resolve_media_asset_url(getattr(news, "image_asset", None), request=request)
    if image_asset_url:
        return image_asset_url
    if not news.image:
        return None
    image_url = news.image.url
    if image_url and not image_url.startswith(("http://", "https://", "/")):
        image_url = f"/{image_url}"
    if request is None:
        return image_url
    return request.build_absolute_uri(image_url)

class UrgentAlertSerializer(serializers.Serializer):
    title = serializers.CharField()
    summary = serializers.CharField(allow_blank=True)


class MeetingFeedSerializer(serializers.ModelSerializer):
    current_user_response = serializers.SerializerMethodField()

    class Meta:
        model = Meeting
        fields = [
            "id",
            "title",
            "start_datetime",
            "venue_name",
            "venue_address",
            "google_maps_link",
            "meeting_mode",
            "online_meeting_link",
            "current_user_response",
        ]

    def get_current_user_response(self, obj: Meeting) -> str | None:
        user = self.context.get("user")
        if not user or not getattr(user, "is_authenticated", False):
            return None
        for response in obj.responses.all():
            if response.user_id == user.id:
                return response.response
        return None


class TickerSerializer(serializers.Serializer):
    gold = serializers.FloatField()
    silver = serializers.FloatField()


class NewsFeedItemSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()
    is_bookmarked = serializers.SerializerMethodField()

    class Meta:
        model = News
        fields = ["id", "title", "description", "publisher_type", "publisher_id", "published_at", "image_url", "is_bookmarked"]

    def get_image_url(self, obj: News) -> str | None:
        return get_news_image_url(obj, request=self.context.get("request"))

    def get_is_bookmarked(self, obj: News) -> bool:
        bookmarked_ids = self.context.get("bookmarked_news_ids", set())
        return obj.id in bookmarked_ids


class NewsFeedResponseSerializer(serializers.Serializer):
    urgent_alert = UrgentAlertSerializer()
    featured_news = NewsFeedItemSerializer(allow_null=True, required=False)
    meetings = MeetingFeedSerializer(many=True)
    ticker = TickerSerializer()
    items = NewsFeedItemSerializer(many=True)


class NewsDetailSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()
    is_bookmarked = serializers.SerializerMethodField()
    related_items = serializers.SerializerMethodField()

    class Meta:
        model = News
        fields = ["id", "title", "description", "publisher_type", "publisher_id", "published_at", "image_url", "is_bookmarked", "related_items"]

    def get_image_url(self, obj: News) -> str | None:
        return get_news_image_url(obj, request=self.context.get("request"))

    def get_is_bookmarked(self, obj: News) -> bool:
        bookmarked_ids = self.context.get("bookmarked_news_ids", set())
        return obj.id in bookmarked_ids

    def get_related_items(self, obj: News):
        related_items = self.context.get("related_items", [])
        return NewsFeedItemSerializer(related_items, many=True, context=self.context).data


class NewsTargetInputSerializer(serializers.Serializer):
    target_type = serializers.ChoiceField(choices=NewsTarget.TargetType.choices)
    target_id = serializers.IntegerField(required=False, allow_null=True, min_value=1)


class MeetingTargetInputSerializer(serializers.Serializer):
    target_type = serializers.ChoiceField(choices=MeetingTarget.TargetType.choices)
    target_id = serializers.IntegerField(required=False, allow_null=True, min_value=1)


class NewsTargetSerializer(serializers.ModelSerializer):
    class Meta:
        model = NewsTarget
        fields = ["id", "target_type", "target_id", "mode"]


class NewsSerializer(serializers.ModelSerializer):
    targets = NewsTargetSerializer(many=True, read_only=True)
    created_by_id = serializers.IntegerField(source="created_by.id", read_only=True)
    approved_by_id = serializers.IntegerField(source="approved_by.id", read_only=True)
    image_url = serializers.SerializerMethodField()
    image_asset_id = serializers.IntegerField(source="image_asset.id", read_only=True, allow_null=True)

    class Meta:
        model = News
        fields = [
            "id",
            "title",
            "description",
            "image_url",
            "image_asset_id",
            "created_by_id",
            "publisher_type",
            "publisher_id",
            "status",
            "approved_by_id",
            "published_at",
            "rejection_reason",
            "created_at",
            "updated_at",
            "targets",
        ]

    def get_image_url(self, obj: News) -> str | None:
        return get_news_image_url(obj, request=self.context.get("request"))


class CreateNewsSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=255)
    description = serializers.CharField()
    image_asset_id = serializers.PrimaryKeyRelatedField(queryset=MediaAsset.objects.all(), source="image_asset", required=False, allow_null=True, default=None)
    publisher_type = serializers.ChoiceField(choices=News.PublisherType.choices)
    publisher_id = serializers.IntegerField(required=False, allow_null=True, min_value=1)
    include_targets = NewsTargetInputSerializer(many=True)
    exclude_targets = NewsTargetInputSerializer(many=True, required=False, default=list)
    save_as_draft = serializers.BooleanField(required=False, default=False)


class NewsUploadSessionSerializer(serializers.Serializer):
    filename = serializers.CharField(max_length=255, required=False, default="news-image.jpg")


class NewsMediaAssetFinalizeSerializer(serializers.Serializer):
    object_key = serializers.CharField(max_length=500)
    bucket_name = serializers.CharField(max_length=255)
    original_filename = serializers.CharField(max_length=255)
    mime_type = serializers.CharField(max_length=120)
    file_size = serializers.IntegerField(min_value=1)
    width = serializers.IntegerField(min_value=0)
    height = serializers.IntegerField(min_value=0)

    def validate_mime_type(self, value: str) -> str:
        allowed = {"image/jpeg", "image/png", "image/webp"}
        if value not in allowed:
            raise serializers.ValidationError("Unsupported image type.")
        return value


class RejectNewsSerializer(serializers.Serializer):
    rejection_reason = serializers.CharField(required=False, allow_blank=True)


class MeetingTargetSerializer(serializers.ModelSerializer):
    class Meta:
        model = MeetingTarget
        fields = ["id", "target_type", "target_id", "mode"]


class MeetingResponseSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(source="user.id", read_only=True)

    class Meta:
        model = MeetingResponse
        fields = ["user_id", "response", "responded_at"]


class MeetingSerializer(serializers.ModelSerializer):
    created_by_id = serializers.IntegerField(source="created_by.id", read_only=True)
    current_user_response = serializers.SerializerMethodField()
    response_summary = serializers.SerializerMethodField()
    targets = MeetingTargetSerializer(many=True, read_only=True)

    class Meta:
        model = Meeting
        fields = [
            "id",
            "title",
            "description",
            "created_by_id",
            "organizer_type",
            "organizer_id",
            "start_datetime",
            "end_datetime",
            "venue_name",
            "venue_address",
            "google_maps_link",
            "meeting_mode",
            "online_meeting_link",
            "status",
            "created_at",
            "updated_at",
            "current_user_response",
            "response_summary",
            "targets",
        ]

    def get_current_user_response(self, obj: Meeting) -> str | None:
        user = self.context.get("user")
        if not user or not getattr(user, "is_authenticated", False):
            return None
        for response in obj.responses.all():
            if response.user_id == user.id:
                return response.response
        return None

    def get_response_summary(self, obj: Meeting) -> dict[str, int]:
        summary = {
            MeetingResponse.ResponseType.ATTENDING: 0,
            MeetingResponse.ResponseType.MAYBE: 0,
            MeetingResponse.ResponseType.NOT_ATTENDING: 0,
        }
        for response in obj.responses.all():
            summary[response.response] = summary.get(response.response, 0) + 1
        return summary


class CreateMeetingSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=255)
    description = serializers.CharField()
    organizer_type = serializers.ChoiceField(choices=Meeting.OrganizerType.choices)
    organizer_id = serializers.IntegerField(required=False, allow_null=True, min_value=1)
    start_datetime = serializers.DateTimeField()
    end_datetime = serializers.DateTimeField()
    venue_name = serializers.CharField(max_length=255, required=False, allow_blank=True, default="")
    venue_address = serializers.CharField(required=False, allow_blank=True, default="")
    google_maps_link = serializers.URLField(required=False, allow_blank=True, default="")
    meeting_mode = serializers.ChoiceField(choices=Meeting.MeetingMode.choices)
    online_meeting_link = serializers.URLField(required=False, allow_blank=True, default="")
    include_targets = MeetingTargetInputSerializer(many=True)
    exclude_targets = MeetingTargetInputSerializer(many=True, required=False, default=list)
    save_as_draft = serializers.BooleanField(required=False, default=False)


class UpdateMeetingSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=255, required=False)
    description = serializers.CharField(required=False)
    organizer_type = serializers.ChoiceField(choices=Meeting.OrganizerType.choices, required=False)
    organizer_id = serializers.IntegerField(required=False, allow_null=True, min_value=1)
    start_datetime = serializers.DateTimeField(required=False)
    end_datetime = serializers.DateTimeField(required=False)
    venue_name = serializers.CharField(max_length=255, required=False, allow_blank=True)
    venue_address = serializers.CharField(required=False, allow_blank=True)
    google_maps_link = serializers.URLField(required=False, allow_blank=True)
    meeting_mode = serializers.ChoiceField(choices=Meeting.MeetingMode.choices, required=False)
    online_meeting_link = serializers.URLField(required=False, allow_blank=True)
    status = serializers.ChoiceField(choices=Meeting.Status.choices, required=False)
    include_targets = MeetingTargetInputSerializer(many=True, required=False)
    exclude_targets = MeetingTargetInputSerializer(many=True, required=False)


class MeetingRespondSerializer(serializers.Serializer):
    response = serializers.ChoiceField(choices=MeetingResponse.ResponseType.choices)
