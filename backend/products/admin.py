"""
Административная панель Django

Регистрация моделей для управления через Django admin интерфейс.
Доступен по адресу /admin/ после создания суперпользователя.
"""

import logging

from django.contrib import admin, messages

from .question_email import resolve_question_recipient, send_user_question_answer_email

from .models import (
    CustomUser,
    ElectricBoiler,
    Delivery,
    OrderHistory,
    OrderHistoryItem,
    UserQuestion,
)

logger = logging.getLogger(__name__)


@admin.register(CustomUser)
class CustomUserAdmin(admin.ModelAdmin):
    """
    Административный интерфейс для модели CustomUser
    """

    list_display = (
        "email",
        "first_name",
        "last_name",
        "phone",
        "city",
        "country",
        "username",
        "birthday",
        "is_staff",
        "is_active",
        "date_joined",
    )
    list_filter = ("is_staff", "is_active", "date_joined", "country", "city")
    search_fields = (
        "email",
        "username",
        "first_name",
        "last_name",
        "phone",
        "city",
        "street",
    )
    ordering = ("-date_joined",)

    # Группировка полей для удобства в админ-панели
    fieldsets = (
        ("Основная информация", {"fields": ("email", "username", "avatar")}),
        ("Личные данные", {"fields": ("first_name", "last_name", "phone", "birthday")}),
        (
            "Адресные данные",
            {
                "fields": (
                    "country",
                    "region",
                    "district",
                    "city",
                    "street",
                    "house_number",
                    "building_number",
                    "apartment_number",
                )
            },
        ),
        (
            "Права доступа",
            {
                "fields": (
                    "is_staff",
                    "is_active",
                    "is_superuser",
                    "groups",
                    "user_permissions",
                )
            },
        ),
        (
            "Важные даты",
            {"fields": ("last_login", "date_joined"), "classes": ("collapse",)},
        ),
    )


@admin.register(ElectricBoiler)
class ElectricBoilerAdmin(admin.ModelAdmin):
    """
    Административный интерфейс для модели ElectricBoiler

    Полнофункциональная настройка для добавления и редактирования электрических котлов
    """

    # Отображение в списке объектов
    list_display = (
        "name",
        "price",
        "country",
        "power",
        "heating_area",
        "created_at",
        "updated_at",
    )
    list_display_links = ("name",)  # Поле для перехода к редактированию
    list_filter = ("country", "created_at", "updated_at", "power")
    search_fields = ("name", "description", "country", "power", "price")
    ordering = ("-created_at", "name")  # Сначала новые, потом по имени
    readonly_fields = ("created_at", "updated_at")

    def get_readonly_fields(self, request, obj=None):
        """Стоимость (price) можно менять вручную только суперпользователю."""
        readonly = list(super().get_readonly_fields(request, obj))
        if not request.user.is_superuser:
            readonly.append("price")
        return readonly

    # Количество объектов на странице
    list_per_page = 25
    list_max_show_all = 100

    # Группировка полей для удобства в админ-панели
    fieldsets = (
        (
            "Основная информация",
            {
                "fields": ("name", "product_url", "price", "country", "description"),
                "description": "Основные данные о котле",
            },
        ),
        (
            "Технические характеристики - Мощность и отопление",
            {
                "fields": ("power", "power_regulation", "heating_area", "work_type"),
                "classes": ("collapse",),
            },
        ),
        (
            "Технические характеристики - Электрические параметры",
            {"fields": ("voltage", "cable", "fuse"), "classes": ("collapse",)},
        ),
        (
            "Технические характеристики - Температурные режимы",
            {
                "fields": ("temp_range", "temp_range_radiator", "temp_range_floor"),
                "classes": ("collapse",),
            },
        ),
        (
            "Технические характеристики - Подключение и размеры",
            {"fields": ("connection", "dimensions"), "classes": ("collapse",)},
        ),
        (
            "Функциональные возможности - Режимы работы",
            {
                "fields": ("self_work", "water_heating", "floor_heating"),
                "classes": ("collapse",),
            },
        ),
        (
            "Функциональные возможности - Управление и автоматика",
            {
                "fields": (
                    "wifi",
                    "thermostat",
                    "thermostat_included",
                    "outdoor_sensor",
                ),
                "classes": ("collapse",),
            },
        ),
        (
            "Комплектация",
            {
                "fields": ("expansion_tank", "circulation_pump"),
                "classes": ("collapse",),
            },
        ),
        (
            "Документация и изображения",
            {
                "fields": (
                    "documentation",
                    "image_1",
                    "image_2",
                    "image_3",
                    "image_4",
                    "image_5",
                )
            },
        ),
        (
            "Метаданные",
            {"fields": ("created_at", "updated_at"), "classes": ("collapse",)},
        ),
    )

    # Настройки для формы добавления/редактирования
    save_on_top = True  # Кнопки сохранения сверху и снизу
    save_as = True  # Возможность сохранить как новый объект
    save_as_continue = True  # Продолжить редактирование после сохранения как нового


@admin.register(Delivery)
class DeliveryAdmin(admin.ModelAdmin):
    """
    Административный интерфейс для модели Доставка.

    Отображается структура пунктов доставки. Для каждого: числовое значение, сумма (BYN).
    """

    list_display = ("title", "value_number", "amount", "sort_order")
    list_editable = ("value_number", "amount", "sort_order")
    list_display_links = ("title",)
    list_filter = ("sort_order",)
    search_fields = ("title",)
    ordering = ("sort_order", "id")

    fieldsets = (
        (
            "Условие доставки",
            {
                "fields": ("title", "sort_order"),
                "description": "Название пункта из структуры доставки (например: По г. Брест при сумме заказа от 1000 BYN).",
            },
        ),
        (
            "Значения (вносятся вручную)",
            {
                "fields": ("value_number", "amount"),
                "description": "Числовое значение и сумма (BYN) — при необходимости оставьте поля пустыми.",
            },
        ),
    )


class OrderHistoryItemInline(admin.TabularInline):
    """Позиции заказа в карточке истории."""

    model = OrderHistoryItem
    extra = 0
    can_delete = False
    exclude = ("unit_price", "line_total")
    readonly_fields = (
        "product_id",
        "product_name",
        "quantity",
    )

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(OrderHistory)
class OrderHistoryAdmin(admin.ModelAdmin):
    """
    История заказов: пользователь, доставка, адрес, суммы, способ оплаты, состав заказа.
    """

    list_display = (
        "order_list_id",
        "order_list_user",
        "order_list_created_at",
        "order_list_status",
    )
    list_display_links = ("order_list_id",)
    list_filter = ("status", "delivery_type", "payment_method", "created_at")

    @admin.display(description="ID", ordering="id")
    def order_list_id(self, obj):
        return obj.pk

    @admin.display(description="ПОЛЬЗОВАТЕЛЬ", ordering="user__email")
    def order_list_user(self, obj):
        if obj.user_id:
            return obj.user
        return "—"

    @admin.display(description="ДАТА ОФОРМЛЕНИЯ", ordering="created_at")
    def order_list_created_at(self, obj):
        return obj.created_at

    @admin.display(description="СТАТУС ЗАКАЗА", ordering="status")
    def order_list_status(self, obj):
        return obj.get_status_display()

    search_fields = (
        "phone",
        "city",
        "street",
        "comment",
        "user__email",
        "items__product_name",
    )
    readonly_fields = ("created_at",)
    ordering = ("-created_at", "-id")
    inlines = (OrderHistoryItemInline,)
    date_hierarchy = "created_at"

    fieldsets = (
        (
            "Заказ",
            {
                "fields": (
                    "user",
                    "created_at",
                    "status",
                    "payment_method",
                    "delivery_type",
                ),
            },
        ),
        (
            "Суммы, BYN",
            {
                "fields": ("products_subtotal", "delivery_cost", "total"),
            },
        ),
        (
            "Контакты",
            {"fields": ("phone", "comment")},
        ),
        (
            "Адрес доставки",
            {
                "fields": (
                    "country",
                    "region",
                    "district",
                    "city",
                    "street",
                    "house_number",
                    "building_number",
                    "apartment_number",
                ),
                "description": "При самовывозе поля адреса могут быть пустыми.",
            },
        ),
    )


@admin.register(UserQuestion)
class UserQuestionAdmin(admin.ModelAdmin):
    """Вопросы пользователей с сайта и ответы администратора."""

    list_display = (
        "id",
        "user_name",
        "email",
        "phone",
        "question_preview",
        "has_admin_answer",
        "answer_email_sent",
        "created_at",
    )
    actions = ("send_answer_email_action",)
    list_display_links = ("id", "user_name")
    list_filter = ("created_at",)
    search_fields = (
        "user_name",
        "email",
        "phone",
        "question",
        "admin_answer",
        "user__email",
    )
    readonly_fields = (
        "user",
        "user_name",
        "email",
        "phone",
        "question",
        "answer_email_sent_at",
        "created_at",
        "updated_at",
    )
    ordering = ("-created_at", "-id")
    date_hierarchy = "created_at"

    fieldsets = (
        (
            "Вопрос пользователя",
            {
                "fields": (
                    "user",
                    "user_name",
                    "email",
                    "phone",
                    "question",
                    "answer_email_sent_at",
                    "created_at",
                    "updated_at",
                ),
            },
        ),
        (
            "Ответ администратора",
            {
                "fields": ("admin_answer",),
                "description": (
                    "Заполните ответ и сохраните — пользователь увидит его в личном "
                    "кабинете на сайте и получит письмо на указанный e-mail."
                ),
            },
        ),
    )

    def save_model(self, request, obj, form, change):
        previous_answer = ""
        had_email_sent = False
        if change and obj.pk:
            row = (
                UserQuestion.objects.filter(pk=obj.pk)
                .values("admin_answer", "answer_email_sent_at")
                .first()
            )
            if row:
                previous_answer = (row["admin_answer"] or "").strip()
                had_email_sent = row["answer_email_sent_at"] is not None

        super().save_model(request, obj, form, change)
        obj.refresh_from_db()

        current_answer = (obj.admin_answer or "").strip()
        if not current_answer:
            return

        answer_changed = current_answer != previous_answer
        needs_email = answer_changed or not had_email_sent
        if not needs_email:
            return

        recipient = resolve_question_recipient(obj)
        try:
            send_user_question_answer_email(obj)
        except Exception as exc:
            logger.exception("Failed to send question answer email")
            self.message_user(
                request,
                f"Ответ сохранён в личном кабинете. Не удалось отправить письмо "
                f"на {recipient or '—'}: {exc}",
                level=messages.WARNING,
            )
        else:
            self.message_user(
                request,
                f"Ответ сохранён. Письмо отправлено на {recipient}.",
                level=messages.SUCCESS,
            )

    @admin.action(description="Отправить ответ на e-mail")
    def send_answer_email_action(self, request, queryset):
        sent = 0
        errors = []
        for obj in queryset:
            if not (obj.admin_answer or "").strip():
                errors.append(f"№{obj.pk}: нет ответа администратора")
                continue
            recipient = resolve_question_recipient(obj)
            try:
                send_user_question_answer_email(obj)
                sent += 1
            except Exception as exc:
                errors.append(f"№{obj.pk} ({recipient}): {exc}")
        if sent:
            self.message_user(
                request,
                f"Отправлено писем: {sent}.",
                level=messages.SUCCESS,
            )
        for err in errors[:5]:
            self.message_user(request, err, level=messages.ERROR)

    @admin.display(description="Письмо", boolean=True)
    def answer_email_sent(self, obj):
        return obj.answer_email_sent_at is not None

    @admin.display(description="Вопрос")
    def question_preview(self, obj):
        text = (obj.question or "").strip()
        if len(text) <= 60:
            return text
        return f"{text[:60]}…"

    @admin.display(description="Ответ", boolean=True)
    def has_admin_answer(self, obj):
        return bool((obj.admin_answer or "").strip())
