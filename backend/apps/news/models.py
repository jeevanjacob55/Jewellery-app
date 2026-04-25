from django.db import models


class NewsItem(models.Model):
    title = models.CharField(max_length=255)
    summary = models.TextField()
    is_urgent = models.BooleanField(default=False)
    published_at = models.DateTimeField(auto_now_add=True)


class Alert(models.Model):
    title = models.CharField(max_length=255)
    body = models.TextField()
    severity = models.CharField(max_length=50, default="info")
    active = models.BooleanField(default=True)


class MeetingEvent(models.Model):
    title = models.CharField(max_length=255)
    venue = models.CharField(max_length=255)
    starts_at = models.DateTimeField()
    calendar_url = models.URLField(blank=True)
