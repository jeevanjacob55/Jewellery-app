from rest_framework import permissions, status
from rest_framework.generics import ListAPIView
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.directory.models import MediaAsset
from config.storage import build_mock_signed_upload, get_mock_upload

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

        session = build_mock_signed_upload(f"reverse-search/{reverse_search_request.id}/original", "upload", filename, visibility="private")
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

        expected_prefix = f"reverse-search/{reverse_search_request.id}/original/"
        if not payload["object_key"].startswith(expected_prefix):
            return Response({"object_key": ["Object key does not match the request upload path."]}, status=status.HTTP_400_BAD_REQUEST)

        mock_upload = get_mock_upload(payload["object_key"])
        if mock_upload is None:
            return Response({"object_key": ["Uploaded object not found in mock storage."]}, status=status.HTTP_400_BAD_REQUEST)
        if mock_upload.content_type != payload["mime_type"]:
            return Response({"mime_type": ["Uploaded file metadata did not match the finalize payload."]}, status=status.HTTP_400_BAD_REQUEST)
        if mock_upload.size != payload["file_size"]:
            return Response({"file_size": ["Uploaded file size did not match the finalize payload."]}, status=status.HTTP_400_BAD_REQUEST)

        media_asset, created = MediaAsset.objects.get_or_create(
            object_key=payload["object_key"],
            defaults={
                "uploader": request.user,
                "bucket_name": payload["bucket_name"],
                "original_filename": payload["original_filename"],
                "mime_type": payload["mime_type"],
                "width": payload["width"],
                "height": payload["height"],
                "file_size": payload["file_size"],
                "visibility": MediaAsset.Visibility.PRIVATE,
                "moderation_status": MediaAsset.ModerationStatus.PENDING,
            },
        )
        if not created and hasattr(media_asset, "reverse_search_attachment"):
            return Response({"object_key": ["This uploaded object is already attached to a request."]}, status=status.HTTP_400_BAD_REQUEST)

        if not created:
            media_asset.uploader = request.user
            media_asset.bucket_name = payload["bucket_name"]
            media_asset.original_filename = payload["original_filename"]
            media_asset.mime_type = payload["mime_type"]
            media_asset.width = payload["width"]
            media_asset.height = payload["height"]
            media_asset.file_size = payload["file_size"]
            media_asset.visibility = MediaAsset.Visibility.PRIVATE
            media_asset.moderation_status = MediaAsset.ModerationStatus.PENDING
            media_asset.save(
                update_fields=[
                    "uploader",
                    "bucket_name",
                    "original_filename",
                    "mime_type",
                    "width",
                    "height",
                    "file_size",
                    "visibility",
                    "moderation_status",
                ]
            )

        ReverseSearchAttachment.objects.create(request=reverse_search_request, asset=media_asset)
        refreshed_request = _request_queryset().get(id=reverse_search_request.id)
        return Response(ReverseSearchRequestSerializer(refreshed_request).data, status=status.HTTP_201_CREATED)


class ReverseSearchStatusListView(ListAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ReverseSearchRequestSerializer

    def get_queryset(self):
        return _request_queryset().filter(created_by=self.request.user)
