from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Association, DistrictOperationalUnit, RegionState, Unit


class RegionHierarchyTests(APITestCase):
    def test_region_hierarchy_returns_nested_states_associations_district_units_and_units(self):
        state = RegionState.objects.create(name="Kerala")
        association = Association.objects.create(state=state, name="KGSMA")
        district_unit = DistrictOperationalUnit.objects.create(association=association, name="Ernakulam District Unit")
        Unit.objects.create(district_operational_unit=district_unit, name="Kadavanthra Unit")

        response = self.client.get(reverse("region_hierarchy"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data[0]["name"], "Kerala")
        self.assertEqual(response.data[0]["associations"][0]["name"], "KGSMA")
        self.assertEqual(response.data[0]["associations"][0]["district_units"][0]["name"], "Ernakulam District Unit")
        self.assertEqual(response.data[0]["associations"][0]["district_units"][0]["units"][0]["name"], "Kadavanthra Unit")
