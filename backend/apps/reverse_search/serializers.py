from rest_framework import serializers

from apps.directory.models import MediaAsset

from .models import ReverseSearchAttachment, ReverseSearchRequest, ReverseSearchResponse


class ReverseSearchResponseSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReverseSearchResponse
        fields = ["id", "message", "availability_label", "created_at"]


class ReverseSearchAttachmentSerializer(serializers.ModelSerializer):
    original_filename = serializers.CharField(source="asset.original_filename")
    object_key = serializers.CharField(source="asset.object_key")
    visibility = serializers.CharField(source="asset.visibility")
    moderation_status = serializers.CharField(source="asset.moderation_status")
    uploaded_at = serializers.DateTimeField(source="asset.uploaded_at")

    class Meta:
        model = ReverseSearchAttachment
        fields = ["id", "original_filename", "object_key", "visibility", "moderation_status", "uploaded_at"]


class ReverseSearchRequestSerializer(serializers.ModelSerializer):
    responses = ReverseSearchResponseSerializer(many=True, read_only=True)
    attachments = ReverseSearchAttachmentSerializer(many=True, read_only=True)

    class Meta:
        model = ReverseSearchRequest
        fields = ["id", "notes", "status", "created_at", "attachments", "responses"]
        read_only_fields = ["status", "created_at"]


class ReverseSearchUploadSessionSerializer(serializers.Serializer):
    request_id = serializers.IntegerField()
    filename = serializers.CharField(max_length=255)


class ReverseSearchFinalizeAttachmentSerializer(serializers.Serializer):
    request_id = serializers.IntegerField()
    object_key = serializers.CharField(max_length=500)
    bucket_name = serializers.CharField(max_length=255)
    original_filename = serializers.CharField(max_length=255)
    mime_type = serializers.CharField(max_length=120)
    file_size = serializers.IntegerField(min_value=0)
    width = serializers.IntegerField(min_value=0)
    height = serializers.IntegerField(min_value=0)

    def validate_mime_type(self, value: str) -> str:
        allowed = {"image/jpeg", "image/png", "image/webp"}
        if value not in allowed:
            raise serializers.ValidationError("Unsupported image type.")
        return value
