from __future__ import annotations

from django.db.models import Count, Prefetch, Q
from django.shortcuts import get_object_or_404
from rest_framework import permissions, status
from rest_framework.generics import ListAPIView, RetrieveAPIView
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.admin_ops.permissions import IsSuperAdmin

from config.storage import build_mock_signed_upload

from .models import Company, CompanyImage, CompanyTier, Enquiry, MediaAsset, Product, ProductCategory, ProductImage
from .serializers import (
    CompanySerializer,
    CompanyTierAssignmentConfirmSerializer,
    CompanyTierAssignmentSerializer,
    CompanyTierSerializer,
    CompanyTierWriteSerializer,
    EnquirySerializer,
    MarketFeedSerializer,
    ProductImageAttachSerializer,
    ProductImageUploadSessionSerializer,
    ProductSerializer,
    ProductWriteSerializer,
)
from .services import TierValidationError, apply_tier_change_with_selected_products, build_downgrade_warning, user_can_manage_company


def get_public_company_queryset():
    active_product_queryset = Product.objects.filter(is_active=True).select_related("category").prefetch_related(
        Prefetch("images", queryset=ProductImage.objects.select_related("asset").order_by("id"))
    )
    return Company.objects.filter(is_active=True, is_approved=True).select_related("verification", "tier_ref").prefetch_related(
        Prefetch("products", queryset=active_product_queryset),
        Prefetch("images", queryset=CompanyImage.objects.select_related("asset").order_by("is_logo", "id")),
    )


def build_market_feed_payload() -> dict:
    company_queryset = get_public_company_queryset()
    product_queryset = Product.objects.filter(
        is_active=True,
        company__is_active=True,
        company__is_approved=True,
    ).select_related("company", "category", "company__tier_ref").prefetch_related(
        Prefetch("images", queryset=ProductImage.objects.select_related("asset").order_by("id")),
    )

    company_ordering = ["tier_ref__display_priority", "-admin_priority", "-created_at", "name"]
    featured_companies = company_queryset.filter(tier_ref__visibility_type=CompanyTier.VisibilityType.FEATURED).order_by(*company_ordering)
    pro_companies = company_queryset.filter(tier_ref__visibility_type=CompanyTier.VisibilityType.PRO).order_by(*company_ordering)
    normal_companies = company_queryset.filter(tier_ref__visibility_type=CompanyTier.VisibilityType.NORMAL).order_by(*company_ordering)
    categories = (
        ProductCategory.objects.annotate(
            product_count=Count(
                "products",
                filter=Q(products__is_active=True, products__company__is_active=True, products__company__is_approved=True),
            )
        )
        .filter(product_count__gt=0)
        .order_by("name")
    )
    latest_products = product_queryset.order_by("-created_at", "-id")[:6]

    return {
        "featured_companies": featured_companies,
        "pro_companies": pro_companies,
        "normal_companies": normal_companies,
        "categories": categories,
        "latest_products": latest_products,
    }


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


class EnquiryCreateView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = EnquirySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        enquiry = serializer.save()
        return Response(EnquirySerializer(enquiry).data, status=status.HTTP_201_CREATED)


class CompanyImageUploadSessionView(APIView):
    def post(self, request, company_id: int):
        filename = request.data.get("filename", "company-image.jpg")
        session = build_mock_signed_upload("companies/gallery", company_id, filename, visibility="public")
        return Response(session.__dict__)


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


class AdminCompanyTierDetailView(APIView):
    permission_classes = [IsSuperAdmin]

    def patch(self, request, tier_id: int):
        tier = get_object_or_404(CompanyTier, pk=tier_id)
        serializer = CompanyTierWriteSerializer(tier, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        updated_tier = serializer.save()
        return Response(CompanyTierSerializer(updated_tier).data)


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
