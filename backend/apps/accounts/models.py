from django.apps import apps as django_apps
from django.contrib.auth.models import AbstractUser
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone
import uuid

from apps.regions.models import Association, DistrictOperationalUnit, RegionState, Unit


def _validate_hierarchy_chain(*, state, association, district_operational_unit, unit, field_map: dict[str, str] | None = None):
    field_map = field_map or {}
    if unit and district_operational_unit != unit.district_operational_unit:
        raise ValidationError({field_map.get("unit", "unit"): "Selected unit does not belong to the chosen district operational unit."})
    if district_operational_unit and association != district_operational_unit.association:
        raise ValidationError(
            {
                field_map.get(
                    "district_operational_unit",
                    "district_operational_unit",
                ): "Selected district operational unit does not belong to the chosen association."
            }
        )
    if association and state != association.state:
        raise ValidationError({field_map.get("association", "association"): "Selected association does not belong to the chosen state."})


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
    google_sub = models.CharField(max_length=255, blank=True, null=True, unique=True)
    google_email = models.EmailField(blank=True)
    google_auth_enabled = models.BooleanField(default=False)
    last_google_login_at = models.DateTimeField(null=True, blank=True)
    jeweller_id = models.CharField(max_length=64, blank=True)
    is_verified_member = models.BooleanField(default=False)
    onboarding_completed = models.BooleanField(default=False)

    def has_scoped_role(self, role: str, *, scope_type: str | None = None, scope_id: int | None = None) -> bool:
        queryset = self.scoped_roles.filter(role=role)
        if scope_type is not None:
            queryset = queryset.filter(scope_type=scope_type)
        if scope_id is not None:
            queryset = queryset.filter(scope_id=scope_id)
        elif scope_type == UserRole.ScopeType.PLATFORM:
            queryset = queryset.filter(scope_id__isnull=True)
        if queryset.exists():
            return True
        if role == UserRole.Role.SUPER_ADMIN and getattr(self, "role", None) == User.Role.SUPER_ADMIN:
            return True
        return False

    def has_any_scoped_role(self, roles: list[str] | tuple[str, ...] | set[str]) -> bool:
        if self.scoped_roles.filter(role__in=roles).exists():
            return True
        return UserRole.Role.SUPER_ADMIN in roles and getattr(self, "role", None) == User.Role.SUPER_ADMIN

    @property
    def is_super_admin_user(self) -> bool:
        return bool(self.is_superuser or self.has_scoped_role(UserRole.Role.SUPER_ADMIN, scope_type=UserRole.ScopeType.PLATFORM))

    @property
    def has_admin_console_access(self) -> bool:
        return bool(self.is_superuser or self.is_staff or self.has_any_scoped_role(UserRole.admin_roles()))

    @property
    def has_scoped_admin_access(self) -> bool:
        return bool(self.is_superuser or self.has_any_scoped_role(UserRole.admin_roles()))


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
        _validate_hierarchy_chain(
            state=self.state,
            association=self.association,
            district_operational_unit=self.district_operational_unit,
            unit=self.unit,
        )


class NotificationPreference(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="notification_preferences")
    rate_alerts = models.BooleanField(default=True)
    news_alerts = models.BooleanField(default=True)
    ad_alerts = models.BooleanField(default=False)
    meeting_alerts = models.BooleanField(default=True)
    product_alerts = models.BooleanField(default=True)

    def __str__(self) -> str:
        return f"{self.user.username} notifications"


class Notification(models.Model):
    class Type(models.TextChoices):
        PRODUCT = "product", "Product"
        NEWS = "news", "News"
        MEETING = "meeting", "Meeting"
        RATE = "rate", "Rate"

    class TargetRoute(models.TextChoices):
        PRODUCT_DETAIL = "ProductDetail", "Product Detail"
        NEWS_DETAIL = "NewsDetail", "News Detail"
        MEETING_DETAIL = "MeetingDetail", "Meeting Detail"
        RATE_DETAILS = "RateDetails", "Rate Details"

    type = models.CharField(max_length=20, choices=Type.choices)
    title = models.CharField(max_length=255)
    body = models.TextField()
    target_route = models.CharField(max_length=40, choices=TargetRoute.choices)
    target_payload = models.JSONField(default=dict, blank=True)
    source_object_type = models.CharField(max_length=30)
    source_object_id = models.PositiveBigIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]
        indexes = [
            models.Index(fields=["type", "created_at"], name="acct_notif_type_created_ix"),
            models.Index(fields=["source_object_type", "source_object_id"], name="acct_notif_source_ix"),
        ]

    def __str__(self) -> str:
        return f"{self.type}:{self.source_object_type}:{self.source_object_id}"


class UserNotification(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="notifications")
    notification = models.ForeignKey(Notification, on_delete=models.CASCADE, related_name="recipients")
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-notification__created_at", "-id"]
        constraints = [
            models.UniqueConstraint(fields=["user", "notification"], name="uniq_user_notification"),
        ]
        indexes = [
            models.Index(fields=["user", "is_read"], name="acct_usernotif_user_read_ix"),
            models.Index(fields=["created_at"], name="acct_usernotif_created_ix"),
        ]

    def __str__(self) -> str:
        return f"{self.user_id}:{self.notification_id}:{'read' if self.is_read else 'unread'}"


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
        _validate_hierarchy_chain(
            state=self.state,
            association=self.association,
            district_operational_unit=self.district_operational_unit,
            unit=self.unit,
        )

    def __str__(self) -> str:
        return f"{self.full_name} access request"


class UserRole(models.Model):
    class Role(models.TextChoices):
        SUPER_ADMIN = "super_admin", "Super Admin"
        STATE_ADMIN = "state_admin", "State Admin"
        ASSOCIATION_ADMIN = "association_admin", "Association Admin"
        DISTRICT_ADMIN = "district_admin", "District Admin"
        UNIT_ADMIN = "unit_admin", "Unit Admin"
        COMPANY_ADMIN = "company_admin", "Company Admin"

    class ScopeType(models.TextChoices):
        PLATFORM = "platform", "Platform"
        STATE = "state", "State"
        ASSOCIATION = "association", "Association"
        DISTRICT_OPERATIONAL_UNIT = "district_operational_unit", "District Operational Unit"
        UNIT = "unit", "Unit"
        COMPANY = "company", "Company"

    ROLE_SCOPE_MAP = {
        Role.SUPER_ADMIN: ScopeType.PLATFORM,
        Role.STATE_ADMIN: ScopeType.STATE,
        Role.ASSOCIATION_ADMIN: ScopeType.ASSOCIATION,
        Role.DISTRICT_ADMIN: ScopeType.DISTRICT_OPERATIONAL_UNIT,
        Role.UNIT_ADMIN: ScopeType.UNIT,
        Role.COMPANY_ADMIN: ScopeType.COMPANY,
    }
    SCOPE_MODEL_MAP = {
        ScopeType.STATE: ("regions", "RegionState"),
        ScopeType.ASSOCIATION: ("regions", "Association"),
        ScopeType.DISTRICT_OPERATIONAL_UNIT: ("regions", "DistrictOperationalUnit"),
        ScopeType.UNIT: ("regions", "Unit"),
        ScopeType.COMPANY: ("directory", "Company"),
    }

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="scoped_roles")
    role = models.CharField(max_length=40, choices=Role.choices)
    scope_type = models.CharField(max_length=40, choices=ScopeType.choices)
    scope_id = models.PositiveBigIntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["user", "role", "scope_type", "scope_id"], name="uniq_user_role_scope_assignment"),
        ]

    @classmethod
    def admin_roles(cls) -> tuple[str, ...]:
        return tuple(cls.Role.values)

    def clean(self):
        expected_scope_type = self.ROLE_SCOPE_MAP[self.role]
        if self.scope_type != expected_scope_type:
            raise ValidationError({"scope_type": f"{self.get_role_display()} requires a {expected_scope_type} scope."})

        if self.scope_type == self.ScopeType.PLATFORM:
            if self.scope_id is not None:
                raise ValidationError({"scope_id": "Platform-scoped roles must not define a scope id."})
            return

        if self.scope_id is None:
            raise ValidationError({"scope_id": "A scope id is required for non-platform roles."})

        app_label, model_name = self.SCOPE_MODEL_MAP[self.scope_type]
        model_class = django_apps.get_model(app_label, model_name)
        if not model_class.objects.filter(pk=self.scope_id).exists():
            raise ValidationError({"scope_id": f"Selected {self.scope_type} scope does not exist."})

    def __str__(self) -> str:
        if self.scope_type == self.ScopeType.PLATFORM:
            return f"{self.user.username} -> {self.role}:platform"
        return f"{self.user.username} -> {self.role}:{self.scope_type}:{self.scope_id}"


class CompanyAdminAccessRequest(models.Model):
    class CompanyType(models.TextChoices):
        INDEPENDENT = "independent", "Independent"
        ASSOCIATION_LINKED = "association_linked", "Association Linked"

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"

    class ApprovalOwnerType(models.TextChoices):
        SUPER_ADMIN = "super_admin", "Super Admin"
        STATE_ADMIN = "state_admin", "State Admin"
        ASSOCIATION_ADMIN = "association_admin", "Association Admin"

    requester_name = models.CharField(max_length=150)
    requester_phone = models.CharField(max_length=20)
    requester_email = models.EmailField()
    company_name = models.CharField(max_length=255)
    business_type = models.CharField(max_length=120)
    state = models.ForeignKey(RegionState, on_delete=models.CASCADE, related_name="company_admin_access_requests")
    association = models.ForeignKey(
        Association,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="company_admin_access_requests",
    )
    district_operational_unit = models.ForeignKey(
        DistrictOperationalUnit,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="company_admin_access_requests",
    )
    unit = models.ForeignKey(Unit, on_delete=models.CASCADE, null=True, blank=True, related_name="company_admin_access_requests")
    company_type = models.CharField(max_length=30, choices=CompanyType.choices)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    approval_owner_type = models.CharField(max_length=30, choices=ApprovalOwnerType.choices)
    approval_owner_scope_id = models.PositiveBigIntegerField(null=True, blank=True)
    approved_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="approved_company_admin_access_requests",
    )
    approved_at = models.DateTimeField(null=True, blank=True)
    rejected_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="rejected_company_admin_access_requests",
    )
    rejected_at = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.TextField(blank=True)
    notes = models.TextField(blank=True)
    resolved_user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="resolved_company_admin_access_requests",
    )
    resolved_company = models.ForeignKey(
        "directory.Company",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="originating_company_admin_access_requests",
    )
    resolved_membership = models.ForeignKey(
        "directory.CompanyMembership",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="originating_company_admin_access_requests",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at", "-id"]

    def clean(self):
        _validate_hierarchy_chain(
            state=self.state,
            association=self.association,
            district_operational_unit=self.district_operational_unit,
            unit=self.unit,
        )
        if self.district_operational_unit and self.association is None:
            raise ValidationError({"district_operational_unit": "Association is required when selecting a district operational unit."})
        if self.unit and self.district_operational_unit is None:
            raise ValidationError({"unit": "District operational unit is required when selecting a unit."})
        expected_type = self.CompanyType.ASSOCIATION_LINKED if self.association_id else self.CompanyType.INDEPENDENT
        if self.company_type != expected_type:
            raise ValidationError({"company_type": "Company type must match the selected hierarchy path."})

    def __str__(self) -> str:
        return f"{self.company_name} ({self.requester_email})"


class AssociationAdminAccessRequest(models.Model):
    class RequestedRole(models.TextChoices):
        STATE_ADMIN = "state_admin", "State Admin"
        ASSOCIATION_ADMIN = "association_admin", "Association Admin"
        DISTRICT_ADMIN = "district_admin", "District Admin"
        UNIT_ADMIN = "unit_admin", "Unit Admin"

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"

    class ApprovalOwnerType(models.TextChoices):
        SUPER_ADMIN = "super_admin", "Super Admin"
        STATE_ADMIN = "state_admin", "State Admin"
        ASSOCIATION_ADMIN = "association_admin", "Association Admin"
        DISTRICT_ADMIN = "district_admin", "District Admin"

    requester_name = models.CharField(max_length=150)
    requester_phone = models.CharField(max_length=20)
    requester_email = models.EmailField()
    state = models.ForeignKey(RegionState, on_delete=models.CASCADE, related_name="association_admin_access_requests")
    association = models.ForeignKey(
        Association,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="association_admin_access_requests",
    )
    district_operational_unit = models.ForeignKey(
        DistrictOperationalUnit,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="association_admin_access_requests",
    )
    unit = models.ForeignKey(Unit, on_delete=models.CASCADE, null=True, blank=True, related_name="association_admin_access_requests")
    requested_role = models.CharField(max_length=30, choices=RequestedRole.choices)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    approval_owner_type = models.CharField(max_length=30, choices=ApprovalOwnerType.choices)
    approval_owner_scope_id = models.PositiveBigIntegerField(null=True, blank=True)
    approved_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="approved_association_admin_access_requests",
    )
    approved_at = models.DateTimeField(null=True, blank=True)
    rejected_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="rejected_association_admin_access_requests",
    )
    rejected_at = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.TextField(blank=True)
    notes = models.TextField(blank=True)
    resolved_user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="resolved_association_admin_access_requests",
    )
    resolved_user_role = models.ForeignKey(
        UserRole,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="originating_association_admin_access_requests",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at", "-id"]

    def clean(self):
        _validate_hierarchy_chain(
            state=self.state,
            association=self.association,
            district_operational_unit=self.district_operational_unit,
            unit=self.unit,
        )
        required = {
            self.RequestedRole.STATE_ADMIN: {"association": False, "district_operational_unit": False, "unit": False},
            self.RequestedRole.ASSOCIATION_ADMIN: {"association": True, "district_operational_unit": False, "unit": False},
            self.RequestedRole.DISTRICT_ADMIN: {"association": True, "district_operational_unit": True, "unit": False},
            self.RequestedRole.UNIT_ADMIN: {"association": True, "district_operational_unit": True, "unit": True},
        }[self.requested_role]
        if required["association"] and not self.association_id:
            raise ValidationError({"association": "Association is required for the selected role."})
        if not required["association"] and self.association_id:
            raise ValidationError({"association": "Association must be empty for the selected role."})
        if required["district_operational_unit"] and not self.district_operational_unit_id:
            raise ValidationError({"district_operational_unit": "District operational unit is required for the selected role."})
        if not required["district_operational_unit"] and self.district_operational_unit_id:
            raise ValidationError({"district_operational_unit": "District operational unit must be empty for the selected role."})
        if required["unit"] and not self.unit_id:
            raise ValidationError({"unit": "Unit is required for the selected role."})
        if not required["unit"] and self.unit_id:
            raise ValidationError({"unit": "Unit must be empty for the selected role."})

    def __str__(self) -> str:
        return f"{self.requested_role}:{self.requester_email}"


class AccountActivationToken(models.Model):
    class Purpose(models.TextChoices):
        ACCESS_APPROVAL = "access_approval", "Access Approval"

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="activation_tokens")
    token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    purpose = models.CharField(max_length=30, choices=Purpose.choices, default=Purpose.ACCESS_APPROVAL)
    expires_at = models.DateTimeField()
    used_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_activation_tokens",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]

    def is_active(self) -> bool:
        return self.used_at is None and self.expires_at > timezone.now()

    def __str__(self) -> str:
        return f"{self.user_id}:{self.token}"


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
        if not self.user.has_scoped_admin_access and self.user.role != User.Role.ADMIN:
            raise ValidationError({"user": "Admin scope assignments can only be attached to admin users."})

    def __str__(self) -> str:
        if self.unit:
            return f"{self.user.username} -> unit:{self.unit.name}"
        if self.district_operational_unit:
            return f"{self.user.username} -> district_unit:{self.district_operational_unit.name}"
        return f"{self.user.username} -> association:{self.association.name}"
