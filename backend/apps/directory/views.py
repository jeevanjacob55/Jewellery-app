from __future__ import annotations

import logging

from django.conf import settings
from django.db.models import Prefetch, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.text import slugify
from rest_framework import permissions, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.generics import ListAPIView, RetrieveAPIView
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.admin_ops.permissions import IsSuperAdmin

from config.storage import build_mock_public_url, build_mock_signed_upload, get_mock_upload

from .models import (
    Company,
    CompanyImage,
    CompanyTierChangeRequest,
    MarketRow,
    MarketZone,
    CompanyTier,
    Enquiry,
    MediaAsset,
    PlacementOverride,
    Product,
    ProductAttributeDefinition,
    ProductAttributeValue,
    ProductCategory,
    ProductImage,
    ProductSubCategory,
    ProductWishlist,
    ZoneEligibilityRule,
)
from .serializers import (
    CompanySerializer,
    CompanyTierAdminDetailSerializer,
    CompanyImageAttachSerializer,
    CompanyManagementDetailSerializer,
    CompanyManagementUpdateSerializer,
    CompanyMediaAssetFinalizeSerializer,
    CompanyMarketVisibilitySerializer,
    CompanyTierAssignmentConfirmSerializer,
    CompanyTierAssignmentSerializer,
    CompanyTierChangeRequestCreateSerializer,
    CompanyTierChangeRequestReviewSerializer,
    CompanyTierChangeRequestSerializer,
    CompanyTierManagementOverviewSerializer,
    CompanyTierSerializer,
    CompanyTierWriteSerializer,
    EnquirySerializer,
    MarketFeedSerializer,
    MarketPreviewSerializer,
    MarketReportSummarySerializer,
    MarketRowWriteSerializer,
    MarketZoneSerializer,
    MarketZoneWriteSerializer,
    MarketUnderServedReportSerializer,
    PlacementOverrideSerializer,
    ProductFilterCategorySerializer,
    ProductDetailSerializer,
    ProductEnquiryWriteSerializer,
    ProductImageAttachSerializer,
    ProductImageUploadSessionSerializer,
    ProductSearchResultSerializer,
    ProductSerializer,
    ProductWriteSerializer,
    ZoneEligibilityRuleBulkUpdateSerializer,
    ZoneEligibilityRuleSerializer,
)
from .services import (
    TierValidationError,
    apply_tier_change_with_selected_products,
    build_latest_products_row,
    build_market_category_row,
    build_market_preview_payload,
    build_market_report_summary,
    build_downgrade_warning,
    build_market_zone_feed,
    build_under_served_report,
    get_admin_manageable_company_queryset,
    user_can_manage_company,
    validate_company_tier_capacity,
)


logger = logging.getLogger(__name__)


def get_public_company_queryset():
    active_product_queryset = Product.objects.filter(is_active=True).select_related("category", "subcategory").prefetch_related(
        Prefetch("images", queryset=ProductImage.objects.select_related("asset").order_by("id")),
        Prefetch("attribute_values", queryset=ProductAttributeValue.objects.select_related("attribute_definition").order_by("attribute_definition__display_order", "id")),
    )
    return Company.objects.filter(is_active=True, is_approved=True).select_related("verification", "tier_ref").prefetch_related(
        Prefetch("products", queryset=active_product_queryset),
        Prefetch("images", queryset=CompanyImage.objects.select_related("asset").order_by("is_logo", "id")),
    )


def get_public_product_queryset():
    return Product.objects.filter(
        is_active=True,
        company__is_active=True,
        company__is_approved=True,
    ).select_related("company", "category", "subcategory", "company__tier_ref").prefetch_related(
        Prefetch("images", queryset=ProductImage.objects.select_related("asset").order_by("id")),
        Prefetch("attribute_values", queryset=ProductAttributeValue.objects.select_related("attribute_definition").order_by("attribute_definition__display_order", "id")),
    )


def get_company_management_queryset():
    product_queryset = (
        Product.objects.select_related("category", "subcategory")
        .prefetch_related(
            Prefetch("images", queryset=ProductImage.objects.select_related("asset").order_by("id")),
            Prefetch(
                "attribute_values",
                queryset=ProductAttributeValue.objects.select_related("attribute_definition").order_by("attribute_definition__display_order", "id"),
            ),
        )
        .order_by("-created_at", "-id")
    )
    return (
        Company.objects.select_related("verification", "tier_ref")
        .prefetch_related(
            Prefetch("products", queryset=product_queryset),
            Prefetch("images", queryset=CompanyImage.objects.select_related("asset").order_by("is_logo", "id")),
        )
    )


def get_tier_request_queryset():
    return CompanyTierChangeRequest.objects.select_related(
        "company",
        "current_tier",
        "requested_tier",
        "requested_by",
        "reviewed_by",
    ).prefetch_related(
        Prefetch("company__products", queryset=Product.objects.order_by("-created_at", "-id")),
    )


def get_company_admin_company(user) -> Company | None:
    if not user or not user.is_authenticated:
        return None
    company_role = user.scoped_roles.filter(role="company_admin", scope_type="company").order_by("id").first()
    if company_role is None or not company_role.scope_id:
        return None
    return get_company_management_queryset().filter(pk=company_role.scope_id).first()


def require_company_admin_company(user) -> Company:
    company = get_company_admin_company(user)
    if company is None:
        raise PermissionDenied("Only company admins linked to a company can manage tier requests.")
    return company


def resolve_category_param(param: str | None) -> ProductCategory | None:
    if not param:
        return None
    normalized = param.strip().lower()
    for category in ProductCategory.objects.filter(is_active=True):
        if category.name.lower() == normalized or slugify(category.name) == normalized:
            return category
    return None


def resolve_subcategory_param(param: str | None, *, category: ProductCategory | None = None) -> ProductSubCategory | None:
    if not param:
        return None
    queryset = ProductSubCategory.objects.filter(is_active=True)
    if category is not None:
        queryset = queryset.filter(category=category)
    normalized = param.strip().lower()
    for subcategory in queryset:
        if subcategory.name.lower() == normalized or subcategory.slug == normalized:
            return subcategory
    return None


def build_market_feed_payload() -> dict:
    if not settings.DIRECTORY_MARKET_ZONE_FEED_ENABLED:
        return build_legacy_market_feed_payload()

    if not settings.DIRECTORY_MARKET_MIXED_FEED_ENABLED:
        return build_zone_market_feed_payload()

    try:
        return build_mixed_market_feed_payload()
    except Exception:
        logger.exception("Falling back to zone market feed after mixed market feed failure.")
        return build_zone_market_feed_payload()


def build_zone_market_feed_payload() -> dict:
    try:
        result = build_market_zone_feed(get_public_company_queryset(), write_exposure=True)
    except Exception:
        logger.exception("Falling back to legacy market-row feed after zone market feed failure.")
        return build_legacy_market_feed_payload()
    return {"rows": result.rows}


def build_mixed_market_feed_payload() -> dict:
    company_result = build_market_zone_feed(get_public_company_queryset(), write_exposure=True)
    company_rows_by_key = {
        row["zone_key"]: row
        for row in company_result.rows
        if row.get("zone_key") in {"hero_spotlight", "featured_companies", "rising_companies"}
    }

    category_row = build_market_category_row(
        list(ProductCategory.objects.filter(is_active=True).order_by("display_order", "name", "id"))
    )
    latest_products_zone = MarketZone.objects.filter(
        key="latest_products",
        is_enabled=True,
        serving_mode=MarketZone.ServingMode.LATEST_PRODUCTS,
    ).first()
    latest_products_row = None
    if latest_products_zone is not None:
        latest_products = list(
            get_public_product_queryset()
            .filter(company__is_market_visible=True, company__tier_ref__is_active=True)
            .order_by("-created_at", "-id")[: latest_products_zone.capacity]
        )
        latest_products_row = build_latest_products_row(latest_products_zone, latest_products)

    ordered_rows = []
    for zone_key in ["hero_spotlight", "featured_companies"]:
        row = company_rows_by_key.get(zone_key)
        if row and row["resolved_items"]:
            ordered_rows.append(row)
    if category_row is not None:
        ordered_rows.append(category_row)
    rising_row = company_rows_by_key.get("rising_companies")
    if rising_row and rising_row["resolved_items"]:
        ordered_rows.append(rising_row)
    if latest_products_row is not None:
        ordered_rows.append(latest_products_row)
    return {"rows": ordered_rows}


def build_legacy_market_feed_payload() -> dict:
    company_queryset = get_public_company_queryset()
    rows = list(MarketRow.objects.filter(is_enabled=True).order_by("sort_order", "id"))

    for row in rows:
        if row.row_type != MarketRow.RowType.COMPANY_TIER:
            row.resolved_items = []
            continue

        row.resolved_items = list(
            company_queryset
            .filter(tier_ref__visibility_type=row.target_visibility_type)
            .order_by("-admin_priority", "-created_at", "name")
        )

    visible_rows = [row for row in rows if row.resolved_items]
    return {"rows": visible_rows}


class CompanyListView(ListAPIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    queryset = get_public_company_queryset().order_by("tier_ref__display_priority", "-admin_priority", "name")
    serializer_class = CompanySerializer


class CompanyDetailView(RetrieveAPIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    queryset = get_public_company_queryset()
    serializer_class = CompanySerializer


class MarketFeedView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        payload = build_market_feed_payload()
        return Response(MarketFeedSerializer(payload).data)


class ProductFilterConfigView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        categories = ProductCategory.objects.filter(is_active=True).prefetch_related(
            Prefetch("subcategories", queryset=ProductSubCategory.objects.filter(is_active=True).order_by("display_order", "name")),
            Prefetch("attribute_definitions", queryset=ProductAttributeDefinition.objects.filter(is_active=True).order_by("display_order", "id")),
        ).order_by("display_order", "name")
        purity_options = list(
            get_public_product_queryset()
            .order_by()
            .values_list("purity", flat=True)
            .distinct()
        )
        preferred_order = {"18K": 0, "22K": 1, "24K": 2, "999.9": 3}
        purity_options.sort(key=lambda value: (preferred_order.get(value, 99), value))
        return Response(
            {
                "categories": ProductFilterCategorySerializer(categories, many=True).data,
                "purity_options": purity_options,
            }
        )


class ProductSearchView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        queryset = get_public_product_queryset()
        search = request.query_params.get("search", "").strip()
        category = resolve_category_param(request.query_params.get("category"))
        subcategory = resolve_subcategory_param(request.query_params.get("subcategory"), category=category)
        purity = request.query_params.get("purity", "").strip()
        company_id = request.query_params.get("company")
        product_id = request.query_params.get("product_id")
        sort = request.query_params.get("sort", "popularity").strip().lower() or "popularity"

        if search:
            queryset = queryset.filter(
                Q(name__icontains=search)
                | Q(company__name__icontains=search)
                | Q(category__name__icontains=search)
                | Q(subcategory__name__icontains=search)
            )

        if category is not None:
            queryset = queryset.filter(category=category)

        if subcategory is not None:
            queryset = queryset.filter(subcategory=subcategory)

        if purity:
            queryset = queryset.filter(purity__iexact=purity)

        if company_id:
            queryset = queryset.filter(company_id=company_id)

        if product_id:
            queryset = queryset.filter(id=product_id)

        excluded_keys = {"search", "category", "subcategory", "purity", "sort", "company", "product_id"}
        dynamic_filters = {
            key: value
            for key, value in request.query_params.items()
            if key not in excluded_keys and value.strip()
        }

        for key, value in dynamic_filters.items():
            matching_product_ids = ProductAttributeValue.objects.filter(
                attribute_definition__key=key,
                value__iexact=value,
            ).values_list("product_id", flat=True)
            queryset = queryset.filter(id__in=matching_product_ids)

        if sort == "price_low_to_high":
            queryset = queryset.order_by("price", "-created_at", "-id")
        elif sort == "price_high_to_low":
            queryset = queryset.order_by("-price", "-created_at", "-id")
        elif sort == "newest":
            queryset = queryset.order_by("-created_at", "-id")
        else:
            queryset = queryset.order_by("-company__admin_priority", "-created_at", "-id")

        count = queryset.distinct().count()
        results = ProductSearchResultSerializer(queryset.distinct(), many=True).data
        return Response({"count": count, "results": results, "sort": sort})


class ProductDetailView(RetrieveAPIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    lookup_url_kwarg = "product_id"
    queryset = get_public_product_queryset()
    serializer_class = ProductDetailSerializer


class ProductWishlistToggleView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, product_id: int):
        product = get_object_or_404(get_public_product_queryset(), pk=product_id)
        wishlist, created = ProductWishlist.objects.get_or_create(user=request.user, product=product)
        if not created:
            wishlist.delete()

        return Response({"product_id": product.id, "is_wishlisted": created})


class ProductEnquiryCreateView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def post(self, request, product_id: int):
        product = get_object_or_404(get_public_product_queryset(), pk=product_id)
        serializer = ProductEnquiryWriteSerializer(data=request.data, context={"product": product})
        serializer.is_valid(raise_exception=True)
        enquiry = serializer.save()
        return Response(EnquirySerializer(enquiry).data, status=status.HTTP_201_CREATED)


class EnquiryCreateView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = EnquirySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        enquiry = serializer.save()
        return Response(EnquirySerializer(enquiry).data, status=status.HTTP_201_CREATED)


class CompanyImageUploadSessionView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, company_id: int):
        company = get_object_or_404(Company.objects.only("id"), pk=company_id)
        if not user_can_manage_company(request.user, company.id):
            return Response({"detail": "You do not have permission to manage media for this company."}, status=status.HTTP_403_FORBIDDEN)
        filename = request.data.get("filename", "company-image.jpg")
        session = build_mock_signed_upload("companies/gallery", company_id, filename, visibility="public")
        return Response(session.__dict__)


class CompanyManagementDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, company_id: int):
        company = get_object_or_404(get_company_management_queryset(), pk=company_id)
        if not user_can_manage_company(request.user, company.id):
            return Response({"detail": "You do not have permission to manage this company."}, status=status.HTTP_403_FORBIDDEN)
        return Response(CompanyManagementDetailSerializer({"company": company, "products": list(company.products.all())}).data)

    def patch(self, request, company_id: int):
        company = get_object_or_404(get_company_management_queryset(), pk=company_id)
        if not user_can_manage_company(request.user, company.id):
            return Response({"detail": "You do not have permission to manage this company."}, status=status.HTTP_403_FORBIDDEN)

        serializer = CompanyManagementUpdateSerializer(company, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        company.refresh_from_db()
        refreshed = get_company_management_queryset().get(pk=company.id)
        return Response(CompanyManagementDetailSerializer({"company": refreshed, "products": list(refreshed.products.all())}).data)


class CompanyTierManagementOverviewView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        company = require_company_admin_company(request.user)
        current_tier = company.tier_ref
        tiers = list(CompanyTier.objects.filter(is_active=True).order_by("display_priority", "id"))
        pending_request = (
            get_tier_request_queryset()
            .filter(company=company, status=CompanyTierChangeRequest.Status.PENDING)
            .order_by("-created_at", "-id")
            .first()
        )
        requests = list(get_tier_request_queryset().filter(company=company).order_by("-created_at", "-id")[:10])
        payload = {
            "company": company,
            "current_tier": current_tier,
            "available_upgrades": [tier for tier in tiers if tier.display_priority < current_tier.display_priority],
            "available_downgrades": [tier for tier in tiers if tier.display_priority > current_tier.display_priority],
            "pending_request": pending_request,
            "requests": requests,
        }
        return Response(CompanyTierManagementOverviewSerializer(payload).data)


class CompanyTierChangeRequestListCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        company = require_company_admin_company(request.user)
        queryset = get_tier_request_queryset().filter(company=company).order_by("-created_at", "-id")
        return Response({"results": CompanyTierChangeRequestSerializer(queryset, many=True).data})

    def post(self, request):
        company = require_company_admin_company(request.user)
        serializer = CompanyTierChangeRequestCreateSerializer(data=request.data, context={"request": request, "company": company})
        serializer.is_valid(raise_exception=True)
        tier_request = serializer.save()
        refreshed = get_tier_request_queryset().get(pk=tier_request.id)
        return Response(
            {
                "message": "Tier request submitted for manual review.",
                "request": CompanyTierChangeRequestSerializer(refreshed).data,
            },
            status=status.HTTP_201_CREATED,
        )


class CompanyTierChangeRequestCancelView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, request_id: int):
        company = require_company_admin_company(request.user)
        tier_request = get_object_or_404(
            CompanyTierChangeRequest.objects.filter(company=company, status=CompanyTierChangeRequest.Status.PENDING),
            pk=request_id,
        )
        tier_request.status = CompanyTierChangeRequest.Status.CANCELLED
        tier_request.save(update_fields=["status", "updated_at"])
        refreshed = get_tier_request_queryset().get(pk=tier_request.id)
        return Response(
            {
                "message": "Tier request cancelled.",
                "request": CompanyTierChangeRequestSerializer(refreshed).data,
            }
        )


class CompanyMediaAssetFinalizeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, company_id: int):
        company = get_object_or_404(Company.objects.only("id"), pk=company_id)
        if not user_can_manage_company(request.user, company.id):
            return Response({"detail": "You do not have permission to manage media for this company."}, status=status.HTTP_403_FORBIDDEN)

        serializer = CompanyMediaAssetFinalizeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payload = serializer.validated_data

        expected_prefix = f"companies/gallery/{company.id}/"
        if not payload["object_key"].startswith(expected_prefix):
            return Response({"object_key": ["Object key does not match the company upload path."]}, status=status.HTTP_400_BAD_REQUEST)

        mock_upload = get_mock_upload(payload["object_key"])
        if mock_upload is None:
            return Response({"object_key": ["Uploaded object not found in mock storage."]}, status=status.HTTP_400_BAD_REQUEST)
        if mock_upload.content_type != payload["mime_type"]:
            return Response({"mime_type": ["Uploaded file metadata did not match the finalize payload."]}, status=status.HTTP_400_BAD_REQUEST)
        if mock_upload.size != payload["file_size"]:
            return Response({"file_size": ["Uploaded file size did not match the finalize payload."]}, status=status.HTTP_400_BAD_REQUEST)

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


class CompanyImageAttachView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, company_id: int):
        company = get_object_or_404(get_company_management_queryset(), pk=company_id)
        if not user_can_manage_company(request.user, company.id):
            return Response({"detail": "You do not have permission to manage media for this company."}, status=status.HTTP_403_FORBIDDEN)

        serializer = CompanyImageAttachSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        asset: MediaAsset = serializer.validated_data["asset"]
        is_logo = serializer.validated_data["slot"] == "logo"

        if hasattr(asset, "product_image"):
            return Response({"asset_id": ["This image asset is already attached to a product."]}, status=status.HTTP_400_BAD_REQUEST)

        existing_attachment = getattr(asset, "company_image", None)
        if existing_attachment is not None and existing_attachment.company_id != company.id:
            return Response({"asset_id": ["This image asset is already attached to another company."]}, status=status.HTTP_400_BAD_REQUEST)

        CompanyImage.objects.filter(company=company, is_logo=is_logo).delete()
        CompanyImage.objects.update_or_create(
            asset=asset,
            defaults={"company": company, "is_logo": is_logo},
        )

        refreshed = get_company_management_queryset().get(pk=company.id)
        return Response(CompanyManagementDetailSerializer({"company": refreshed, "products": list(refreshed.products.all())}).data, status=status.HTTP_201_CREATED)


class CompanyProductListCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, company_id: int):
        company = get_object_or_404(Company.objects.select_related("tier_ref"), pk=company_id)
        if not user_can_manage_company(request.user, company.id):
            return Response({"detail": "You do not have permission to manage products for this company."}, status=status.HTTP_403_FORBIDDEN)

        serializer = ProductWriteSerializer(data=request.data, context={"company": company})
        serializer.is_valid(raise_exception=True)
        product = serializer.save()
        product.refresh_from_db()
        return Response(ProductSerializer(product).data, status=status.HTTP_201_CREATED)


class CompanyProductDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, company_id: int, product_id: int):
        company = get_object_or_404(Company.objects.select_related("tier_ref"), pk=company_id)
        if not user_can_manage_company(request.user, company.id):
            return Response({"detail": "You do not have permission to manage products for this company."}, status=status.HTTP_403_FORBIDDEN)

        product = get_object_or_404(
            Product.objects.filter(company=company).prefetch_related(Prefetch("images", queryset=ProductImage.objects.select_related("asset"))),
            pk=product_id,
        )
        serializer = ProductWriteSerializer(product, data=request.data, partial=True, context={"company": company})
        serializer.is_valid(raise_exception=True)
        updated_product = serializer.save()
        return Response(ProductSerializer(updated_product).data)


class ProductImageUploadSessionView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, company_id: int, product_id: int):
        company = get_object_or_404(Company.objects.select_related("tier_ref"), pk=company_id)
        if not user_can_manage_company(request.user, company.id):
            return Response({"detail": "You do not have permission to manage product images for this company."}, status=status.HTTP_403_FORBIDDEN)

        get_object_or_404(Product, pk=product_id, company=company)
        serializer = ProductImageUploadSessionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        filename = serializer.validated_data["filename"]
        session = build_mock_signed_upload("products/gallery", product_id, filename, visibility="public")
        return Response(session.__dict__)


class ProductImageAttachView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, company_id: int, product_id: int):
        company = get_object_or_404(Company.objects.select_related("tier_ref"), pk=company_id)
        if not user_can_manage_company(request.user, company.id):
            return Response({"detail": "You do not have permission to manage product images for this company."}, status=status.HTTP_403_FORBIDDEN)

        product = get_object_or_404(Product.objects.prefetch_related("images"), pk=product_id, company=company)
        serializer = ProductImageAttachSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        image_count_after_attach = product.images.count() + 1
        if image_count_after_attach > company.tier_ref.max_photos_per_product:
            return Response(
                {
                    "asset_id": [
                        f"No more than {company.tier_ref.max_photos_per_product} product image(s) are allowed for your current tier."
                    ]
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        asset: MediaAsset = serializer.validated_data["asset"]
        if ProductImage.objects.filter(asset=asset).exists():
            return Response({"asset_id": ["This image asset is already attached to a product."]}, status=status.HTTP_400_BAD_REQUEST)

        ProductImage.objects.create(product=product, asset=asset)
        product.refresh_from_db()
        return Response(ProductSerializer(product).data, status=status.HTTP_201_CREATED)


class AdminCompanyTierListCreateView(APIView):
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        tiers = CompanyTier.objects.all().order_by("display_priority", "id")
        return Response(CompanyTierSerializer(tiers, many=True).data)

    def post(self, request):
        serializer = CompanyTierWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        tier = serializer.save()
        return Response(CompanyTierSerializer(tier).data, status=status.HTTP_201_CREATED)


class AdminMarketZoneListCreateView(APIView):
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        zones = MarketZone.objects.all().order_by("sort_order", "id")
        return Response(MarketZoneSerializer(zones, many=True).data)

    def post(self, request):
        serializer = MarketZoneWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        zone = serializer.save()
        return Response(MarketZoneSerializer(zone).data, status=status.HTTP_201_CREATED)


class AdminMarketZoneDetailView(APIView):
    permission_classes = [IsSuperAdmin]

    def patch(self, request, zone_id: int):
        zone = get_object_or_404(MarketZone, pk=zone_id)
        serializer = MarketZoneWriteSerializer(zone, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        updated_zone = serializer.save()
        return Response(MarketZoneSerializer(updated_zone).data)


class AdminMarketZoneEligibilityRuleView(APIView):
    permission_classes = [IsSuperAdmin]

    def get(self, request, zone_id: int):
        zone = get_object_or_404(MarketZone, pk=zone_id)
        rules = zone.eligibility_rules.select_related("tier").order_by("tier__display_priority", "id")
        return Response(ZoneEligibilityRuleSerializer(rules, many=True).data)

    def patch(self, request, zone_id: int):
        zone = get_object_or_404(MarketZone, pk=zone_id)
        serializer = ZoneEligibilityRuleBulkUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        rules_by_id = {
            rule.id: rule
            for rule in zone.eligibility_rules.select_related("tier").all()
        }
        updated_rules: list[ZoneEligibilityRule] = []
        for payload in serializer.validated_data["rules"]:
            rule = rules_by_id.get(payload["id"])
            if rule is None:
                return Response({"rules": [f"Rule {payload['id']} does not belong to this zone."]}, status=status.HTTP_400_BAD_REQUEST)
            for field_name, value in payload.items():
                if field_name != "id":
                    setattr(rule, field_name, value)
            rule.save()
            updated_rules.append(rule)
        return Response(ZoneEligibilityRuleSerializer(updated_rules, many=True).data)


class AdminMarketRowListCreateView(APIView):
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        rows = MarketRow.objects.all().order_by("sort_order", "id")
        return Response(MarketRowWriteSerializer(rows, many=True).data)

    def post(self, request):
        serializer = MarketRowWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        row = serializer.save()
        return Response(MarketRowWriteSerializer(row).data, status=status.HTTP_201_CREATED)


class AdminMarketRowDetailView(APIView):
    permission_classes = [IsSuperAdmin]

    def patch(self, request, row_id: int):
        row = get_object_or_404(MarketRow, pk=row_id)
        serializer = MarketRowWriteSerializer(row, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        updated_row = serializer.save()
        return Response(MarketRowWriteSerializer(updated_row).data)


class AdminCompanyTierDetailView(APIView):
    permission_classes = [IsSuperAdmin]

    def get(self, request, tier_id: int):
        tier = get_object_or_404(CompanyTier, pk=tier_id)
        enrolled_companies = list(
            get_company_management_queryset()
            .filter(tier_ref=tier)
            .order_by("name", "id")
        )
        recent_requests = list(
            get_tier_request_queryset()
            .filter(Q(current_tier=tier) | Q(requested_tier=tier))
            .order_by("-created_at", "-id")[:10]
        )
        pending_request_count = CompanyTierChangeRequest.objects.filter(
            requested_tier=tier,
            status=CompanyTierChangeRequest.Status.PENDING,
        ).count()
        return Response(
            CompanyTierAdminDetailSerializer(
                {
                    "tier": tier,
                    "enrolled_companies": enrolled_companies,
                    "pending_request_count": pending_request_count,
                    "recent_requests": recent_requests,
                }
            ).data
        )

    def patch(self, request, tier_id: int):
        tier = get_object_or_404(CompanyTier, pk=tier_id)
        serializer = CompanyTierWriteSerializer(tier, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        updated_tier = serializer.save()
        return Response(CompanyTierSerializer(updated_tier).data)


class AdminCompanyTierRequestListView(APIView):
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        queryset = get_tier_request_queryset().order_by("-created_at", "-id")
        return Response({"results": CompanyTierChangeRequestSerializer(queryset, many=True).data})


class AdminCompanyTierRequestApproveView(APIView):
    permission_classes = [IsSuperAdmin]

    def post(self, request, request_id: int):
        tier_request = get_object_or_404(
            get_tier_request_queryset().filter(status=CompanyTierChangeRequest.Status.PENDING),
            pk=request_id,
        )
        serializer = CompanyTierChangeRequestReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        if tier_request.request_type == CompanyTierChangeRequest.RequestType.UPGRADE:
            try:
                validate_company_tier_capacity(tier_request.requested_tier, exclude_company_id=tier_request.company_id)
            except TierValidationError as exc:
                return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
            tier_request.company.tier_ref = tier_request.requested_tier
            tier_request.company.save(update_fields=["tier_ref"])
        else:
            try:
                apply_tier_change_with_selected_products(
                    tier_request.company,
                    tier_request.requested_tier,
                    tier_request.retain_active_product_ids,
                )
            except TierValidationError as exc:
                return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        tier_request.status = CompanyTierChangeRequest.Status.APPROVED
        tier_request.reviewed_by = request.user
        tier_request.admin_note = serializer.validated_data["admin_note"].strip()
        tier_request.reviewed_at = timezone.now()
        tier_request.save(update_fields=["status", "reviewed_by", "admin_note", "reviewed_at", "updated_at"])
        refreshed = get_tier_request_queryset().get(pk=tier_request.id)
        return Response({"message": "Tier request approved.", "request": CompanyTierChangeRequestSerializer(refreshed).data})


class AdminCompanyTierRequestRejectView(APIView):
    permission_classes = [IsSuperAdmin]

    def post(self, request, request_id: int):
        tier_request = get_object_or_404(
            get_tier_request_queryset().filter(status=CompanyTierChangeRequest.Status.PENDING),
            pk=request_id,
        )
        serializer = CompanyTierChangeRequestReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        tier_request.status = CompanyTierChangeRequest.Status.REJECTED
        tier_request.reviewed_by = request.user
        tier_request.admin_note = serializer.validated_data["admin_note"].strip()
        tier_request.reviewed_at = timezone.now()
        tier_request.save(update_fields=["status", "reviewed_by", "admin_note", "reviewed_at", "updated_at"])
        refreshed = get_tier_request_queryset().get(pk=tier_request.id)
        return Response({"message": "Tier request rejected.", "request": CompanyTierChangeRequestSerializer(refreshed).data})


class AdminPlacementOverrideListCreateView(APIView):
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        overrides = PlacementOverride.objects.all().order_by("-priority", "starts_at", "id")
        return Response(PlacementOverrideSerializer(overrides, many=True).data)

    def post(self, request):
        serializer = PlacementOverrideSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        override = serializer.save()
        return Response(PlacementOverrideSerializer(override).data, status=status.HTTP_201_CREATED)


class AdminPlacementOverrideDetailView(APIView):
    permission_classes = [IsSuperAdmin]

    def patch(self, request, override_id: int):
        override = get_object_or_404(PlacementOverride, pk=override_id)
        serializer = PlacementOverrideSerializer(override, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        updated_override = serializer.save()
        return Response(PlacementOverrideSerializer(updated_override).data)


class AdminCompanyTierToggleView(APIView):
    permission_classes = [IsSuperAdmin]

    def post(self, request, tier_id: int, action: str):
        tier = get_object_or_404(CompanyTier, pk=tier_id)
        if action not in {"activate", "deactivate"}:
            return Response({"detail": "Unsupported tier action."}, status=status.HTTP_400_BAD_REQUEST)
        tier.is_active = action == "activate"
        tier.save(update_fields=["is_active"])
        return Response(CompanyTierSerializer(tier).data)


class AdminCompanyTierAssignmentView(APIView):
    permission_classes = [IsSuperAdmin]

    def patch(self, request, company_id: int):
        company = get_object_or_404(Company.objects.select_related("tier_ref").prefetch_related("products"), pk=company_id)
        serializer = CompanyTierAssignmentSerializer(data=request.data, context={"company": company})
        serializer.is_valid(raise_exception=True)
        next_tier: CompanyTier = serializer.validated_data["tier"]

        downgrade_warning = build_downgrade_warning(company, next_tier)
        if downgrade_warning is not None:
            return Response(
                {
                    "detail": "Tier downgrade requires explicit active product selection before it can be completed.",
                    "tier_id": next_tier.id,
                    "allowed_active_products": downgrade_warning.allowed_active_products,
                    "active_product_ids": downgrade_warning.active_product_ids,
                    "overflow_product_ids": downgrade_warning.overflow_product_ids,
                },
                status=status.HTTP_409_CONFLICT,
            )

        company.tier_ref = next_tier
        company.save(update_fields=["tier_ref"])
        return Response(CompanySerializer(company).data)


class AdminCompanyTierAssignmentConfirmView(APIView):
    permission_classes = [IsSuperAdmin]

    def post(self, request, company_id: int):
        company = get_object_or_404(Company.objects.select_related("tier_ref").prefetch_related("products"), pk=company_id)
        serializer = CompanyTierAssignmentConfirmSerializer(data=request.data, context={"company": company})
        serializer.is_valid(raise_exception=True)

        next_tier: CompanyTier = serializer.validated_data["tier"]
        retain_active_product_ids = serializer.validated_data["retain_active_product_ids"]
        try:
            apply_tier_change_with_selected_products(company, next_tier, retain_active_product_ids)
        except TierValidationError as exc:
            return Response({"retain_active_product_ids": [str(exc)]}, status=status.HTTP_400_BAD_REQUEST)
        company.refresh_from_db()
        return Response(CompanySerializer(company).data)


class AdminCompanyMarketVisibilityView(APIView):
    permission_classes = [IsSuperAdmin]

    def patch(self, request, company_id: int):
        company = get_object_or_404(Company.objects.select_related("tier_ref"), pk=company_id)
        serializer = CompanyMarketVisibilitySerializer(company, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        updated_company = serializer.save()
        return Response(CompanySerializer(updated_company).data)


class AdminMarketPreviewView(APIView):
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        try:
            hero_days = int(request.query_params.get("hero_days", "0"))
        except ValueError:
            return Response({"hero_days": ["Hero days must be a whole number."]}, status=status.HTTP_400_BAD_REQUEST)
        if hero_days < 0 or hero_days > 14:
            return Response({"hero_days": ["Hero days must be between 0 and 14."]}, status=status.HTTP_400_BAD_REQUEST)

        payload = build_market_preview_payload(get_public_company_queryset(), hero_days=hero_days)
        return Response(MarketPreviewSerializer(payload).data)


class AdminMarketReportSummaryView(APIView):
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        try:
            days = int(request.query_params.get("days", "7"))
        except ValueError:
            return Response({"days": ["Days must be a whole number."]}, status=status.HTTP_400_BAD_REQUEST)
        if days <= 0 or days > 90:
            return Response({"days": ["Days must be between 1 and 90."]}, status=status.HTTP_400_BAD_REQUEST)
        payload = build_market_report_summary(days=days)
        return Response(MarketReportSummarySerializer(payload).data)


class AdminMarketUnderServedReportView(APIView):
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        try:
            days = int(request.query_params.get("days", "7"))
        except ValueError:
            return Response({"days": ["Days must be a whole number."]}, status=status.HTTP_400_BAD_REQUEST)
        if days <= 0 or days > 90:
            return Response({"days": ["Days must be between 1 and 90."]}, status=status.HTTP_400_BAD_REQUEST)
        payload = build_under_served_report(get_public_company_queryset(), days=days)
        return Response(MarketUnderServedReportSerializer(payload).data)
