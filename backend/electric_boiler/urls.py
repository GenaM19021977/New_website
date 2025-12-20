"""
Главный файл URL конфигурации проекта

Определяет основные маршруты приложения, включая:
- Админ-панель Django
- API endpoints приложения products
- JWT токен endpoints (refresh, verify)
"""

from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import TokenRefreshView, TokenVerifyView

urlpatterns = [
    # Админ-панель Django (доступна по адресу /admin/)
    path('admin/', admin.site.urls),
    
    # Подключение URL patterns из приложения products
    # Включает: /register/, /login/, /users/
    path('', include('products.urls')),
    
    # JWT токен endpoints
    # POST /api/token/refresh/ - обновление access токена с помощью refresh токена
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # POST /api/token/verify/ - проверка валидности токена
    path('api/token/verify/', TokenVerifyView.as_view(), name='token_verify'),
]
