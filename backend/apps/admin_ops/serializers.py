from rest_framework import serializers

from apps.regions.models import Association, DistrictOperationalUnit, RegionState, Unit
from apps.regions.serializers import AssociationSerializer, DistrictOperationalUnitSerializer, RegionStateSerializer, UnitSerializer


class AssociationCreateSerializer(serializers.Serializer):
    state_id = serializers.PrimaryKeyRelatedField(queryset=RegionState.objects.all(), source="state")
    name = serializers.CharField(max_length=100)

    def validate_name(self, value: str) -> str:
        normalized = " ".join(value.split()).strip()
        if not normalized:
            raise serializers.ValidationError("Association name cannot be blank.")
        return normalized

    def validate(self, attrs):
        if Association.objects.filter(state=attrs["state"], name__iexact=attrs["name"]).exists():
            raise serializers.ValidationError({"name": "An association with this name already exists under the selected state."})
        return attrs

    def create(self, validated_data):
        return Association.objects.create(**validated_data)


class BulkNameListSerializer(serializers.Serializer):
    names = serializers.ListField(child=serializers.CharField(max_length=100), allow_empty=False)

    def validate_names(self, values: list[str]) -> list[str]:
        normalized_names: list[str] = []
        seen: set[str] = set()

        for value in values:
            normalized = " ".join(value.split()).strip()
            if not normalized:
                raise serializers.ValidationError("Names must not be blank.")

            key = normalized.casefold()
            if key in seen:
                raise serializers.ValidationError(f"Duplicate name '{normalized}' appears more than once in the request.")

            seen.add(key)
            normalized_names.append(normalized)

        return normalized_names


class DistrictUnitBulkCreateSerializer(BulkNameListSerializer):
    association_id = serializers.PrimaryKeyRelatedField(queryset=Association.objects.all(), source="association")


class UnitBulkCreateSerializer(BulkNameListSerializer):
    district_operational_unit_id = serializers.PrimaryKeyRelatedField(
        queryset=DistrictOperationalUnit.objects.all(),
        source="district_operational_unit",
    )


class HierarchyMutationResultSerializer(serializers.Serializer):
    created = serializers.ListField(child=serializers.DictField())
    skipped_existing = serializers.ListField(child=serializers.CharField())
    created_count = serializers.IntegerField()
    skipped_count = serializers.IntegerField()


class SuperAdminHierarchySerializer(serializers.Serializer):
    states = RegionStateSerializer(many=True)


def build_bulk_create_result(*, names: list[str], existing_lookup: dict[str, object], create_callback) -> dict[str, object]:
    created = []
    skipped_existing = []

    for name in names:
        key = name.casefold()
        if key in existing_lookup:
            skipped_existing.append(name)
            continue

        instance = create_callback(name)
        existing_lookup[key] = instance
        created.append(instance)

    return {
        "created": created,
        "skipped_existing": skipped_existing,
        "created_count": len(created),
        "skipped_count": len(skipped_existing),
    }


def serialize_bulk_associations(result: dict[str, object]) -> dict[str, object]:
    return {
        "created": AssociationSerializer(result["created"], many=True).data,
        "skipped_existing": result["skipped_existing"],
        "created_count": result["created_count"],
        "skipped_count": result["skipped_count"],
    }


def serialize_bulk_district_units(result: dict[str, object]) -> dict[str, object]:
    return {
        "created": DistrictOperationalUnitSerializer(result["created"], many=True).data,
        "skipped_existing": result["skipped_existing"],
        "created_count": result["created_count"],
        "skipped_count": result["skipped_count"],
    }


def serialize_bulk_units(result: dict[str, object]) -> dict[str, object]:
    return {
        "created": UnitSerializer(result["created"], many=True).data,
        "skipped_existing": result["skipped_existing"],
        "created_count": result["created_count"],
        "skipped_count": result["skipped_count"],
    }
