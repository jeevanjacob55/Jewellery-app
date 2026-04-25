from django.contrib import admin

from .models import MemberProfile, NotificationPreference, User

admin.site.register(User)
admin.site.register(MemberProfile)
admin.site.register(NotificationPreference)
