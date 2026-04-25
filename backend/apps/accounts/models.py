from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    class Role(models.TextChoices):
        GUEST = "guest", "Guest"
        MEMBER = "member", "Member"
        SUPPLIER = "supplier", "Supplier"
        ADVERTISER = "advertiser", "Advertiser"
        ADMIN = "admin", "Admin"

    role = models.CharField(max_length=20, choices=Role.choices, default=Role.MEMBER)
    corporate_email = models.EmailField(blank=True)
    jeweller_id = models.CharField(max_length=64, blank=True)
    is_verified_member = models.BooleanField(default=False)
    onboarding_completed = models.BooleanField(default=False)


class MemberProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="member_profile")
    phone_number = models.CharField(max_length=20, blank=True)
    company_name = models.CharField(max_length=255, blank=True)
    state_name = models.CharField(max_length=100, blank=True)
    district_name = models.CharField(max_length=100, blank=True)
    local_chapter_name = models.CharField(max_length=100, blank=True)
    membership_tier = models.CharField(max_length=50, default="Platinum")

    def __str__(self) -> str:
        return f"{self.user.username} profile"


class NotificationPreference(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="notification_preferences")
    rate_alerts = models.BooleanField(default=True)
    news_alerts = models.BooleanField(default=True)
    ad_alerts = models.BooleanField(default=False)
    meeting_alerts = models.BooleanField(default=True)

    def __str__(self) -> str:
        return f"{self.user.username} notifications"
