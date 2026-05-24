"""
Отправка ответа администратора на вопрос пользователя по e-mail.
"""

import logging
import ssl

from django.conf import settings
from django.core.mail import EmailMessage, get_connection
from django.utils import timezone

logger = logging.getLogger(__name__)


def resolve_question_recipient(question) -> str:
    """E-mail получателя: из вопроса или из профиля пользователя."""
    email = (question.email or "").strip()
    if email:
        return email
    user = getattr(question, "user", None)
    if user and getattr(user, "email", None):
        return (user.email or "").strip()
    return ""


def send_user_question_answer_email(question) -> None:
    """
    Письмо с текстом вопроса и ответом. После успеха помечает answer_email_sent_at.
    """
    from .models import UserQuestion

    recipient = resolve_question_recipient(question)
    answer = (question.admin_answer or "").strip()
    if not recipient:
        raise ValueError("У вопроса не указан адрес электронной почты.")
    if not answer:
        raise ValueError("Ответ администратора пустой.")

    site_name = getattr(settings, "SITE_NAME", "Kotelkov.by")
    cabinet_url = getattr(
        settings,
        "FRONTEND_CABINET_URL",
        f"{getattr(settings, 'FRONTEND_URL', 'http://localhost:3000').rstrip('/')}/cabinet",
    )

    subject = f"Ответ на ваш вопрос — {site_name}"
    body = (
        f"Здравствуйте, {question.user_name}!\n\n"
        f"Вы задавали вопрос на сайте {site_name}:\n\n"
        f"{question.question.strip()}\n\n"
        f"Ответ:\n\n"
        f"{answer}\n\n"
        f"Ответ также доступен в личном кабинете: {cabinet_url}\n\n"
        f"—\n"
        f"{site_name}"
    )

    timeout = int(getattr(settings, "EMAIL_TIMEOUT", 30))
    connection = get_connection(
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
                timeout=timeout,
                fail_silently=False,
            )
            message.connection = connection
            sent = message.send(fail_silently=False)
        else:
            raise

    if sent != 1:
        raise RuntimeError(f"SMTP вернул код отправки: {sent}")

    if question.pk:
        UserQuestion.objects.filter(pk=question.pk).update(
            answer_email_sent_at=timezone.now()
        )
        question.answer_email_sent_at = timezone.now()

    logger.info("Question answer email sent to %s (question id=%s)", recipient, question.pk)
