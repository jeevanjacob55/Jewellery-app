from __future__ import annotations

from rest_framework import serializers
from django.utils.text import slugify

from .models import (
    Company,
    CompanyTier,
    CompanyVerification,
    Enquiry,
    MediaAsset,
    Product,
    ProductAttributeDefinition,
    ProductAttributeValue,
    ProductCategory,
    ProductSubCategory,
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


class MarketFeaturedCompanySerializer(serializers.ModelSerializer):
    company_id = serializers.IntegerField(source="id", read_only=True)
    hero_image_url = serializers.SerializerMethodField()
    logo_image_url = serializers.SerializerMethodField()

    class Meta:
        model = Company
        fields = ["company_id", "name", "hero_image_url", "logo_image_url", "city", "state"]

    def get_hero_image_url(self, obj: Company) -> str | None:
        return get_company_image_url(obj, is_logo=False)

    def get_logo_image_url(self, obj: Company) -> str | None:
        return get_company_image_url(obj, is_logo=True)


class MarketCompanyCardSerializer(serializers.ModelSerializer):
    company_id = serializers.IntegerField(source="id", read_only=True)
    hero_image_url = serializers.SerializerMethodField()
    logo_image_url = serializers.SerializerMethodField()
    is_verified = serializers.SerializerMethodField()

    class Meta:
        model = Company
        fields = ["company_id", "name", "hero_image_url", "logo_image_url", "is_verified"]

    def get_hero_image_url(self, obj: Company) -> str | None:
        return get_company_image_url(obj, is_logo=False)

    def get_logo_image_url(self, obj: Company) -> str | None:
        return get_company_image_url(obj, is_logo=True)

    def get_is_verified(self, obj: Company) -> bool:
        return get_company_is_verified(obj)


class MarketCategorySerializer(serializers.ModelSerializer):
    icon_key = serializers.SerializerMethodField()
    product_count = serializers.IntegerField(read_only=True)
    slug = serializers.SerializerMethodField()

    class Meta:
        model = ProductCategory
        fields = ["id", "name", "slug", "icon_key", "product_count"]

    def get_slug(self, obj: ProductCategory) -> str:
        return get_category_slug(obj)

    def get_icon_key(self, obj: ProductCategory) -> str:
        return obj.icon_key or get_market_category_icon_key(obj.name)


class MarketProductCardSerializer(serializers.ModelSerializer):
    product_id = serializers.IntegerField(source="id", read_only=True)
    company_id = serializers.IntegerField(source="company.id", read_only=True)
    company_name = serializers.CharField(source="company.name", read_only=True)
    category_name = serializers.CharField(source="category.name", read_only=True)
    category_slug = serializers.SerializerMethodField()
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = ["product_id", "company_id", "company_name", "name", "purity", "weight_grams", "image_url", "category_name", "category_slug"]

    def get_category_slug(self, obj: Product) -> str:
        return get_category_slug(obj.category)

    def get_image_url(self, obj: Product) -> str | None:
        return get_product_image_url(obj)


class MarketFeedSerializer(serializers.Serializer):
    featured_companies = MarketFeaturedCompanySerializer(many=True)
    pro_companies = MarketCompanyCardSerializer(many=True)
    normal_companies = MarketCompanyCardSerializer(many=True)
    categories = MarketCategorySerializer(many=True)
    latest_products = MarketProductCardSerializer(many=True)


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
            "display_priority",
            "visibility_type",
        ]


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
