"""
Административная панель Django

Регистрация моделей для управления через Django admin интерфейс.
Доступен по адресу /admin/ после создания суперпользователя.
"""

from django.contrib import admin

from .models import CustomUser, ElectricBoiler, Delivery, OrderHistory, OrderHistoryItem


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
