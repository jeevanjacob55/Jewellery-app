from django.contrib import admin

from .models import (
    AdminScopeAssignment,
    MemberAccessRequest,
    MemberProfile,
    Notification,
    NotificationPreference,
    User,
    UserNotification,
    UserRole,
)

admin.site.register(User)
admin.site.register(MemberProfile)
admin.site.register(NotificationPreference)
admin.site.register(Notification)
admin.site.register(UserNotification)
admin.site.register(MemberAccessRequest)
admin.site.register(AdminScopeAssignment)
admin.site.register(UserRole)
