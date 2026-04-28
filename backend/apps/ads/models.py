from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from apps.directory.models import MediaAsset
from apps.regions.models import Association, DistrictOperationalUnit, RegionState, Unit


class Advertisement(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        SUBMITTED = "submitted", "Submitted"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"
        EXPIRED = "expired", "Expired"

    class Placement(models.TextChoices):
        DASHBOARD_HERO = "dashboard_hero", "Dashboard Hero"
        MARKET_BANNER = "market_banner", "Market Banner"
        NEWS_INLINE = "news_inline", "News Inline"

    class ActionType(models.TextChoices):
        EXTERNAL_URL = "external_url", "External URL"
        INTERNAL_SCREEN = "internal_screen", "Internal Screen"
        PRODUCT = "product", "Product"
        COMPANY = "company", "Company"
        CATEGORY = "category", "Category"

    advertiser = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="advertisements")
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    label_text = models.CharField(max_length=50, default="ADVERTISEMENT")
    background_color = models.CharField(max_length=10, blank=True)
    placement = models.CharField(max_length=50, choices=Placement.choices, default=Placement.DASHBOARD_HERO)
    action_type = models.CharField(max_length=50, choices=ActionType.choices, default=ActionType.EXTERNAL_URL)
    action_payload = models.JSONField(default=dict, blank=True)
    priority = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    reach = models.CharField(max_length=50, default="local")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    start_date = models.DateTimeField(null=True, blank=True)
    end_date = models.DateTimeField(null=True, blank=True)
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="approved_advertisements",
    )
    approved_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-priority", "-created_at"]

    def clean(self):
        if self.start_date and self.end_date and self.start_date > self.end_date:
            raise ValidationError({"end_date": "End date must be after the start date."})

    @property
    def image_url(self) -> str | None:
        for ad_asset in self.assets.select_related("asset").order_by("id"):
            asset = ad_asset.asset
            if asset.public_url:
                return asset.public_url
        return None

    def is_live(self, now=None) -> bool:
        current_time = now or timezone.now()
        if self.status != self.Status.APPROVED or not self.is_active:
            return False
        if self.start_date and self.start_date > current_time:
            return False
        if self.end_date and self.end_date < current_time:
            return False
        return True

    def __str__(self) -> str:
        return self.title


class AdTargeting(models.Model):
    advertisement = models.OneToOneField(Advertisement, on_delete=models.CASCADE, related_name="targeting")
    state = models.ForeignKey(RegionState, on_delete=models.SET_NULL, null=True, blank=True, related_name="ad_targetings")
    association = models.ForeignKey(Association, on_delete=models.SET_NULL, null=True, blank=True, related_name="ad_targetings")
    district_operational_unit = models.ForeignKey(
        DistrictOperationalUnit,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="ad_targetings",
    )
    unit = models.ForeignKey(Unit, on_delete=models.SET_NULL, null=True, blank=True, related_name="ad_targetings")

    def clean(self):
        if self.unit and self.district_operational_unit != self.unit.district_operational_unit:
            raise ValidationError({"unit": "Selected unit does not belong to the chosen district operational unit."})
        if self.district_operational_unit and self.association != self.district_operational_unit.association:
            raise ValidationError({"district_operational_unit": "Selected district operational unit does not belong to the chosen association."})
        if self.association and self.state != self.association.state:
            raise ValidationError({"association": "Selected association does not belong to the chosen state."})


class AdAsset(models.Model):
    advertisement = models.ForeignKey(Advertisement, on_delete=models.CASCADE, related_name="assets")
    asset = models.OneToOneField(MediaAsset, on_delete=models.CASCADE, related_name="ad_asset")
    placement = models.CharField(max_length=100, default=Advertisement.Placement.DASHBOARD_HERO)


class AdApproval(models.Model):
    advertisement = models.OneToOneField(Advertisement, on_delete=models.CASCADE, related_name="approval")
    approved_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    notes = models.TextField(blank=True)
    approved_at = models.DateTimeField(null=True, blank=True)


class AdImpression(models.Model):
    advertisement = models.ForeignKey(Advertisement, on_delete=models.CASCADE, related_name="impressions")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    guest_id = models.CharField(max_length=255, null=True, blank=True)
    placement = models.CharField(max_length=50)
    viewed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-viewed_at", "-id"]


class AdClick(models.Model):
    advertisement = models.ForeignKey(Advertisement, on_delete=models.CASCADE, related_name="clicks")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    guest_id = models.CharField(max_length=255, null=True, blank=True)
    placement = models.CharField(max_length=50)
    action_type = models.CharField(max_length=50)
    action_payload = models.JSONField(default=dict, blank=True)
    clicked_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-clicked_at", "-id"]
