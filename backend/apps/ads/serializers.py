from __future__ import annotations

from rest_framework import serializers

from .models import AdClick, AdImpression, Advertisement


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
        return obj.image_url


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
