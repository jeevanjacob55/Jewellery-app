from rest_framework import serializers

from apps.regions.models import Association, DistrictOperationalUnit, RegionState, Unit

from .models import AdminScopeAssignment, MemberAccessRequest, MemberProfile, NotificationPreference, User, UserRole


class HierarchyReferenceSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField()


class StateReferenceField(serializers.RelatedField):
    def to_representation(self, value):
        return {"id": value.id, "name": value.name}


class AssociationReferenceField(serializers.RelatedField):
    def to_representation(self, value):
        return {"id": value.id, "name": value.name}


class DistrictOperationalUnitReferenceField(serializers.RelatedField):
    def to_representation(self, value):
        return {"id": value.id, "name": value.name}


class UnitReferenceField(serializers.RelatedField):
    def to_representation(self, value):
        return {"id": value.id, "name": value.name}


class NotificationPreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationPreference
        fields = ["rate_alerts", "news_alerts", "ad_alerts", "meeting_alerts"]


class MemberProfileSerializer(serializers.ModelSerializer):
    state = StateReferenceField(read_only=True)
    association = AssociationReferenceField(read_only=True)
    district_operational_unit = DistrictOperationalUnitReferenceField(read_only=True)
    unit = UnitReferenceField(read_only=True)

    class Meta:
        model = MemberProfile
        fields = [
            "phone_number",
            "company_name",
            "state",
            "association",
            "district_operational_unit",
            "unit",
            "membership_tier",
        ]


class UserRoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserRole
        fields = ["role", "scope_type", "scope_id"]


class UpdateNotificationPreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationPreference
        fields = ["rate_alerts", "news_alerts", "ad_alerts", "meeting_alerts"]


class UpdateMemberProfileSerializer(serializers.ModelSerializer):
    state_id = serializers.PrimaryKeyRelatedField(queryset=RegionState.objects.all(), source="state", required=False, allow_null=True)
    association_id = serializers.PrimaryKeyRelatedField(queryset=Association.objects.all(), source="association", required=False, allow_null=True)
    district_operational_unit_id = serializers.PrimaryKeyRelatedField(
        queryset=DistrictOperationalUnit.objects.all(),
        source="district_operational_unit",
        required=False,
        allow_null=True,
    )
    unit_id = serializers.PrimaryKeyRelatedField(queryset=Unit.objects.all(), source="unit", required=False, allow_null=True)

    class Meta:
        model = MemberProfile
        fields = [
            "phone_number",
            "company_name",
            "state_id",
            "association_id",
            "district_operational_unit_id",
            "unit_id",
            "membership_tier",
        ]
        read_only_fields = ["membership_tier"]

    def validate(self, attrs):
        state = attrs.get("state", getattr(self.instance, "state", None))
        association = attrs.get("association", getattr(self.instance, "association", None))
        district_operational_unit = attrs.get("district_operational_unit", getattr(self.instance, "district_operational_unit", None))
        unit = attrs.get("unit", getattr(self.instance, "unit", None))

        hierarchy_fields_present = any(
            field in attrs for field in ["state", "association", "district_operational_unit", "unit"]
        )
        if hierarchy_fields_present and not all([state, association, district_operational_unit, unit]):
            raise serializers.ValidationError("State, association, district operational unit, and unit are all required together.")
        if unit and unit.district_operational_unit != district_operational_unit:
            raise serializers.ValidationError({"unit_id": "Selected unit does not belong to the selected district operational unit."})
        if district_operational_unit and district_operational_unit.association != association:
            raise serializers.ValidationError(
                {"district_operational_unit_id": "Selected district operational unit does not belong to the selected association."}
            )
        if association and association.state != state:
            raise serializers.ValidationError({"association_id": "Selected association does not belong to the selected state."})
        return attrs


class UpdateUserSerializer(serializers.ModelSerializer):
    member_profile = UpdateMemberProfileSerializer(required=False)

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "first_name",
            "last_name",
            "email",
            "corporate_email",
            "role",
            "jeweller_id",
            "is_verified_member",
            "onboarding_completed",
            "member_profile",
        ]
        read_only_fields = ["id", "username", "role", "jeweller_id", "is_verified_member"]

    def update(self, instance, validated_data):
        member_profile_data = validated_data.pop("member_profile", None)

        for attribute, value in validated_data.items():
            setattr(instance, attribute, value)
        instance.save()

        if member_profile_data is not None:
            profile, _ = MemberProfile.objects.get_or_create(user=instance)
            for attribute, value in member_profile_data.items():
                setattr(profile, attribute, value)
            profile.full_clean()
            profile.save()

        return instance


class UserSerializer(serializers.ModelSerializer):
    member_profile = MemberProfileSerializer(read_only=True)
    notification_preferences = NotificationPreferenceSerializer(read_only=True)
    roles = UserRoleSerializer(source="scoped_roles", many=True, read_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "first_name",
            "last_name",
            "email",
            "corporate_email",
            "role",
            "jeweller_id",
            "is_verified_member",
            "onboarding_completed",
            "member_profile",
            "notification_preferences",
            "roles",
        ]


class GuestAccessSerializer(serializers.Serializer):
    guest_name = serializers.CharField(max_length=100)
    state_id = serializers.PrimaryKeyRelatedField(queryset=RegionState.objects.all(), source="state")
    association_id = serializers.PrimaryKeyRelatedField(queryset=Association.objects.all(), source="association", required=False, allow_null=True)
    district_operational_unit_id = serializers.PrimaryKeyRelatedField(
        queryset=DistrictOperationalUnit.objects.all(),
        source="district_operational_unit",
        required=False,
        allow_null=True,
    )
    unit_id = serializers.PrimaryKeyRelatedField(queryset=Unit.objects.all(), source="unit", required=False, allow_null=True)

    def validate(self, attrs):
        state = attrs["state"]
        association = attrs.get("association")
        district_operational_unit = attrs.get("district_operational_unit")
        unit = attrs.get("unit")

        if association and association.state != state:
            raise serializers.ValidationError({"association_id": "Selected association does not belong to the selected state."})
        if district_operational_unit and not association:
            raise serializers.ValidationError({"association_id": "Association is required when selecting a district operational unit."})
        if district_operational_unit and district_operational_unit.association != association:
            raise serializers.ValidationError(
                {"district_operational_unit_id": "Selected district operational unit does not belong to the selected association."}
            )
        if unit and not district_operational_unit:
            raise serializers.ValidationError({"district_operational_unit_id": "District operational unit is required when selecting a unit."})
        if unit and unit.district_operational_unit != district_operational_unit:
            raise serializers.ValidationError({"unit_id": "Selected unit does not belong to the selected district operational unit."})
        return attrs


class MemberAccessRequestCreateSerializer(serializers.ModelSerializer):
    state_id = serializers.PrimaryKeyRelatedField(queryset=RegionState.objects.all(), source="state")
    association_id = serializers.PrimaryKeyRelatedField(queryset=Association.objects.all(), source="association")
    district_operational_unit_id = serializers.PrimaryKeyRelatedField(
        queryset=DistrictOperationalUnit.objects.all(),
        source="district_operational_unit",
    )
    unit_id = serializers.PrimaryKeyRelatedField(queryset=Unit.objects.all(), source="unit")

    class Meta:
        model = MemberAccessRequest
        fields = [
            "full_name",
            "phone_number",
            "email",
            "business_name",
            "state_id",
            "association_id",
            "district_operational_unit_id",
            "unit_id",
            "notes",
        ]

    def validate_full_name(self, value: str) -> str:
        normalized = " ".join(value.split()).strip()
        if not normalized:
            raise serializers.ValidationError("Full name is required.")
        return normalized

    def validate_business_name(self, value: str) -> str:
        normalized = " ".join(value.split()).strip()
        if not normalized:
            raise serializers.ValidationError("Business name is required.")
        return normalized

    def validate_phone_number(self, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise serializers.ValidationError("Phone number is required.")
        return normalized

    def validate_notes(self, value: str) -> str:
        return value.strip()

    def validate(self, attrs):
        state = attrs["state"]
        association = attrs["association"]
        district_operational_unit = attrs["district_operational_unit"]
        unit = attrs["unit"]

        if association.state != state:
            raise serializers.ValidationError({"association_id": "Selected association does not belong to the selected state."})
        if district_operational_unit.association != association:
            raise serializers.ValidationError(
                {"district_operational_unit_id": "Selected district operational unit does not belong to the selected association."}
            )
        if unit.district_operational_unit != district_operational_unit:
            raise serializers.ValidationError({"unit_id": "Selected unit does not belong to the selected district operational unit."})
        return attrs


class MemberAccessRequestResponseSerializer(serializers.ModelSerializer):
    state = StateReferenceField(read_only=True)
    association = AssociationReferenceField(read_only=True)
    district_operational_unit = DistrictOperationalUnitReferenceField(read_only=True)
    unit = UnitReferenceField(read_only=True)

    class Meta:
        model = MemberAccessRequest
        fields = [
            "id",
            "full_name",
            "email",
            "business_name",
            "state",
            "association",
            "district_operational_unit",
            "unit",
            "status",
            "created_at",
        ]


class AdminScopeAssignmentSerializer(serializers.ModelSerializer):
    association = AssociationReferenceField(read_only=True)
    district_operational_unit = DistrictOperationalUnitReferenceField(read_only=True)
    unit = UnitReferenceField(read_only=True)

    class Meta:
        model = AdminScopeAssignment
        fields = ["association", "district_operational_unit", "unit"]
