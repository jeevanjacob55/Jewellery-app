from django.conf import settings
from django.db import models

from apps.directory.models import MediaAsset


class ReverseSearchRequest(models.Model):
    class Status(models.TextChoices):
        SUBMITTED = "submitted", "Submitted"
        UNDER_REVIEW = "under_review", "Under Review"
        SUPPLIER_RESPONDED = "supplier_responded", "Supplier Responded"
        CLOSED = "closed", "Closed"

    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="reverse_search_requests")
    notes = models.TextField(blank=True)
    status = models.CharField(max_length=30, choices=Status.choices, default=Status.SUBMITTED)
    created_at = models.DateTimeField(auto_now_add=True)


class ReverseSearchAttachment(models.Model):
    request = models.ForeignKey(ReverseSearchRequest, on_delete=models.CASCADE, related_name="attachments")
    asset = models.OneToOneField(MediaAsset, on_delete=models.CASCADE, related_name="reverse_search_attachment")


class ReverseSearchResponse(models.Model):
    request = models.ForeignKey(ReverseSearchRequest, on_delete=models.CASCADE, related_name="responses")
    responder = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    message = models.TextField()
    availability_label = models.CharField(max_length=100, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
