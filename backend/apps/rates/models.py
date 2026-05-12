from django.db import models

from apps.accounts.models import User
from apps.directory.models import MediaAsset
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


class AssociationRateCategory(models.Model):
    association = models.ForeignKey(Association, on_delete=models.CASCADE, related_name="managed_rate_categories")
    name = models.CharField(max_length=120)
    slug = models.SlugField(max_length=120)
    unit_label = models.CharField(max_length=60, default="1 Gram")
    current_value = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    display_order = models.PositiveIntegerField(default=0)
    updated_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="updated_rate_categories",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["display_order", "id"]
        constraints = [
            models.UniqueConstraint(fields=["association", "slug"], name="uniq_rate_category_per_association_slug"),
        ]


class AssociationRateSubcategory(models.Model):
    category = models.ForeignKey(AssociationRateCategory, on_delete=models.CASCADE, related_name="subcategories")
    name = models.CharField(max_length=120)
    slug = models.SlugField(max_length=120)
    unit_label = models.CharField(max_length=60, default="1 Gram")
    current_value = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    display_order = models.PositiveIntegerField(default=0)
    updated_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="updated_rate_subcategories",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["display_order", "id"]
        constraints = [
            models.UniqueConstraint(fields=["category", "slug"], name="uniq_rate_subcategory_per_category_slug"),
        ]


class AssociationSpotlightMedia(models.Model):
    association = models.ForeignKey(Association, on_delete=models.CASCADE, related_name="spotlight_media")
    asset = models.OneToOneField(MediaAsset, on_delete=models.CASCADE, related_name="association_spotlight_media")
    title = models.CharField(max_length=140, blank=True)
    subtitle = models.CharField(max_length=255, blank=True)
    sort_order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    starts_at = models.DateTimeField(null=True, blank=True)
    ends_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_association_spotlight_media",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["sort_order", "id"]
