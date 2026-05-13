from __future__ import annotations

from functools import cached_property

import boto3
from botocore.client import Config
from botocore.exceptions import ClientError
from django.conf import settings

from apps.media_platform.paths import build_object_key, normalize_object_key
from apps.media_platform.providers.base import StorageProvider
from apps.media_platform.providers.config import build_public_asset_url, resolve_bucket_name
from apps.media_platform.providers.mock import MOCK_STORAGE_HOST
from apps.media_platform.types import UploadSession, UploadedObjectInfo


class R2StorageProvider(StorageProvider):
    @cached_property
    def client(self):
        endpoint_url = (getattr(settings, "R2_ENDPOINT_URL", "") or "").strip()
        if not endpoint_url:
            account_id = (getattr(settings, "R2_ACCOUNT_ID", "") or "").strip()
            if account_id:
                endpoint_url = f"https://{account_id}.r2.cloudflarestorage.com"

        return boto3.client(
            "s3",
            endpoint_url=endpoint_url or None,
            region_name=(getattr(settings, "R2_REGION", "") or "auto").strip() or "auto",
            aws_access_key_id=(getattr(settings, "R2_ACCESS_KEY_ID", "") or "").strip() or None,
            aws_secret_access_key=(getattr(settings, "R2_SECRET_ACCESS_KEY", "") or "").strip() or None,
            config=Config(signature_version="s3v4", s3={"addressing_style": "path"}),
        )

    def _resolve_bucket_name(self, visibility: str) -> str:
        return resolve_bucket_name(visibility)

    def create_upload_session(self, *, prefix: str, owner_id: int | str, filename: str, visibility: str) -> UploadSession:
        bucket_name = self._resolve_bucket_name(visibility)
        object_key = build_object_key(prefix, owner_id, filename)
        upload_url = self.client.generate_presigned_url(
            "put_object",
            Params={
                "Bucket": bucket_name,
                "Key": normalize_object_key(object_key),
            },
            ExpiresIn=settings.MEDIA_SIGNED_URL_TTL,
            HttpMethod="PUT",
        )
        return UploadSession(
            object_key=object_key,
            bucket_name=bucket_name,
            visibility=visibility,
            expires_in=settings.MEDIA_SIGNED_URL_TTL,
            upload_url=upload_url,
        )

    def get_uploaded_object(self, *, object_key: str, bucket_name: str) -> UploadedObjectInfo | None:
        try:
            response = self.client.head_object(Bucket=bucket_name, Key=normalize_object_key(object_key))
        except ClientError as exc:
            error_code = str(exc.response.get("Error", {}).get("Code", ""))
            if error_code in {"404", "NoSuchKey", "NotFound"}:
                return None
            raise
        return UploadedObjectInfo(
            object_key=normalize_object_key(object_key),
            content_type=response.get("ContentType") or "application/octet-stream",
            size=int(response.get("ContentLength") or 0),
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
        if not object_key:
            return normalized_public_url or None
        return build_public_asset_url(object_key) or normalized_public_url or None
