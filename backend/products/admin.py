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
    list_display = ("email", "username", "birthday", "is_staff", "is_active", "date_joined")
    list_filter = ("is_staff", "is_active", "date_joined")
    search_fields = ("email", "username")
    ordering = ("-date_joined",)


@admin.register(ElectricBoiler)
class ElectricBoilerAdmin(admin.ModelAdmin):
    """
    Административный интерфейс для модели ElectricBoiler
    """
    list_display = ("name", "price", "country", "power", "created_at")
    list_filter = ("country", "created_at")
    search_fields = ("name", "description", "country")
    ordering = ("name",)
    readonly_fields = ("created_at", "updated_at")

    # Группировка полей для удобства в админ-панели
    fieldsets = (
        ("Основная информация", {
            "fields": ("name", "product_url", "price", "country", "description")
        }),
        ("Технические характеристики", {
            "fields": (
                "power", "power_regulation", "heating_area", "work_type",
                "voltage", "cable", "fuse", "temp_range", "efficiency", "connection", "dimensions"
            )
        }),
        ("Функциональные возможности", {
            "fields": (
                "self_work", "water_heating", "floor_heating",
                "wifi", "thermostat", "thermostat_included", "outdoor_sensor"
            )
        }),
        ("Комплектация", {
            "fields": ("expansion_tank", "circulation_pump")
        }),
        ("Документация и изображения", {
            "fields": ("documentation", "image_1", "image_2", "image_3", "image_4")
        }),
        ("Метаданные", {
            "fields": ("created_at", "updated_at"),
            "classes": ("collapse",)
        }),
    )
