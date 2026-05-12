from __future__ import annotations

from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone as dt_timezone
from dataclasses import dataclass
from decimal import Decimal
from typing import Iterable

from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Count, Q
from django.utils import timezone

from apps.accounts.models import MemberProfile, UserRole
from apps.regions.models import Association, DistrictOperationalUnit, RegionState, Unit

from .models import (
    Company,
    CompanyTier,
    ExposureLedger,
    MarketZone,
    PlacementOverride,
    Product,
    ProductCategory,
    ProductVisibilityTarget,
    ZoneEligibilityRule,
)


class TierValidationError(Exception):
    pass


@dataclass
class TierDowngradeWarning:
    active_product_ids: list[int]
    allowed_active_products: int
    overflow_product_ids: list[int]


@dataclass
class MarketFeedBuildResult:
    rows: list[dict]
    candidate_count: int
    applied_override_count: int
    fallback_used: bool = False


FAIRNESS_ZONE_KEYS = {"featured_companies", "rising_companies"}
ZERO_DECIMAL = Decimal("0")
HUNDRED_DECIMAL = Decimal("100")


def _company_names_for_member_profiles(queryset) -> list[str]:
    return list(
        queryset.exclude(company_name="")
        .values_list("company_name", flat=True)
        .distinct()
    )


PRODUCT_TARGET_MODEL_BY_TYPE = {
    ProductVisibilityTarget.TargetType.STATE: RegionState,
    ProductVisibilityTarget.TargetType.ASSOCIATION: Association,
    ProductVisibilityTarget.TargetType.UNIT: Unit,
    ProductVisibilityTarget.TargetType.COMPANY: Company,
}


def get_admin_manageable_company_queryset(user):
    if not user or not user.is_authenticated:
        return Company.objects.none()
    if getattr(user, "is_super_admin_user", False):
        return Company.objects.all()

    state_role = user.scoped_roles.filter(
        role=UserRole.Role.STATE_ADMIN,
        scope_type=UserRole.ScopeType.STATE,
    ).order_by("id").first()
    if state_role and state_role.scope_id:
        state = RegionState.objects.filter(pk=state_role.scope_id).first()
        if state is not None:
            return Company.objects.filter(state__iexact=state.name)

    association_role = user.scoped_roles.filter(
        role=UserRole.Role.ASSOCIATION_ADMIN,
        scope_type=UserRole.ScopeType.ASSOCIATION,
    ).order_by("id").first()
    if association_role and association_role.scope_id:
        association = Association.objects.filter(pk=association_role.scope_id).first()
        if association is not None:
            company_names = _company_names_for_member_profiles(
                MemberProfile.objects.filter(association=association)
            )
            return Company.objects.filter(name__in=company_names)

    district_role = user.scoped_roles.filter(
        role=UserRole.Role.DISTRICT_ADMIN,
        scope_type=UserRole.ScopeType.DISTRICT_OPERATIONAL_UNIT,
    ).order_by("id").first()
    if district_role and district_role.scope_id:
        district_operational_unit = DistrictOperationalUnit.objects.filter(pk=district_role.scope_id).first()
        if district_operational_unit is not None:
            company_names = _company_names_for_member_profiles(
                MemberProfile.objects.filter(district_operational_unit=district_operational_unit)
            )
            return Company.objects.filter(name__in=company_names)

    unit_role = user.scoped_roles.filter(
        role=UserRole.Role.UNIT_ADMIN,
        scope_type=UserRole.ScopeType.UNIT,
    ).order_by("id").first()
    if unit_role and unit_role.scope_id:
        unit = Unit.objects.filter(pk=unit_role.scope_id).first()
        if unit is not None:
            company_names = _company_names_for_member_profiles(MemberProfile.objects.filter(unit=unit))
            return Company.objects.filter(name__in=company_names)

    return Company.objects.none()


def get_manageable_company_queryset(user):
    admin_queryset = get_admin_manageable_company_queryset(user)
    if admin_queryset.exists():
        return admin_queryset
    if not user or not user.is_authenticated:
        return Company.objects.none()
    company_role = user.scoped_roles.filter(
        role=UserRole.Role.COMPANY_ADMIN,
        scope_type=UserRole.ScopeType.COMPANY,
    ).order_by("id").first()
    if company_role and company_role.scope_id:
        return Company.objects.filter(pk=company_role.scope_id)
    return Company.objects.none()


def user_can_manage_company(user, company_id: int) -> bool:
    if not user or not user.is_authenticated:
        return False
    return get_manageable_company_queryset(user).filter(pk=company_id).exists()


def validate_product_target_payload(target_type: str, target_id: int | None) -> None:
    if target_type == ProductVisibilityTarget.TargetType.PLATFORM:
        if target_id is not None:
            raise TierValidationError("Platform targets must not include a target id.")
        return

    if target_id is None:
        raise TierValidationError("A target id is required for this target type.")

    if target_type == ProductVisibilityTarget.TargetType.USER:
        if not get_user_model().objects.filter(pk=target_id).exists():
            raise TierValidationError("Selected user target does not exist.")
        return

    model_class = PRODUCT_TARGET_MODEL_BY_TYPE.get(target_type)
    if model_class is None:
        raise TierValidationError("Unsupported target type.")
    if not model_class.objects.filter(pk=target_id).exists():
        raise TierValidationError(f"Selected {target_type} target does not exist.")


def _company_member_profiles(company_id: int):
    company = Company.objects.filter(pk=company_id).first()
    if company is None:
        return MemberProfile.objects.none()
    return MemberProfile.objects.filter(company_name=company.name).select_related(
        "state",
        "association",
        "district_operational_unit",
        "unit",
    )


def _company_association_ids(company_id: int) -> set[int]:
    return set(_company_member_profiles(company_id).exclude(association=None).values_list("association_id", flat=True))


def _company_unit_ids(company_id: int) -> set[int]:
    return set(_company_member_profiles(company_id).exclude(unit=None).values_list("unit_id", flat=True))


def _company_state_ids(company_id: int) -> set[int]:
    return set(_company_member_profiles(company_id).exclude(state=None).values_list("state_id", flat=True))


def _user_company_ids(user) -> set[int]:
    if not user or not user.is_authenticated:
        return set()
    company_ids = set(
        user.scoped_roles.filter(
            role=UserRole.Role.COMPANY_ADMIN,
            scope_type=UserRole.ScopeType.COMPANY,
        ).values_list("scope_id", flat=True)
    )
    member_profile = getattr(user, "member_profile", None)
    if member_profile and member_profile.company_name:
        company_ids.update(Company.objects.filter(name=member_profile.company_name).values_list("id", flat=True))
    return company_ids


def get_product_visibility_tokens(user) -> set[tuple[str, int | None]]:
    tokens: set[tuple[str, int | None]] = {(ProductVisibilityTarget.TargetType.PLATFORM, None)}
    if not user or not user.is_authenticated:
        return tokens

    tokens.add((ProductVisibilityTarget.TargetType.USER, user.id))

    member_profile = getattr(user, "member_profile", None)
    if member_profile:
        if member_profile.state_id:
            tokens.add((ProductVisibilityTarget.TargetType.STATE, member_profile.state_id))
        if member_profile.association_id:
            tokens.add((ProductVisibilityTarget.TargetType.ASSOCIATION, member_profile.association_id))
        if member_profile.unit_id:
            tokens.add((ProductVisibilityTarget.TargetType.UNIT, member_profile.unit_id))

    for company_id in _user_company_ids(user):
        tokens.add((ProductVisibilityTarget.TargetType.COMPANY, company_id))
        for association_id in _company_association_ids(company_id):
            tokens.add((ProductVisibilityTarget.TargetType.ASSOCIATION, association_id))
        for unit_id in _company_unit_ids(company_id):
            tokens.add((ProductVisibilityTarget.TargetType.UNIT, unit_id))
        for state_id in _company_state_ids(company_id):
            tokens.add((ProductVisibilityTarget.TargetType.STATE, state_id))

    return tokens


def _build_target_match_q(tokens: set[tuple[str, int | None]]) -> Q:
    query = Q()
    for target_type, target_id in tokens:
        condition = Q(target_type=target_type)
        if target_id is None:
            condition &= Q(target_id__isnull=True)
        else:
            condition &= Q(target_id=target_id)
        query |= condition
    return query


def apply_product_visibility_filters(queryset, user):
    tokens = get_product_visibility_tokens(user)
    target_query = _build_target_match_q(tokens)
    include_product_ids = ProductVisibilityTarget.objects.filter(
        mode=ProductVisibilityTarget.Mode.INCLUDE,
    ).filter(target_query).values_list("product_id", flat=True)
    exclude_product_ids = ProductVisibilityTarget.objects.filter(
        mode=ProductVisibilityTarget.Mode.EXCLUDE,
    ).filter(target_query).values_list("product_id", flat=True)
    return queryset.filter(id__in=include_product_ids).exclude(id__in=exclude_product_ids).distinct()


def _format_product_target_label(target: ProductVisibilityTarget) -> str:
    if target.target_type == ProductVisibilityTarget.TargetType.PLATFORM:
        return "Platform"
    if target.target_id is None:
        return target.target_type.replace("_", " ").title()
    if target.target_type == ProductVisibilityTarget.TargetType.USER:
        return f"User #{target.target_id}"
    return f"{target.target_type.replace('_', ' ').title()} #{target.target_id}"


def build_product_visibility_summary(product: Product, *, company: Company | None = None) -> dict[str, object]:
    resolved_company = company or product.company
    blockers: list[str] = []

    if not product.is_active:
        blockers.append("This product is inactive.")
    if not resolved_company.is_active:
        blockers.append("The company profile is inactive.")
    if not resolved_company.is_approved:
        blockers.append("The company is awaiting admin approval.")

    include_targets = [target for target in product.visibility_targets.all() if target.mode == ProductVisibilityTarget.Mode.INCLUDE]
    exclude_targets = [target for target in product.visibility_targets.all() if target.mode == ProductVisibilityTarget.Mode.EXCLUDE]

    if not include_targets:
        blockers.append("No include audience has been configured.")

    if blockers:
        return {
            "status": "hidden",
            "audience_label": "Company managers and admins only",
            "detail": "Hidden from the public product catalog until these blockers are cleared.",
            "blockers": blockers,
        }

    include_labels = ", ".join(_format_product_target_label(target) for target in include_targets)
    exclude_labels = ", ".join(_format_product_target_label(target) for target in exclude_targets)
    detail = f"Included audiences: {include_labels}."
    if exclude_labels:
        detail = f"{detail} Excluding: {exclude_labels}."
    if not resolved_company.is_market_visible:
        detail = f"{detail} Market screen placement is controlled separately and is currently hidden for this company."

    is_platform_default = (
        len(include_targets) == 1
        and include_targets[0].target_type == ProductVisibilityTarget.TargetType.PLATFORM
        and include_targets[0].target_id is None
        and not exclude_targets
    )

    return {
        "status": "visible",
        "audience_label": "Public catalog visitors, members, and admins" if is_platform_default else "Selected audience targets",
        "detail": detail,
        "blockers": [],
    }


def sync_product_visibility_targets(
    product: Product,
    *,
    include_targets: list[dict] | None = None,
    exclude_targets: list[dict] | None = None,
) -> None:
    if include_targets is None and exclude_targets is None:
        return

    next_include_targets = include_targets if include_targets is not None else [
        {"target_type": target.target_type, "target_id": target.target_id}
        for target in product.visibility_targets.filter(mode=ProductVisibilityTarget.Mode.INCLUDE)
    ]
    next_exclude_targets = exclude_targets if exclude_targets is not None else [
        {"target_type": target.target_type, "target_id": target.target_id}
        for target in product.visibility_targets.filter(mode=ProductVisibilityTarget.Mode.EXCLUDE)
    ]

    if not next_include_targets:
        raise TierValidationError("At least one include target is required.")

    for target in [*next_include_targets, *next_exclude_targets]:
        validate_product_target_payload(target["target_type"], target.get("target_id"))

    normalized_include_targets = list(
        {
            (target["target_type"], target.get("target_id")): {
                "target_type": target["target_type"],
                "target_id": target.get("target_id"),
            }
            for target in next_include_targets
        }.values()
    )
    normalized_exclude_targets = list(
        {
            (target["target_type"], target.get("target_id")): {
                "target_type": target["target_type"],
                "target_id": target.get("target_id"),
            }
            for target in next_exclude_targets
        }.values()
    )

    with transaction.atomic():
        product.visibility_targets.all().delete()
        ProductVisibilityTarget.objects.bulk_create(
            [
                ProductVisibilityTarget(
                    product=product,
                    target_type=target["target_type"],
                    target_id=target.get("target_id"),
                    mode=ProductVisibilityTarget.Mode.INCLUDE,
                )
                for target in normalized_include_targets
            ]
            + [
                ProductVisibilityTarget(
                    product=product,
                    target_type=target["target_type"],
                    target_id=target.get("target_id"),
                    mode=ProductVisibilityTarget.Mode.EXCLUDE,
                )
                for target in normalized_exclude_targets
            ]
        )

def get_company_active_product_count(company: Company, *, exclude_product_id: int | None = None) -> int:
    queryset = company.products.filter(is_active=True)
    if exclude_product_id is not None:
        queryset = queryset.exclude(id=exclude_product_id)
    return queryset.count()


def validate_company_tier_capacity(tier: CompanyTier, *, exclude_company_id: int | None = None) -> None:
    if tier.max_companies_allowed is None:
        return
    queryset = tier.companies.filter(is_active=True, is_approved=True)
    if exclude_company_id is not None:
        queryset = queryset.exclude(id=exclude_company_id)
    if queryset.count() >= tier.max_companies_allowed:
        raise TierValidationError("This tier has reached its company slot limit.")


def validate_company_can_activate_product(company: Company, *, exclude_product_id: int | None = None) -> None:
    if not company.tier_ref_id:
        raise TierValidationError("A company tier is required before products can be activated.")
    active_count = get_company_active_product_count(company, exclude_product_id=exclude_product_id)
    if active_count >= company.tier_ref.max_products:
        raise TierValidationError("You have reached your product showcase limit for your current tier.")


def validate_product_image_count(company: Company, image_count: int) -> None:
    tier = company.tier_ref
    if tier is None:
        raise TierValidationError("A company tier is required before validating product images.")
    if image_count < tier.min_photos_per_product:
        raise TierValidationError(
            f"At least {tier.min_photos_per_product} product image(s) are required for your current tier."
        )
    if image_count > tier.max_photos_per_product:
        raise TierValidationError(
            f"No more than {tier.max_photos_per_product} product image(s) are allowed for your current tier."
        )


def build_downgrade_warning(company: Company, next_tier: CompanyTier) -> TierDowngradeWarning | None:
    active_products = list(company.products.filter(is_active=True).order_by("-created_at", "-id"))
    if len(active_products) <= next_tier.max_products:
        return None
    retained_products = active_products[: next_tier.max_products]
    overflow_products = active_products[next_tier.max_products :]
    return TierDowngradeWarning(
        active_product_ids=[product.id for product in active_products],
        allowed_active_products=next_tier.max_products,
        overflow_product_ids=[product.id for product in overflow_products],
    )


def apply_tier_change_with_selected_products(company: Company, next_tier: CompanyTier, retain_active_product_ids: list[int]) -> None:
    active_products = list(company.products.filter(is_active=True).order_by("-created_at", "-id"))
    active_product_ids = {product.id for product in active_products}
    requested_product_ids = set(retain_active_product_ids)

    if not requested_product_ids.issubset(active_product_ids):
        raise TierValidationError("Selected products must belong to the company and already be active.")
    if len(requested_product_ids) > next_tier.max_products:
        raise TierValidationError("Selected active products exceed the limit for the target tier.")

    company.products.filter(is_active=True).exclude(id__in=requested_product_ids).update(is_active=False)
    company.tier_ref = next_tier
    company.save(update_fields=["tier_ref"])


def sync_product_images(product: Product, image_asset_ids: list[int]) -> int:
    product.images.exclude(asset_id__in=image_asset_ids).delete()
    existing_asset_ids = set(product.images.values_list("asset_id", flat=True))
    from .models import MediaAsset, ProductImage

    assets = MediaAsset.objects.filter(id__in=image_asset_ids)
    asset_lookup = {asset.id: asset for asset in assets}
    for asset_id in image_asset_ids:
        if asset_id in existing_asset_ids:
            continue
        asset = asset_lookup.get(asset_id)
        if asset is None:
            continue
        ProductImage.objects.create(product=product, asset=asset)
    return product.images.count()


def build_market_zone_feed(company_queryset, *, now=None, write_exposure: bool = False) -> MarketFeedBuildResult:
    current_time = now or timezone.now()
    zones = list(
        MarketZone.objects.filter(is_enabled=True)
        .exclude(serving_mode=MarketZone.ServingMode.DORMANT)
        .order_by("sort_order", "id")
    )
    visible_companies = list(
        company_queryset.filter(is_market_visible=True, tier_ref__is_active=True)
    )
    rows: list[dict] = []
    candidate_count = 0
    applied_override_count = 0
    exposures_to_create: list[ExposureLedger] = []

    for zone in zones:
        rules = list(
            ZoneEligibilityRule.objects.filter(zone=zone, is_eligible=True).select_related("tier")
        )
        if not rules:
            continue

        if zone.serving_mode == MarketZone.ServingMode.SCHEDULED_HERO:
            row, row_candidate_count, row_override_count, row_exposures = _build_scheduled_hero_row(
                zone,
                visible_companies,
                rules,
                current_time,
                write_exposure=write_exposure,
            )
        elif zone.serving_mode == MarketZone.ServingMode.WEIGHTED_COMPANIES:
            row, row_candidate_count, row_override_count, row_exposures = _build_weighted_zone_row(
                zone,
                visible_companies,
                rules,
                current_time,
                write_exposure=write_exposure,
            )
        else:
            continue

        candidate_count += row_candidate_count
        applied_override_count += row_override_count
        exposures_to_create.extend(row_exposures)
        if row["resolved_items"]:
            rows.append(row)

    if write_exposure and exposures_to_create:
        with transaction.atomic():
            ExposureLedger.objects.bulk_create(exposures_to_create)

    return MarketFeedBuildResult(
        rows=rows,
        candidate_count=candidate_count,
        applied_override_count=applied_override_count,
        fallback_used=False,
    )


def build_market_category_row(categories: list[ProductCategory]) -> dict | None:
    if not categories:
        return None
    return {
        "id": -1,
        "title": "Browse Categories",
        "row_type": "category_collection",
        "layout": "rail_category",
        "sort_order": 25,
        "is_enabled": True,
        "zone_key": None,
        "serving_mode": None,
        "resolved_items": categories,
    }


def build_latest_products_row(zone: MarketZone, products: list[Product]) -> dict | None:
    if not products:
        return None
    return {
        "id": zone.id,
        "title": zone.title,
        "row_type": "product_collection",
        "layout": zone.layout,
        "sort_order": zone.sort_order,
        "is_enabled": zone.is_enabled,
        "zone_key": zone.key,
        "serving_mode": zone.serving_mode,
        "resolved_items": products,
    }


def _build_scheduled_hero_row(
    zone: MarketZone,
    visible_companies: list[Company],
    rules: list[ZoneEligibilityRule],
    current_time,
    *,
    write_exposure: bool,
) -> tuple[dict, int, int, list[ExposureLedger]]:
    selection = _select_scheduled_hero(
        zone,
        visible_companies,
        rules,
        current_time,
    )
    candidate_count = selection["candidate_count"]
    selected = selection["selected"]
    if not selected:
        return _build_zone_row_payload(zone, []), 0, 0, []

    if write_exposure:
        selected_company = selected[0]["company"]
        selected_company.last_featured_at = selection["slot_time"]
        selected_company.save(update_fields=["last_featured_at"])

    exposures = _build_exposure_rows(
        zone,
        selected,
        current_time,
        source="public_market_feed" if write_exposure else "admin_market_preview",
        slot_key=selection["slot_key"],
    )
    applied_override_count = sum(1 for candidate in selected if candidate["override_rank"] < 2)
    return (
        _build_zone_row_payload(zone, [candidate["company"] for candidate in selected]),
        candidate_count,
        applied_override_count,
        exposures if write_exposure else [],
    )


def _build_weighted_zone_row(
    zone: MarketZone,
    visible_companies: list[Company],
    rules: list[ZoneEligibilityRule],
    current_time,
    *,
    write_exposure: bool,
) -> tuple[dict, int, int, list[ExposureLedger]]:
    candidates = _get_zone_candidates(zone, visible_companies, rules, current_time)
    fairness_enabled = _supports_fairness(zone)
    _annotate_candidate_fairness(candidates, zone, current_time)
    candidate_count = len(candidates)
    if not candidates:
        return _build_zone_row_payload(zone, []), 0, 0, []

    candidates.sort(key=lambda candidate: _company_sort_key(candidate, zone, fairness_enabled=fairness_enabled))
    selected = candidates[: zone.capacity]
    exposures = _build_exposure_rows(
        zone,
        selected,
        current_time,
        source="public_market_feed" if write_exposure else "admin_market_preview",
    )
    applied_override_count = sum(1 for candidate in selected if candidate["override_rank"] < 2)
    return (
        _build_zone_row_payload(zone, [candidate["company"] for candidate in selected]),
        candidate_count,
        applied_override_count,
        exposures if write_exposure else [],
    )


def _get_zone_candidates(
    zone: MarketZone,
    visible_companies: list[Company],
    rules: Iterable[ZoneEligibilityRule],
    current_time,
) -> list[dict]:
    tier_rule_map = {rule.tier_id: rule for rule in rules}
    relevant_companies = [company for company in visible_companies if company.tier_ref_id in tier_rule_map]
    if not relevant_companies:
        return []

    override_map = _get_override_map(zone, [company.id for company in relevant_companies], current_time)
    candidates: list[dict] = []
    for company in relevant_companies:
        override = override_map.get(company.id)
        if override is not None and override.action == PlacementOverride.Action.BLOCK:
            continue
        rule = tier_rule_map[company.tier_ref_id]
        candidates.append(
            {
                "company": company,
                "rule": rule,
                "override": override,
                "override_rank": _get_override_rank(override),
                "score": Decimal(company.tier_ref.base_weight) * rule.weight_multiplier,
                "actual_serves": 0,
                "target_serves": ZERO_DECIMAL,
                "deficit": ZERO_DECIMAL,
            }
        )
    return candidates


def _get_override_map(zone: MarketZone, company_ids: list[int], current_time) -> dict[int, PlacementOverride]:
    if not company_ids:
        return {}
    overrides = list(
        PlacementOverride.objects.filter(
            zone=zone,
            company_id__in=company_ids,
            is_active=True,
            starts_at__lte=current_time,
            ends_at__gt=current_time,
        ).order_by("-priority", "id")
    )
    ranked_map: dict[int, tuple[int, PlacementOverride]] = {}
    for override in overrides:
        rank = _get_override_rank(override)
        existing = ranked_map.get(override.company_id)
        if existing is None or rank < existing[0] or (rank == existing[0] and override.priority > existing[1].priority):
            ranked_map[override.company_id] = (rank, override)
    return {company_id: value[1] for company_id, value in ranked_map.items()}


def _get_override_rank(override: PlacementOverride | None) -> int:
    if override is None:
        return 2
    if override.action == PlacementOverride.Action.PIN:
        return 0
    if override.action == PlacementOverride.Action.BOOST:
        return 1
    return 3


def _company_sort_key(candidate: dict, zone: MarketZone, *, fairness_enabled: bool = False) -> tuple:
    company = candidate["company"]
    deficit_score = candidate["deficit"] if fairness_enabled else ZERO_DECIMAL
    return (
        candidate["override_rank"],
        -deficit_score,
        -candidate["score"],
        -company.admin_priority,
        -company.created_at.timestamp(),
        -company.id,
    )


def _is_on_cooldown(candidate: dict, zone: MarketZone, current_time, *, featured_at_overrides: dict[int, datetime] | None = None) -> bool:
    company = candidate["company"]
    last_featured_at = company.last_featured_at
    if featured_at_overrides and company.id in featured_at_overrides:
        last_featured_at = featured_at_overrides[company.id]
    if last_featured_at is None:
        return False
    cooldown_hours = zone.cooldown_override_hours if zone.cooldown_override_hours is not None else company.tier_ref.cooldown_hours
    if cooldown_hours <= 0:
        return False
    return last_featured_at > current_time - timedelta(hours=cooldown_hours)


def _build_zone_row_payload(zone: MarketZone, companies: list[Company]) -> dict:
    return {
        "id": zone.id,
        "title": zone.title,
        "row_type": "company_tier",
        "layout": zone.layout,
        "sort_order": zone.sort_order,
        "is_enabled": zone.is_enabled,
        "zone_key": zone.key,
        "serving_mode": zone.serving_mode,
        "resolved_items": companies,
    }


def _build_exposure_rows(
    zone: MarketZone,
    selected: list[dict],
    current_time,
    *,
    source: str,
    slot_key: str | None = None,
) -> list[ExposureLedger]:
    exposures: list[ExposureLedger] = []
    for candidate in selected:
        company = candidate["company"]
        metadata = {
            "source": source,
            "selection_reason": _get_selection_reason(candidate, zone),
        }
        if slot_key is not None:
            metadata["slot_key"] = slot_key
        exposures.append(
            ExposureLedger(
                company=company,
                tier=company.tier_ref,
                zone=zone,
                event_type=ExposureLedger.EventType.SERVED,
                served_at=current_time,
                metadata=metadata,
            )
        )
    return exposures


def build_market_preview_payload(company_queryset, *, now=None, hero_days: int = 0) -> dict:
    current_time = now or timezone.now()
    result = build_market_zone_feed(company_queryset, now=current_time, write_exposure=False)
    payload = {
        "rows": result.rows,
        "candidate_count": result.candidate_count,
        "applied_override_count": result.applied_override_count,
        "fallback_used": result.fallback_used,
        "hero_schedule": [],
    }
    if hero_days > 0:
        payload["hero_schedule"] = build_market_hero_schedule(company_queryset, now=current_time, days=hero_days)
    return payload


def build_market_hero_schedule(company_queryset, *, now=None, days: int = 7) -> list[dict]:
    current_time = now or timezone.now()
    hero_zone = MarketZone.objects.filter(
        key="hero_spotlight",
        is_enabled=True,
        serving_mode=MarketZone.ServingMode.SCHEDULED_HERO,
    ).first()
    if hero_zone is None:
        return []

    rules = list(
        ZoneEligibilityRule.objects.filter(zone=hero_zone, is_eligible=True).select_related("tier")
    )
    visible_companies = list(company_queryset.filter(is_market_visible=True, tier_ref__is_active=True))
    if not rules or not visible_companies:
        return []

    slot_interval_hours = max(hero_zone.slot_interval_hours, 1)
    slot_seconds = slot_interval_hours * 3600
    current_time_utc = current_time.astimezone(dt_timezone.utc)
    current_slot_index = int(current_time_utc.timestamp() // slot_seconds)
    total_slots = max((days * 24) // slot_interval_hours, 0)
    featured_at_overrides: dict[int, datetime] = {}
    schedule: list[dict] = []

    for slot_offset in range(total_slots):
        slot_index = current_slot_index + slot_offset
        slot_time = datetime.fromtimestamp(slot_index * slot_seconds, tz=dt_timezone.utc)
        selection = _select_scheduled_hero(
            hero_zone,
            visible_companies,
            rules,
            slot_time,
            featured_at_overrides=featured_at_overrides,
        )
        selected_company = selection["selected"][0]["company"] if selection["selected"] else None
        if selected_company is not None:
            featured_at_overrides[selected_company.id] = selection["slot_time"]
        schedule.append(
            {
                "slot_key": selection["slot_key"],
                "slot_index": selection["slot_index"],
                "serves_at": selection["slot_time"],
                "zone_key": hero_zone.key,
                "title": hero_zone.title,
                "wildcard_slot": selection["wildcard_slot"],
                "selection_reason": _get_selection_reason(selection["selected"][0], hero_zone) if selection["selected"] else None,
                "company": selected_company,
            }
        )
    return schedule


def build_market_report_summary(*, now=None, days: int = 7) -> dict:
    current_time = now or timezone.now()
    window_start = current_time - timedelta(days=days)
    exposures = list(
        ExposureLedger.objects.filter(
            event_type=ExposureLedger.EventType.SERVED,
            served_at__gte=window_start,
            served_at__lte=current_time,
            zone__key__in=["hero_spotlight", "featured_companies", "rising_companies"],
        )
        .select_related("company", "tier", "zone")
        .order_by("zone__sort_order", "-served_at", "-id")
    )

    zone_totals: dict[str, dict] = {}
    tier_totals: dict[str, dict] = {}
    zone_company_counts: dict[str, Counter] = defaultdict(Counter)

    for exposure in exposures:
        if exposure.zone is None:
            continue
        zone_key = exposure.zone.key
        zone_entry = zone_totals.setdefault(
            zone_key,
            {
                "zone_key": zone_key,
                "title": exposure.zone.title,
                "total_serves": 0,
                "selection_reasons": {"pin": 0, "boost": 0, "fairness": 0, "weight": 0},
                "top_companies": [],
            },
        )
        zone_entry["total_serves"] += 1
        selection_reason = exposure.metadata.get("selection_reason") or "weight"
        if selection_reason not in zone_entry["selection_reasons"]:
            zone_entry["selection_reasons"][selection_reason] = 0
        zone_entry["selection_reasons"][selection_reason] += 1
        zone_company_counts[zone_key][exposure.company_id] += 1

        tier_slug = exposure.tier.slug if exposure.tier else "unknown"
        tier_entry = tier_totals.setdefault(
            tier_slug,
            {
                "tier_id": exposure.tier_id,
                "tier_slug": exposure.tier.slug if exposure.tier else None,
                "tier_name": exposure.tier.name if exposure.tier else None,
                "total_serves": 0,
            },
        )
        tier_entry["total_serves"] += 1

    company_lookup = {
        company.id: company
        for company in Company.objects.filter(id__in={company_id for counter in zone_company_counts.values() for company_id in counter.keys()}).select_related("tier_ref")
    }
    for zone_key, zone_entry in zone_totals.items():
        top_companies: list[dict] = []
        for company_id, total_serves in zone_company_counts[zone_key].most_common(5):
            company = company_lookup.get(company_id)
            if company is None:
                continue
            top_companies.append(
                {
                    "company_id": company.id,
                    "name": company.name,
                    "tier_name": company.tier_ref.name,
                    "total_serves": total_serves,
                }
            )
        zone_entry["top_companies"] = top_companies

    return {
        "days": days,
        "window_start": window_start,
        "window_end": current_time,
        "fairness_enabled": bool(settings.DIRECTORY_MARKET_FAIRNESS_ENABLED),
        "zones": list(zone_totals.values()),
        "tiers": sorted(tier_totals.values(), key=lambda item: (-item["total_serves"], item["tier_name"] or "")),
    }


def build_under_served_report(company_queryset, *, now=None, days: int = 7) -> dict:
    current_time = now or timezone.now()
    window_start = current_time - timedelta(days=days)
    if not settings.DIRECTORY_MARKET_FAIRNESS_ENABLED:
        return {
            "days": days,
            "window_start": window_start,
            "window_end": current_time,
            "fairness_enabled": False,
            "results": [],
        }

    visible_companies = list(company_queryset.filter(is_market_visible=True, tier_ref__is_active=True))
    zones = list(
        MarketZone.objects.filter(
            key__in=sorted(FAIRNESS_ZONE_KEYS),
            is_enabled=True,
            serving_mode=MarketZone.ServingMode.WEIGHTED_COMPANIES,
        ).order_by("sort_order", "id")
    )
    results: list[dict] = []
    for zone in zones:
        rules = list(
            ZoneEligibilityRule.objects.filter(zone=zone, is_eligible=True).select_related("tier")
        )
        candidates = _get_zone_candidates(zone, visible_companies, rules, current_time)
        _annotate_candidate_fairness(candidates, zone, current_time, window_days=days)
        for candidate in candidates:
            if candidate["deficit"] <= ZERO_DECIMAL:
                continue
            company = candidate["company"]
            results.append(
                {
                    "company_id": company.id,
                    "company_name": company.name,
                    "tier_id": company.tier_ref_id,
                    "tier_name": company.tier_ref.name,
                    "zone_key": zone.key,
                    "zone_title": zone.title,
                    "actual_serves": candidate["actual_serves"],
                    "target_serves": candidate["target_serves"],
                    "deficit": candidate["deficit"],
                }
            )

    results.sort(
        key=lambda item: (
            -item["deficit"],
            item["zone_key"],
            item["tier_name"],
            item["company_name"],
        )
    )
    return {
        "days": days,
        "window_start": window_start,
        "window_end": current_time,
        "fairness_enabled": True,
        "results": results,
    }


def _select_scheduled_hero(
    zone: MarketZone,
    visible_companies: list[Company],
    rules: list[ZoneEligibilityRule],
    current_time,
    *,
    featured_at_overrides: dict[int, datetime] | None = None,
) -> dict:
    slot_interval_hours = max(zone.slot_interval_hours, 1)
    slot_seconds = slot_interval_hours * 3600
    current_time_utc = current_time.astimezone(dt_timezone.utc)
    slot_index = int(current_time_utc.timestamp() // slot_seconds)
    wildcard_slot = (slot_index + 1) % 5 == 0
    slot_time = datetime.fromtimestamp(slot_index * slot_seconds, tz=dt_timezone.utc)

    preferred_rules = [rule for rule in rules if rule.is_wildcard == wildcard_slot]
    candidate_rules = preferred_rules or rules
    candidates = _get_zone_candidates(zone, visible_companies, candidate_rules, current_time)
    candidate_count = len(candidates)
    if not candidates:
        return {
            "selected": [],
            "candidate_count": 0,
            "slot_key": str(slot_index),
            "slot_index": slot_index,
            "slot_time": slot_time,
            "wildcard_slot": wildcard_slot,
        }

    cooled_candidates = [
        candidate
        for candidate in candidates
        if not _is_on_cooldown(candidate, zone, current_time, featured_at_overrides=featured_at_overrides)
    ]
    ranked_candidates = cooled_candidates or candidates
    ranked_candidates.sort(key=lambda candidate: _company_sort_key(candidate, zone))
    return {
        "selected": ranked_candidates[:1],
        "candidate_count": candidate_count,
        "slot_key": str(slot_index),
        "slot_index": slot_index,
        "slot_time": slot_time,
        "wildcard_slot": wildcard_slot,
    }


def _supports_fairness(zone: MarketZone) -> bool:
    return bool(
        settings.DIRECTORY_MARKET_FAIRNESS_ENABLED
        and zone.serving_mode == MarketZone.ServingMode.WEIGHTED_COMPANIES
        and zone.key in FAIRNESS_ZONE_KEYS
    )


def _annotate_candidate_fairness(
    candidates: list[dict],
    zone: MarketZone,
    current_time,
    *,
    window_days: int | None = None,
) -> None:
    for candidate in candidates:
        candidate["actual_serves"] = 0
        candidate["target_serves"] = ZERO_DECIMAL
        candidate["deficit"] = ZERO_DECIMAL

    if not candidates or zone.key not in FAIRNESS_ZONE_KEYS:
        return

    lookback_days = window_days or max(int(settings.DIRECTORY_MARKET_FAIRNESS_WINDOW_DAYS), 1)
    window_start = current_time - timedelta(days=lookback_days)
    company_ids = [candidate["company"].id for candidate in candidates]
    exposure_counts = {
        row["company_id"]: row["total_serves"]
        for row in ExposureLedger.objects.filter(
            zone=zone,
            event_type=ExposureLedger.EventType.SERVED,
            served_at__gte=window_start,
            served_at__lte=current_time,
            company_id__in=company_ids,
        )
        .values("company_id")
        .annotate(total_serves=Count("id"))
    }
    zone_total_serves = sum(exposure_counts.values())
    candidates_by_tier: dict[int, list[dict]] = defaultdict(list)
    for candidate in candidates:
        candidates_by_tier[candidate["company"].tier_ref_id].append(candidate)

    for tier_candidates in candidates_by_tier.values():
        eligible_count = len(tier_candidates)
        if eligible_count <= 0:
            continue
        rule = tier_candidates[0]["rule"]
        per_company_share = Decimal(rule.guaranteed_share) / Decimal(eligible_count)
        for candidate in tier_candidates:
            actual_serves = int(exposure_counts.get(candidate["company"].id, 0))
            target_serves = (Decimal(zone_total_serves) * per_company_share / HUNDRED_DECIMAL) if zone_total_serves > 0 else ZERO_DECIMAL
            deficit = target_serves - Decimal(actual_serves)
            candidate["actual_serves"] = actual_serves
            candidate["target_serves"] = target_serves.quantize(Decimal("0.01"))
            candidate["deficit"] = max(deficit, ZERO_DECIMAL).quantize(Decimal("0.01"))


def _get_selection_reason(candidate: dict, zone: MarketZone) -> str:
    override_rank = candidate["override_rank"]
    if override_rank == 0:
        return "pin"
    if override_rank == 1:
        return "boost"
    if _supports_fairness(zone) and candidate["deficit"] > ZERO_DECIMAL:
        return "fairness"
    return "weight"
