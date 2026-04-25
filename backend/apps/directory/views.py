from rest_framework import permissions, status
from rest_framework.generics import ListAPIView, RetrieveAPIView
from rest_framework.response import Response
from rest_framework.views import APIView

from config.storage import build_mock_signed_upload

from .models import Company, Enquiry
from .serializers import CompanySerializer, EnquirySerializer


class CompanyListView(ListAPIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    queryset = Company.objects.prefetch_related("products", "verification").all().order_by("tier", "name")
    serializer_class = CompanySerializer


class CompanyDetailView(RetrieveAPIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    queryset = Company.objects.prefetch_related("products", "verification").all()
    serializer_class = CompanySerializer


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
