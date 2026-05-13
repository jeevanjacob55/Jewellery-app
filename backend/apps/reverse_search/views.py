from rest_framework import permissions, status
from rest_framework.exceptions import ValidationError
from rest_framework.generics import ListAPIView
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.media_platform.models import MediaAsset
from apps.media_platform.service import create_upload_session, finalize_media_asset

from .models import ReverseSearchAttachment, ReverseSearchRequest
from .serializers import (
    ReverseSearchFinalizeAttachmentSerializer,
    ReverseSearchRequestSerializer,
    ReverseSearchUploadSessionSerializer,
)


def _request_queryset():
    return ReverseSearchRequest.objects.prefetch_related("responses", "attachments__asset")


class ReverseSearchListCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        queryset = _request_queryset().filter(created_by=request.user)
        return Response(ReverseSearchRequestSerializer(queryset, many=True).data)

    def post(self, request):
        serializer = ReverseSearchRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save(created_by=request.user)
        return Response(ReverseSearchRequestSerializer(instance).data, status=status.HTTP_201_CREATED)


class ReverseSearchUploadSessionView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = ReverseSearchUploadSessionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        request_id = serializer.validated_data["request_id"]
        filename = serializer.validated_data["filename"]
        reverse_search_request = _request_queryset().filter(id=request_id, created_by=request.user).first()

        if reverse_search_request is None:
            return Response({"request_id": ["Reverse-search request not found."]}, status=status.HTTP_404_NOT_FOUND)
        if reverse_search_request.attachments.exists():
            return Response({"request_id": ["This request already has an attachment."]}, status=status.HTTP_400_BAD_REQUEST)

        session = create_upload_session(
            prefix=f"reverse-search/{reverse_search_request.id}/original",
            owner_id="upload",
            filename=filename,
            visibility="private",
        )
        return Response(session.__dict__)


class ReverseSearchFinalizeAttachmentView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = ReverseSearchFinalizeAttachmentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payload = serializer.validated_data
        reverse_search_request = _request_queryset().filter(id=payload["request_id"], created_by=request.user).first()

        if reverse_search_request is None:
            return Response({"request_id": ["Reverse-search request not found."]}, status=status.HTTP_404_NOT_FOUND)
        if reverse_search_request.attachments.exists():
            return Response({"request_id": ["This request already has an attachment."]}, status=status.HTTP_400_BAD_REQUEST)

        try:
            media_asset = finalize_media_asset(
                payload=payload,
                request=request,
                uploader=request.user,
                expected_prefix=f"reverse-search/{reverse_search_request.id}/original/",
                expected_prefix_error="Object key does not match the request upload path.",
                visibility=MediaAsset.Visibility.PRIVATE,
                moderation_status=MediaAsset.ModerationStatus.PENDING,
            )
        except ValidationError as exc:
            return Response(exc.detail, status=status.HTTP_400_BAD_REQUEST)
        if hasattr(media_asset, "reverse_search_attachment"):
            return Response({"object_key": ["This uploaded object is already attached to a request."]}, status=status.HTTP_400_BAD_REQUEST)

        ReverseSearchAttachment.objects.create(request=reverse_search_request, asset=media_asset)
        refreshed_request = _request_queryset().get(id=reverse_search_request.id)
        return Response(ReverseSearchRequestSerializer(refreshed_request).data, status=status.HTTP_201_CREATED)


class ReverseSearchStatusListView(ListAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ReverseSearchRequestSerializer

    def get_queryset(self):
        return _request_queryset().filter(created_by=self.request.user)
