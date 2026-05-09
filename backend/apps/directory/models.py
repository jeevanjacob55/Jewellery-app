from django.conf import settings
from django.db import models


class CompanyTier(models.Model):
    class VisibilityType(models.TextChoices):
        FEATURED = "featured", "Featured"
        PRO = "pro", "Pro"
        NORMAL = "normal", "Normal"

    name = models.CharField(max_length=120, unique=True)
    slug = models.SlugField(max_length=140, unique=True)
    description = models.TextField(blank=True)
    max_products = models.PositiveIntegerField()
    min_photos_per_product = models.PositiveIntegerField(default=3)
    max_photos_per_product = models.PositiveIntegerField(default=5)
    max_companies_allowed = models.PositiveIntegerField(null=True, blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    is_free = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    base_weight = models.PositiveIntegerField(default=1)
    hero_eligible = models.BooleanField(default=False)
    premium_floor_share = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    cooldown_hours = models.PositiveIntegerField(default=0)
    display_priority = models.PositiveIntegerField(default=0)
    visibility_type = models.CharField(max_length=20, choices=VisibilityType.choices)

    class Meta:
        ordering = ["display_priority", "id"]

    def __str__(self) -> str:
        return self.name


class Company(models.Model):
    name = models.CharField(max_length=255)
    category = models.CharField(max_length=100)
    tier_ref = models.ForeignKey(CompanyTier, on_delete=models.PROTECT, related_name="companies")
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    about = models.TextField(blank=True)
    daily_capacity = models.CharField(max_length=100, blank=True)
    specialization = models.CharField(max_length=255, blank=True)
    admin_priority = models.PositiveIntegerField(default=0)
    is_market_visible = models.BooleanField(default=True)
    last_featured_at = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    is_approved = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name", "id"]

    def __str__(self) -> str:
        return self.name


class CompanyTierChangeRequest(models.Model):
    class RequestType(models.TextChoices):
        UPGRADE = "upgrade", "Upgrade"
        DOWNGRADE = "downgrade", "Downgrade"

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"
        CANCELLED = "cancelled", "Cancelled"

    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name="tier_change_requests")
    current_tier = models.ForeignKey(CompanyTier, on_delete=models.PROTECT, related_name="current_tier_change_requests")
    requested_tier = models.ForeignKey(CompanyTier, on_delete=models.PROTECT, related_name="requested_tier_change_requests")
    requested_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="requested_tier_changes")
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reviewed_tier_changes",
    )
    request_type = models.CharField(max_length=20, choices=RequestType.choices)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    company_note = models.TextField(blank=True)
    admin_note = models.TextField(blank=True)
    current_tier_name = models.CharField(max_length=120)
    requested_tier_name = models.CharField(max_length=120)
    retain_active_product_ids = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at", "-id"]

    def __str__(self) -> str:
        return f"{self.company.name}: {self.current_tier_name} -> {self.requested_tier_name}"


class MarketRow(models.Model):
    class RowType(models.TextChoices):
        COMPANY_TIER = "company_tier", "Company Tier"
        FEATURED_PRODUCT_COLLECTION = "featured_product_collection", "Featured Product Collection"
        CATEGORY_COLLECTION = "category_collection", "Category Collection"

    class Layout(models.TextChoices):
        HERO_COMPANY = "hero_company", "Hero Company"
        GRID_COMPANY = "grid_company", "Grid Company"
        RAIL_COMPANY = "rail_company", "Rail Company"

    title = models.CharField(max_length=140)
    row_type = models.CharField(max_length=40, choices=RowType.choices, default=RowType.COMPANY_TIER)
    layout = models.CharField(max_length=40, choices=Layout.choices, default=Layout.RAIL_COMPANY)
    target_visibility_type = models.CharField(max_length=20, choices=CompanyTier.VisibilityType.choices)
    sort_order = models.PositiveIntegerField(default=0)
    is_enabled = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["sort_order", "id"]

    def __str__(self) -> str:
        return self.title


class MarketZone(models.Model):
    class Layout(models.TextChoices):
        HERO_COMPANY = "hero_company", "Hero Company"
        GRID_COMPANY = "grid_company", "Grid Company"
        RAIL_COMPANY = "rail_company", "Rail Company"
        RAIL_PRODUCT = "rail_product", "Rail Product"
        GRID_PRODUCT = "grid_product", "Grid Product"

    class ServingMode(models.TextChoices):
        SCHEDULED_HERO = "scheduled_hero", "Scheduled Hero"
        WEIGHTED_COMPANIES = "weighted_companies", "Weighted Companies"
        LATEST_PRODUCTS = "latest_products", "Latest Products"
        DORMANT = "dormant", "Dormant"

    key = models.SlugField(max_length=80, unique=True)
    title = models.CharField(max_length=140)
    description = models.TextField(blank=True)
    layout = models.CharField(max_length=40, choices=Layout.choices, default=Layout.RAIL_COMPANY)
    sort_order = models.PositiveIntegerField(default=0)
    capacity = models.PositiveIntegerField(default=1)
    is_enabled = models.BooleanField(default=True)
    serving_mode = models.CharField(max_length=40, choices=ServingMode.choices, default=ServingMode.DORMANT)
    slot_interval_hours = models.PositiveIntegerField(default=0)
    cooldown_override_hours = models.PositiveIntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["sort_order", "id"]

    def __str__(self) -> str:
        return self.title


class ZoneEligibilityRule(models.Model):
    zone = models.ForeignKey(MarketZone, on_delete=models.CASCADE, related_name="eligibility_rules")
    tier = models.ForeignKey(CompanyTier, on_delete=models.CASCADE, related_name="zone_eligibility_rules")
    is_eligible = models.BooleanField(default=True)
    is_wildcard = models.BooleanField(default=False)
    weight_multiplier = models.DecimalField(max_digits=6, decimal_places=2, default=1)
    guaranteed_share = models.DecimalField(max_digits=5, decimal_places=2, default=0)

    class Meta:
        ordering = ["zone__sort_order", "tier__display_priority", "id"]
        constraints = [
            models.UniqueConstraint(fields=["zone", "tier"], name="uniq_zone_tier_eligibility_rule"),
        ]

    def __str__(self) -> str:
        return f"{self.zone.key} / {self.tier.slug}"


class PlacementOverride(models.Model):
    class Action(models.TextChoices):
        PIN = "pin", "Pin"
        BOOST = "boost", "Boost"
        BLOCK = "block", "Block"

    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name="placement_overrides")
    zone = models.ForeignKey(MarketZone, on_delete=models.CASCADE, related_name="placement_overrides")
    action = models.CharField(max_length=20, choices=Action.choices)
    starts_at = models.DateTimeField()
    ends_at = models.DateTimeField()
    priority = models.PositiveIntegerField(default=0)
    notes = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-priority", "starts_at", "id"]

    def __str__(self) -> str:
        return f"{self.company.name} / {self.zone.key} / {self.action}"


class ExposureLedger(models.Model):
    class EventType(models.TextChoices):
        SERVED = "served", "Served"

    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name="exposure_events")
    tier = models.ForeignKey(CompanyTier, on_delete=models.SET_NULL, null=True, blank=True, related_name="exposure_events")
    zone = models.ForeignKey(MarketZone, on_delete=models.SET_NULL, null=True, blank=True, related_name="exposure_events")
    event_type = models.CharField(max_length=30, choices=EventType.choices, default=EventType.SERVED)
    served_at = models.DateTimeField()
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-served_at", "-id"]
        indexes = [
            models.Index(fields=["served_at"], name="directory_exp_served_idx"),
            models.Index(fields=["zone", "served_at"], name="directory_exp_zone_served_idx"),
            models.Index(fields=["tier", "served_at"], name="directory_exp_tier_served_idx"),
            models.Index(fields=["company", "zone", "served_at"], name="dir_exp_comp_zone_serv_idx"),
        ]

    def __str__(self) -> str:
        return f"{self.company_id}:{self.zone_id}:{self.event_type}"


class CompanyVerification(models.Model):
    company = models.OneToOneField(Company, on_delete=models.CASCADE, related_name="verification")
    gst_registered = models.BooleanField(default=False)
    bis_hallmarked = models.BooleanField(default=False)
    export_licensed = models.BooleanField(default=False)


class ProductCategory(models.Model):
    name = models.CharField(max_length=100, unique=True)
    icon_key = models.CharField(max_length=50, default="diamond")
    is_active = models.BooleanField(default=True)
    display_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["display_order", "name", "id"]

    def __str__(self) -> str:
        return self.name


class ProductSubCategory(models.Model):
    category = models.ForeignKey(ProductCategory, on_delete=models.CASCADE, related_name="subcategories")
    name = models.CharField(max_length=100)
    slug = models.SlugField(max_length=120)
    is_active = models.BooleanField(default=True)
    display_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["display_order", "name", "id"]
        constraints = [
            models.UniqueConstraint(fields=["category", "slug"], name="uniq_product_subcategory_slug_per_category"),
        ]

    def __str__(self) -> str:
        return f"{self.category.name} / {self.name}"


class ProductAttributeDefinition(models.Model):
    class AttributeType(models.TextChoices):
        SELECT = "select", "Select"
        RANGE = "range", "Range"
        NUMBER = "number", "Number"

    category = models.ForeignKey(ProductCategory, on_delete=models.CASCADE, related_name="attribute_definitions")
    key = models.CharField(max_length=100)
    label = models.CharField(max_length=120)
    type = models.CharField(max_length=20, choices=AttributeType.choices, default=AttributeType.SELECT)
    options_json = models.JSONField(default=list, blank=True)
    is_required = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    display_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["display_order", "id"]
        constraints = [
            models.UniqueConstraint(fields=["category", "key"], name="uniq_product_attribute_key_per_category"),
        ]

    def __str__(self) -> str:
        return f"{self.category.name} / {self.label}"


class Product(models.Model):
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name="products")
    category = models.ForeignKey(ProductCategory, on_delete=models.PROTECT, related_name="products")
    subcategory = models.ForeignKey(ProductSubCategory, on_delete=models.SET_NULL, null=True, blank=True, related_name="products")
    name = models.CharField(max_length=255)
    weight_grams = models.DecimalField(max_digits=8, decimal_places=2)
    purity = models.CharField(max_length=20)
    price = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]

    def __str__(self) -> str:
        return self.name


class ProductWishlist(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="product_wishlists")
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="wishlists")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["user", "product"], name="uniq_product_wishlist_user_product"),
        ]

    def __str__(self) -> str:
        return f"{self.user_id}:{self.product_id}"


class MediaAsset(models.Model):
    class Visibility(models.TextChoices):
        PUBLIC = "public", "Public"
        PRIVATE = "private", "Private"

    class ModerationStatus(models.TextChoices):
        PENDING = "pending", "Pending"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"

    uploader = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    object_key = models.CharField(max_length=500, unique=True)
    bucket_name = models.CharField(max_length=255)
    original_filename = models.CharField(max_length=255)
    mime_type = models.CharField(max_length=120)
    public_url = models.URLField(blank=True)
    width = models.PositiveIntegerField(default=0)
    height = models.PositiveIntegerField(default=0)
    file_size = models.PositiveIntegerField(default=0)
    visibility = models.CharField(max_length=20, choices=Visibility.choices, default=Visibility.PRIVATE)
    moderation_status = models.CharField(max_length=20, choices=ModerationStatus.choices, default=ModerationStatus.PENDING)
    alt_text = models.CharField(max_length=255, blank=True)
    caption = models.CharField(max_length=255, blank=True)
    sort_order = models.PositiveIntegerField(default=0)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return self.original_filename


class CompanyImage(models.Model):
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name="images")
    asset = models.OneToOneField(MediaAsset, on_delete=models.CASCADE, related_name="company_image")
    is_logo = models.BooleanField(default=False)


class ProductImage(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="images")
    asset = models.OneToOneField(MediaAsset, on_delete=models.CASCADE, related_name="product_image")


class ProductAttributeValue(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="attribute_values")
    attribute_definition = models.ForeignKey(ProductAttributeDefinition, on_delete=models.CASCADE, related_name="values")
    value = models.CharField(max_length=255)

    class Meta:
        ordering = ["attribute_definition__display_order", "id"]
        constraints = [
            models.UniqueConstraint(fields=["product", "attribute_definition"], name="uniq_product_attribute_value"),
        ]

    def __str__(self) -> str:
        return f"{self.product.name} / {self.attribute_definition.label}: {self.value}"


class Enquiry(models.Model):
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name="enquiries")
    product = models.ForeignKey(Product, on_delete=models.SET_NULL, null=True, blank=True, related_name="enquiries")
    requester_name = models.CharField(max_length=120)
    requester_phone = models.CharField(max_length=20)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
