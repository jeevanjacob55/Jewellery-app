from dataclasses import dataclass
from threading import Lock
from urllib.parse import quote
from uuid import uuid4

from django.conf import settings
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView


@dataclass
class UploadSession:
    object_key: str
    bucket_name: str
    visibility: str
    expires_in: int
    upload_url: str


@dataclass
class MockUploadedObject:
    object_key: str
    content_type: str
    size: int


_MOCK_UPLOADS: dict[str, MockUploadedObject] = {}
_MOCK_UPLOADS_LOCK = Lock()


def build_object_key(prefix: str, owner_id: int | str, filename: str) -> str:
    safe_name = filename.replace(" ", "-").lower()
    return f"{prefix}/{owner_id}/{uuid4()}-{safe_name}"


def build_mock_signed_upload(prefix: str, owner_id: int | str, filename: str, visibility: str = "private") -> UploadSession:
    object_key = build_object_key(prefix, owner_id, filename)
    bucket_name = settings.GCS_PRIVATE_BUCKET_NAME if visibility == "private" else settings.GCS_BUCKET_NAME
    return UploadSession(
        object_key=object_key,
        bucket_name=bucket_name or "replace-with-cloud-bucket",
        visibility=visibility,
        expires_in=settings.MEDIA_SIGNED_URL_TTL,
        upload_url=f"/api/mock-uploads/?object_key={quote(object_key, safe='')}",
    )


def register_mock_upload(object_key: str, content_type: str, size: int) -> None:
    with _MOCK_UPLOADS_LOCK:
        _MOCK_UPLOADS[object_key] = MockUploadedObject(object_key=object_key, content_type=content_type, size=size)


def get_mock_upload(object_key: str) -> MockUploadedObject | None:
    with _MOCK_UPLOADS_LOCK:
        return _MOCK_UPLOADS.get(object_key)


class MockUploadView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def put(self, request):
        object_key = request.query_params.get("object_key")
        if not object_key:
            return Response({"object_key": ["This query parameter is required."]}, status=status.HTTP_400_BAD_REQUEST)

        content_type = request.headers.get("Content-Type", "application/octet-stream")
        register_mock_upload(object_key=object_key, content_type=content_type, size=len(request.body))
        return Response(status=status.HTTP_204_NO_CONTENT)
