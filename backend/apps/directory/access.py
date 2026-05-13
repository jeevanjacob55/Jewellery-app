from __future__ import annotations

from dataclasses import dataclass
import logging

from django.db.models import Q

from apps.accounts.models import MemberProfile, UserRole
from apps.regions.models import Association, DistrictOperationalUnit, RegionState, Unit

from .models import Company, CompanyMembership


logger = logging.getLogger(__name__)

MANAGEABLE_MEMBERSHIP_ROLES = {
    CompanyMembership.Role.PRIMARY_ADMIN,
    CompanyMembership.Role.ADMIN,
    CompanyMembership.Role.MANAGER,
}


@dataclass
class LinkedCompanyContext:
    company: Company | None
    source: str | None = None
    membership: CompanyMembership | None = None


def normalize_company_name(value: str) -> str:
    return " ".join((value or "").split()).strip().casefold()


def _resolve_company(company_or_id: Company | int | None) -> Company | None:
    if isinstance(company_or_id, Company):
        return company_or_id
    if not company_or_id:
        return None
    return Company.objects.filter(pk=company_or_id).first()


def _company_member_profiles(company: Company):
    return MemberProfile.objects.filter(company_name=company.name).select_related(
        "state",
        "association",
        "district_operational_unit",
        "unit",
    )


def get_company_state_ids(company: Company) -> set[int]:
    company = _resolve_company(company)
    if company is None:
        return set()
    if company.state_ref_id:
        return {company.state_ref_id}
    return set(_company_member_profiles(company).exclude(state=None).values_list("state_id", flat=True))


def get_company_association_ids(company: Company) -> set[int]:
    company = _resolve_company(company)
    if company is None:
        return set()
    if company.association_ref_id:
        return {company.association_ref_id}
    return set(_company_member_profiles(company).exclude(association=None).values_list("association_id", flat=True))


def get_company_district_ids(company: Company) -> set[int]:
    company = _resolve_company(company)
    if company is None:
        return set()
    if company.district_operational_unit_ref_id:
        return {company.district_operational_unit_ref_id}
    return set(
        _company_member_profiles(company).exclude(district_operational_unit=None).values_list("district_operational_unit_id", flat=True)
    )


def get_company_unit_ids(company: Company) -> set[int]:
    company = _resolve_company(company)
    if company is None:
        return set()
    if company.unit_ref_id:
        return {company.unit_ref_id}
    return set(_company_member_profiles(company).exclude(unit=None).values_list("unit_id", flat=True))


def get_active_company_memberships(user) -> list[CompanyMembership]:
    if not user or not getattr(user, "is_authenticated", False):
        return []
    return list(
        CompanyMembership.objects.filter(
            user=user,
            status=CompanyMembership.Status.ACTIVE,
        )
        .select_related("company", "company__tier_ref", "company__state_ref", "company__association_ref")
        .order_by("-is_primary_admin", "created_at", "id")
    )


def get_primary_company_membership(user) -> CompanyMembership | None:
    memberships = get_active_company_memberships(user)
    return memberships[0] if memberships else None


def get_linked_company_context(user) -> LinkedCompanyContext:
    membership = get_primary_company_membership(user)
    if membership is not None:
        return LinkedCompanyContext(company=membership.company, source="membership", membership=membership)

    if user and getattr(user, "is_authenticated", False):
        scoped_company_role = (
            user.scoped_roles.filter(role=UserRole.Role.COMPANY_ADMIN, scope_type=UserRole.ScopeType.COMPANY).order_by("id").first()
        )
        if scoped_company_role and scoped_company_role.scope_id:
            company = Company.objects.select_related("tier_ref", "state_ref", "association_ref").filter(pk=scoped_company_role.scope_id).first()
            if company is not None:
                return LinkedCompanyContext(company=company, source="scoped_role")

        member_profile = getattr(user, "member_profile", None)
        company_name = getattr(member_profile, "company_name", "").strip()
        if company_name:
            matches = list(Company.objects.select_related("tier_ref", "state_ref", "association_ref").filter(name=company_name)[:2])
            if len(matches) == 1:
                logger.info("Legacy company profile fallback used for user_id=%s company_id=%s", getattr(user, "id", None), matches[0].id)
                return LinkedCompanyContext(company=matches[0], source="legacy_profile")

    return LinkedCompanyContext(company=None)


def get_linked_company(user) -> Company | None:
    return get_linked_company_context(user).company


def get_user_company_ids(user) -> set[int]:
    company_ids: set[int] = set()
    membership = get_primary_company_membership(user)
    if membership is not None:
        company_ids.add(membership.company_id)
    if not user or not getattr(user, "is_authenticated", False):
        return company_ids

    company_ids.update(
        CompanyMembership.objects.filter(
            user=user,
            status=CompanyMembership.Status.ACTIVE,
        ).values_list("company_id", flat=True)
    )
    company_ids.update(
        user.scoped_roles.filter(
            role=UserRole.Role.COMPANY_ADMIN,
            scope_type=UserRole.ScopeType.COMPANY,
        ).values_list("scope_id", flat=True)
    )
    member_profile = getattr(user, "member_profile", None)
    if member_profile and member_profile.company_name:
        company_ids.update(Company.objects.filter(name=member_profile.company_name).values_list("id", flat=True))
    return {company_id for company_id in company_ids if company_id}


def get_manageable_membership_company_queryset(user):
    if not user or not getattr(user, "is_authenticated", False):
        return Company.objects.none()
    return Company.objects.filter(
        memberships__user=user,
        memberships__status=CompanyMembership.Status.ACTIVE,
        memberships__role__in=MANAGEABLE_MEMBERSHIP_ROLES,
    ).distinct()


def company_has_active_admin(company: Company) -> bool:
    if company.memberships.filter(status=CompanyMembership.Status.ACTIVE, is_primary_admin=True).exists():
        return True
    return UserRole.objects.filter(
        role=UserRole.Role.COMPANY_ADMIN,
        scope_type=UserRole.ScopeType.COMPANY,
        scope_id=company.id,
    ).exists()


def find_safe_legacy_company_match(*, company_name: str, state: RegionState) -> Company | None:
    queryset = Company.objects.filter(name__iexact=company_name.strip()).filter(
        Q(state_ref=state) | Q(state__iexact=state.name)
    ).order_by("id")
    matches = list(queryset[:2])
    if len(matches) != 1:
        return None
    return matches[0]


def find_safe_legacy_company_matches(*, company_name: str, state: RegionState) -> list[Company]:
    normalized_name = normalize_company_name(company_name)
    queryset = (
        Company.objects.filter(Q(state_ref=state) | Q(state__iexact=state.name))
        .select_related("tier_ref", "state_ref", "association_ref", "district_operational_unit_ref", "unit_ref")
        .order_by("id")
    )
    return [company for company in queryset if normalize_company_name(company.name) == normalized_name]


def derive_company_queryset_for_scope(
    *,
    state: RegionState | None = None,
    association: Association | None = None,
    district_operational_unit: DistrictOperationalUnit | None = None,
    unit: Unit | None = None,
):
    queryset = Company.objects.all()
    if state is not None:
        return queryset.filter(Q(state_ref=state) | Q(state__iexact=state.name)).distinct()
    if association is not None:
        company_names = association.member_profiles.exclude(company_name="").values_list("company_name", flat=True)
        return queryset.filter(Q(association_ref=association) | Q(name__in=company_names)).distinct()
    if district_operational_unit is not None:
        company_names = district_operational_unit.member_profiles.exclude(company_name="").values_list("company_name", flat=True)
        return queryset.filter(
            Q(district_operational_unit_ref=district_operational_unit) | Q(name__in=company_names)
        ).distinct()
    if unit is not None:
        company_names = unit.member_profiles.exclude(company_name="").values_list("company_name", flat=True)
        return queryset.filter(Q(unit_ref=unit) | Q(name__in=company_names)).distinct()
    return queryset.none()
