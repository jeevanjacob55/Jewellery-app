from django.contrib import admin

from .models import Association, DistrictOperationalUnit, RegionState, Unit

admin.site.register(RegionState)
admin.site.register(Association)
admin.site.register(DistrictOperationalUnit)
admin.site.register(Unit)
