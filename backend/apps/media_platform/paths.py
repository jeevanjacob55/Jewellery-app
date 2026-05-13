from __future__ import annotations

from uuid import uuid4


def normalize_object_key(object_key: str) -> str:
    return "/".join(part for part in object_key.replace("\\", "/").split("/") if part and part not in {".", ".."})


def build_object_key(prefix: str, owner_id: int | str, filename: str) -> str:
    safe_name = filename.replace(" ", "-").lower()
    return f"{normalize_object_key(prefix)}/{owner_id}/{uuid4()}-{safe_name}"
