from dataclasses import dataclass


@dataclass
class UploadSession:
    object_key: str
    bucket_name: str
    visibility: str
    expires_in: int
    upload_url: str


@dataclass
class UploadedObjectInfo:
    object_key: str
    content_type: str
    size: int
