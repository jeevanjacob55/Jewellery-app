from django.contrib import admin

from .models import Alert, MeetingEvent, NewsItem

admin.site.register(NewsItem)
admin.site.register(Alert)
admin.site.register(MeetingEvent)
