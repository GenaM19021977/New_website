"""
Административная панель Django

Регистрация моделей для управления через Django admin интерфейс.
Доступен по адресу /admin/ после создания суперпользователя.
"""

from django.contrib import admin
from .models import *

# Регистрация кастомной модели пользователя в админ-панели
# Позволяет управлять пользователями через веб-интерфейс Django admin
admin.site.register(CustomUser)

# Register your models here.
