from django.contrib import admin

from .models import AssociationRate, ExternalMarketRate, GlobalTrendSnapshot

admin.site.register(AssociationRate)
admin.site.register(ExternalMarketRate)
admin.site.register(GlobalTrendSnapshot)
