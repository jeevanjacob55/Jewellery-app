from __future__ import annotations

import mimetypes
from pathlib import Path

from django.conf import settings
from rest_framework.exceptions import ValidationError

from apps.media_platform.models import MediaAsset
from apps.media_platform.providers.base import StorageProvider
from apps.media_platform.providers.gcs import GCSStorageProvider
from apps.media_platform.providers.local import LocalStorageProvider
from apps.media_platform.providers.mock import MockStorageProvider, build_mock_public_url
from apps.media_platform.types import UploadSession


_PROVIDER_CACHE: dict[str, StorageProvider] = {}


def get_storage_provider() -> StorageProvider:
    provider_name = getattr(settings, "MEDIA_STORAGE_PROVIDER", "mock").strip().lower() or "mock"
    if provider_name not in _PROVIDER_CACHE:
        if provider_name == "gcs":
            _PROVIDER_CACHE[provider_name] = GCSStorageProvider()
        elif provider_name == "local":
            _PROVIDER_CACHE[provider_name] = LocalStorageProvider()
        else:
            _PROVIDER_CACHE[provider_name] = MockStorageProvider()
    return _PROVIDER_CACHE[provider_name]


def create_upload_session(*, prefix: str, owner_id: int | str, filename: str, visibility: str) -> UploadSession:
    return get_storage_provider().create_upload_session(prefix=prefix, owner_id=owner_id, filename=filename, visibility=visibility)


def ensure_upload_prefix(*, object_key: str, expected_prefix: str, error_message: str) -> None:
    if not object_key.startswith(expected_prefix):
        raise ValidationError({"object_key": [error_message]})


def finalize_media_asset(
    *,
    payload: dict,
    request,
    uploader,
    expected_prefix: str,
    expected_prefix_error: str,
    visibility: str,
    moderation_status: str,
) -> MediaAsset:
    ensure_upload_prefix(
        object_key=payload["object_key"],
        expected_prefix=expected_prefix,
        error_message=expected_prefix_error,
    )

    provider = get_storage_provider()
    uploaded = provider.get_uploaded_object(object_key=payload["object_key"], bucket_name=payload["bucket_name"])
    if uploaded is None:
        raise ValidationError({"object_key": ["Uploaded object not found in configured storage."]})
    if uploaded.content_type != payload["mime_type"]:
        raise ValidationError({"mime_type": ["Uploaded file metadata did not match the finalize payload."]})
    if uploaded.size != payload["file_size"]:
        raise ValidationError({"file_size": ["Uploaded file size did not match the finalize payload."]})

    public_url = ""
    if visibility == MediaAsset.Visibility.PUBLIC:
        public_url = resolve_public_media_url(
            payload["object_key"],
            payload.get("public_url"),
            request=request,
            bucket_name=payload["bucket_name"],
        ) or ""

    media_asset, created = MediaAsset.objects.get_or_create(
        object_key=payload["object_key"],
        defaults={
            "uploader": uploader,
            "bucket_name": payload["bucket_name"],
            "original_filename": payload["original_filename"],
            "mime_type": payload["mime_type"],
            "public_url": public_url,
            "width": payload["width"],
            "height": payload["height"],
            "file_size": payload["file_size"],
            "visibility": visibility,
            "moderation_status": moderation_status,
        },
    )

    if not created:
        media_asset.uploader = uploader
        media_asset.bucket_name = payload["bucket_name"]
        media_asset.original_filename = payload["original_filename"]
        media_asset.mime_type = payload["mime_type"]
        media_asset.public_url = public_url
        media_asset.width = payload["width"]
        media_asset.height = payload["height"]
        media_asset.file_size = payload["file_size"]
        media_asset.visibility = visibility
        media_asset.moderation_status = moderation_status
        media_asset.save(
            update_fields=[
                "uploader",
                "bucket_name",
                "original_filename",
                "mime_type",
                "public_url",
                "width",
                "height",
                "file_size",
                "visibility",
                "moderation_status",
            ]
        )

    return media_asset


def resolve_public_media_url(object_key: str, public_url: str | None, request=None, bucket_name: str | None = None) -> str | None:
    return get_storage_provider().resolve_public_url(
        object_key=object_key,
        public_url=public_url,
        bucket_name=bucket_name,
        request=request,
    )


def resolve_media_asset_url(asset: MediaAsset | None, request=None) -> str | None:
    if asset is None:
        return None
    return resolve_public_media_url(asset.object_key, asset.public_url, request=request, bucket_name=asset.bucket_name)


def build_media_asset_response(asset: MediaAsset, request=None) -> dict[str, str | int | None]:
    return {
        "asset_id": asset.id,
        "object_key": asset.object_key,
        "public_url": resolve_media_asset_url(asset, request=request),
        "original_filename": asset.original_filename,
    }


def create_legacy_news_asset(*, news_id: int, image_field, uploader=None) -> MediaAsset | None:
    if not image_field:
        return None

    object_key = getattr(image_field, "name", "").strip()
    if not object_key:
        return None

    original_filename = Path(object_key).name
    mime_type, _ = mimetypes.guess_type(original_filename)
    try:
        file_size = int(image_field.size or 0)
    except Exception:
        file_size = 0

    public_url = ""
    try:
        public_url = image_field.url
    except Exception:
        public_url = build_mock_public_url(object_key)

    media_asset, _ = MediaAsset.objects.get_or_create(
        object_key=object_key,
        defaults={
            "uploader": uploader,
            "bucket_name": "legacy-local-media",
            "original_filename": original_filename,
            "mime_type": mime_type or "application/octet-stream",
            "public_url": public_url,
            "width": 0,
            "height": 0,
            "file_size": file_size,
            "visibility": MediaAsset.Visibility.PUBLIC,
            "moderation_status": MediaAsset.ModerationStatus.APPROVED,
        },
    )
    return media_asset
