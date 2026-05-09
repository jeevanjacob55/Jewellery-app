from django.contrib import admin

from .models import AdApproval, AdAsset, AdClick, AdImpression, AdTargeting, Advertisement


@admin.register(Advertisement)
class AdvertisementAdmin(admin.ModelAdmin):
    list_display = ("title", "company", "placement", "status", "priority", "is_active", "start_date", "end_date")
    list_filter = ("placement", "status", "is_active", "action_type")
    search_fields = ("title", "description", "company__name")


@admin.register(AdTargeting)
class AdTargetingAdmin(admin.ModelAdmin):
    list_display = ("advertisement", "state", "association", "district_operational_unit", "unit")
    search_fields = ("advertisement__title",)


@admin.register(AdAsset)
class AdAssetAdmin(admin.ModelAdmin):
    list_display = ("advertisement", "placement", "asset")
    search_fields = ("advertisement__title", "asset__original_filename")


@admin.register(AdApproval)
class AdApprovalAdmin(admin.ModelAdmin):
    list_display = ("advertisement", "approved_by", "approved_at")
    search_fields = ("advertisement__title", "notes")


@admin.register(AdImpression)
class AdImpressionAdmin(admin.ModelAdmin):
    list_display = ("advertisement", "placement", "user", "guest_id", "viewed_at")
    list_filter = ("placement",)
    search_fields = ("advertisement__title", "guest_id", "user__username")


@admin.register(AdClick)
class AdClickAdmin(admin.ModelAdmin):
    list_display = ("advertisement", "placement", "user", "guest_id", "action_type", "clicked_at")
    list_filter = ("placement", "action_type")
    search_fields = ("advertisement__title", "guest_id", "user__username")
