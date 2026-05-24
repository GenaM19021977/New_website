"""
Проверка отправки письма с ответом на вопрос.

Пример:
  python manage.py test_question_email --to user@example.com
  python manage.py test_question_email --question-id 1
"""

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from products.models import UserQuestion
from products.question_email import send_user_question_answer_email


class Command(BaseCommand):
    help = "Отправить тестовое письмо «Ответ на вопрос» (проверка SMTP)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--to",
            type=str,
            help="Адрес получателя (если не указан — email из записи вопроса).",
        )
        parser.add_argument(
            "--question-id",
            type=int,
            help="ID вопроса в БД (должен быть заполнен admin_answer).",
        )

    def handle(self, *args, **options):
        backend = settings.EMAIL_BACKEND
        self.stdout.write(f"EMAIL_BACKEND: {backend}")
        self.stdout.write(f"EMAIL_HOST: {settings.EMAIL_HOST}:{settings.EMAIL_PORT}")
        self.stdout.write(f"FROM: {settings.DEFAULT_FROM_EMAIL}")
        self.stdout.write(
            f"SSL={settings.EMAIL_USE_SSL} TLS={settings.EMAIL_USE_TLS}"
        )

        if "console" in backend:
            self.stdout.write(
                self.style.WARNING(
                    "Сейчас письма только в консоль. В .env укажите "
                    "EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend"
                )
            )

        if not settings.EMAIL_HOST_USER or not settings.EMAIL_HOST_PASSWORD:
            raise CommandError(
                "Заполните EMAIL_HOST_USER и EMAIL_HOST_PASSWORD в backend/.env "
                "(для Mail.ru — пароль приложения, не основной пароль ящика)."
            )

        question = self._get_question(options)
        recipient = (options.get("to") or question.email or "").strip()
        if not recipient:
            raise CommandError("Не указан email получателя.")

        if not (question.admin_answer or "").strip():
            question.admin_answer = (
                "Это тестовый ответ администратора. Если вы видите это письмо, "
                "отправка настроена правильно."
            )

        question.email = recipient
        try:
            send_user_question_answer_email(question)
        except Exception as exc:
            raise CommandError(f"Ошибка отправки: {exc}") from exc

        self.stdout.write(
            self.style.SUCCESS(f"Письмо отправлено на {recipient}")
        )

    def _get_question(self, options):
        qid = options.get("question_id")
        if qid:
            try:
                return UserQuestion.objects.get(pk=qid)
            except UserQuestion.DoesNotExist as exc:
                raise CommandError(f"Вопрос с id={qid} не найден.") from exc

        return UserQuestion(
            pk=0,
            user_name="Тест",
            email=options.get("to") or settings.EMAIL_HOST_USER,
            phone="",
            question="Тестовый вопрос с сайта.",
            admin_answer="",
        )
