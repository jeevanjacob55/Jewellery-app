from __future__ import annotations

from urllib.parse import quote

from django.conf import settings

from apps.media_platform.paths import normalize_object_key


def resolve_bucket_name(visibility: str) -> str:
    if visibility == "private":
        return (
            getattr(settings, "MEDIA_PRIVATE_BUCKET_NAME", "")
            or getattr(settings, "GCS_PRIVATE_BUCKET_NAME", "")
            or "replace-with-private-media-bucket"
        )
    return (
        getattr(settings, "MEDIA_PUBLIC_BUCKET_NAME", "")
        or getattr(settings, "GCS_BUCKET_NAME", "")
        or "replace-with-public-media-bucket"
    )


def build_public_asset_url(object_key: str) -> str | None:
    base_url = (getattr(settings, "MEDIA_PUBLIC_BASE_URL", "") or "").strip().rstrip("/")
    if not base_url:
        return None
    normalized_object_key = quote(normalize_object_key(object_key), safe="/")
    return f"{base_url}/{normalized_object_key}"
