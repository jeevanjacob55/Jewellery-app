from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .models import LocalChapter, RegionDistrict, RegionState


class RegionHierarchyTests(APITestCase):
    def test_region_hierarchy_returns_nested_states_districts_and_chapters(self):
        state = RegionState.objects.create(name="Kerala")
        district = RegionDistrict.objects.create(state=state, name="Thrissur")
        LocalChapter.objects.create(district=district, name="Thrissur Central")

        response = self.client.get(reverse("region_hierarchy"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data[0]["name"], "Kerala")
        self.assertEqual(response.data[0]["districts"][0]["name"], "Thrissur")
        self.assertEqual(response.data[0]["districts"][0]["chapters"][0]["name"], "Thrissur Central")
