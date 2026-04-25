from rest_framework import serializers

from .models import LocalChapter, RegionDistrict, RegionState


class LocalChapterSerializer(serializers.ModelSerializer):
    class Meta:
        model = LocalChapter
        fields = ["id", "name"]


class RegionDistrictSerializer(serializers.ModelSerializer):
    chapters = LocalChapterSerializer(many=True, read_only=True)

    class Meta:
        model = RegionDistrict
        fields = ["id", "name", "chapters"]


class RegionStateSerializer(serializers.ModelSerializer):
    districts = RegionDistrictSerializer(many=True, read_only=True)

    class Meta:
        model = RegionState
        fields = ["id", "name", "districts"]
