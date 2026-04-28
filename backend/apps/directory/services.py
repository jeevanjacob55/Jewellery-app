from __future__ import annotations

from dataclasses import dataclass

from apps.accounts.models import UserRole

from .models import Company, CompanyTier, Product


class TierValidationError(Exception):
    pass


@dataclass
class TierDowngradeWarning:
    active_product_ids: list[int]
    allowed_active_products: int
    overflow_product_ids: list[int]


def user_can_manage_company(user, company_id: int) -> bool:
    if not user or not user.is_authenticated:
        return False
    if getattr(user, "is_super_admin_user", False):
        return True
    return user.has_scoped_role(
        UserRole.Role.COMPANY_ADMIN,
        scope_type=UserRole.ScopeType.COMPANY,
        scope_id=company_id,
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
