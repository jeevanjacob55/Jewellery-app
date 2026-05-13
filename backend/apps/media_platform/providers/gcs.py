from __future__ import annotations

import json
from datetime import timedelta
from functools import cached_property

from django.conf import settings
from google.cloud import storage
from google.oauth2 import service_account

from apps.media_platform.paths import build_object_key, normalize_object_key
from apps.media_platform.providers.base import StorageProvider
from apps.media_platform.providers.mock import MOCK_STORAGE_HOST
from apps.media_platform.types import UploadSession, UploadedObjectInfo


class GCSStorageProvider(StorageProvider):
    @cached_property
    def client(self) -> storage.Client:
        credentials_json = getattr(settings, "GCS_SERVICE_ACCOUNT_JSON", "").strip()
        if credentials_json:
            credentials_info = json.loads(credentials_json)
            credentials = service_account.Credentials.from_service_account_info(credentials_info)
            return storage.Client(project=credentials_info.get("project_id"), credentials=credentials)
        return storage.Client()

    def _resolve_bucket_name(self, visibility: str) -> str:
        bucket_name = settings.GCS_PRIVATE_BUCKET_NAME if visibility == "private" else settings.GCS_BUCKET_NAME
        return bucket_name or "replace-with-cloud-bucket"

    def create_upload_session(self, *, prefix: str, owner_id: int | str, filename: str, visibility: str) -> UploadSession:
        bucket_name = self._resolve_bucket_name(visibility)
        object_key = build_object_key(prefix, owner_id, filename)
        blob = self.client.bucket(bucket_name).blob(normalize_object_key(object_key))
        upload_url = blob.generate_signed_url(
            version="v4",
            expiration=timedelta(seconds=settings.MEDIA_SIGNED_URL_TTL),
            method="PUT",
        )
        return UploadSession(
            object_key=object_key,
            bucket_name=bucket_name,
            visibility=visibility,
            expires_in=settings.MEDIA_SIGNED_URL_TTL,
            upload_url=upload_url,
        )

    def get_uploaded_object(self, *, object_key: str, bucket_name: str) -> UploadedObjectInfo | None:
        blob = self.client.bucket(bucket_name).blob(normalize_object_key(object_key))
        if not blob.exists():
            return None
        blob.reload()
        return UploadedObjectInfo(
            object_key=normalize_object_key(object_key),
            content_type=blob.content_type or "application/octet-stream",
            size=int(blob.size or 0),
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
            parsed = normalized_public_url.lower()
            if MOCK_STORAGE_HOST not in parsed:
                return normalized_public_url
        if not object_key or not bucket_name:
            return normalized_public_url or None
        return self.client.bucket(bucket_name).blob(normalize_object_key(object_key)).public_url
