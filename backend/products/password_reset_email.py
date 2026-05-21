"""
Письмо со ссылкой для восстановления пароля.
"""

import logging
import ssl

from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import EmailMessage, get_connection
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode

logger = logging.getLogger(__name__)


def build_password_reset_url(user) -> str:
    """Ссылка на страницу сброса пароля (uid + token в query)."""
    base = getattr(
        settings,
        "FRONTEND_PASSWORD_RESET_URL",
        f"{getattr(settings, 'FRONTEND_URL', 'http://localhost:3000').rstrip('/')}/reset-password",
    ).rstrip("/")
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
    return f"{base}?uid={uid}&token={token}"


def _get_mail_connection():
    timeout = int(getattr(settings, "EMAIL_TIMEOUT", 30))
    return get_connection(
        backend=settings.EMAIL_BACKEND,
        host=settings.EMAIL_HOST,
        port=settings.EMAIL_PORT,
        username=settings.EMAIL_HOST_USER,
        password=settings.EMAIL_HOST_PASSWORD,
        use_tls=settings.EMAIL_USE_TLS,
        use_ssl=settings.EMAIL_USE_SSL,
        timeout=timeout,
        fail_silently=False,
    )


def send_password_reset_email(user) -> None:
    """Отправляет пользователю ссылку для установки нового пароля."""
    recipient = (user.email or "").strip()
    if not recipient:
        raise ValueError("У пользователя не указан email.")

    site_name = getattr(settings, "SITE_NAME", "Kotelkov.by")
    reset_url = build_password_reset_url(user)
    login_url = getattr(
        settings,
        "FRONTEND_LOGIN_URL",
        f"{getattr(settings, 'FRONTEND_URL', 'http://localhost:3000').rstrip('/')}/login",
    )

    subject = f"Восстановление пароля — {site_name}"
    body = (
        f"Здравствуйте!\n\n"
        f"Вы запросили восстановление пароля для входа в личный кабинет на сайте {site_name}.\n\n"
        f"Перейдите по ссылке, чтобы задать новый пароль (ссылка действует ограниченное время):\n\n"
        f"{reset_url}\n\n"
        f"Если вы не запрашивали сброс пароля, просто проигнорируйте это письмо.\n\n"
        f"После смены пароля войдите на сайте: {login_url}\n\n"
        f"—\n"
        f"{site_name}"
    )

    connection = _get_mail_connection()
    message = EmailMessage(
        subject=subject,
        body=body,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[recipient],
        connection=connection,
    )
    message.encoding = "utf-8"

    try:
        sent = message.send(fail_silently=False)
    except ssl.SSLError:
        if settings.EMAIL_USE_SSL and settings.EMAIL_PORT == 465:
            logger.warning("SSL on 465 failed, retry with STARTTLS on 587")
            connection = get_connection(
                backend=settings.EMAIL_BACKEND,
                host=settings.EMAIL_HOST,
                port=587,
                username=settings.EMAIL_HOST_USER,
                password=settings.EMAIL_HOST_PASSWORD,
                use_tls=True,
                use_ssl=False,
                timeout=int(getattr(settings, "EMAIL_TIMEOUT", 30)),
                fail_silently=False,
            )
            message.connection = connection
            sent = message.send(fail_silently=False)
        else:
            raise

    if sent != 1:
        raise RuntimeError(f"SMTP вернул код отправки: {sent}")

    logger.info("Password reset email sent to %s (user id=%s)", recipient, user.pk)
