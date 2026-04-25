from django.contrib import admin

from .models import AdApproval, AdAsset, AdTargeting, Advertisement

admin.site.register(Advertisement)
admin.site.register(AdTargeting)
admin.site.register(AdAsset)
admin.site.register(AdApproval)
