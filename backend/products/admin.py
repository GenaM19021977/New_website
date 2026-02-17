"""
Административная панель Django

Регистрация моделей для управления через Django admin интерфейс.
Доступен по адресу /admin/ после создания суперпользователя.
"""

from django.contrib import admin
from .models import CustomUser, ElectricBoiler


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
