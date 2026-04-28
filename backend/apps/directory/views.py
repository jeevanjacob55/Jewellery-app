from django.db.models import Count, Prefetch
from rest_framework import permissions, status
from rest_framework.generics import ListAPIView, RetrieveAPIView
from rest_framework.response import Response
from rest_framework.views import APIView

from config.storage import build_mock_signed_upload

from .models import Company, CompanyImage, Enquiry, Product, ProductCategory, ProductImage
from .serializers import CompanySerializer, EnquirySerializer, MarketFeedSerializer


def build_market_feed_payload() -> dict:
    company_image_queryset = CompanyImage.objects.select_related("asset").order_by("is_logo", "id")
    product_image_queryset = ProductImage.objects.select_related("asset").order_by("id")

    company_queryset = Company.objects.select_related("verification").prefetch_related(
        Prefetch("images", queryset=company_image_queryset),
    )
    product_queryset = Product.objects.select_related("company", "category").prefetch_related(
        Prefetch("images", queryset=product_image_queryset),
    )

    featured_partners = company_queryset.filter(tier=Company.Tier.PREMIUM).order_by("name")
    pro_companies = company_queryset.filter(tier=Company.Tier.PRO).order_by("name")
    normal_companies = company_queryset.filter(tier=Company.Tier.NORMAL).order_by("name")
    categories = ProductCategory.objects.annotate(product_count=Count("products")).filter(product_count__gt=0).order_by("name")
    latest_products = product_queryset.order_by("-id")[:6]

    return {
        "featured_partners": featured_partners,
        "pro_companies": pro_companies,
        "normal_companies": normal_companies,
        "categories": categories,
        "latest_products": latest_products,
    }


class CompanyListView(ListAPIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    queryset = Company.objects.prefetch_related(
        Prefetch("products", queryset=Product.objects.select_related("category").prefetch_related(Prefetch("images", queryset=ProductImage.objects.select_related("asset")))),
        Prefetch("images", queryset=CompanyImage.objects.select_related("asset")),
        "verification",
    ).all().order_by("tier", "name")
    serializer_class = CompanySerializer


class CompanyDetailView(RetrieveAPIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    queryset = Company.objects.prefetch_related(
        Prefetch("products", queryset=Product.objects.select_related("category").prefetch_related(Prefetch("images", queryset=ProductImage.objects.select_related("asset")))),
        Prefetch("images", queryset=CompanyImage.objects.select_related("asset")),
        "verification",
    ).all()
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
