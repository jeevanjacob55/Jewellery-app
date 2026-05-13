from __future__ import annotations

from django.urls import reverse
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.admin_ops.permissions import HasAdminAccess

from .access_serializers import (
    AccessRequestDecisionSerializer,
    ActivationTokenCompleteSerializer,
    ActivationTokenStatusSerializer,
    AssociationAdminAccessRequestCreateSerializer,
    AssociationAdminAccessRequestSerializer,
    CompanyAdminAccessRequestCreateSerializer,
    CompanyAdminAccessRequestSerializer,
    build_activation_payload,
)
from .access_services import (
    activate_account,
    approve_association_admin_access_request,
    approve_company_admin_access_request,
    get_activation_token,
    get_association_admin_access_requests_for_user,
    get_company_admin_access_requests_for_user,
    reject_association_admin_access_request,
    reject_company_admin_access_request,
)
from .models import AssociationAdminAccessRequest, CompanyAdminAccessRequest


def _build_activation_response(request, token) -> dict:
    activation_path = reverse("access_activation", kwargs={"token": str(token.token)})
    return {
        "activation_token": str(token.token),
        "activation_api_path": activation_path,
        "activation_url": request.build_absolute_uri(activation_path),
        "expires_at": token.expires_at,
    }


class CompanyAdminAccessRequestSubmitView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = CompanyAdminAccessRequestCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        access_request = serializer.save()
        return Response(
            {
                "message": "Company admin access request submitted for review.",
                "request": CompanyAdminAccessRequestSerializer(access_request).data,
            },
            status=status.HTTP_201_CREATED,
        )


class AssociationAdminAccessRequestSubmitView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = AssociationAdminAccessRequestCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        access_request = serializer.save()
        return Response(
            {
                "message": "Association admin access request submitted for review.",
                "request": AssociationAdminAccessRequestSerializer(access_request).data,
            },
            status=status.HTTP_201_CREATED,
        )


class CompanyAdminAccessRequestListView(APIView):
    permission_classes = [permissions.IsAuthenticated, HasAdminAccess]

    def get(self, request):
        queryset = get_company_admin_access_requests_for_user(request.user).filter(status=CompanyAdminAccessRequest.Status.PENDING)
        return Response({"results": CompanyAdminAccessRequestSerializer(queryset, many=True).data})


class CompanyAdminAccessRequestApproveView(APIView):
    permission_classes = [permissions.IsAuthenticated, HasAdminAccess]

    def post(self, request, request_id: int):
        access_request, result = approve_company_admin_access_request(reviewer=request.user, request_id=request_id)
        if result is None:
            return Response(
                {
                    "message": "Company admin access request was auto-rejected for manual review.",
                    "request": CompanyAdminAccessRequestSerializer(access_request).data,
                }
            )
        return Response(
            {
                "message": "Company admin access request approved.",
                "request": CompanyAdminAccessRequestSerializer(access_request).data,
                "activation": _build_activation_response(request, result.activation_token),
            }
        )


class CompanyAdminAccessRequestRejectView(APIView):
    permission_classes = [permissions.IsAuthenticated, HasAdminAccess]

    def post(self, request, request_id: int):
        serializer = AccessRequestDecisionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        access_request, _ = reject_company_admin_access_request(
            reviewer=request.user,
            request_id=request_id,
            rejection_reason=serializer.validated_data.get("rejection_reason", ""),
        )
        return Response(
            {
                "message": "Company admin access request rejected.",
                "request": CompanyAdminAccessRequestSerializer(access_request).data,
            }
        )


class AssociationAdminAccessRequestListView(APIView):
    permission_classes = [permissions.IsAuthenticated, HasAdminAccess]

    def get(self, request):
        queryset = get_association_admin_access_requests_for_user(request.user).filter(
            status=AssociationAdminAccessRequest.Status.PENDING
        )
        return Response({"results": AssociationAdminAccessRequestSerializer(queryset, many=True).data})


class AssociationAdminAccessRequestApproveView(APIView):
    permission_classes = [permissions.IsAuthenticated, HasAdminAccess]

    def post(self, request, request_id: int):
        access_request, result = approve_association_admin_access_request(reviewer=request.user, request_id=request_id)
        return Response(
            {
                "message": "Association admin access request approved.",
                "request": AssociationAdminAccessRequestSerializer(access_request).data,
                "activation": _build_activation_response(request, result.activation_token),
            }
        )


class AssociationAdminAccessRequestRejectView(APIView):
    permission_classes = [permissions.IsAuthenticated, HasAdminAccess]

    def post(self, request, request_id: int):
        serializer = AccessRequestDecisionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        access_request, _ = reject_association_admin_access_request(
            reviewer=request.user,
            request_id=request_id,
            rejection_reason=serializer.validated_data.get("rejection_reason", ""),
        )
        return Response(
            {
                "message": "Association admin access request rejected.",
                "request": AssociationAdminAccessRequestSerializer(access_request).data,
            }
        )


class AccountActivationView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def get(self, request, token):
        activation_token = get_activation_token(token)
        if activation_token is None:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(ActivationTokenStatusSerializer(build_activation_payload(activation_token)).data)

    def post(self, request, token):
        serializer = ActivationTokenCompleteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        activation_token = activate_account(token=token, password=serializer.validated_data["password"])
        return Response(
            {
                "message": "Account activation completed.",
                "activation": ActivationTokenStatusSerializer(build_activation_payload(activation_token)).data,
            }
        )
