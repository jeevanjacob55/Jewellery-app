from __future__ import annotations

from abc import ABC, abstractmethod

from apps.media_platform.types import UploadSession, UploadedObjectInfo


class StorageProvider(ABC):
    @abstractmethod
    def create_upload_session(self, *, prefix: str, owner_id: int | str, filename: str, visibility: str) -> UploadSession:
        raise NotImplementedError

    @abstractmethod
    def get_uploaded_object(self, *, object_key: str, bucket_name: str) -> UploadedObjectInfo | None:
        raise NotImplementedError

    @abstractmethod
    def resolve_public_url(
        self,
        *,
        object_key: str,
        public_url: str | None,
        bucket_name: str | None,
        request=None,
    ) -> str | None:
        raise NotImplementedError

    def store_upload(self, *, object_key: str, content_type: str, content: bytes) -> None:
        raise NotImplementedError("Direct upload handling is not supported by this provider.")

    def read_upload(self, *, object_key: str) -> tuple[bytes, str] | None:
        raise NotImplementedError("Direct upload handling is not supported by this provider.")
