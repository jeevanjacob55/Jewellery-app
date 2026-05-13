from rest_framework import serializers

from apps.media_platform.models import MediaAsset
from apps.media_platform.service import resolve_media_asset_url
from apps.regions.models import Association

from .models import AssociationSpotlightMedia


class DashboardHeadlineRateSerializer(serializers.Serializer):
    value = serializers.FloatField()
    trend = serializers.CharField()
    change_value = serializers.FloatField()
    change_percent = serializers.FloatField()
    change_label = serializers.CharField()
    change_percent_label = serializers.CharField()

class DashboardHeadlineRatesSerializer(serializers.Serializer):
    gold_22k = DashboardHeadlineRateSerializer()
    gold_24k = DashboardHeadlineRateSerializer()
    silver = DashboardHeadlineRateSerializer()


class DashboardComparisonSerializer(serializers.Serializer):
    label = serializers.CharField()
    gold_22k = serializers.FloatField()


class DashboardAssociationContextSerializer(serializers.Serializer):
    id = serializers.IntegerField(allow_null=True)
    name = serializers.CharField()


class DashboardAssociationRateSummarySerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField()
    state_name = serializers.CharField()
    updated_at_label = serializers.CharField()
    gold_22k = serializers.FloatField()
    gold_24k = serializers.FloatField()
    silver = serializers.FloatField()
    headline_rates = DashboardHeadlineRatesSerializer()


class StateAssociationRateSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField()
    state_name = serializers.CharField()
    updated_at_label = serializers.CharField()
    gold_22k = serializers.FloatField()
    gold_24k = serializers.FloatField()
    silver = serializers.FloatField()
    headline_rates = DashboardHeadlineRatesSerializer()


class StateRateSummarySerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField()
    associations = StateAssociationRateSerializer(many=True)


class DashboardGlobalTrendsSerializer(serializers.Serializer):
    usd_inr = serializers.FloatField()
    gold_oz = serializers.FloatField()
    silver_oz = serializers.FloatField()


class DashboardWelcomeFilmstripItemSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    image_url = serializers.CharField()
    title = serializers.CharField(allow_blank=True)
    subtitle = serializers.CharField(allow_blank=True)


class DashboardWelcomeFilmstripSerializer(serializers.Serializer):
    enabled = serializers.BooleanField()
    association_id = serializers.IntegerField()
    duration_seconds = serializers.IntegerField()
    scroll_speed = serializers.CharField()
    reshow_policy = serializers.CharField()
    items = DashboardWelcomeFilmstripItemSerializer(many=True)


class DashboardResponseSerializer(serializers.Serializer):
    association = DashboardAssociationContextSerializer()
    updated_at_label = serializers.CharField()
    headline_rates = DashboardHeadlineRatesSerializer()
    comparisons = DashboardComparisonSerializer(many=True)
    other_associations = DashboardAssociationRateSummarySerializer(many=True)
    global_trends = DashboardGlobalTrendsSerializer()
    quick_actions = serializers.ListField(child=serializers.CharField())
    dashboard_welcome_filmstrip = DashboardWelcomeFilmstripSerializer(allow_null=True)


class StateRatesResponseSerializer(serializers.Serializer):
    states = StateRateSummarySerializer(many=True)


class AssociationRateDetailContextSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField()
    state_name = serializers.CharField()


class AssociationRateDetailGroupItemSerializer(serializers.Serializer):
    key = serializers.CharField()
    label = serializers.CharField()
    unit_label = serializers.CharField()
    value = serializers.FloatField()
    trend = serializers.CharField()
    change_value = serializers.FloatField()
    change_percent = serializers.FloatField()
    change_label = serializers.CharField()
    change_percent_label = serializers.CharField()


class AssociationRateDetailGroupSerializer(serializers.Serializer):
    key = serializers.CharField()
    title = serializers.CharField()
    icon_key = serializers.CharField()
    items = AssociationRateDetailGroupItemSerializer(many=True)


class AssociationRateDetailNoticeSerializer(serializers.Serializer):
    eyebrow = serializers.CharField()
    body = serializers.CharField()


class AssociationRateDetailResponseSerializer(serializers.Serializer):
    association = AssociationRateDetailContextSerializer()
    updated_at_label = serializers.CharField()
    hero_badge_label = serializers.CharField()
    rate_groups = AssociationRateDetailGroupSerializer(many=True)
    notice = AssociationRateDetailNoticeSerializer()


class AssociationRateCatalogSubcategorySerializer(serializers.Serializer):
    id = serializers.IntegerField(required=False)
    name = serializers.CharField(max_length=120)
    unit_label = serializers.CharField(max_length=60, required=False, allow_blank=False, default="1 Gram")
    current_value = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, allow_null=True)


class AssociationRateCatalogCategorySerializer(serializers.Serializer):
    id = serializers.IntegerField(required=False)
    name = serializers.CharField(max_length=120)
    unit_label = serializers.CharField(max_length=60, required=False, allow_blank=False, default="1 Gram")
    current_value = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, allow_null=True)
    subcategories = AssociationRateCatalogSubcategorySerializer(many=True, required=False)

    def validate(self, attrs):
        subcategories = attrs.get("subcategories") or []
        seen = set()
        for subcategory in subcategories:
            key = subcategory["name"].strip().casefold()
            if key in seen:
                raise serializers.ValidationError({"subcategories": "Subcategory names must be unique within a category."})
            seen.add(key)
        return attrs


class AssociationRateCatalogPayloadSerializer(serializers.Serializer):
    categories = AssociationRateCatalogCategorySerializer(many=True)

    def validate(self, attrs):
        seen = set()
        for category in attrs["categories"]:
            key = category["name"].strip().casefold()
            if key in seen:
                raise serializers.ValidationError({"categories": "Category names must be unique within an association."})
            seen.add(key)
        return attrs


class AssociationRateCatalogResponseSerializer(serializers.Serializer):
    association = AssociationRateDetailContextSerializer()
    updated_at_label = serializers.CharField()
    categories = AssociationRateCatalogCategorySerializer(many=True)


class AssociationSpotlightMediaSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()
    asset_id = serializers.IntegerField(read_only=True)
    association_name = serializers.CharField(source="association.name", read_only=True)
    state_name = serializers.CharField(source="association.state.name", read_only=True)

    class Meta:
        model = AssociationSpotlightMedia
        fields = [
            "id",
            "association",
            "association_name",
            "state_name",
            "asset_id",
            "image_url",
            "title",
            "subtitle",
            "sort_order",
            "is_active",
            "starts_at",
            "ends_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "association", "association_name", "state_name", "sort_order", "created_at", "updated_at"]

    def get_image_url(self, obj: AssociationSpotlightMedia) -> str:
        return resolve_media_asset_url(obj.asset, request=self.context.get("request")) or ""


class AssociationSpotlightCollectionSerializer(serializers.Serializer):
    association = AssociationRateDetailContextSerializer()
    config = serializers.SerializerMethodField()
    items = AssociationSpotlightMediaSerializer(many=True)

    def get_config(self, obj) -> dict:
        return obj["config"]


class AssociationSpotlightMediaWriteSerializer(serializers.Serializer):
    asset_id = serializers.PrimaryKeyRelatedField(queryset=MediaAsset.objects.all(), source="asset")
    title = serializers.CharField(max_length=140, required=False, allow_blank=True, default="")
    subtitle = serializers.CharField(max_length=255, required=False, allow_blank=True, default="")
    is_active = serializers.BooleanField(required=False, default=True)
    starts_at = serializers.DateTimeField(required=False, allow_null=True, default=None)
    ends_at = serializers.DateTimeField(required=False, allow_null=True, default=None)

    def validate(self, attrs):
        starts_at = attrs.get("starts_at")
        ends_at = attrs.get("ends_at")
        if starts_at and ends_at and ends_at <= starts_at:
            raise serializers.ValidationError({"ends_at": "End time must be later than start time."})
        return attrs


class AssociationSpotlightMediaReorderSerializer(serializers.Serializer):
    item_ids = serializers.ListField(child=serializers.IntegerField(min_value=1), allow_empty=False)

    def validate_item_ids(self, value):
        if len(value) != len(set(value)):
            raise serializers.ValidationError("Spotlight item ids must be unique.")
        return value


class AssociationSpotlightUploadSessionSerializer(serializers.Serializer):
    filename = serializers.CharField(max_length=255)


class AssociationSpotlightMediaFinalizeSerializer(serializers.Serializer):
    object_key = serializers.CharField(max_length=500)
    bucket_name = serializers.CharField(max_length=255)
    original_filename = serializers.CharField(max_length=255)
    mime_type = serializers.CharField(max_length=120)
    file_size = serializers.IntegerField(min_value=1)
    width = serializers.IntegerField(min_value=0)
    height = serializers.IntegerField(min_value=0)


class AssociationSpotlightAssociationSelectorSerializer(serializers.Serializer):
    association_id = serializers.PrimaryKeyRelatedField(
        queryset=Association.objects.select_related("state").all(),
        required=False,
        allow_null=True,
        source="association",
    )
