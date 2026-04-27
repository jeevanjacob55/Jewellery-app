from django.db import models

from apps.regions.models import Association


class AssociationRate(models.Model):
    association = models.ForeignKey(Association, on_delete=models.CASCADE, null=True, blank=True, related_name="rates")
    region_label = models.CharField(max_length=120)
    gold_22k = models.DecimalField(max_digits=10, decimal_places=2)
    gold_24k = models.DecimalField(max_digits=10, decimal_places=2)
    silver = models.DecimalField(max_digits=10, decimal_places=2)
    effective_at = models.DateTimeField()


class ExternalMarketRate(models.Model):
    source_name = models.CharField(max_length=100)
    region_label = models.CharField(max_length=100)
    gold_22k = models.DecimalField(max_digits=10, decimal_places=2)
    gold_24k = models.DecimalField(max_digits=10, decimal_places=2)
    silver = models.DecimalField(max_digits=10, decimal_places=2)
    effective_at = models.DateTimeField()


class GlobalTrendSnapshot(models.Model):
    usd_inr = models.DecimalField(max_digits=10, decimal_places=2)
    gold_oz = models.DecimalField(max_digits=10, decimal_places=2)
    silver_oz = models.DecimalField(max_digits=10, decimal_places=2)
    captured_at = models.DateTimeField(auto_now_add=True)
