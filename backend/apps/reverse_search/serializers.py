from rest_framework import serializers

from .models import ReverseSearchRequest, ReverseSearchResponse


class ReverseSearchResponseSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReverseSearchResponse
        fields = ["id", "message", "availability_label", "created_at"]


class ReverseSearchRequestSerializer(serializers.ModelSerializer):
    responses = ReverseSearchResponseSerializer(many=True, read_only=True)

    class Meta:
        model = ReverseSearchRequest
        fields = ["id", "notes", "status", "created_at", "responses"]
        read_only_fields = ["status", "created_at"]
