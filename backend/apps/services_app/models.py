from django.db import models


class ServiceType(models.Model):
    name = models.CharField(max_length=100, unique=True)
    average_turnaround_days = models.PositiveIntegerField(default=7)
    accuracy_metric = models.CharField(max_length=100, blank=True)

    def __str__(self) -> str:
        return self.name


class ComplianceRequest(models.Model):
    service_type = models.ForeignKey(ServiceType, on_delete=models.PROTECT, related_name="requests")
    business_name = models.CharField(max_length=255)
    due_in_days = models.PositiveIntegerField(default=0)
    status = models.CharField(max_length=50, default="action_required")
    created_at = models.DateTimeField(auto_now_add=True)


class ComplianceReminder(models.Model):
    title = models.CharField(max_length=255)
    due_in_days = models.PositiveIntegerField(default=0)
    severity = models.CharField(max_length=50, default="info")
