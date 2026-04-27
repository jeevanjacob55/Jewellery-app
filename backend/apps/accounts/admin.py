from django.contrib import admin

from .models import AdminScopeAssignment, MemberProfile, NotificationPreference, User

admin.site.register(User)
admin.site.register(MemberProfile)
admin.site.register(NotificationPreference)
admin.site.register(AdminScopeAssignment)
