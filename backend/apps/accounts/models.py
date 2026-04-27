from django.contrib.auth.models import AbstractUser
from django.core.exceptions import ValidationError
from django.db import models

from apps.regions.models import Association, DistrictOperationalUnit, RegionState, Unit


class User(AbstractUser):
    class Role(models.TextChoices):
        SUPER_ADMIN = "super_admin", "Super Admin"
        GUEST = "guest", "Guest"
        MEMBER = "member", "Member"
        SUPPLIER = "supplier", "Supplier"
        ADVERTISER = "advertiser", "Advertiser"
        ADMIN = "admin", "Admin"

    role = models.CharField(max_length=20, choices=Role.choices, default=Role.MEMBER)
    corporate_email = models.EmailField(blank=True)
    jeweller_id = models.CharField(max_length=64, blank=True)
    is_verified_member = models.BooleanField(default=False)
    onboarding_completed = models.BooleanField(default=False)


class MemberProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="member_profile")
    phone_number = models.CharField(max_length=20, blank=True)
    company_name = models.CharField(max_length=255, blank=True)
    state = models.ForeignKey(RegionState, on_delete=models.SET_NULL, null=True, blank=True, related_name="member_profiles")
    association = models.ForeignKey(Association, on_delete=models.SET_NULL, null=True, blank=True, related_name="member_profiles")
    district_operational_unit = models.ForeignKey(
        DistrictOperationalUnit,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="member_profiles",
    )
    unit = models.ForeignKey(Unit, on_delete=models.SET_NULL, null=True, blank=True, related_name="member_profiles")
    membership_tier = models.CharField(max_length=50, default="Platinum")

    def __str__(self) -> str:
        return f"{self.user.username} profile"

    def clean(self):
        if self.unit and self.district_operational_unit != self.unit.district_operational_unit:
            raise ValidationError({"unit": "Selected unit does not belong to the chosen district operational unit."})
        if self.district_operational_unit and self.association != self.district_operational_unit.association:
            raise ValidationError({"district_operational_unit": "Selected district operational unit does not belong to the chosen association."})
        if self.association and self.state != self.association.state:
            raise ValidationError({"association": "Selected association does not belong to the chosen state."})


class NotificationPreference(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="notification_preferences")
    rate_alerts = models.BooleanField(default=True)
    news_alerts = models.BooleanField(default=True)
    ad_alerts = models.BooleanField(default=False)
    meeting_alerts = models.BooleanField(default=True)

    def __str__(self) -> str:
        return f"{self.user.username} notifications"


class MemberAccessRequest(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"

    full_name = models.CharField(max_length=150)
    phone_number = models.CharField(max_length=20)
    email = models.EmailField()
    business_name = models.CharField(max_length=255)
    state = models.ForeignKey(RegionState, on_delete=models.CASCADE, related_name="member_access_requests")
    association = models.ForeignKey(Association, on_delete=models.CASCADE, related_name="member_access_requests")
    district_operational_unit = models.ForeignKey(
        DistrictOperationalUnit,
        on_delete=models.CASCADE,
        related_name="member_access_requests",
    )
    unit = models.ForeignKey(Unit, on_delete=models.CASCADE, related_name="member_access_requests")
    notes = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    created_at = models.DateTimeField(auto_now_add=True)

    def clean(self):
        if self.unit and self.district_operational_unit != self.unit.district_operational_unit:
            raise ValidationError({"unit": "Selected unit does not belong to the chosen district operational unit."})
        if self.district_operational_unit and self.association != self.district_operational_unit.association:
            raise ValidationError({"district_operational_unit": "Selected district operational unit does not belong to the chosen association."})
        if self.association and self.state != self.association.state:
            raise ValidationError({"association": "Selected association does not belong to the chosen state."})

    def __str__(self) -> str:
        return f"{self.full_name} access request"


class AdminScopeAssignment(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="admin_scope_assignments")
    association = models.ForeignKey(Association, on_delete=models.CASCADE, null=True, blank=True, related_name="admin_assignments")
    district_operational_unit = models.ForeignKey(
        DistrictOperationalUnit,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="admin_assignments",
    )
    unit = models.ForeignKey(Unit, on_delete=models.CASCADE, null=True, blank=True, related_name="admin_assignments")

    def clean(self):
        selected_scopes = [scope for scope in [self.association, self.district_operational_unit, self.unit] if scope is not None]
        if len(selected_scopes) != 1:
            raise ValidationError("Exactly one admin scope must be assigned.")
        if self.user.role != User.Role.ADMIN:
            raise ValidationError({"user": "Admin scope assignments can only be attached to admin users."})

    def __str__(self) -> str:
        if self.unit:
            return f"{self.user.username} -> unit:{self.unit.name}"
        if self.district_operational_unit:
            return f"{self.user.username} -> district_unit:{self.district_operational_unit.name}"
        return f"{self.user.username} -> association:{self.association.name}"
