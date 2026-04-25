from django.contrib import admin

from .models import ComplianceReminder, ComplianceRequest, ServiceType

admin.site.register(ServiceType)
admin.site.register(ComplianceRequest)
admin.site.register(ComplianceReminder)
