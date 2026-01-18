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
    list_display = ("email", "first_name", "last_name", "phone", "city", "country", "username", "birthday", "is_staff", "is_active", "date_joined")
    list_filter = ("is_staff", "is_active", "date_joined", "country", "city")
    search_fields = ("email", "username", "first_name", "last_name", "phone", "city", "street")
    ordering = ("-date_joined",)
    
    # Группировка полей для удобства в админ-панели
    fieldsets = (
        ("Основная информация", {
            "fields": ("email", "username", "avatar")
        }),
        ("Личные данные", {
            "fields": ("first_name", "last_name", "phone", "birthday")
        }),
        ("Адресные данные", {
            "fields": (
                "country", "region", "district", "city", 
                "street", "house_number", "building_number", "apartment_number"
            )
        }),
        ("Права доступа", {
            "fields": ("is_staff", "is_active", "is_superuser", "groups", "user_permissions")
        }),
        ("Важные даты", {
            "fields": ("last_login", "date_joined"),
            "classes": ("collapse",)
        }),
    )


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
                "voltage", "cable", "fuse", "temp_range", "temp_range_radiator", "temp_range_floor",
                "efficiency", "connection", "dimensions"
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
            "fields": ("documentation", "image_1", "image_2", "image_3", "image_4", "image_5")
        }),
        ("Метаданные", {
            "fields": ("created_at", "updated_at"),
            "classes": ("collapse",)
        }),
    )
