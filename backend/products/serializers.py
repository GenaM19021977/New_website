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
    
    # Поле для возврата полного URL аватара
    avatar = serializers.ImageField(required=False, allow_null=True)

    class Meta:
        model = User
        fields = (
            "id", "email", "username", "birthday", "first_name", "last_name", "phone", "avatar",
            "country", "region", "district", "city", "street", "house_number", "building_number", "apartment_number"
        )  # Поля для сериализации
        read_only_fields = ("id",)  # ID только для чтения (генерируется автоматически)


class UserUpdateSerializer(serializers.ModelSerializer):
    """
    Сериализатор для обновления данных пользователя
    """
    
    avatar = serializers.ImageField(required=False, allow_null=True)

    class Meta:
        model = User
        fields = (
            "first_name", "last_name", "phone", "avatar",
            "country", "region", "district", "city", "street", 
            "house_number", "building_number", "apartment_number"
        )
        extra_kwargs = {
            "first_name": {"required": False},
            "last_name": {"required": False},
        }


class PasswordChangeSerializer(serializers.Serializer):
    """
    Сериализатор для смены пароля
    """
    old_password = serializers.CharField(required=True, write_only=True)
    new_password = serializers.CharField(required=True, min_length=8, write_only=True)
    new_password2 = serializers.CharField(required=True, min_length=8, write_only=True)

    def validate(self, attrs):
        if attrs['new_password'] != attrs['new_password2']:
            raise serializers.ValidationError({"new_password2": "Новые пароли не совпадают"})
        return attrs


class RegisterSerializer(serializers.ModelSerializer):
    """
    Сериализатор для регистрации нового пользователя

    Используется для создания нового пользователя с валидацией данных.
    Автоматически хэширует пароль при создании пользователя.
    
    Обязательные поля:
    - email (обязательно)
    - password (обязательно)
    - password2 (обязательно, подтверждение пароля)
    - first_name (обязательно)
    - last_name (обязательно)
    """

    # Поле для подтверждения пароля (не сохраняется в модели)
    password2 = serializers.CharField(write_only=True, required=True, min_length=8)

    class Meta:
        model = User
        fields = ("id", "email", "password", "password2", "first_name", "last_name", "phone", "avatar")  # Поля для регистрации
        extra_kwargs = {
            "email": {
                "required": True
            },  # Email обязателен
            "password": {
                "write_only": True,
                "required": True,
                "min_length": 8
            },  # Пароль обязателен, минимум 8 символов
            "first_name": {
                "required": True,
                "allow_blank": False
            },  # Имя обязательно
            "last_name": {
                "required": True,
                "allow_blank": False
            },  # Фамилия обязательна
        }

    def validate_email(self, value):
        """
        Валидация email

        Проверяет, что email не пустой и валидный.
        """
        if not value:
            raise serializers.ValidationError("Email обязателен для заполнения")
        return value

    def validate_password(self, value):
        """
        Валидация пароля

        Проверяет, что пароль не пустой и соответствует минимальным требованиям.
        """
        if not value:
            raise serializers.ValidationError("Пароль обязателен для заполнения")
        if len(value) < 8:
            raise serializers.ValidationError("Пароль должен содержать минимум 8 символов")
        return value

    def validate_first_name(self, value):
        """
        Валидация имени

        Проверяет, что имя не пустое.
        """
        if not value or not value.strip():
            raise serializers.ValidationError("Имя обязательно для заполнения")
        return value.strip()

    def validate_last_name(self, value):
        """
        Валидация фамилии

        Проверяет, что фамилия не пустая.
        """
        if not value or not value.strip():
            raise serializers.ValidationError("Фамилия обязательна для заполнения")
        return value.strip()

    def validate(self, attrs):
        """
        Валидация данных регистрации

        Проверяет совпадение пароля и подтверждения пароля.
        """
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({"password2": "Пароли не совпадают"})
        return attrs

    def create(self, validated_data):
        """
        Создает нового пользователя с хэшированным паролем

        Args:
            validated_data: Валидированные данные (email, password, first_name, last_name, phone, avatar)

        Returns:
            User: Созданный объект пользователя
        """
        # Удаляем password2 из validated_data, так как его нет в модели
        validated_data.pop('password2')
        
        # Извлекаем пароль
        password = validated_data.pop('password')
        
        # create_user автоматически хэширует пароль
        user = User.objects.create_user(password=password, **validated_data)
        user.save()  # Явно сохраняем пользователя в БД
        return user
