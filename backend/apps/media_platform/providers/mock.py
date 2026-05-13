from __future__ import annotations

from pathlib import Path
from threading import Lock
from urllib.parse import quote, urlsplit

from django.conf import settings

from apps.media_platform.paths import build_object_key, normalize_object_key
from apps.media_platform.providers.base import StorageProvider
from apps.media_platform.providers.config import resolve_bucket_name
from apps.media_platform.types import UploadSession, UploadedObjectInfo


MOCK_STORAGE_HOST = "mock-storage.local"
MEDIA_UPLOAD_PATH = "/api/media/uploads/"

_MOCK_UPLOADS: dict[str, UploadedObjectInfo] = {}
_MOCK_UPLOADS_LOCK = Lock()


def build_mock_public_url(object_key: str, request=None) -> str:
    relative_path = f"{MEDIA_UPLOAD_PATH}?object_key={quote(normalize_object_key(object_key), safe='')}"
    if request is None:
        return relative_path
    return request.build_absolute_uri(relative_path)


class MockStorageProvider(StorageProvider):
    def _resolve_bucket_name(self, visibility: str) -> str:
        return resolve_bucket_name(visibility)

    def _get_upload_path(self, object_key: str) -> Path:
        return Path(settings.MEDIA_ROOT) / "mock-uploads" / Path(normalize_object_key(object_key))

    def create_upload_session(self, *, prefix: str, owner_id: int | str, filename: str, visibility: str) -> UploadSession:
        object_key = build_object_key(prefix, owner_id, filename)
        return UploadSession(
            object_key=object_key,
            bucket_name=self._resolve_bucket_name(visibility),
            visibility=visibility,
            expires_in=settings.MEDIA_SIGNED_URL_TTL,
            upload_url=f"{MEDIA_UPLOAD_PATH}?object_key={quote(object_key, safe='')}",
        )

    def get_uploaded_object(self, *, object_key: str, bucket_name: str) -> UploadedObjectInfo | None:
        normalized_object_key = normalize_object_key(object_key)
        with _MOCK_UPLOADS_LOCK:
            uploaded = _MOCK_UPLOADS.get(normalized_object_key)
        if uploaded is not None:
            return uploaded
        upload_path = self._get_upload_path(normalized_object_key)
        if not upload_path.exists():
            return None
        return UploadedObjectInfo(
            object_key=normalized_object_key,
            content_type="application/octet-stream",
            size=upload_path.stat().st_size,
        )

    def resolve_public_url(
        self,
        *,
        object_key: str,
        public_url: str | None,
        bucket_name: str | None,
        request=None,
    ) -> str | None:
        normalized_public_url = (public_url or "").strip()
        if normalized_public_url:
            parsed = urlsplit(normalized_public_url)
            if parsed.hostname != MOCK_STORAGE_HOST:
                if normalized_public_url.startswith("/") and request is not None:
                    return request.build_absolute_uri(normalized_public_url)
                return normalized_public_url
        if not object_key:
            return normalized_public_url or None
        return build_mock_public_url(object_key, request=request)

    def store_upload(self, *, object_key: str, content_type: str, content: bytes) -> None:
        normalized_object_key = normalize_object_key(object_key)
        upload_path = self._get_upload_path(normalized_object_key)
        upload_path.parent.mkdir(parents=True, exist_ok=True)
        upload_path.write_bytes(content)
        with _MOCK_UPLOADS_LOCK:
            _MOCK_UPLOADS[normalized_object_key] = UploadedObjectInfo(
                object_key=normalized_object_key,
                content_type=content_type,
                size=len(content),
            )

    def read_upload(self, *, object_key: str) -> tuple[bytes, str] | None:
        normalized_object_key = normalize_object_key(object_key)
        upload_path = self._get_upload_path(normalized_object_key)
        if not upload_path.exists():
            return None
        uploaded = self.get_uploaded_object(object_key=normalized_object_key, bucket_name="")
        content_type = uploaded.content_type if uploaded is not None else "application/octet-stream"
        return upload_path.read_bytes(), content_type
