"""
Настройки Django проекта

Содержит конфигурацию для:
- Безопасности (SECRET_KEY, DEBUG, ALLOWED_HOSTS)
- Установленных приложений и middleware
- Базы данных (PostgreSQL)
- Аутентификации (JWT токены)
- CORS для работы с frontend
"""

from pathlib import Path
import os
from dotenv import load_dotenv
from datetime import timedelta

# Определение базовой директории проекта (два уровня выше от settings.py)
BASE_DIR = Path(__file__).resolve().parent.parent

# Загрузка переменных окружения из .env файла
load_dotenv()

# ==================== БЕЗОПАСНОСТЬ ====================

# Секретный ключ для криптографических операций Django
# ВАЖНО: Должен быть уникальным и храниться в секрете в production!
SECRET_KEY = os.environ.get("SECRET_KEY")

# Режим отладки (True для разработки, False для production)
# В production должен быть False для безопасности
DEBUG = os.environ.get("DEBUG", "False").lower() in ("true", "1", "yes")

# Список разрешенных хостов для работы приложения
# В production должен содержать реальные домены
ALLOWED_HOSTS = os.getenv("ALLOWED_HOSTS", "").split(",")

# ==================== УСТАНОВЛЕННЫЕ ПРИЛОЖЕНИЯ ====================

INSTALLED_APPS = [
    # Стандартные приложения Django
    "django.contrib.admin",  # Админ-панель
    "django.contrib.auth",  # Система аутентификации
    "django.contrib.contenttypes",  # Система типов контента
    "django.contrib.sessions",  # Управление сессиями
    "django.contrib.messages",  # Система сообщений
    "django.contrib.staticfiles",  # Управление статическими файлами
    # Сторонние приложения
    "rest_framework",  # Django REST Framework для API
    "rest_framework_simplejwt",  # JWT токены для аутентификации
    "corsheaders",  # Обработка CORS заголовков для работы с frontend
    # Локальные приложения
    "products",  # Основное приложение проекта
]

# ==================== MIDDLEWARE ====================
# Порядок middleware важен! Они выполняются сверху вниз

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",  # Обработка CORS заголовков (должен быть первым)
    "django.middleware.security.SecurityMiddleware",  # Безопасность (HTTPS, заголовки безопасности)
    "django.contrib.sessions.middleware.SessionMiddleware",  # Управление сессиями
    "django.middleware.common.CommonMiddleware",  # Общие операции (нормализация URL)
    "django.middleware.csrf.CsrfViewMiddleware",  # Защита от CSRF атак
    "django.contrib.auth.middleware.AuthenticationMiddleware",  # Аутентификация пользователей
    "django.contrib.messages.middleware.MessageMiddleware",  # Система сообщений
    "django.middleware.clickjacking.XFrameOptionsMiddleware",  # Защита от clickjacking
]

# ==================== CORS НАСТРОЙКИ ====================
# Настройки для разрешения запросов с frontend приложения

# Список разрешенных источников для CORS запросов
CORS_ALLOWED_ORIGINS = os.getenv("CORS_ALLOWED_ORIGINS", "").split(",")
# Удаляем пустые строки из списка
CORS_ALLOWED_ORIGINS = [origin for origin in CORS_ALLOWED_ORIGINS if origin]

# Для разработки разрешаем все источники, если CORS_ALLOWED_ORIGINS пуст
# В production это должно быть False!
if not CORS_ALLOWED_ORIGINS and DEBUG:
    CORS_ALLOW_ALL_ORIGINS = True
else:
    CORS_ALLOW_ALL_ORIGINS = False

# ==================== АУТЕНТИФИКАЦИЯ ====================

# Использование кастомной модели пользователя вместо стандартной
AUTH_USER_MODEL = "products.CustomUser"

# Backends для аутентификации пользователей
# Django попробует каждый backend по порядку до первого успешного
AUTHENTICATION_BACKENDS = [
    "products.auth_backend.EmailAuthBackend",  # Кастомный backend для аутентификации по email
    "django.contrib.auth.backends.ModelBackend",  # Стандартный backend (fallback)
]

# ==================== URL КОНФИГУРАЦИЯ ====================
ROOT_URLCONF = "electric_boiler.urls"

# ==================== ШАБЛОНЫ ====================
TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,  # Поиск шаблонов в папках templates приложений
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",  # Доступ к request в шаблонах
                "django.contrib.auth.context_processors.auth",  # Информация о пользователе
                "django.contrib.messages.context_processors.messages",  # Система сообщений
            ],
        },
    },
]

# ==================== WSGI ====================
WSGI_APPLICATION = "electric_boiler.wsgi.application"

# ==================== БАЗА ДАННЫХ ====================
# Настройки подключения к PostgreSQL
# Все параметры берутся из переменных окружения (.env файл)

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",  # Драйвер PostgreSQL
        "NAME": os.getenv("DB_NAME"),  # Имя базы данных
        "USER": os.getenv("DB_USER"),  # Пользователь БД
        "PASSWORD": os.getenv("DB_PASSWORD"),  # Пароль пользователя
        "HOST": os.getenv("DB_HOST"),  # Хост БД (обычно 'localhost')
        "PORT": os.getenv("DB_PORT"),  # Порт БД (обычно '5432')
    }
}


# ==================== ВАЛИДАЦИЯ ПАРОЛЕЙ ====================
# Правила для проверки надежности паролей пользователей

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
        # Проверяет, что пароль не слишком похож на другие данные пользователя
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
        # Проверяет минимальную длину пароля
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
        # Проверяет, что пароль не является распространенным
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
        # Проверяет, что пароль не состоит только из цифр
    },
]

# ==================== ИНТЕРНАЦИОНАЛИЗАЦИЯ ====================

LANGUAGE_CODE = "en-us"  # Язык по умолчанию
TIME_ZONE = "UTC"  # Часовой пояс
USE_I18N = True  # Включение интернационализации
USE_TZ = True  # Использование часовых поясов

# ==================== СТАТИЧЕСКИЕ ФАЙЛЫ ====================

STATIC_URL = "static/"  # URL префикс для статических файлов

# ==================== МОДЕЛИ ====================

DEFAULT_AUTO_FIELD = (
    "django.db.models.BigAutoField"  # Тип автоинкрементного поля по умолчанию
)

# ==================== DJANGO REST FRAMEWORK ====================
# Настройки для API endpoints

REST_FRAMEWORK = {
    # Классы аутентификации (порядок важен)
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",  # JWT токены
    ],
    # Классы разрешений по умолчанию
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.AllowAny",  # Временно для разработки! В production изменить на IsAuthenticated
    ],
    # Настройки пагинации (разбиение на страницы)
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 20,  # Количество элементов на странице
}

# ==================== JWT НАСТРОЙКИ ====================
# Конфигурация JWT токенов для аутентификации

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=60),  # Время жизни access токена (1 час)
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),  # Время жизни refresh токена (7 дней)
    "ROTATE_REFRESH_TOKENS": True,  # Генерировать новый refresh токен при обновлении
    "BLACKLIST_AFTER_ROTATION": True,  # Добавлять старый refresh токен в черный список
    "UPDATE_LAST_LOGIN": True,  # Обновлять поле last_login при входе
    "ALGORITHM": "HS256",  # Алгоритм подписи токена
    "SIGNING_KEY": SECRET_KEY,  # Ключ для подписи токенов
    "AUTH_HEADER_TYPES": ("Bearer",),  # Тип заголовка авторизации
    "AUTH_HEADER_NAME": "HTTP_AUTHORIZATION",  # Имя заголовка авторизации
    "USER_ID_FIELD": "id",  # Поле модели пользователя для идентификации
    "USER_ID_CLAIM": "user_id",  # Имя claim в токене для ID пользователя
    "AUTH_TOKEN_CLASSES": (
        "rest_framework_simplejwt.tokens.AccessToken",
    ),  # Класс токена
    "TOKEN_TYPE_CLAIM": "token_type",  # Имя claim для типа токена
}
