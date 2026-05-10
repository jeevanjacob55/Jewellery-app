from dataclasses import dataclass
from pathlib import Path
from threading import Lock
from urllib.parse import quote, urlsplit
from uuid import uuid4

from django.conf import settings
from django.http import HttpResponse
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
_MOCK_STORAGE_HOST = "mock-storage.local"


def build_object_key(prefix: str, owner_id: int | str, filename: str) -> str:
    safe_name = filename.replace(" ", "-").lower()
    return f"{prefix}/{owner_id}/{uuid4()}-{safe_name}"


def _normalize_object_key(object_key: str) -> str:
    return "/".join(part for part in object_key.replace("\\", "/").split("/") if part and part not in {".", ".."})


def build_mock_public_url(object_key: str, request=None) -> str:
    relative_path = f"/api/mock-uploads/?object_key={quote(_normalize_object_key(object_key), safe='')}"
    if request is None:
        return relative_path
    return request.build_absolute_uri(relative_path)


def resolve_public_media_url(object_key: str, public_url: str | None, request=None) -> str | None:
    normalized_public_url = (public_url or "").strip()
    if normalized_public_url:
        parsed = urlsplit(normalized_public_url)
        if parsed.hostname != _MOCK_STORAGE_HOST:
            return normalized_public_url
    if not object_key:
        return normalized_public_url or None
    return build_mock_public_url(object_key, request=request)


def _get_mock_upload_path(object_key: str) -> Path:
    return Path(settings.MEDIA_ROOT) / "mock-uploads" / Path(_normalize_object_key(object_key))


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


def register_mock_upload(object_key: str, content_type: str, content: bytes) -> None:
    upload_path = _get_mock_upload_path(object_key)
    upload_path.parent.mkdir(parents=True, exist_ok=True)
    upload_path.write_bytes(content)
    with _MOCK_UPLOADS_LOCK:
        _MOCK_UPLOADS[object_key] = MockUploadedObject(object_key=object_key, content_type=content_type, size=len(content))


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
        register_mock_upload(object_key=object_key, content_type=content_type, content=request.body)
        return Response(status=status.HTTP_204_NO_CONTENT)

    def get(self, request):
        object_key = request.query_params.get("object_key")
        if not object_key:
            return Response({"object_key": ["This query parameter is required."]}, status=status.HTTP_400_BAD_REQUEST)

        upload_path = _get_mock_upload_path(object_key)
        if not upload_path.exists():
            return Response(status=status.HTTP_404_NOT_FOUND)

        mock_upload = get_mock_upload(object_key)
        content_type = mock_upload.content_type if mock_upload is not None else "application/octet-stream"
        return HttpResponse(upload_path.read_bytes(), content_type=content_type)
