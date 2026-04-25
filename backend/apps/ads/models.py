from django.conf import settings
from django.db import models

from apps.directory.models import MediaAsset


class Advertisement(models.Model):
    advertiser = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="advertisements")
    title = models.CharField(max_length=255)
    reach = models.CharField(max_length=50, default="local")
    status = models.CharField(max_length=50, default="pending_review")
    starts_at = models.DateField(null=True, blank=True)
    ends_at = models.DateField(null=True, blank=True)


class AdTargeting(models.Model):
    advertisement = models.OneToOneField(Advertisement, on_delete=models.CASCADE, related_name="targeting")
    state_name = models.CharField(max_length=100, blank=True)
    district_name = models.CharField(max_length=100, blank=True)
    local_chapter_name = models.CharField(max_length=100, blank=True)


class AdAsset(models.Model):
    advertisement = models.ForeignKey(Advertisement, on_delete=models.CASCADE, related_name="assets")
    asset = models.OneToOneField(MediaAsset, on_delete=models.CASCADE, related_name="ad_asset")
    placement = models.CharField(max_length=100, default="dashboard_hero")


class AdApproval(models.Model):
    advertisement = models.OneToOneField(Advertisement, on_delete=models.CASCADE, related_name="approval")
    approved_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    notes = models.TextField(blank=True)
    approved_at = models.DateTimeField(null=True, blank=True)
