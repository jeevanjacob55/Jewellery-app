from django.contrib import admin

from .models import Alert, Meeting, MeetingEvent, MeetingResponse, MeetingTarget, News, NewsItem, NewsTarget

admin.site.register(News)
admin.site.register(NewsTarget)
admin.site.register(NewsItem)
admin.site.register(Alert)
admin.site.register(Meeting)
admin.site.register(MeetingTarget)
admin.site.register(MeetingResponse)
admin.site.register(MeetingEvent)
