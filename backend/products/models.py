"""
Модели данных для пользователей
Кастомная модель пользователя с email в качестве основного идентификатора
"""

from django.db import models
from django.contrib.auth.models import AbstractUser
from django.contrib.auth.base_user import BaseUserManager


class CustomUserManager(BaseUserManager):
    """
    Кастомный менеджер для модели CustomUser
    
    Переопределяет стандартные методы создания пользователей,
    чтобы использовать email вместо username в качестве основного идентификатора.
    """
    
    def create_user(self, email, password=None, **extra_fields):
        """
        Создает и сохраняет обычного пользователя с хэшированным паролем
        
        Args:
            email: Email пользователя (обязательное поле)
            password: Пароль пользователя (будет хэширован)
            **extra_fields: Дополнительные поля пользователя
            
        Returns:
            CustomUser: Созданный объект пользователя
            
        Raises:
            ValueError: Если email не указан
        """
        if not email:
            raise ValueError('Email is required')
        
        # Нормализация email (приведение к нижнему регистру)
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        # Хэширование пароля перед сохранением
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        """
        Создает и сохраняет суперпользователя (администратора)
        
        Args:
            email: Email суперпользователя
            password: Пароль суперпользователя
            **extra_fields: Дополнительные поля
            
        Returns:
            CustomUser: Созданный объект суперпользователя
        """
        # Установка прав администратора по умолчанию
        extra_fields.setdefault('is_staff', True)  # Доступ к админ-панели
        extra_fields.setdefault('is_superuser', True)  # Все права администратора
        return self.create_user(email, password, **extra_fields)


class CustomUser(AbstractUser):
    """
    Кастомная модель пользователя
    
    Расширяет стандартную модель AbstractUser, используя email
    в качестве основного идентификатора вместо username.
    
    Поля:
        email: Email пользователя (уникальный, используется для входа)
        birthday: Дата рождения (опционально)
        username: Имя пользователя (опционально, может быть пустым)
    """
    email = models.EmailField(max_length=200, unique=True)  # Email как уникальный идентификатор
    birthday = models.DateField(null=True, blank=True)  # Дата рождения (необязательное поле)
    username = models.CharField(max_length=200, null=True, blank=True)  # Username опционален

    # Использование кастомного менеджера
    objects = CustomUserManager()
    
    # Email используется для аутентификации вместо username
    USERNAME_FIELD = 'email'
    # Нет обязательных полей кроме email и password
    REQUIRED_FIELDS = []
