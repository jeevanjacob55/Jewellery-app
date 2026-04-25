from django.conf import settings
from django.db import models


class Company(models.Model):
    class Tier(models.TextChoices):
        PREMIUM = "premium", "Premium"
        PRO = "pro", "Pro"
        NORMAL = "normal", "Normal"

    name = models.CharField(max_length=255)
    category = models.CharField(max_length=100)
    tier = models.CharField(max_length=20, choices=Tier.choices, default=Tier.NORMAL)
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    about = models.TextField(blank=True)
    daily_capacity = models.CharField(max_length=100, blank=True)
    specialization = models.CharField(max_length=255, blank=True)

    def __str__(self) -> str:
        return self.name


class CompanyVerification(models.Model):
    company = models.OneToOneField(Company, on_delete=models.CASCADE, related_name="verification")
    gst_registered = models.BooleanField(default=False)
    bis_hallmarked = models.BooleanField(default=False)
    export_licensed = models.BooleanField(default=False)


class ProductCategory(models.Model):
    name = models.CharField(max_length=100, unique=True)

    def __str__(self) -> str:
        return self.name


class Product(models.Model):
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name="products")
    category = models.ForeignKey(ProductCategory, on_delete=models.PROTECT, related_name="products")
    name = models.CharField(max_length=255)
    weight_grams = models.DecimalField(max_digits=8, decimal_places=2)
    purity = models.CharField(max_length=20)
    description = models.TextField(blank=True)

    def __str__(self) -> str:
        return self.name


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


class Enquiry(models.Model):
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name="enquiries")
    product = models.ForeignKey(Product, on_delete=models.SET_NULL, null=True, blank=True, related_name="enquiries")
    requester_name = models.CharField(max_length=120)
    requester_phone = models.CharField(max_length=20)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
