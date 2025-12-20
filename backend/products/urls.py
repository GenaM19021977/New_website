"""
URL маршруты для API endpoints приложения products

Использует Django REST Framework роутеры для автоматической генерации URL patterns
"""

from django.contrib import admin
from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import *

# Создание роутера для автоматической генерации URL patterns
router = DefaultRouter()

# Регистрация ViewSets в роутере
# POST /register/ - регистрация нового пользователя
router.register('register', RegisterView, basename='register')

# POST /login/ - аутентификация пользователя
router.register('login', LoginView, basename='login')

# GET /users/ - получение списка пользователей
router.register('users', UserView, basename='users')

# URL patterns, сгенерированные роутером
urlpatterns = router.urls

