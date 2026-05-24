"""
Проверка Google ID token и вход/регистрация пользователя.
"""

import logging

from django.conf import settings
from django.contrib.auth import get_user_model
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token

logger = logging.getLogger(__name__)

User = get_user_model()


class GoogleAuthError(Exception):
    """Ошибка аутентификации через Google."""


def verify_google_id_token(token: str) -> dict:
    """Проверяет JWT от Google Identity Services и возвращает claims."""
    client_id = (getattr(settings, "GOOGLE_OAUTH_CLIENT_ID", None) or "").strip()
    if not client_id:
        raise GoogleAuthError("Google OAuth не настроен на сервере.")

    try:
        idinfo = id_token.verify_oauth2_token(
            token,
            google_requests.Request(),
            client_id,
        )
    except ValueError as exc:
        logger.warning("Invalid Google ID token: %s", exc)
        raise GoogleAuthError("Недействительный токен Google.") from exc

    if idinfo.get("iss") not in ("accounts.google.com", "https://accounts.google.com"):
        raise GoogleAuthError("Неверный издатель токена Google.")

    return idinfo


def authenticate_or_create_user_from_google(idinfo: dict) -> User:
    """
    Находит или создаёт пользователя по данным Google.
    Связывает существующий аккаунт с тем же email, если google_id ещё не задан.
    """
    google_id = str(idinfo.get("sub") or "").strip()
    email = (idinfo.get("email") or "").strip()
    email_verified = idinfo.get("email_verified") in (True, "true", "True", 1)

    if not google_id:
        raise GoogleAuthError("В ответе Google отсутствует идентификатор пользователя.")
    if not email:
        raise GoogleAuthError("Google не передал адрес электронной почты.")
    if not email_verified:
        raise GoogleAuthError("Email в Google не подтверждён.")

    first_name = (idinfo.get("given_name") or "").strip()
    last_name = (idinfo.get("family_name") or "").strip()
    if not first_name and not last_name:
        full_name = (idinfo.get("name") or "").strip()
        if full_name:
            parts = full_name.split(None, 1)
            first_name = parts[0]
            last_name = parts[1] if len(parts) > 1 else ""

    user = User.objects.filter(google_id=google_id).first()
    if user:
        return user

    user = User.objects.filter(email__iexact=email).first()
    if user:
        if user.google_id and user.google_id != google_id:
            raise GoogleAuthError(
                "Этот email уже привязан к другому аккаунту Google."
            )
        user.google_id = google_id
        update_fields = ["google_id"]
        if first_name and not (user.first_name or "").strip():
            user.first_name = first_name
            update_fields.append("first_name")
        if last_name and not (user.last_name or "").strip():
            user.last_name = last_name
            update_fields.append("last_name")
        user.save(update_fields=update_fields)
        return user

    return User.objects.create_user(
        email=email,
        password=None,
        google_id=google_id,
        first_name=first_name or "",
        last_name=last_name or "",
    )
