from django.contrib import admin

from .models import Alert, Meeting, MeetingEvent, MeetingResponse, MeetingTarget, News, NewsItem, NewsTarget


@admin.register(News)
class NewsAdmin(admin.ModelAdmin):
    list_display = ("title", "publisher_type", "publisher_id", "status", "published_at")
    list_filter = ("status", "publisher_type")
    search_fields = ("title", "description")


@admin.register(NewsTarget)
class NewsTargetAdmin(admin.ModelAdmin):
    list_display = ("news", "mode", "target_type", "target_id")
    list_filter = ("mode", "target_type")


admin.site.register(NewsItem)
admin.site.register(Alert)
admin.site.register(Meeting)
admin.site.register(MeetingTarget)
admin.site.register(MeetingResponse)
admin.site.register(MeetingEvent)
