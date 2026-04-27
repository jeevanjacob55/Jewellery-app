from rest_framework import serializers

from .models import Association, DistrictOperationalUnit, RegionState, Unit


class UnitSerializer(serializers.ModelSerializer):
    class Meta:
        model = Unit
        fields = ["id", "name"]


class DistrictOperationalUnitSerializer(serializers.ModelSerializer):
    units = UnitSerializer(many=True, read_only=True)

    class Meta:
        model = DistrictOperationalUnit
        fields = ["id", "name", "units"]


class AssociationSerializer(serializers.ModelSerializer):
    district_units = DistrictOperationalUnitSerializer(many=True, read_only=True)

    class Meta:
        model = Association
        fields = ["id", "name", "district_units"]


class RegionStateSerializer(serializers.ModelSerializer):
    associations = AssociationSerializer(many=True, read_only=True)

    class Meta:
        model = RegionState
        fields = ["id", "name", "associations"]
