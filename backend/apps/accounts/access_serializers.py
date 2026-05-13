from __future__ import annotations

from rest_framework import serializers

from apps.regions.models import Association, DistrictOperationalUnit, RegionState, Unit

from .access_services import derive_association_request_owner, derive_company_request_owner, normalize_email, normalize_name
from .models import AccountActivationToken, AssociationAdminAccessRequest, CompanyAdminAccessRequest
from .serializers import (
    AssociationReferenceField,
    DistrictOperationalUnitReferenceField,
    StateReferenceField,
    UnitReferenceField,
)


class CompanyAdminAccessRequestCreateSerializer(serializers.ModelSerializer):
    state_id = serializers.PrimaryKeyRelatedField(queryset=RegionState.objects.all(), source="state")
    association_id = serializers.PrimaryKeyRelatedField(queryset=Association.objects.all(), source="association", required=False, allow_null=True)
    district_operational_unit_id = serializers.PrimaryKeyRelatedField(
        queryset=DistrictOperationalUnit.objects.all(),
        source="district_operational_unit",
        required=False,
        allow_null=True,
    )
    unit_id = serializers.PrimaryKeyRelatedField(queryset=Unit.objects.all(), source="unit", required=False, allow_null=True)

    class Meta:
        model = CompanyAdminAccessRequest
        fields = [
            "requester_name",
            "requester_phone",
            "requester_email",
            "company_name",
            "business_type",
            "state_id",
            "association_id",
            "district_operational_unit_id",
            "unit_id",
            "notes",
        ]

    def validate_requester_name(self, value: str) -> str:
        normalized = normalize_name(value)
        if not normalized:
            raise serializers.ValidationError("Requester name is required.")
        return normalized

    def validate_requester_phone(self, value: str) -> str:
        normalized = " ".join((value or "").split()).strip()
        if not normalized:
            raise serializers.ValidationError("Phone number is required.")
        return normalized

    def validate_requester_email(self, value: str) -> str:
        return normalize_email(value)

    def validate_company_name(self, value: str) -> str:
        normalized = normalize_name(value)
        if not normalized:
            raise serializers.ValidationError("Company name is required.")
        return normalized

    def validate_business_type(self, value: str) -> str:
        normalized = normalize_name(value)
        if not normalized:
            raise serializers.ValidationError("Business type is required.")
        return normalized

    def validate_notes(self, value: str) -> str:
        return value.strip()

    def validate(self, attrs):
        state = attrs["state"]
        association = attrs.get("association")
        district_operational_unit = attrs.get("district_operational_unit")
        unit = attrs.get("unit")
        if association and association.state_id != state.id:
            raise serializers.ValidationError({"association_id": "Selected association does not belong to the selected state."})
        if district_operational_unit and association is None:
            raise serializers.ValidationError({"association_id": "Association is required when selecting a district operational unit."})
        if district_operational_unit and district_operational_unit.association_id != association.id:
            raise serializers.ValidationError(
                {"district_operational_unit_id": "Selected district operational unit does not belong to the selected association."}
            )
        if unit and district_operational_unit is None:
            raise serializers.ValidationError({"district_operational_unit_id": "District operational unit is required when selecting a unit."})
        if unit and unit.district_operational_unit_id != district_operational_unit.id:
            raise serializers.ValidationError({"unit_id": "Selected unit does not belong to the selected district operational unit."})
        attrs["company_type"] = (
            CompanyAdminAccessRequest.CompanyType.ASSOCIATION_LINKED
            if association is not None
            else CompanyAdminAccessRequest.CompanyType.INDEPENDENT
        )
        owner_type, owner_scope_id = derive_company_request_owner(state=state, association=association)
        attrs["approval_owner_type"] = owner_type
        attrs["approval_owner_scope_id"] = owner_scope_id
        return attrs


class AssociationAdminAccessRequestCreateSerializer(serializers.ModelSerializer):
    state_id = serializers.PrimaryKeyRelatedField(queryset=RegionState.objects.all(), source="state")
    association_id = serializers.PrimaryKeyRelatedField(queryset=Association.objects.all(), source="association", required=False, allow_null=True)
    district_operational_unit_id = serializers.PrimaryKeyRelatedField(
        queryset=DistrictOperationalUnit.objects.all(),
        source="district_operational_unit",
        required=False,
        allow_null=True,
    )
    unit_id = serializers.PrimaryKeyRelatedField(queryset=Unit.objects.all(), source="unit", required=False, allow_null=True)

    class Meta:
        model = AssociationAdminAccessRequest
        fields = [
            "requester_name",
            "requester_phone",
            "requester_email",
            "requested_role",
            "state_id",
            "association_id",
            "district_operational_unit_id",
            "unit_id",
            "notes",
        ]

    def validate_requester_name(self, value: str) -> str:
        normalized = normalize_name(value)
        if not normalized:
            raise serializers.ValidationError("Requester name is required.")
        return normalized

    def validate_requester_phone(self, value: str) -> str:
        normalized = " ".join((value or "").split()).strip()
        if not normalized:
            raise serializers.ValidationError("Phone number is required.")
        return normalized

    def validate_requester_email(self, value: str) -> str:
        return normalize_email(value)

    def validate_notes(self, value: str) -> str:
        return value.strip()

    def validate(self, attrs):
        state = attrs["state"]
        association = attrs.get("association")
        district_operational_unit = attrs.get("district_operational_unit")
        unit = attrs.get("unit")
        if association and association.state_id != state.id:
            raise serializers.ValidationError({"association_id": "Selected association does not belong to the selected state."})
        if district_operational_unit and association is None:
            raise serializers.ValidationError({"association_id": "Association is required when selecting a district operational unit."})
        if district_operational_unit and district_operational_unit.association_id != association.id:
            raise serializers.ValidationError(
                {"district_operational_unit_id": "Selected district operational unit does not belong to the selected association."}
            )
        if unit and district_operational_unit is None:
            raise serializers.ValidationError({"district_operational_unit_id": "District operational unit is required when selecting a unit."})
        if unit and unit.district_operational_unit_id != district_operational_unit.id:
            raise serializers.ValidationError({"unit_id": "Selected unit does not belong to the selected district operational unit."})

        owner_type, owner_scope_id = derive_association_request_owner(
            requested_role=attrs["requested_role"],
            state=state,
            association=association,
            district_operational_unit=district_operational_unit,
        )
        attrs["approval_owner_type"] = owner_type
        attrs["approval_owner_scope_id"] = owner_scope_id
        return attrs


class CompanyAdminAccessRequestSerializer(serializers.ModelSerializer):
    state = StateReferenceField(read_only=True)
    association = AssociationReferenceField(read_only=True)
    district_operational_unit = DistrictOperationalUnitReferenceField(read_only=True)
    unit = UnitReferenceField(read_only=True)
    approved_by_name = serializers.CharField(source="approved_by.get_full_name", read_only=True)
    rejected_by_name = serializers.CharField(source="rejected_by.get_full_name", read_only=True)
    activation_user_email = serializers.CharField(source="resolved_user.email", read_only=True)

    class Meta:
        model = CompanyAdminAccessRequest
        fields = [
            "id",
            "requester_name",
            "requester_phone",
            "requester_email",
            "company_name",
            "business_type",
            "company_type",
            "state",
            "association",
            "district_operational_unit",
            "unit",
            "status",
            "approval_owner_type",
            "approval_owner_scope_id",
            "approved_by_name",
            "approved_at",
            "rejected_by_name",
            "rejected_at",
            "rejection_reason",
            "notes",
            "activation_user_email",
            "created_at",
            "updated_at",
        ]


class AssociationAdminAccessRequestSerializer(serializers.ModelSerializer):
    state = StateReferenceField(read_only=True)
    association = AssociationReferenceField(read_only=True)
    district_operational_unit = DistrictOperationalUnitReferenceField(read_only=True)
    unit = UnitReferenceField(read_only=True)
    approved_by_name = serializers.CharField(source="approved_by.get_full_name", read_only=True)
    rejected_by_name = serializers.CharField(source="rejected_by.get_full_name", read_only=True)
    activation_user_email = serializers.CharField(source="resolved_user.email", read_only=True)

    class Meta:
        model = AssociationAdminAccessRequest
        fields = [
            "id",
            "requester_name",
            "requester_phone",
            "requester_email",
            "requested_role",
            "state",
            "association",
            "district_operational_unit",
            "unit",
            "status",
            "approval_owner_type",
            "approval_owner_scope_id",
            "approved_by_name",
            "approved_at",
            "rejected_by_name",
            "rejected_at",
            "rejection_reason",
            "notes",
            "activation_user_email",
            "created_at",
            "updated_at",
        ]


class AccessRequestDecisionSerializer(serializers.Serializer):
    rejection_reason = serializers.CharField(required=False, allow_blank=True, max_length=2000)


class ActivationTokenStatusSerializer(serializers.Serializer):
    token = serializers.UUIDField(read_only=True)
    email = serializers.EmailField(read_only=True)
    user_name = serializers.CharField(read_only=True)
    expires_at = serializers.DateTimeField(read_only=True)
    is_active = serializers.BooleanField(read_only=True)
    purpose = serializers.CharField(read_only=True)


class ActivationTokenCompleteSerializer(serializers.Serializer):
    password = serializers.CharField(write_only=True, min_length=8, max_length=128)

    def validate_password(self, value: str) -> str:
        if len(value.strip()) < 8:
            raise serializers.ValidationError("Password must be at least 8 characters long.")
        return value


def build_activation_payload(token: AccountActivationToken) -> dict:
    return {
        "token": token.token,
        "email": token.user.email,
        "user_name": token.user.get_full_name().strip() or token.user.username,
        "expires_at": token.expires_at,
        "is_active": token.is_active(),
        "purpose": token.purpose,
    }
