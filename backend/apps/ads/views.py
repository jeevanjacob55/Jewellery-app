from django.db.models import Prefetch, Q
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.generics import get_object_or_404
from rest_framework.response import Response
from rest_framework.views import APIView

from config.storage import build_mock_signed_upload

from .models import AdAsset, AdClick, AdImpression, Advertisement
from .serializers import AdEventSerializer, AdvertisementSerializer


def get_ad_queryset():
    return Advertisement.objects.prefetch_related(Prefetch("assets", queryset=AdAsset.objects.select_related("asset").order_by("id")))


class AdvertisementOverviewView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        placement = request.query_params.get("placement", Advertisement.Placement.DASHBOARD_HERO)
        now = timezone.now()
        advertisements = (
            get_ad_queryset()
            .filter(
                placement=placement,
                status=Advertisement.Status.APPROVED,
                is_active=True,
            )
            .filter(Q(start_date__isnull=True) | Q(start_date__lte=now))
            .filter(Q(end_date__isnull=True) | Q(end_date__gte=now))
            .order_by("-priority", "-created_at")
        )
        return Response({"results": AdvertisementSerializer(advertisements, many=True).data})


class AdvertisementUploadSessionView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        advertiser_id = request.user.id or "advertiser"
        campaign_id = request.data.get("campaign_id", "draft")
        filename = request.data.get("filename", "campaign-banner.jpg")
        session = build_mock_signed_upload(f"ads/{advertiser_id}", campaign_id, filename, visibility="public")
        return Response(session.__dict__)


class AdvertisementImpressionView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, ad_id: int):
        advertisement = get_object_or_404(Advertisement, pk=ad_id)
        serializer = AdEventSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        AdImpression.objects.create(
            advertisement=advertisement,
            user=request.user if getattr(request.user, "is_authenticated", False) else None,
            guest_id=serializer.validated_data.get("guest_id"),
            placement=serializer.validated_data["placement"],
        )
        return Response(status=status.HTTP_202_ACCEPTED)


class AdvertisementClickView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, ad_id: int):
        advertisement = get_object_or_404(Advertisement, pk=ad_id)
        serializer = AdEventSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        AdClick.objects.create(
            advertisement=advertisement,
            user=request.user if getattr(request.user, "is_authenticated", False) else None,
            guest_id=serializer.validated_data.get("guest_id"),
            placement=serializer.validated_data["placement"],
            action_type=advertisement.action_type,
            action_payload=advertisement.action_payload,
        )
        return Response(status=status.HTTP_202_ACCEPTED)
