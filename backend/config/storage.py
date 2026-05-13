from apps.media_platform.paths import build_object_key
from apps.media_platform.providers.mock import build_mock_public_url
from apps.media_platform.service import create_upload_session, get_storage_provider, resolve_public_media_url
from apps.media_platform.types import UploadSession, UploadedObjectInfo as MockUploadedObject
from apps.media_platform.views import MediaUploadView as MockUploadView


def build_mock_signed_upload(prefix: str, owner_id: int | str, filename: str, visibility: str = "private") -> UploadSession:
    return create_upload_session(prefix=prefix, owner_id=owner_id, filename=filename, visibility=visibility)


def get_mock_upload(object_key: str) -> MockUploadedObject | None:
    return get_storage_provider().get_uploaded_object(object_key=object_key, bucket_name="")
