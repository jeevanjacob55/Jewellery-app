from django.contrib import admin

from .models import LocalChapter, RegionDistrict, RegionState

admin.site.register(RegionState)
admin.site.register(RegionDistrict)
admin.site.register(LocalChapter)
