from __future__ import annotations

import logging

from django.conf import settings


logger = logging.getLogger(__name__)


class GoogleAuthError(Exception):
    pass


def get_configured_google_client_ids() -> list[str]:
    raw_value = getattr(settings, "GOOGLE_OAUTH_CLIENT_IDS", "") or ""
    return [value.strip() for value in raw_value.split(",") if value.strip()]


def verify_google_id_token(raw_id_token: str) -> dict:
    if not raw_id_token or not raw_id_token.strip():
        raise GoogleAuthError("Google ID token is required.")

    client_ids = get_configured_google_client_ids()
    if not client_ids:
        raise GoogleAuthError("Google sign-in is not configured for this environment.")

    try:
        from google.auth.transport import requests as google_requests
        from google.oauth2 import id_token as google_id_token
    except ImportError as exc:
        raise GoogleAuthError("Google authentication support is not installed on the backend.") from exc

    verification_request = google_requests.Request()
    last_error: Exception | None = None
    token_payload: dict | None = None
    for audience in client_ids:
        try:
            token_payload = google_id_token.verify_oauth2_token(raw_id_token, verification_request, audience)
            break
        except Exception as exc:  # pragma: no cover - library exceptions vary
            last_error = exc

    if token_payload is None:
        logger.warning("Google token verification failed: %s", last_error)
        raise GoogleAuthError("Invalid Google token.")

    issuer = token_payload.get("iss")
    if issuer not in {"accounts.google.com", "https://accounts.google.com"}:
        raise GoogleAuthError("Invalid Google token issuer.")
    if not token_payload.get("email_verified"):
        raise GoogleAuthError("Google account email must be verified before sign-in.")
    if not token_payload.get("email"):
        raise GoogleAuthError("Google token did not include an email address.")

    return token_payload
