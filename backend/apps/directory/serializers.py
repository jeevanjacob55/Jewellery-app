from rest_framework import serializers

from .models import Company, CompanyVerification, Enquiry, Product


class CompanyVerificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = CompanyVerification
        fields = ["gst_registered", "bis_hallmarked", "export_licensed"]


class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = ["id", "name", "weight_grams", "purity", "description"]


class CompanySerializer(serializers.ModelSerializer):
    verification = CompanyVerificationSerializer(read_only=True)
    products = ProductSerializer(many=True, read_only=True)

    class Meta:
        model = Company
        fields = [
            "id",
            "name",
            "category",
            "tier",
            "city",
            "state",
            "about",
            "daily_capacity",
            "specialization",
            "verification",
            "products",
        ]


class EnquirySerializer(serializers.ModelSerializer):
    class Meta:
        model = Enquiry
        fields = ["id", "company", "product", "requester_name", "requester_phone", "notes", "created_at"]
        read_only_fields = ["created_at"]
