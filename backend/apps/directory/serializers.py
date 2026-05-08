from __future__ import annotations

from rest_framework import serializers
from django.utils.text import slugify

from .models import (
    Company,
    CompanyTier,
    CompanyVerification,
    Enquiry,
    MarketRow,
    MarketZone,
    MediaAsset,
    PlacementOverride,
    Product,
    ProductAttributeDefinition,
    ProductAttributeValue,
    ProductCategory,
    ProductImage,
    ProductSubCategory,
    ProductWishlist,
    ZoneEligibilityRule,
)
from .services import (
    TierValidationError,
    sync_product_images,
    validate_company_can_activate_product,
    validate_company_tier_capacity,
    validate_product_image_count,
)


def get_company_image_url(company: Company, *, is_logo: bool) -> str | None:
    for image in company.images.all():
        if image.is_logo == is_logo and image.asset.public_url:
            return image.asset.public_url
    return None


def get_product_image_url(product: Product) -> str | None:
    for image in product.images.all():
        if image.asset.public_url:
            return image.asset.public_url
    return None


def get_product_image_payload(product: Product) -> list[dict[str, str]]:
    payload: list[dict[str, str]] = []
    for image in product.images.all():
        if image.asset.public_url:
            payload.append({"url": image.asset.public_url, "type": "image"})
    return payload


def get_product_attribute_payload(product: Product) -> list[dict[str, str]]:
    payload: list[dict[str, str]] = []
    for attribute_value in product.attribute_values.all():
        payload.append(
            {
                "key": attribute_value.attribute_definition.key,
                "label": attribute_value.attribute_definition.label,
                "value": attribute_value.value,
            }
        )
    return payload


def get_product_attribute_lookup(product: Product) -> dict[str, str]:
    lookup: dict[str, str] = {}
    for attribute_value in product.attribute_values.all():
        lookup[attribute_value.attribute_definition.key.strip().lower()] = attribute_value.value
    return lookup


def get_product_attribute_value(product: Product, *keys: str) -> str | None:
    lookup = get_product_attribute_lookup(product)
    for key in keys:
        value = lookup.get(key.strip().lower())
        if value:
            return value
    return None


def get_product_primary_attribute(product: Product) -> tuple[str | None, str | None]:
    for attribute_value in product.attribute_values.all():
        if attribute_value.attribute_definition.key == "weight":
            continue
        return attribute_value.attribute_definition.label, attribute_value.value
    return None, None


def get_company_is_verified(company: Company) -> bool:
    verification = getattr(company, "verification", None)
    if not verification:
        return False
    return bool(verification.gst_registered or verification.bis_hallmarked or verification.export_licensed)


def get_company_contact_payload(company: Company) -> dict[str, str | None]:
    from apps.accounts.models import UserRole

    contact_user = (
        UserRole.objects.filter(
            role=UserRole.Role.COMPANY_ADMIN,
            scope_type=UserRole.ScopeType.COMPANY,
            scope_id=company.id,
            user__member_profile__phone_number__gt="",
        )
        .select_related("user", "user__member_profile")
        .order_by("id")
        .first()
    )
    phone = None
    if contact_user and getattr(contact_user.user, "member_profile", None):
        phone = contact_user.user.member_profile.phone_number or None

    return {
        "location": ", ".join(part for part in [company.city, company.state] if part),
        "logo": get_company_image_url(company, is_logo=True),
        "phone": phone,
        "whatsapp": phone,
    }


def get_market_category_icon_key(category_name: str) -> str:
    lookup = {
        "rings": "rings",
        "chains": "chains",
        "bangles": "bangles",
        "necklaces": "necklaces",
        "coins": "coins",
        "diamonds": "diamonds",
    }
    normalized = category_name.strip().lower()
    return lookup.get(normalized, "diamond")


def get_category_slug(category: ProductCategory) -> str:
    return slugify(category.name)


def get_subcategory_slug(subcategory: ProductSubCategory) -> str:
    return subcategory.slug or slugify(subcategory.name)


class CompanyVerificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = CompanyVerification
        fields = ["gst_registered", "bis_hallmarked", "export_licensed"]


class ProductSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)
    category_slug = serializers.SerializerMethodField()
    subcategory_name = serializers.CharField(source="subcategory.name", read_only=True)
    subcategory_slug = serializers.SerializerMethodField()
    image_url = serializers.SerializerMethodField()
    price = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    attributes = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            "id",
            "name",
            "weight_grams",
            "purity",
            "price",
            "description",
            "category_name",
            "category_slug",
            "subcategory_name",
            "subcategory_slug",
            "image_url",
            "attributes",
            "is_active",
        ]

    def get_category_slug(self, obj: Product) -> str:
        return get_category_slug(obj.category)

    def get_subcategory_slug(self, obj: Product) -> str | None:
        return get_subcategory_slug(obj.subcategory) if obj.subcategory else None

    def get_image_url(self, obj: Product) -> str | None:
        return get_product_image_url(obj)

    def get_attributes(self, obj: Product) -> list[dict[str, str]]:
        return get_product_attribute_payload(obj)


class CompanyManagementProductImageSerializer(serializers.ModelSerializer):
    asset_id = serializers.IntegerField(source="asset.id", read_only=True)
    url = serializers.CharField(source="asset.public_url", read_only=True)
    original_filename = serializers.CharField(source="asset.original_filename", read_only=True)

    class Meta:
        model = ProductImage
        fields = ["asset_id", "url", "original_filename"]


class CompanyManagementProductSerializer(serializers.ModelSerializer):
    category_id = serializers.IntegerField(source="category.id", read_only=True)
    category_name = serializers.CharField(source="category.name", read_only=True)
    subcategory_id = serializers.IntegerField(source="subcategory.id", read_only=True, allow_null=True)
    subcategory_name = serializers.CharField(source="subcategory.name", read_only=True, allow_null=True)
    image_count = serializers.SerializerMethodField()
    images = CompanyManagementProductImageSerializer(many=True, read_only=True)

    class Meta:
        model = Product
        fields = [
            "id",
            "name",
            "category_id",
            "category_name",
            "subcategory_id",
            "subcategory_name",
            "weight_grams",
            "purity",
            "price",
            "description",
            "is_active",
            "created_at",
            "image_count",
            "images",
        ]

    def get_image_count(self, obj: Product) -> int:
        return obj.images.count()


class CompanySerializer(serializers.ModelSerializer):
    verification = CompanyVerificationSerializer(read_only=True)
    products = ProductSerializer(many=True, read_only=True)
    hero_image_url = serializers.SerializerMethodField()
    logo_image_url = serializers.SerializerMethodField()
    tier = serializers.CharField(source="tier_ref.name", read_only=True)
    tier_id = serializers.IntegerField(source="tier_ref.id", read_only=True)
    tier_visibility_type = serializers.CharField(source="tier_ref.visibility_type", read_only=True)
    max_products = serializers.IntegerField(source="tier_ref.max_products", read_only=True)

    class Meta:
        model = Company
        fields = [
            "id",
            "name",
            "category",
            "tier",
            "tier_id",
            "tier_visibility_type",
            "max_products",
            "city",
            "state",
            "about",
            "daily_capacity",
            "specialization",
            "verification",
            "products",
            "hero_image_url",
            "logo_image_url",
            "admin_priority",
            "is_active",
            "is_approved",
        ]

    def get_hero_image_url(self, obj: Company) -> str | None:
        return get_company_image_url(obj, is_logo=False)

    def get_logo_image_url(self, obj: Company) -> str | None:
        return get_company_image_url(obj, is_logo=True)


class CompanyManagementTierSerializer(serializers.ModelSerializer):
    class Meta:
        model = CompanyTier
        fields = [
            "id",
            "name",
            "visibility_type",
            "max_products",
            "min_photos_per_product",
            "max_photos_per_product",
        ]


class CompanyManagementSummarySerializer(serializers.ModelSerializer):
    verification = CompanyVerificationSerializer(read_only=True)
    tier = CompanyManagementTierSerializer(source="tier_ref", read_only=True)
    hero_image_url = serializers.SerializerMethodField()
    logo_image_url = serializers.SerializerMethodField()
    active_product_count = serializers.SerializerMethodField()
    total_product_count = serializers.SerializerMethodField()

    class Meta:
        model = Company
        fields = [
            "id",
            "name",
            "category",
            "city",
            "state",
            "about",
            "daily_capacity",
            "specialization",
            "is_active",
            "is_approved",
            "is_market_visible",
            "hero_image_url",
            "logo_image_url",
            "verification",
            "tier",
            "active_product_count",
            "total_product_count",
        ]

    def get_hero_image_url(self, obj: Company) -> str | None:
        return get_company_image_url(obj, is_logo=False)

    def get_logo_image_url(self, obj: Company) -> str | None:
        return get_company_image_url(obj, is_logo=True)

    def get_active_product_count(self, obj: Company) -> int:
        return obj.products.filter(is_active=True).count()

    def get_total_product_count(self, obj: Company) -> int:
        return obj.products.count()


class CompanyManagementDetailSerializer(serializers.Serializer):
    company = CompanyManagementSummarySerializer()
    products = CompanyManagementProductSerializer(many=True)


class CompanyManagementUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Company
        fields = ["name", "category", "city", "state", "about", "daily_capacity", "specialization"]


class CompanyImageAttachSerializer(serializers.Serializer):
    SLOT_CHOICES = (("logo", "logo"), ("hero", "hero"))

    asset_id = serializers.PrimaryKeyRelatedField(queryset=MediaAsset.objects.all(), source="asset")
    slot = serializers.ChoiceField(choices=SLOT_CHOICES)


class CompanyMediaAssetFinalizeSerializer(serializers.Serializer):
    object_key = serializers.CharField(max_length=500)
    bucket_name = serializers.CharField(max_length=255)
    original_filename = serializers.CharField(max_length=255)
    mime_type = serializers.CharField(max_length=120)
    file_size = serializers.IntegerField(min_value=0)
    width = serializers.IntegerField(min_value=0)
    height = serializers.IntegerField(min_value=0)

    def validate_mime_type(self, value: str) -> str:
        allowed = {"image/jpeg", "image/png", "image/webp"}
        if value not in allowed:
            raise serializers.ValidationError("Unsupported image type.")
        return value


class MarketCompanyCardSerializer(serializers.ModelSerializer):
    company_id = serializers.IntegerField(source="id", read_only=True)
    hero_image_url = serializers.SerializerMethodField()
    logo_image_url = serializers.SerializerMethodField()
    is_verified = serializers.SerializerMethodField()
    city = serializers.CharField(read_only=True)
    state = serializers.CharField(read_only=True)
    tier_visibility_type = serializers.CharField(source="tier_ref.visibility_type", read_only=True)

    class Meta:
        model = Company
        fields = ["company_id", "name", "hero_image_url", "logo_image_url", "is_verified", "city", "state", "tier_visibility_type"]

    def get_hero_image_url(self, obj: Company) -> str | None:
        return get_company_image_url(obj, is_logo=False)

    def get_logo_image_url(self, obj: Company) -> str | None:
        return get_company_image_url(obj, is_logo=True)

    def get_is_verified(self, obj: Company) -> bool:
        return get_company_is_verified(obj)


class MarketCategoryCardSerializer(serializers.ModelSerializer):
    slug = serializers.SerializerMethodField()
    icon_key = serializers.SerializerMethodField()

    class Meta:
        model = ProductCategory
        fields = ["id", "name", "slug", "icon_key"]

    def get_slug(self, obj: ProductCategory) -> str:
        return get_category_slug(obj)

    def get_icon_key(self, obj: ProductCategory) -> str:
        return obj.icon_key or get_market_category_icon_key(obj.name)


class MarketProductCardSerializer(serializers.ModelSerializer):
    title = serializers.CharField(source="name", read_only=True)
    image_url = serializers.SerializerMethodField()
    company_id = serializers.IntegerField(source="company.id", read_only=True)
    company_name = serializers.CharField(source="company.name", read_only=True)

    class Meta:
        model = Product
        fields = ["id", "title", "image_url", "purity", "weight_grams", "company_id", "company_name"]

    def get_image_url(self, obj: Product) -> str | None:
        return get_product_image_url(obj)


class MarketRowSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    title = serializers.CharField()
    row_type = serializers.CharField()
    layout = serializers.CharField()
    sort_order = serializers.IntegerField()
    is_enabled = serializers.BooleanField()
    zone_key = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    serving_mode = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    items = serializers.SerializerMethodField()

    def get_items(self, obj):
        row_type = obj.get("row_type") if isinstance(obj, dict) else getattr(obj, "row_type", None)
        if isinstance(obj, dict):
            items = obj.get("resolved_items", obj.get("items", []))
        else:
            items = getattr(obj, "resolved_items", [])
        if row_type == "category_collection":
            return MarketCategoryCardSerializer(items, many=True).data
        if row_type == "product_collection":
            return MarketProductCardSerializer(items, many=True).data
        return MarketCompanyCardSerializer(items, many=True).data


class MarketFeedSerializer(serializers.Serializer):
    rows = MarketRowSerializer(many=True)


class ProductSubCategorySerializer(serializers.ModelSerializer):
    slug = serializers.SerializerMethodField()

    class Meta:
        model = ProductSubCategory
        fields = ["id", "name", "slug"]

    def get_slug(self, obj: ProductSubCategory) -> str:
        return get_subcategory_slug(obj)


class ProductAttributeDefinitionSerializer(serializers.ModelSerializer):
    options = serializers.ListField(source="options_json", child=serializers.JSONField(), read_only=True)

    class Meta:
        model = ProductAttributeDefinition
        fields = ["id", "key", "label", "type", "options", "is_required"]


class ProductFilterCategorySerializer(serializers.ModelSerializer):
    slug = serializers.SerializerMethodField()
    icon_key = serializers.SerializerMethodField()
    subcategories = ProductSubCategorySerializer(many=True, read_only=True)
    attributes = ProductAttributeDefinitionSerializer(many=True, read_only=True, source="attribute_definitions")

    class Meta:
        model = ProductCategory
        fields = ["id", "name", "slug", "icon_key", "subcategories", "attributes"]

    def get_slug(self, obj: ProductCategory) -> str:
        return get_category_slug(obj)

    def get_icon_key(self, obj: ProductCategory) -> str:
        return obj.icon_key or get_market_category_icon_key(obj.name)


class ProductSearchResultSerializer(serializers.ModelSerializer):
    title = serializers.CharField(source="name", read_only=True)
    company_id = serializers.IntegerField(source="company.id", read_only=True)
    company_name = serializers.CharField(source="company.name", read_only=True)
    category_name = serializers.CharField(source="category.name", read_only=True)
    category_slug = serializers.SerializerMethodField()
    subcategory_name = serializers.CharField(source="subcategory.name", read_only=True)
    subcategory_slug = serializers.SerializerMethodField()
    image_url = serializers.SerializerMethodField()
    attribute_label = serializers.SerializerMethodField()
    attribute_value = serializers.SerializerMethodField()
    attributes = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            "id",
            "company_id",
            "company_name",
            "title",
            "category_name",
            "category_slug",
            "subcategory_name",
            "subcategory_slug",
            "purity",
            "weight_grams",
            "price",
            "image_url",
            "attribute_label",
            "attribute_value",
            "attributes",
        ]

    def get_category_slug(self, obj: Product) -> str:
        return get_category_slug(obj.category)

    def get_subcategory_slug(self, obj: Product) -> str | None:
        return get_subcategory_slug(obj.subcategory) if obj.subcategory else None

    def get_image_url(self, obj: Product) -> str | None:
        return get_product_image_url(obj)

    def get_attribute_label(self, obj: Product) -> str | None:
        return get_product_primary_attribute(obj)[0]

    def get_attribute_value(self, obj: Product) -> str | None:
        return get_product_primary_attribute(obj)[1]

    def get_attributes(self, obj: Product) -> list[dict[str, str]]:
        return get_product_attribute_payload(obj)


class ProductDetailCompanySerializer(serializers.ModelSerializer):
    location = serializers.SerializerMethodField()
    logo = serializers.SerializerMethodField()
    phone = serializers.SerializerMethodField()
    whatsapp = serializers.SerializerMethodField()

    class Meta:
        model = Company
        fields = ["id", "name", "location", "logo", "phone", "whatsapp"]

    def _get_contact(self, obj: Company) -> dict[str, str | None]:
        cache = getattr(self, "_contact_cache", None)
        if cache is None:
            cache = {}
            self._contact_cache = cache
        if obj.id not in cache:
            cache[obj.id] = get_company_contact_payload(obj)
        return cache[obj.id]

    def get_location(self, obj: Company) -> str:
        return self._get_contact(obj)["location"] or ""

    def get_logo(self, obj: Company) -> str | None:
        return self._get_contact(obj)["logo"]

    def get_phone(self, obj: Company) -> str | None:
        return self._get_contact(obj)["phone"]

    def get_whatsapp(self, obj: Company) -> str | None:
        return self._get_contact(obj)["whatsapp"]


class ProductDetailSerializer(serializers.ModelSerializer):
    collection_label = serializers.SerializerMethodField()
    weight = serializers.SerializerMethodField()
    length = serializers.SerializerMethodField()
    category = serializers.CharField(source="category.name", read_only=True)
    subcategory = serializers.CharField(source="subcategory.name", read_only=True)
    availability = serializers.SerializerMethodField()
    hallmark = serializers.SerializerMethodField()
    price_min = serializers.SerializerMethodField()
    price_max = serializers.SerializerMethodField()
    images = serializers.SerializerMethodField()
    company = ProductDetailCompanySerializer(read_only=True)
    is_wishlisted = serializers.SerializerMethodField()
    share_url = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            "id",
            "name",
            "collection_label",
            "purity",
            "weight",
            "length",
            "category",
            "subcategory",
            "availability",
            "hallmark",
            "price_min",
            "price_max",
            "description",
            "images",
            "company",
            "is_wishlisted",
            "share_url",
        ]

    def get_collection_label(self, obj: Product) -> str | None:
        return get_product_attribute_value(obj, "collection_label", "collection", "collection_name")

    def get_weight(self, obj: Product) -> str:
        return f"{obj.weight_grams}g"

    def get_length(self, obj: Product) -> str | None:
        return get_product_attribute_value(obj, "length", "chain_length", "size")

    def get_availability(self, obj: Product) -> str:
        return "In Stock" if obj.is_active else "Unavailable"

    def get_hallmark(self, obj: Product) -> str | None:
        return get_product_attribute_value(obj, "hallmark", "hallmark_certification", "bis_hallmark")

    def get_price_min(self, obj: Product) -> str | None:
        return str(obj.price) if obj.price is not None else None

    def get_price_max(self, obj: Product) -> str | None:
        return str(obj.price) if obj.price is not None else None

    def get_images(self, obj: Product) -> list[dict[str, str]]:
        return get_product_image_payload(obj)

    def get_is_wishlisted(self, obj: Product) -> bool:
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if not user or not getattr(user, "is_authenticated", False):
            return False
        return ProductWishlist.objects.filter(user=user, product=obj).exists()

    def get_share_url(self, obj: Product) -> str | None:
        request = self.context.get("request")
        return request.build_absolute_uri() if request is not None else None


class CompanyTierSerializer(serializers.ModelSerializer):
    current_company_count = serializers.SerializerMethodField()

    class Meta:
        model = CompanyTier
        fields = [
            "id",
            "name",
            "slug",
            "description",
            "max_products",
            "min_photos_per_product",
            "max_photos_per_product",
            "max_companies_allowed",
            "price",
            "is_free",
            "is_active",
            "base_weight",
            "hero_eligible",
            "premium_floor_share",
            "cooldown_hours",
            "display_priority",
            "visibility_type",
            "current_company_count",
        ]

    def get_current_company_count(self, obj: CompanyTier) -> int:
        return obj.companies.filter(is_active=True, is_approved=True).count()


class CompanyTierWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = CompanyTier
        fields = [
            "name",
            "slug",
            "description",
            "max_products",
            "min_photos_per_product",
            "max_photos_per_product",
            "max_companies_allowed",
            "price",
            "is_free",
            "is_active",
            "base_weight",
            "hero_eligible",
            "premium_floor_share",
            "cooldown_hours",
            "display_priority",
            "visibility_type",
        ]


class MarketRowWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = MarketRow
        fields = ["id", "title", "row_type", "layout", "target_visibility_type", "sort_order", "is_enabled"]
        read_only_fields = ["id"]

    def validate_row_type(self, value: str) -> str:
        if value != MarketRow.RowType.COMPANY_TIER:
            raise serializers.ValidationError("Only company-tier market rows are supported in Phase 1.")
        return value


class MarketZoneSerializer(serializers.ModelSerializer):
    class Meta:
        model = MarketZone
        fields = [
            "id",
            "key",
            "title",
            "description",
            "layout",
            "capacity",
            "sort_order",
            "is_enabled",
            "serving_mode",
            "slot_interval_hours",
            "cooldown_override_hours",
        ]


class MarketZoneWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = MarketZone
        fields = [
            "key",
            "title",
            "description",
            "layout",
            "capacity",
            "sort_order",
            "is_enabled",
            "serving_mode",
            "slot_interval_hours",
            "cooldown_override_hours",
        ]

    def validate(self, attrs):
        serving_mode = attrs.get("serving_mode", getattr(self.instance, "serving_mode", MarketZone.ServingMode.DORMANT))
        capacity = attrs.get("capacity", getattr(self.instance, "capacity", 1))
        slot_interval_hours = attrs.get("slot_interval_hours", getattr(self.instance, "slot_interval_hours", 0))

        if serving_mode == MarketZone.ServingMode.SCHEDULED_HERO:
            if capacity != 1:
                raise serializers.ValidationError({"capacity": "Hero zones must have a capacity of 1."})
            if slot_interval_hours <= 0:
                raise serializers.ValidationError({"slot_interval_hours": "Hero zones require a positive slot interval."})
        return attrs


class ZoneEligibilityRuleSerializer(serializers.ModelSerializer):
    zone_id = serializers.IntegerField(source="zone.id", read_only=True)
    tier_id = serializers.IntegerField(source="tier.id", read_only=True)
    tier_slug = serializers.CharField(source="tier.slug", read_only=True)

    class Meta:
        model = ZoneEligibilityRule
        fields = [
            "id",
            "zone_id",
            "tier_id",
            "tier_slug",
            "is_eligible",
            "is_wildcard",
            "weight_multiplier",
            "guaranteed_share",
        ]


class ZoneEligibilityRuleUpdateItemSerializer(serializers.Serializer):
    id = serializers.IntegerField(min_value=1)
    is_eligible = serializers.BooleanField(required=False)
    is_wildcard = serializers.BooleanField(required=False)
    weight_multiplier = serializers.DecimalField(max_digits=6, decimal_places=2, required=False)
    guaranteed_share = serializers.DecimalField(max_digits=5, decimal_places=2, required=False)

    def validate(self, attrs):
        if len(attrs) == 1:
            raise serializers.ValidationError("At least one updatable field must be supplied for each rule.")
        return attrs


class ZoneEligibilityRuleBulkUpdateSerializer(serializers.Serializer):
    rules = ZoneEligibilityRuleUpdateItemSerializer(many=True)


class PlacementOverrideSerializer(serializers.ModelSerializer):
    company_id = serializers.PrimaryKeyRelatedField(queryset=Company.objects.all(), source="company")
    zone_id = serializers.PrimaryKeyRelatedField(queryset=MarketZone.objects.all(), source="zone")

    class Meta:
        model = PlacementOverride
        fields = [
            "id",
            "company_id",
            "zone_id",
            "action",
            "starts_at",
            "ends_at",
            "priority",
            "notes",
            "is_active",
        ]
        read_only_fields = ["id"]

    def validate(self, attrs):
        starts_at = attrs.get("starts_at", getattr(self.instance, "starts_at", None))
        ends_at = attrs.get("ends_at", getattr(self.instance, "ends_at", None))
        if starts_at and ends_at and ends_at <= starts_at:
            raise serializers.ValidationError({"ends_at": "Override end time must be later than the start time."})
        return attrs


class CompanyMarketVisibilitySerializer(serializers.ModelSerializer):
    class Meta:
        model = Company
        fields = ["is_market_visible", "admin_priority"]


class MarketPreviewSerializer(serializers.Serializer):
    rows = MarketRowSerializer(many=True)
    candidate_count = serializers.IntegerField()
    applied_override_count = serializers.IntegerField()
    fallback_used = serializers.BooleanField()
    hero_schedule = serializers.SerializerMethodField()

    def get_hero_schedule(self, obj):
        items = obj.get("hero_schedule", [])
        return MarketHeroScheduleEntrySerializer(items, many=True).data


class MarketHeroScheduleEntrySerializer(serializers.Serializer):
    slot_key = serializers.CharField()
    slot_index = serializers.IntegerField()
    serves_at = serializers.DateTimeField()
    zone_key = serializers.CharField()
    title = serializers.CharField()
    wildcard_slot = serializers.BooleanField()
    selection_reason = serializers.CharField(allow_null=True)
    company = MarketCompanyCardSerializer(allow_null=True)


class MarketReportTopCompanySerializer(serializers.Serializer):
    company_id = serializers.IntegerField()
    name = serializers.CharField()
    tier_name = serializers.CharField()
    total_serves = serializers.IntegerField()


class MarketReportZoneSummarySerializer(serializers.Serializer):
    zone_key = serializers.CharField()
    title = serializers.CharField()
    total_serves = serializers.IntegerField()
    selection_reasons = serializers.DictField(child=serializers.IntegerField())
    top_companies = MarketReportTopCompanySerializer(many=True)


class MarketReportTierSummarySerializer(serializers.Serializer):
    tier_id = serializers.IntegerField(allow_null=True)
    tier_slug = serializers.CharField(allow_null=True)
    tier_name = serializers.CharField(allow_null=True)
    total_serves = serializers.IntegerField()


class MarketReportSummarySerializer(serializers.Serializer):
    days = serializers.IntegerField()
    window_start = serializers.DateTimeField()
    window_end = serializers.DateTimeField()
    fairness_enabled = serializers.BooleanField()
    zones = MarketReportZoneSummarySerializer(many=True)
    tiers = MarketReportTierSummarySerializer(many=True)


class MarketUnderServedEntrySerializer(serializers.Serializer):
    company_id = serializers.IntegerField()
    company_name = serializers.CharField()
    tier_id = serializers.IntegerField()
    tier_name = serializers.CharField()
    zone_key = serializers.CharField()
    zone_title = serializers.CharField()
    actual_serves = serializers.IntegerField()
    target_serves = serializers.DecimalField(max_digits=10, decimal_places=2)
    deficit = serializers.DecimalField(max_digits=10, decimal_places=2)


class MarketUnderServedReportSerializer(serializers.Serializer):
    days = serializers.IntegerField()
    window_start = serializers.DateTimeField()
    window_end = serializers.DateTimeField()
    fairness_enabled = serializers.BooleanField()
    results = MarketUnderServedEntrySerializer(many=True)


class ProductEnquiryWriteSerializer(serializers.Serializer):
    type = serializers.CharField(required=False, allow_blank=True, default="FINAL_PRICE_REQUEST")
    message = serializers.CharField(required=False, allow_blank=True, default="")
    requester_name = serializers.CharField(max_length=120)
    requester_phone = serializers.CharField(max_length=20)

    def validate(self, attrs):
        product: Product = self.context["product"]
        if not product.company.is_active or not product.company.is_approved or not product.is_active:
            raise serializers.ValidationError("This product is no longer available for enquiries.")
        return attrs

    def create(self, validated_data):
        product: Product = self.context["product"]
        message = validated_data.get("message", "").strip() or "I would like to know the final price for this product."
        return Enquiry.objects.create(
            company=product.company,
            product=product,
            requester_name=validated_data["requester_name"].strip(),
            requester_phone=validated_data["requester_phone"].strip(),
            notes=message,
        )


class CompanyTierAssignmentSerializer(serializers.Serializer):
    tier_id = serializers.PrimaryKeyRelatedField(queryset=CompanyTier.objects.all(), source="tier")

    def validate(self, attrs):
        company: Company = self.context["company"]
        tier: CompanyTier = attrs["tier"]
        if not tier.is_active:
            raise serializers.ValidationError({"tier_id": "Only active tiers can be assigned to a company."})
        try:
            validate_company_tier_capacity(tier, exclude_company_id=company.id)
        except TierValidationError as exc:
            raise serializers.ValidationError({"tier_id": str(exc)}) from exc
        return attrs


class CompanyTierAssignmentConfirmSerializer(serializers.Serializer):
    tier_id = serializers.PrimaryKeyRelatedField(queryset=CompanyTier.objects.all(), source="tier")
    retain_active_product_ids = serializers.ListField(child=serializers.IntegerField(min_value=1), allow_empty=False)

    def validate(self, attrs):
        company: Company = self.context["company"]
        tier: CompanyTier = attrs["tier"]
        try:
            validate_company_tier_capacity(tier, exclude_company_id=company.id)
        except TierValidationError as exc:
            raise serializers.ValidationError({"tier_id": str(exc)}) from exc
        return attrs


class ProductWriteSerializer(serializers.ModelSerializer):
    is_active = serializers.BooleanField(required=False, default=False)
    image_asset_ids = serializers.ListField(child=serializers.IntegerField(min_value=1), write_only=True, required=False)

    class Meta:
        model = Product
        fields = ["id", "name", "category", "subcategory", "weight_grams", "purity", "price", "description", "is_active", "image_asset_ids"]
        read_only_fields = ["id"]

    def validate(self, attrs):
        company: Company = self.context["company"]
        image_asset_ids = attrs.get("image_asset_ids")
        instance: Product | None = self.instance
        target_is_active = attrs.get("is_active", getattr(instance, "is_active", True))
        category = attrs.get("category", getattr(instance, "category", None))
        subcategory = attrs.get("subcategory", getattr(instance, "subcategory", None))

        if company.tier_ref_id is None:
            raise serializers.ValidationError("A company tier is required before products can be managed.")

        if subcategory and category and subcategory.category_id != category.id:
            raise serializers.ValidationError({"subcategory": "Selected subcategory does not belong to the chosen category."})

        if target_is_active and (not company.is_active or not company.is_approved):
            raise serializers.ValidationError("Only active and approved companies can keep active products in the market.")

        if target_is_active and (instance is None or not instance.is_active):
            try:
                validate_company_can_activate_product(company, exclude_product_id=getattr(instance, "id", None))
            except TierValidationError as exc:
                raise serializers.ValidationError({"is_active": str(exc)}) from exc

        if image_asset_ids is not None and len(MediaAsset.objects.filter(id__in=image_asset_ids)) != len(set(image_asset_ids)):
            raise serializers.ValidationError({"image_asset_ids": "One or more selected image assets do not exist."})

        if target_is_active:
            existing_count = instance.images.count() if instance is not None else 0
            final_image_count = len(image_asset_ids) if image_asset_ids is not None else existing_count
            try:
                validate_product_image_count(company, final_image_count)
            except TierValidationError as exc:
                raise serializers.ValidationError({"image_asset_ids": str(exc)}) from exc

        return attrs

    def create(self, validated_data):
        company: Company = self.context["company"]
        image_asset_ids = validated_data.pop("image_asset_ids", [])
        product = Product.objects.create(company=company, **validated_data)
        if image_asset_ids:
            sync_product_images(product, image_asset_ids)
        product.refresh_from_db()
        return product

    def update(self, instance, validated_data):
        image_asset_ids = validated_data.pop("image_asset_ids", None)
        for attribute, value in validated_data.items():
            setattr(instance, attribute, value)
        instance.save()
        if image_asset_ids is not None:
            sync_product_images(instance, image_asset_ids)
        instance.refresh_from_db()
        return instance


class ProductImageUploadSessionSerializer(serializers.Serializer):
    filename = serializers.CharField(max_length=255, required=False, default="product-image.jpg")


class ProductImageAttachSerializer(serializers.Serializer):
    asset_id = serializers.PrimaryKeyRelatedField(queryset=MediaAsset.objects.all(), source="asset")


class EnquirySerializer(serializers.ModelSerializer):
    class Meta:
        model = Enquiry
        fields = ["id", "company", "product", "requester_name", "requester_phone", "notes", "created_at"]
        read_only_fields = ["created_at"]
