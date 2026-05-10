from __future__ import annotations

from django.db.models import Prefetch, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import User, UserRole
from apps.admin_ops.views import _resolve_admin_scope, _scoped_advertisement_queryset
from apps.directory.models import Company, MediaAsset
from config.storage import build_mock_public_url, build_mock_signed_upload, get_mock_upload

from .models import AdAsset, AdClick, AdImpression, Advertisement
from .serializers import (
    AdEventSerializer,
    AdvertisementCampaignSerializer,
    AdvertisementCampaignWriteSerializer,
    AdvertisementMediaAssetFinalizeSerializer,
    AdvertisementSerializer,
)


def get_advertisement_queryset():
    return Advertisement.objects.select_related(
        "advertiser",
        "approved_by",
        "company",
        "company__tier_ref",
        "targeting__state",
        "targeting__association",
        "targeting__district_operational_unit",
        "targeting__unit",
    ).prefetch_related(
        Prefetch("assets", queryset=AdAsset.objects.select_related("asset").order_by("id"))
    )


def _get_company_admin_company(user: User) -> Company | None:
    company_role = user.scoped_roles.filter(
        role=UserRole.Role.COMPANY_ADMIN,
        scope_type=UserRole.ScopeType.COMPANY,
    ).order_by("id").first()
    if company_role is None or not company_role.scope_id:
        return None
    return Company.objects.select_related("tier_ref").filter(pk=company_role.scope_id).first()


def _require_company_advertiser(user: User, *, require_active_approved: bool) -> Company:
    company = _get_company_admin_company(user)
    if company is None:
        raise PermissionDenied("Only company admins linked to a registered company can manage advertisements.")
    if require_active_approved and (not company.is_active or not company.is_approved):
        raise PermissionDenied("Only active and approved companies can create or submit advertisements.")
    return company


def _user_can_review_ads(user: User) -> bool:
    if not user or not user.is_authenticated:
        return False
    if user.role in {User.Role.ADMIN, User.Role.SUPER_ADMIN} or user.is_staff or user.is_superuser:
        return True
    return user.scoped_roles.filter(
        role__in=[
            UserRole.Role.SUPER_ADMIN,
            UserRole.Role.STATE_ADMIN,
            UserRole.Role.ASSOCIATION_ADMIN,
            UserRole.Role.DISTRICT_ADMIN,
            UserRole.Role.UNIT_ADMIN,
        ]
    ).exists()


def _require_ad_reviewer(user: User) -> None:
    if not _user_can_review_ads(user):
        raise PermissionDenied("Only platform or scoped admins can review advertisement submissions.")


def _approval_queryset_for_user(user: User):
    if user.role in {User.Role.ADMIN, User.Role.SUPER_ADMIN} or user.is_staff or user.is_superuser:
        return get_advertisement_queryset().filter(status=Advertisement.Status.SUBMITTED).order_by("-created_at", "-id")
    scope = _resolve_admin_scope(user)
    advertisement_ids = (
        _scoped_advertisement_queryset(scope)
        .filter(status=Advertisement.Status.SUBMITTED)
        .values_list("id", flat=True)
    )
    return get_advertisement_queryset().filter(id__in=advertisement_ids).distinct().order_by("-created_at", "-id")


class AdvertisementOverviewView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        placement = request.query_params.get("placement", Advertisement.Placement.DASHBOARD_HERO)
        now = timezone.now()
        advertisements = (
            get_advertisement_queryset()
            .filter(
                placement=placement,
                status=Advertisement.Status.APPROVED,
                is_active=True,
            )
            .filter(Q(company__isnull=True) | Q(company__is_active=True, company__is_approved=True))
            .filter(Q(start_date__isnull=True) | Q(start_date__lte=now))
            .filter(Q(end_date__isnull=True) | Q(end_date__gte=now))
            .order_by("-priority", "-created_at", "-id")
        )
        return Response({"results": AdvertisementSerializer(advertisements, many=True, context={"request": request}).data})


class AdvertisementUploadSessionView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        company = _require_company_advertiser(request.user, require_active_approved=True)
        filename = request.data.get("filename", "banner.jpg")
        session = build_mock_signed_upload("ads/banners", company.id, filename, visibility="public")
        return Response(session.__dict__)


class AdvertisementMediaAssetFinalizeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        company = _require_company_advertiser(request.user, require_active_approved=True)
        serializer = AdvertisementMediaAssetFinalizeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payload = serializer.validated_data

        expected_prefix = f"ads/banners/{company.id}/"
        if not payload["object_key"].startswith(expected_prefix):
            raise ValidationError({"object_key": ["Object key does not match the advertisement upload path."]})

        mock_upload = get_mock_upload(payload["object_key"])
        if mock_upload is None:
            raise ValidationError({"object_key": ["Uploaded object not found in mock storage."]})
        if mock_upload.content_type != payload["mime_type"]:
            raise ValidationError({"mime_type": ["Uploaded file metadata did not match the finalize payload."]})
        if mock_upload.size != payload["file_size"]:
            raise ValidationError({"file_size": ["Uploaded file size did not match the finalize payload."]})

        public_url = build_mock_public_url(payload["object_key"], request=request)
        media_asset, created = MediaAsset.objects.get_or_create(
            object_key=payload["object_key"],
            defaults={
                "uploader": request.user,
                "bucket_name": payload["bucket_name"],
                "original_filename": payload["original_filename"],
                "mime_type": payload["mime_type"],
                "public_url": public_url,
                "width": payload["width"],
                "height": payload["height"],
                "file_size": payload["file_size"],
                "visibility": MediaAsset.Visibility.PUBLIC,
                "moderation_status": MediaAsset.ModerationStatus.APPROVED,
            },
        )

        if not created:
            media_asset.uploader = request.user
            media_asset.bucket_name = payload["bucket_name"]
            media_asset.original_filename = payload["original_filename"]
            media_asset.mime_type = payload["mime_type"]
            media_asset.public_url = public_url
            media_asset.width = payload["width"]
            media_asset.height = payload["height"]
            media_asset.file_size = payload["file_size"]
            media_asset.visibility = MediaAsset.Visibility.PUBLIC
            media_asset.moderation_status = MediaAsset.ModerationStatus.APPROVED
            media_asset.save(
                update_fields=[
                    "uploader",
                    "bucket_name",
                    "original_filename",
                    "mime_type",
                    "public_url",
                    "width",
                    "height",
                    "file_size",
                    "visibility",
                    "moderation_status",
                ]
            )

        return Response(
            {
                "asset_id": media_asset.id,
                "object_key": media_asset.object_key,
                "public_url": media_asset.public_url,
                "original_filename": media_asset.original_filename,
            },
            status=status.HTTP_201_CREATED,
        )


class AdvertisementCampaignListCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        company = _require_company_advertiser(request.user, require_active_approved=False)
        queryset = get_advertisement_queryset().filter(company=company).order_by("-created_at", "-id")
        return Response({"results": AdvertisementCampaignSerializer(queryset, many=True, context={"request": request}).data})

    def post(self, request):
        company = _require_company_advertiser(request.user, require_active_approved=True)
        serializer = AdvertisementCampaignWriteSerializer(
            data=request.data,
            context={"request": request, "company": company},
        )
        serializer.is_valid(raise_exception=True)
        advertisement = serializer.save()
        refreshed = get_advertisement_queryset().get(pk=advertisement.id)
        return Response(
            {
                "message": (
                    "Advertisement submitted for review."
                    if refreshed.status == Advertisement.Status.SUBMITTED
                    else "Advertisement draft saved successfully."
                ),
                "advertisement": AdvertisementCampaignSerializer(refreshed, context={"request": request}).data,
            },
            status=status.HTTP_201_CREATED,
        )


class AdvertisementCampaignDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, ad_id: int):
        company = _require_company_advertiser(request.user, require_active_approved=True)
        advertisement = get_object_or_404(get_advertisement_queryset().filter(company=company), pk=ad_id)
        if advertisement.status == Advertisement.Status.APPROVED:
            raise ValidationError({"detail": ["Approved advertisements cannot be edited. Create a new campaign instead."]})

        serializer = AdvertisementCampaignWriteSerializer(
            advertisement,
            data=request.data,
            partial=True,
            context={"request": request, "company": company, "advertisement": advertisement},
        )
        serializer.is_valid(raise_exception=True)
        updated = serializer.save()
        refreshed = get_advertisement_queryset().get(pk=updated.id)
        return Response(
            {
                "message": (
                    "Advertisement re-submitted for review."
                    if refreshed.status == Advertisement.Status.SUBMITTED
                    else "Advertisement draft updated successfully."
                ),
                "advertisement": AdvertisementCampaignSerializer(refreshed, context={"request": request}).data,
            }
        )


class SubmittedAdvertisementApprovalListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        _require_ad_reviewer(request.user)
        queryset = _approval_queryset_for_user(request.user)
        return Response({"results": AdvertisementCampaignSerializer(queryset, many=True, context={"request": request}).data})


class AdvertisementApproveView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, ad_id: int):
        _require_ad_reviewer(request.user)
        advertisement = get_object_or_404(_approval_queryset_for_user(request.user), pk=ad_id)
        advertisement.status = Advertisement.Status.APPROVED
        advertisement.approved_by = request.user
        advertisement.approved_at = timezone.now()
        advertisement.save(update_fields=["status", "approved_by", "approved_at", "updated_at"])
        refreshed = get_advertisement_queryset().get(pk=advertisement.id)
        return Response(
            {
                "message": "Advertisement approved successfully.",
                "advertisement": AdvertisementCampaignSerializer(refreshed, context={"request": request}).data,
            }
        )


class AdvertisementRejectView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, ad_id: int):
        _require_ad_reviewer(request.user)
        advertisement = get_object_or_404(_approval_queryset_for_user(request.user), pk=ad_id)
        advertisement.status = Advertisement.Status.REJECTED
        advertisement.approved_by = request.user
        advertisement.approved_at = timezone.now()
        advertisement.save(update_fields=["status", "approved_by", "approved_at", "updated_at"])
        refreshed = get_advertisement_queryset().get(pk=advertisement.id)
        return Response(
            {
                "message": "Advertisement rejected successfully.",
                "advertisement": AdvertisementCampaignSerializer(refreshed, context={"request": request}).data,
            }
        )


class AdvertisementImpressionView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, ad_id: int):
        advertisement = get_object_or_404(Advertisement, pk=ad_id)
        serializer = AdEventSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payload = serializer.validated_data
        AdImpression.objects.create(
            advertisement=advertisement,
            user=request.user if request.user.is_authenticated else None,
            placement=payload["placement"],
            guest_id=payload.get("guest_id"),
        )
        return Response(status=status.HTTP_202_ACCEPTED)


class AdvertisementClickView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, ad_id: int):
        advertisement = get_object_or_404(Advertisement, pk=ad_id)
        serializer = AdEventSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payload = serializer.validated_data
        AdClick.objects.create(
            advertisement=advertisement,
            user=request.user if request.user.is_authenticated else None,
            guest_id=payload.get("guest_id"),
            placement=payload["placement"],
            action_type=advertisement.action_type,
            action_payload=advertisement.action_payload,
        )
        return Response(status=status.HTTP_202_ACCEPTED)
