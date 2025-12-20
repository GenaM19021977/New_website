"""
Кастомный backend для аутентификации пользователей по email

Позволяет использовать email вместо username для входа в систему.
Используется в AUTHENTICATION_BACKENDS в settings.py
"""

from django.contrib.auth import get_user_model
from django.contrib.auth.backends import ModelBackend

# Получаем модель пользователя из настроек Django
User = get_user_model()


class EmailAuthBackend(ModelBackend):
    """
    Backend для аутентификации пользователей по email
    
    Переопределяет стандартную аутентификацию Django,
    чтобы использовать email вместо username.
    """
    
    def authenticate(self, request, email=None, password=None):
        """
        Аутентификация пользователя по email и password
        
        Args:
            request: HTTP запрос
            email: Email пользователя
            password: Пароль пользователя
            
        Returns:
            User: Объект пользователя при успешной аутентификации,
            None: Если пользователь не найден или пароль неверный
        """
        try:
            # Поиск пользователя по email
            user = User.objects.get(email=email)
            # Проверка пароля (автоматическое сравнение с хэшем)
            if user.check_password(password):
                return user
        except User.DoesNotExist:
            # Пользователь с таким email не найден
            return None

    def get_user(self, user_id):
        """
        Получение пользователя по ID
        
        Используется Django для поддержания сессии пользователя.
        
        Args:
            user_id: ID пользователя
            
        Returns:
            User: Объект пользователя или None, если не найден
        """
        try:
            return User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return None