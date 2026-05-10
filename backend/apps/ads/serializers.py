from __future__ import annotations

from rest_framework import serializers

from apps.directory.models import MediaAsset
from apps.regions.models import Association, DistrictOperationalUnit, RegionState, Unit
from config.storage import resolve_public_media_url

from .models import AdAsset, AdClick, AdImpression, AdTargeting, Advertisement


def get_advertisement_image_url(advertisement: Advertisement, request=None) -> str | None:
    for ad_asset in advertisement.assets.select_related("asset").order_by("id"):
        return resolve_public_media_url(ad_asset.asset.object_key, ad_asset.asset.public_url, request=request)
    return None


class AdvertisementSerializer(serializers.ModelSerializer):
    label = serializers.CharField(source="label_text", read_only=True)
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = Advertisement
        fields = [
            "id",
            "label",
            "title",
            "description",
            "image_url",
            "background_color",
            "action_type",
            "action_payload",
        ]

    def get_image_url(self, obj: Advertisement) -> str | None:
        return get_advertisement_image_url(obj, request=self.context.get("request"))


class AdEventSerializer(serializers.Serializer):
    placement = serializers.CharField(max_length=50)
    guest_id = serializers.CharField(max_length=255, required=False, allow_blank=False)


class AdImpressionSerializer(serializers.ModelSerializer):
    class Meta:
        model = AdImpression
        fields = ["id", "placement", "guest_id", "viewed_at"]
        read_only_fields = ["id", "viewed_at"]


class AdClickSerializer(serializers.ModelSerializer):
    class Meta:
        model = AdClick
        fields = ["id", "placement", "guest_id", "action_type", "action_payload", "clicked_at"]
        read_only_fields = ["id", "action_type", "action_payload", "clicked_at"]


class AdvertisementMediaAssetFinalizeSerializer(serializers.Serializer):
    object_key = serializers.CharField(max_length=500)
    bucket_name = serializers.CharField(max_length=255)
    original_filename = serializers.CharField(max_length=255)
    mime_type = serializers.ChoiceField(
        choices=[
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif",
        ]
    )
    file_size = serializers.IntegerField(min_value=1)
    width = serializers.IntegerField(min_value=1)
    height = serializers.IntegerField(min_value=1)


class AdvertisementTargetingWriteSerializer(serializers.Serializer):
    state_id = serializers.PrimaryKeyRelatedField(
        source="state",
        queryset=RegionState.objects.all(),
        required=False,
        allow_null=True,
    )
    association_id = serializers.PrimaryKeyRelatedField(
        source="association",
        queryset=Association.objects.all(),
        required=False,
        allow_null=True,
    )
    district_operational_unit_id = serializers.PrimaryKeyRelatedField(
        source="district_operational_unit",
        queryset=DistrictOperationalUnit.objects.all(),
        required=False,
        allow_null=True,
    )
    unit_id = serializers.PrimaryKeyRelatedField(
        source="unit",
        queryset=Unit.objects.all(),
        required=False,
        allow_null=True,
    )

    def validate(self, attrs):
        state = attrs.get("state")
        association = attrs.get("association")
        district_operational_unit = attrs.get("district_operational_unit")
        unit = attrs.get("unit")

        if unit and district_operational_unit != unit.district_operational_unit:
            raise serializers.ValidationError({"unit_id": "Selected unit does not belong to the chosen district operational unit."})
        if district_operational_unit and association != district_operational_unit.association:
            raise serializers.ValidationError(
                {"district_operational_unit_id": "Selected district operational unit does not belong to the chosen association."}
            )
        if association and state != association.state:
            raise serializers.ValidationError({"association_id": "Selected association does not belong to the chosen state."})
        return attrs


class AdvertisementCampaignWriteSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=255)
    description = serializers.CharField(required=False, allow_blank=True, default="")
    label_text = serializers.CharField(max_length=50, required=False, allow_blank=True, default="ADVERTISEMENT")
    background_color = serializers.CharField(max_length=10, required=False, allow_blank=True, default="")
    placement = serializers.ChoiceField(choices=Advertisement.Placement.choices, default=Advertisement.Placement.DASHBOARD_HERO)
    action_type = serializers.ChoiceField(choices=Advertisement.ActionType.choices, default=Advertisement.ActionType.EXTERNAL_URL)
    action_value = serializers.CharField(max_length=500, required=False, allow_blank=True, default="")
    priority = serializers.IntegerField(required=False, default=0)
    is_active = serializers.BooleanField(required=False, default=True)
    start_date = serializers.DateTimeField(required=False, allow_null=True, default=None)
    end_date = serializers.DateTimeField(required=False, allow_null=True, default=None)
    status = serializers.ChoiceField(
        choices=[
            Advertisement.Status.DRAFT,
            Advertisement.Status.SUBMITTED,
        ],
        default=Advertisement.Status.DRAFT,
    )
    asset_id = serializers.PrimaryKeyRelatedField(
        source="asset",
        queryset=MediaAsset.objects.all(),
        required=False,
        allow_null=True,
        default=None,
    )
    targeting = AdvertisementTargetingWriteSerializer(required=False, default=dict)

    def validate_background_color(self, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            return ""
        if not normalized.startswith("#") or len(normalized) not in {4, 7}:
            raise serializers.ValidationError("Enter a valid hex color such as #A94B08.")
        return normalized.upper()

    def validate(self, attrs):
        advertisement: Advertisement | None = self.context.get("advertisement")
        start_date = attrs.get("start_date")
        end_date = attrs.get("end_date")
        if start_date and end_date and start_date > end_date:
            raise serializers.ValidationError({"end_date": "End date must be after the start date."})

        action_type = attrs.get(
            "action_type",
            advertisement.action_type if advertisement is not None else Advertisement.ActionType.EXTERNAL_URL,
        )
        action_value = attrs.get(
            "action_value",
            self._get_existing_action_value(advertisement),
        ).strip()
        attrs["action_payload"] = self._build_action_payload(action_type, action_value)

        asset = attrs.get("asset")
        status_value = attrs.get(
            "status",
            advertisement.status if advertisement is not None else Advertisement.Status.DRAFT,
        )
        if status_value == Advertisement.Status.SUBMITTED and asset is None and self._get_existing_asset() is None:
            raise serializers.ValidationError({"asset_id": "A banner image is required before submitting an advertisement."})
        if status_value == Advertisement.Status.SUBMITTED and not action_value:
            raise serializers.ValidationError({"action_value": "Provide the banner action destination before submitting for review."})

        if asset is not None:
            request = self.context["request"]
            advertisement: Advertisement | None = self.context.get("advertisement")
            existing_attachment = getattr(asset, "ad_asset", None)
            if asset.uploader_id != request.user.id:
                raise serializers.ValidationError({"asset_id": "You can only attach media that you uploaded for this company."})
            if existing_attachment is not None and (advertisement is None or existing_attachment.advertisement_id != advertisement.id):
                raise serializers.ValidationError({"asset_id": "This media asset is already attached to another advertisement."})
        return attrs

    def save(self, **kwargs):
        advertisement: Advertisement | None = self.context.get("advertisement")
        company = self.context["company"]
        request = self.context["request"]
        targeting_data = self.validated_data.pop("targeting", None)
        has_asset = "asset" in self.validated_data
        asset = self.validated_data.pop("asset") if has_asset else serializers.empty
        action_payload = self.validated_data.pop("action_payload")
        self.validated_data.pop("action_value", None)

        defaults = {
            **self.validated_data,
            "action_payload": action_payload,
            "advertiser": request.user,
            "company": company,
            "approved_by": None,
            "approved_at": None,
        }

        if advertisement is None:
            advertisement = Advertisement.objects.create(**defaults)
        else:
            for field, value in defaults.items():
                setattr(advertisement, field, value)
            advertisement.save()

        targeting, _ = AdTargeting.objects.get_or_create(advertisement=advertisement)
        if targeting_data is not None:
            targeting.state = targeting_data.get("state", targeting.state)
            targeting.association = targeting_data.get("association", targeting.association)
            targeting.district_operational_unit = targeting_data.get("district_operational_unit", targeting.district_operational_unit)
            targeting.unit = targeting_data.get("unit", targeting.unit)
        targeting.full_clean()
        targeting.save()
        advertisement.reach = self._build_reach(
            {
                "state": targeting.state,
                "association": targeting.association,
                "district_operational_unit": targeting.district_operational_unit,
                "unit": targeting.unit,
            }
        )
        advertisement.save(update_fields=["reach", "updated_at"])

        if asset is not serializers.empty:
            current_asset = advertisement.assets.order_by("id").first()
            if asset is None:
                if current_asset is not None:
                    current_asset.delete()
            elif current_asset is None:
                AdAsset.objects.create(advertisement=advertisement, asset=asset, placement=advertisement.placement)
            elif current_asset.asset_id != asset.id:
                current_asset.delete()
                AdAsset.objects.create(advertisement=advertisement, asset=asset, placement=advertisement.placement)
            elif current_asset.placement != advertisement.placement:
                current_asset.placement = advertisement.placement
                current_asset.save(update_fields=["placement"])
        else:
            current_asset = advertisement.assets.order_by("id").first()
            if current_asset is not None and current_asset.placement != advertisement.placement:
                current_asset.placement = advertisement.placement
                current_asset.save(update_fields=["placement"])

        return advertisement

    def _get_existing_asset(self) -> MediaAsset | None:
        advertisement: Advertisement | None = self.context.get("advertisement")
        if advertisement is None:
            return None
        current_asset = advertisement.assets.order_by("id").first()
        return current_asset.asset if current_asset is not None else None

    def _get_existing_action_value(self, advertisement: Advertisement | None) -> str:
        if advertisement is None:
            return ""
        payload = advertisement.action_payload or {}
        if advertisement.action_type == Advertisement.ActionType.EXTERNAL_URL:
            return str(payload.get("url", ""))
        if advertisement.action_type == Advertisement.ActionType.INTERNAL_SCREEN:
            return str(payload.get("screen", ""))
        if advertisement.action_type == Advertisement.ActionType.PRODUCT:
            return str(payload.get("product_id", ""))
        if advertisement.action_type == Advertisement.ActionType.COMPANY:
            return str(payload.get("company_id", ""))
        return str(payload.get("category", ""))

    def _build_reach(self, targeting_data: dict) -> str:
        if targeting_data.get("unit") is not None:
            return "unit"
        if targeting_data.get("district_operational_unit") is not None:
            return "district_operational_unit"
        if targeting_data.get("association") is not None:
            return "association"
        if targeting_data.get("state") is not None:
            return "state"
        return "platform"

    def _build_action_payload(self, action_type: str, action_value: str) -> dict:
        if not action_value:
            return {}
        if action_type == Advertisement.ActionType.EXTERNAL_URL:
            return {"url": action_value}
        if action_type == Advertisement.ActionType.INTERNAL_SCREEN:
            return {"screen": action_value}
        if action_type == Advertisement.ActionType.PRODUCT:
            try:
                return {"product_id": int(action_value)}
            except ValueError as exc:
                raise serializers.ValidationError({"action_value": "Enter a numeric product id."}) from exc
        if action_type == Advertisement.ActionType.COMPANY:
            try:
                return {"company_id": int(action_value)}
            except ValueError as exc:
                raise serializers.ValidationError({"action_value": "Enter a numeric company id."}) from exc
        return {"category": action_value}


class AdvertisementTargetingReadSerializer(serializers.Serializer):
    state_id = serializers.IntegerField(source="state.id", allow_null=True, read_only=True)
    state_name = serializers.CharField(source="state.name", allow_null=True, read_only=True)
    association_id = serializers.IntegerField(source="association.id", allow_null=True, read_only=True)
    association_name = serializers.CharField(source="association.name", allow_null=True, read_only=True)
    district_operational_unit_id = serializers.IntegerField(source="district_operational_unit.id", allow_null=True, read_only=True)
    district_operational_unit_name = serializers.CharField(source="district_operational_unit.name", allow_null=True, read_only=True)
    unit_id = serializers.IntegerField(source="unit.id", allow_null=True, read_only=True)
    unit_name = serializers.CharField(source="unit.name", allow_null=True, read_only=True)


class AdvertisementCampaignSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()
    asset_id = serializers.SerializerMethodField()
    action_value = serializers.SerializerMethodField()
    advertiser_name = serializers.SerializerMethodField()
    company = serializers.SerializerMethodField()
    targeting = serializers.SerializerMethodField()
    approved_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Advertisement
        fields = [
            "id",
            "title",
            "description",
            "label_text",
            "background_color",
            "placement",
            "action_type",
            "action_payload",
            "action_value",
            "priority",
            "is_active",
            "reach",
            "status",
            "start_date",
            "end_date",
            "approved_at",
            "approved_by_name",
            "created_at",
            "updated_at",
            "image_url",
            "asset_id",
            "advertiser_name",
            "company",
            "targeting",
        ]

    def get_image_url(self, obj: Advertisement) -> str | None:
        return get_advertisement_image_url(obj, request=self.context.get("request"))

    def get_asset_id(self, obj: Advertisement) -> int | None:
        first_asset = obj.assets.order_by("id").first()
        return first_asset.asset_id if first_asset is not None else None

    def get_action_value(self, obj: Advertisement) -> str:
        payload = obj.action_payload or {}
        if obj.action_type == Advertisement.ActionType.EXTERNAL_URL:
            return str(payload.get("url", ""))
        if obj.action_type == Advertisement.ActionType.INTERNAL_SCREEN:
            return str(payload.get("screen", ""))
        if obj.action_type == Advertisement.ActionType.PRODUCT:
            return str(payload.get("product_id", ""))
        if obj.action_type == Advertisement.ActionType.COMPANY:
            return str(payload.get("company_id", ""))
        return str(payload.get("category", ""))

    def get_advertiser_name(self, obj: Advertisement) -> str:
        full_name = f"{obj.advertiser.first_name} {obj.advertiser.last_name}".strip()
        return full_name or obj.advertiser.username

    def get_company(self, obj: Advertisement) -> dict | None:
        if obj.company_id is None:
            return None
        return {
            "id": obj.company.id,
            "name": obj.company.name,
            "is_active": obj.company.is_active,
            "is_approved": obj.company.is_approved,
        }

    def get_targeting(self, obj: Advertisement) -> dict:
        targeting = getattr(obj, "targeting", None)
        if targeting is None:
            return {
                "state_id": None,
                "state_name": None,
                "association_id": None,
                "association_name": None,
                "district_operational_unit_id": None,
                "district_operational_unit_name": None,
                "unit_id": None,
                "unit_name": None,
            }
        return AdvertisementTargetingReadSerializer(targeting).data

    def get_approved_by_name(self, obj: Advertisement) -> str | None:
        if obj.approved_by_id is None:
            return None
        full_name = f"{obj.approved_by.first_name} {obj.approved_by.last_name}".strip()
        return full_name or obj.approved_by.username
