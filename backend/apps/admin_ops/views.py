from rest_framework import status
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.regions.models import Association, DistrictOperationalUnit, RegionState, Unit

from .permissions import IsSuperAdmin
from .serializers import (
    AssociationCreateSerializer,
    DistrictUnitBulkCreateSerializer,
    SuperAdminHierarchySerializer,
    UnitBulkCreateSerializer,
    build_bulk_create_result,
    serialize_bulk_district_units,
    serialize_bulk_units,
)


class AdminOverviewView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        return Response(
            {
                "actions": ["Ad Approval", "User Verification", "Manual Rate Update"],
                "analytics": {"active_members": 482, "annual_target": 600, "estimated_revenue": 1240000},
                "system_logs": [
                    "Reverse search assigned to supplier cluster",
                    "Manual 24K rate update recorded",
                    "Advertiser creative awaiting approval",
                ],
            }
        )


class HierarchyManagementView(APIView):
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        states = RegionState.objects.prefetch_related("associations__district_units__units").all()
        return Response(SuperAdminHierarchySerializer({"states": states}).data)


class AssociationCreateView(APIView):
    permission_classes = [IsSuperAdmin]

    def post(self, request):
        serializer = AssociationCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        association = serializer.save()
        return Response(
            {
                "id": association.id,
                "name": association.name,
                "state": {"id": association.state.id, "name": association.state.name},
            },
            status=status.HTTP_201_CREATED,
        )


class DistrictUnitBulkCreateView(APIView):
    permission_classes = [IsSuperAdmin]

    def post(self, request):
        serializer = DistrictUnitBulkCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        association = serializer.validated_data["association"]
        names = serializer.validated_data["names"]
        existing_lookup = {
            district_unit.name.casefold(): district_unit
            for district_unit in DistrictOperationalUnit.objects.filter(association=association)
        }
        result = build_bulk_create_result(
            names=names,
            existing_lookup=existing_lookup,
            create_callback=lambda name: DistrictOperationalUnit.objects.create(association=association, name=name),
        )

        return Response(
            {
                "association": {"id": association.id, "name": association.name},
                **serialize_bulk_district_units(result),
            },
            status=status.HTTP_201_CREATED,
        )


class UnitBulkCreateView(APIView):
    permission_classes = [IsSuperAdmin]

    def post(self, request):
        serializer = UnitBulkCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        district_operational_unit = serializer.validated_data["district_operational_unit"]
        names = serializer.validated_data["names"]
        existing_lookup = {
            unit.name.casefold(): unit
            for unit in Unit.objects.filter(district_operational_unit=district_operational_unit)
        }
        result = build_bulk_create_result(
            names=names,
            existing_lookup=existing_lookup,
            create_callback=lambda name: Unit.objects.create(district_operational_unit=district_operational_unit, name=name),
        )

        return Response(
            {
                "district_operational_unit": {
                    "id": district_operational_unit.id,
                    "name": district_operational_unit.name,
                },
                **serialize_bulk_units(result),
            },
            status=status.HTTP_201_CREATED,
        )
