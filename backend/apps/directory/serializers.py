from rest_framework import serializers

from .models import Company, CompanyVerification, Enquiry, Product, ProductCategory


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


class CompanyVerificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = CompanyVerification
        fields = ["gst_registered", "bis_hallmarked", "export_licensed"]


class ProductSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = ["id", "name", "weight_grams", "purity", "description", "category_name", "image_url"]

    def get_image_url(self, obj: Product) -> str | None:
        return get_product_image_url(obj)


class CompanySerializer(serializers.ModelSerializer):
    verification = CompanyVerificationSerializer(read_only=True)
    products = ProductSerializer(many=True, read_only=True)
    hero_image_url = serializers.SerializerMethodField()
    logo_image_url = serializers.SerializerMethodField()

    class Meta:
        model = Company
        fields = [
            "id",
            "name",
            "category",
            "tier",
            "city",
            "state",
            "about",
            "daily_capacity",
            "specialization",
            "verification",
            "products",
            "hero_image_url",
            "logo_image_url",
        ]

    def get_hero_image_url(self, obj: Company) -> str | None:
        return get_company_image_url(obj, is_logo=False)

    def get_logo_image_url(self, obj: Company) -> str | None:
        return get_company_image_url(obj, is_logo=True)


class MarketFeaturedPartnerSerializer(serializers.ModelSerializer):
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

    class Meta:
        model = ProductCategory
        fields = ["id", "name", "icon_key", "product_count"]

    def get_icon_key(self, obj: ProductCategory) -> str:
        return get_market_category_icon_key(obj.name)


class MarketProductCardSerializer(serializers.ModelSerializer):
    product_id = serializers.IntegerField(source="id", read_only=True)
    company_id = serializers.IntegerField(source="company.id", read_only=True)
    company_name = serializers.CharField(source="company.name", read_only=True)
    category_name = serializers.CharField(source="category.name", read_only=True)
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = ["product_id", "company_id", "company_name", "name", "purity", "weight_grams", "image_url", "category_name"]

    def get_image_url(self, obj: Product) -> str | None:
        return get_product_image_url(obj)


class MarketFeedSerializer(serializers.Serializer):
    featured_partners = MarketFeaturedPartnerSerializer(many=True)
    pro_companies = MarketCompanyCardSerializer(many=True)
    normal_companies = MarketCompanyCardSerializer(many=True)
    categories = MarketCategorySerializer(many=True)
    latest_products = MarketProductCardSerializer(many=True)


class EnquirySerializer(serializers.ModelSerializer):
    class Meta:
        model = Enquiry
        fields = ["id", "company", "product", "requester_name", "requester_phone", "notes", "created_at"]
        read_only_fields = ["created_at"]
