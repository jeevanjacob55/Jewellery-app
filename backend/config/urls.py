from django.contrib import admin
from django.urls import include, path
from rest_framework.response import Response
from rest_framework.views import APIView


class HealthView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request):
        return Response({"status": "ok", "service": "jewellery-association-api"})


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/health/", HealthView.as_view(), name="health"),
    path("api/auth/", include("apps.accounts.urls")),
    path("api/me/", include("apps.accounts.me_urls")),
    path("api/regions/", include("apps.regions.urls")),
    path("api/dashboard/", include("apps.rates.urls")),
    path("api/directory/", include("apps.directory.urls")),
    path("api/reverse-search/", include("apps.reverse_search.urls")),
    path("api/services/", include("apps.services_app.urls")),
    path("api/news/", include("apps.news.urls")),
    path("api/ads/", include("apps.ads.urls")),
    path("api/admin/", include("apps.admin_ops.urls")),
]
