"""
Сериализаторы для валидации и преобразования данных пользователей
Используются в API endpoints для работы с пользовательскими данными
"""

from rest_framework import serializers
from .models import *
from django.contrib.auth import get_user_model

# Получаем модель пользователя из настроек Django
User = get_user_model()


class LoginSerializer(serializers.Serializer):
    """
    Сериализатор для данных входа пользователя

    Используется для валидации email и password при логине.
    Не связан с моделью, так как используется только для валидации входных данных.
    """
    email = serializers.EmailField()  # Email должен быть валидным
    password = serializers.CharField()  # Пароль в виде строки


class UserSerializer(serializers.ModelSerializer):
    """
    Сериализатор для отображения данных пользователя

    Используется для возврата информации о пользователе в API ответах.
    Исключает чувствительные данные (пароль) из ответа.
    """

    class Meta:
        model = User
        fields = ("id", "email", "username", "birthday")  # Поля для сериализации
        read_only_fields = ("id",)  # ID только для чтения (генерируется автоматически)


class RegisterSerializer(serializers.ModelSerializer):
    """
    Сериализатор для регистрации нового пользователя

    Используется для создания нового пользователя с валидацией данных.
    Автоматически хэширует пароль при создании пользователя.
    """

    class Meta:
        model = User
        fields = ("id", "email", "password")  # Поля для регистрации
        extra_kwargs = {
            "password": {
                "write_only": True
            }  # Пароль только для записи, не возвращается в ответе
        }

    def create(self, validated_data):
        """
        Создает нового пользователя с хэшированным паролем

        Args:
            validated_data: Валидированные данные (email, password)

        Returns:
            User: Созданный объект пользователя
        """
        # create_user автоматически хэширует пароль
        user = User.objects.create_user(**validated_data)
        user.save()  # Явно сохраняем пользователя в БД
        return user
