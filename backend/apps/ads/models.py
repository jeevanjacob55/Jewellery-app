from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models

from apps.directory.models import MediaAsset
from apps.regions.models import Association, DistrictOperationalUnit, RegionState, Unit


class Advertisement(models.Model):
    advertiser = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="advertisements")
    title = models.CharField(max_length=255)
    reach = models.CharField(max_length=50, default="local")
    status = models.CharField(max_length=50, default="pending_review")
    starts_at = models.DateField(null=True, blank=True)
    ends_at = models.DateField(null=True, blank=True)


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
    placement = models.CharField(max_length=100, default="dashboard_hero")


class AdApproval(models.Model):
    advertisement = models.OneToOneField(Advertisement, on_delete=models.CASCADE, related_name="approval")
    approved_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    notes = models.TextField(blank=True)
    approved_at = models.DateTimeField(null=True, blank=True)
