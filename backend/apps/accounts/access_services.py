from __future__ import annotations

from dataclasses import dataclass
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError

from apps.directory.access import company_has_active_admin, find_safe_legacy_company_matches
from apps.directory.models import Company, CompanyMembership, CompanyTier
from apps.regions.models import Association, DistrictOperationalUnit, RegionState, Unit

from .models import (
    AccountActivationToken,
    AssociationAdminAccessRequest,
    CompanyAdminAccessRequest,
    UserRole,
)


ACTIVATION_TOKEN_LIFETIME = timedelta(days=7)


@dataclass
class ApprovalResult:
    activation_token: AccountActivationToken
    user_created: bool


def normalize_email(value: str) -> str:
    return (value or "").strip().lower()


def normalize_name(value: str) -> str:
    return " ".join((value or "").split()).strip()


def split_name(value: str) -> tuple[str, str]:
    normalized = normalize_name(value)
    if not normalized:
        return "", ""
    parts = normalized.split(" ", 1)
    if len(parts) == 1:
        return parts[0], ""
    return parts[0], parts[1]


def get_default_company_tier() -> CompanyTier:
    tier = CompanyTier.objects.filter(is_active=True, is_free=True).order_by("display_priority", "id").first()
    if tier is None:
        tier = CompanyTier.objects.filter(is_active=True).order_by("display_priority", "id").first()
    if tier is None:
        raise ValidationError("At least one active company tier is required before approving company access requests.")
    return tier


def derive_company_request_owner(*, state: RegionState, association: Association | None) -> tuple[str, int | None]:
    if association is not None:
        return CompanyAdminAccessRequest.ApprovalOwnerType.ASSOCIATION_ADMIN, association.id
    return CompanyAdminAccessRequest.ApprovalOwnerType.STATE_ADMIN, state.id


def derive_association_request_owner(
    *,
    requested_role: str,
    state: RegionState,
    association: Association | None,
    district_operational_unit: DistrictOperationalUnit | None,
) -> tuple[str, int | None]:
    if requested_role == AssociationAdminAccessRequest.RequestedRole.STATE_ADMIN:
        return AssociationAdminAccessRequest.ApprovalOwnerType.SUPER_ADMIN, None
    if requested_role == AssociationAdminAccessRequest.RequestedRole.ASSOCIATION_ADMIN:
        return AssociationAdminAccessRequest.ApprovalOwnerType.STATE_ADMIN, state.id
    if requested_role == AssociationAdminAccessRequest.RequestedRole.DISTRICT_ADMIN:
        if association is None:
            raise ValidationError("Association scope is required for district admin requests.")
        return AssociationAdminAccessRequest.ApprovalOwnerType.ASSOCIATION_ADMIN, association.id
    if requested_role == AssociationAdminAccessRequest.RequestedRole.UNIT_ADMIN:
        if district_operational_unit is not None:
            return AssociationAdminAccessRequest.ApprovalOwnerType.DISTRICT_ADMIN, district_operational_unit.id
        if association is not None:
            return AssociationAdminAccessRequest.ApprovalOwnerType.ASSOCIATION_ADMIN, association.id
    raise ValidationError("Unable to determine approval owner for the selected admin role.")


def get_company_admin_access_requests_for_user(user):
    if not user or not getattr(user, "is_authenticated", False):
        return CompanyAdminAccessRequest.objects.none()
    queryset = CompanyAdminAccessRequest.objects.select_related(
        "state",
        "association",
        "district_operational_unit",
        "unit",
        "approved_by",
        "rejected_by",
        "resolved_user",
        "resolved_company",
        "resolved_membership",
    ).order_by("-created_at", "-id")
    if getattr(user, "is_super_admin_user", False):
        return queryset
    state_ids = list(
        user.scoped_roles.filter(
            role=UserRole.Role.STATE_ADMIN,
            scope_type=UserRole.ScopeType.STATE,
        ).values_list("scope_id", flat=True)
    )
    association_ids = list(
        user.scoped_roles.filter(
            role=UserRole.Role.ASSOCIATION_ADMIN,
            scope_type=UserRole.ScopeType.ASSOCIATION,
        ).values_list("scope_id", flat=True)
    )
    return queryset.filter(
        Q(approval_owner_type=CompanyAdminAccessRequest.ApprovalOwnerType.STATE_ADMIN, approval_owner_scope_id__in=state_ids)
        | Q(
            approval_owner_type=CompanyAdminAccessRequest.ApprovalOwnerType.ASSOCIATION_ADMIN,
            approval_owner_scope_id__in=association_ids,
        )
    )


def get_association_admin_access_requests_for_user(user):
    if not user or not getattr(user, "is_authenticated", False):
        return AssociationAdminAccessRequest.objects.none()
    queryset = AssociationAdminAccessRequest.objects.select_related(
        "state",
        "association",
        "district_operational_unit",
        "unit",
        "approved_by",
        "rejected_by",
        "resolved_user",
        "resolved_user_role",
    ).order_by("-created_at", "-id")
    if getattr(user, "is_super_admin_user", False):
        return queryset
    state_ids = list(
        user.scoped_roles.filter(
            role=UserRole.Role.STATE_ADMIN,
            scope_type=UserRole.ScopeType.STATE,
        ).values_list("scope_id", flat=True)
    )
    association_ids = list(
        user.scoped_roles.filter(
            role=UserRole.Role.ASSOCIATION_ADMIN,
            scope_type=UserRole.ScopeType.ASSOCIATION,
        ).values_list("scope_id", flat=True)
    )
    district_ids = list(
        user.scoped_roles.filter(
            role=UserRole.Role.DISTRICT_ADMIN,
            scope_type=UserRole.ScopeType.DISTRICT_OPERATIONAL_UNIT,
        ).values_list("scope_id", flat=True)
    )
    return queryset.filter(
        Q(
            approval_owner_type=AssociationAdminAccessRequest.ApprovalOwnerType.STATE_ADMIN,
            approval_owner_scope_id__in=state_ids,
        )
        | Q(
            approval_owner_type=AssociationAdminAccessRequest.ApprovalOwnerType.ASSOCIATION_ADMIN,
            approval_owner_scope_id__in=association_ids,
        )
        | Q(
            approval_owner_type=AssociationAdminAccessRequest.ApprovalOwnerType.DISTRICT_ADMIN,
            approval_owner_scope_id__in=district_ids,
        )
    )


def _can_review_company_admin_access_request(user, access_request: CompanyAdminAccessRequest) -> bool:
    if not user or not getattr(user, "is_authenticated", False):
        return False
    if getattr(user, "is_super_admin_user", False):
        return True
    if access_request.approval_owner_type == CompanyAdminAccessRequest.ApprovalOwnerType.STATE_ADMIN:
        return user.has_scoped_role(
            UserRole.Role.STATE_ADMIN,
            scope_type=UserRole.ScopeType.STATE,
            scope_id=access_request.approval_owner_scope_id,
        )
    if access_request.approval_owner_type == CompanyAdminAccessRequest.ApprovalOwnerType.ASSOCIATION_ADMIN:
        return user.has_scoped_role(
            UserRole.Role.ASSOCIATION_ADMIN,
            scope_type=UserRole.ScopeType.ASSOCIATION,
            scope_id=access_request.approval_owner_scope_id,
        )
    return False


def can_review_company_admin_access_request(user, access_request: CompanyAdminAccessRequest) -> bool:
    return _can_review_company_admin_access_request(user, access_request)


def can_review_association_admin_access_request(user, access_request: AssociationAdminAccessRequest) -> bool:
    if not user or not getattr(user, "is_authenticated", False):
        return False
    if getattr(user, "is_super_admin_user", False):
        return True
    if access_request.approval_owner_type == AssociationAdminAccessRequest.ApprovalOwnerType.STATE_ADMIN:
        return user.has_scoped_role(
            UserRole.Role.STATE_ADMIN,
            scope_type=UserRole.ScopeType.STATE,
            scope_id=access_request.approval_owner_scope_id,
        )
    if access_request.approval_owner_type == AssociationAdminAccessRequest.ApprovalOwnerType.ASSOCIATION_ADMIN:
        return user.has_scoped_role(
            UserRole.Role.ASSOCIATION_ADMIN,
            scope_type=UserRole.ScopeType.ASSOCIATION,
            scope_id=access_request.approval_owner_scope_id,
        )
    if access_request.approval_owner_type == AssociationAdminAccessRequest.ApprovalOwnerType.DISTRICT_ADMIN:
        return user.has_scoped_role(
            UserRole.Role.DISTRICT_ADMIN,
            scope_type=UserRole.ScopeType.DISTRICT_OPERATIONAL_UNIT,
            scope_id=access_request.approval_owner_scope_id,
        ) or user.has_scoped_role(
            UserRole.Role.ASSOCIATION_ADMIN,
            scope_type=UserRole.ScopeType.ASSOCIATION,
            scope_id=access_request.association_id,
        )
    return False


def _ensure_reviewer(user, predicate, message: str) -> None:
    if not predicate(user):
        raise PermissionDenied(message)


def _find_or_create_user(*, email: str, full_name: str) -> tuple[object, bool]:
    user_model = get_user_model()
    normalized_email = normalize_email(email)
    first_name, last_name = split_name(full_name)
    user = user_model.objects.filter(email__iexact=normalized_email).order_by("id").first()
    created = False
    if user is None:
        user = user_model.objects.create_user(
            username=normalized_email,
            email=normalized_email,
            first_name=first_name,
            last_name=last_name,
            is_active=True,
        )
        user.set_unusable_password()
        user.save(update_fields=["password"])
        created = True
    else:
        changed_fields: list[str] = []
        if not user.email:
            user.email = normalized_email
            changed_fields.append("email")
        if not user.username:
            user.username = normalized_email
            changed_fields.append("username")
        if not user.first_name and first_name:
            user.first_name = first_name
            changed_fields.append("first_name")
        if not user.last_name and last_name:
            user.last_name = last_name
            changed_fields.append("last_name")
        if not user.is_active:
            user.is_active = True
            changed_fields.append("is_active")
        if changed_fields:
            user.save(update_fields=changed_fields)
    return user, created


def create_activation_token(*, user, created_by=None) -> AccountActivationToken:
    AccountActivationToken.objects.filter(
        user=user,
        purpose=AccountActivationToken.Purpose.ACCESS_APPROVAL,
        used_at__isnull=True,
    ).update(used_at=timezone.now())
    return AccountActivationToken.objects.create(
        user=user,
        purpose=AccountActivationToken.Purpose.ACCESS_APPROVAL,
        expires_at=timezone.now() + ACTIVATION_TOKEN_LIFETIME,
        created_by=created_by,
    )


def _build_company_from_request(access_request: CompanyAdminAccessRequest) -> Company:
    return Company.objects.create(
        name=access_request.company_name,
        category=access_request.business_type,
        tier_ref=get_default_company_tier(),
        city="",
        state=access_request.state.name,
        state_ref=access_request.state,
        association_ref=access_request.association,
        district_operational_unit_ref=access_request.district_operational_unit,
        unit_ref=access_request.unit,
        company_type=access_request.company_type,
        is_active=True,
        is_approved=True,
    )


@transaction.atomic
def approve_company_admin_access_request(*, reviewer, request_id: int) -> tuple[CompanyAdminAccessRequest, ApprovalResult | None]:
    access_request = CompanyAdminAccessRequest.objects.select_for_update().select_related(
        "state",
        "association",
        "district_operational_unit",
        "unit",
    ).get(pk=request_id)
    if access_request.status != CompanyAdminAccessRequest.Status.PENDING:
        raise ValidationError("This request has already been reviewed.")
    if not can_review_company_admin_access_request(reviewer, access_request):
        raise PermissionDenied("You do not have permission to approve this company access request.")

    matches = find_safe_legacy_company_matches(company_name=access_request.company_name, state=access_request.state)
    if len(matches) > 1:
        access_request.status = CompanyAdminAccessRequest.Status.REJECTED
        access_request.rejected_by = reviewer
        access_request.rejected_at = timezone.now()
        access_request.rejection_reason = "Multiple legacy company matches were found. Manual review is required before approval."
        access_request.save(update_fields=["status", "rejected_by", "rejected_at", "rejection_reason", "updated_at"])
        return access_request, None

    matched_company = matches[0] if matches else None
    if matched_company is not None and company_has_active_admin(matched_company):
        access_request.status = CompanyAdminAccessRequest.Status.REJECTED
        access_request.rejected_by = reviewer
        access_request.rejected_at = timezone.now()
        access_request.rejection_reason = "A matching company already has an active admin. Manual review is required before approval."
        access_request.save(update_fields=["status", "rejected_by", "rejected_at", "rejection_reason", "updated_at"])
        return access_request, None

    user, user_created = _find_or_create_user(
        email=access_request.requester_email,
        full_name=access_request.requester_name,
    )
    other_active_membership = CompanyMembership.objects.filter(
        user=user,
        status=CompanyMembership.Status.ACTIVE,
    ).exclude(company=matched_company).first()
    if other_active_membership is not None:
        raise ValidationError("This user already has an active company context and requires manual review.")

    company = matched_company or _build_company_from_request(access_request)
    membership, _ = CompanyMembership.objects.get_or_create(
        user=user,
        company=company,
        defaults={
            "role": CompanyMembership.Role.PRIMARY_ADMIN,
            "status": CompanyMembership.Status.ACTIVE,
            "is_primary_admin": True,
            "approved_by": reviewer,
            "approved_at": timezone.now(),
        },
    )
    if membership.status != CompanyMembership.Status.ACTIVE or not membership.is_primary_admin or membership.role != CompanyMembership.Role.PRIMARY_ADMIN:
        membership.status = CompanyMembership.Status.ACTIVE
        membership.role = CompanyMembership.Role.PRIMARY_ADMIN
        membership.is_primary_admin = True
        membership.approved_by = reviewer
        membership.approved_at = timezone.now()
        membership.full_clean()
        membership.save()

    UserRole.objects.get_or_create(
        user=user,
        role=UserRole.Role.COMPANY_ADMIN,
        scope_type=UserRole.ScopeType.COMPANY,
        scope_id=company.id,
    )
    activation_token = create_activation_token(user=user, created_by=reviewer)
    access_request.status = CompanyAdminAccessRequest.Status.APPROVED
    access_request.approved_by = reviewer
    access_request.approved_at = timezone.now()
    access_request.rejected_by = None
    access_request.rejected_at = None
    access_request.rejection_reason = ""
    access_request.resolved_user = user
    access_request.resolved_company = company
    access_request.resolved_membership = membership
    access_request.save(
        update_fields=[
            "status",
            "approved_by",
            "approved_at",
            "rejected_by",
            "rejected_at",
            "rejection_reason",
            "resolved_user",
            "resolved_company",
            "resolved_membership",
            "updated_at",
        ]
    )
    return access_request, ApprovalResult(activation_token=activation_token, user_created=user_created)


@transaction.atomic
def reject_company_admin_access_request(*, reviewer, request_id: int, rejection_reason: str) -> tuple[CompanyAdminAccessRequest, ApprovalResult | None]:
    access_request = CompanyAdminAccessRequest.objects.select_for_update().get(pk=request_id)
    if access_request.status != CompanyAdminAccessRequest.Status.PENDING:
        raise ValidationError("This request has already been reviewed.")
    if not can_review_company_admin_access_request(reviewer, access_request):
        raise PermissionDenied("You do not have permission to reject this company access request.")
    access_request.status = CompanyAdminAccessRequest.Status.REJECTED
    access_request.rejected_by = reviewer
    access_request.rejected_at = timezone.now()
    access_request.rejection_reason = normalize_name(rejection_reason) or "Request rejected."
    access_request.save(update_fields=["status", "rejected_by", "rejected_at", "rejection_reason", "updated_at"])
    return access_request, None


def _association_role_scope(access_request: AssociationAdminAccessRequest) -> tuple[str, int | None]:
    scope_map = {
        AssociationAdminAccessRequest.RequestedRole.STATE_ADMIN: (UserRole.ScopeType.STATE, access_request.state_id),
        AssociationAdminAccessRequest.RequestedRole.ASSOCIATION_ADMIN: (UserRole.ScopeType.ASSOCIATION, access_request.association_id),
        AssociationAdminAccessRequest.RequestedRole.DISTRICT_ADMIN: (
            UserRole.ScopeType.DISTRICT_OPERATIONAL_UNIT,
            access_request.district_operational_unit_id,
        ),
        AssociationAdminAccessRequest.RequestedRole.UNIT_ADMIN: (UserRole.ScopeType.UNIT, access_request.unit_id),
    }
    return scope_map[access_request.requested_role]


@transaction.atomic
def approve_association_admin_access_request(*, reviewer, request_id: int) -> tuple[AssociationAdminAccessRequest, ApprovalResult]:
    access_request = AssociationAdminAccessRequest.objects.select_for_update().get(pk=request_id)
    if access_request.status != AssociationAdminAccessRequest.Status.PENDING:
        raise ValidationError("This request has already been reviewed.")
    if not can_review_association_admin_access_request(reviewer, access_request):
        raise PermissionDenied("You do not have permission to approve this admin access request.")

    user, user_created = _find_or_create_user(
        email=access_request.requester_email,
        full_name=access_request.requester_name,
    )
    scope_type, scope_id = _association_role_scope(access_request)
    user_role, _ = UserRole.objects.get_or_create(
        user=user,
        role=access_request.requested_role,
        scope_type=scope_type,
        scope_id=scope_id,
    )
    activation_token = create_activation_token(user=user, created_by=reviewer)
    access_request.status = AssociationAdminAccessRequest.Status.APPROVED
    access_request.approved_by = reviewer
    access_request.approved_at = timezone.now()
    access_request.rejected_by = None
    access_request.rejected_at = None
    access_request.rejection_reason = ""
    access_request.resolved_user = user
    access_request.resolved_user_role = user_role
    access_request.save(
        update_fields=[
            "status",
            "approved_by",
            "approved_at",
            "rejected_by",
            "rejected_at",
            "rejection_reason",
            "resolved_user",
            "resolved_user_role",
            "updated_at",
        ]
    )
    return access_request, ApprovalResult(activation_token=activation_token, user_created=user_created)


@transaction.atomic
def reject_association_admin_access_request(*, reviewer, request_id: int, rejection_reason: str) -> tuple[AssociationAdminAccessRequest, ApprovalResult | None]:
    access_request = AssociationAdminAccessRequest.objects.select_for_update().get(pk=request_id)
    if access_request.status != AssociationAdminAccessRequest.Status.PENDING:
        raise ValidationError("This request has already been reviewed.")
    if not can_review_association_admin_access_request(reviewer, access_request):
        raise PermissionDenied("You do not have permission to reject this admin access request.")
    access_request.status = AssociationAdminAccessRequest.Status.REJECTED
    access_request.rejected_by = reviewer
    access_request.rejected_at = timezone.now()
    access_request.rejection_reason = normalize_name(rejection_reason) or "Request rejected."
    access_request.save(update_fields=["status", "rejected_by", "rejected_at", "rejection_reason", "updated_at"])
    return access_request, None


def get_activation_token(token):
    return AccountActivationToken.objects.select_related("user").filter(token=token).first()


@transaction.atomic
def activate_account(*, token, password: str):
    activation_token = AccountActivationToken.objects.select_for_update().select_related("user").filter(token=token).first()
    if activation_token is None or not activation_token.is_active():
        raise ValidationError("This activation link is invalid or has expired.")
    if not password or len(password) < 8:
        raise ValidationError({"password": "Password must be at least 8 characters long."})
    user = activation_token.user
    user.set_password(password)
    user.is_active = True
    user.save(update_fields=["password", "is_active"])
    activation_token.used_at = timezone.now()
    activation_token.save(update_fields=["used_at"])
    return activation_token
