from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase


class NewsFeedTests(APITestCase):
    def test_news_feed_is_public(self):
        response = self.client.get(reverse("news_feed"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("urgent_alert", response.data)
        self.assertIn("meetings", response.data)
        self.assertIn("ticker", response.data)
