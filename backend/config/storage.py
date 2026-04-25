from dataclasses import dataclass
from uuid import uuid4

from django.conf import settings


@dataclass
class UploadSession:
    object_key: str
    bucket_name: str
    visibility: str
    expires_in: int
    upload_url: str


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
        upload_url=f"https://storage.googleapis.com/upload/{object_key}",
    )
