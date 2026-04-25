from django.contrib import admin

from .models import ReverseSearchAttachment, ReverseSearchRequest, ReverseSearchResponse

admin.site.register(ReverseSearchRequest)
admin.site.register(ReverseSearchAttachment)
admin.site.register(ReverseSearchResponse)
