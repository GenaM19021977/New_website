"""
API Views для аутентификации и управления пользователями
Использует Django REST Framework ViewSets и JWT токены для аутентификации
"""

from rest_framework import viewsets, permissions, status
from .serializers import LoginSerializer, RegisterSerializer, UserSerializer
from .models import *
from rest_framework.response import Response
from django.contrib.auth import get_user_model, authenticate
from rest_framework_simplejwt.tokens import RefreshToken


# Получаем модель пользователя из настроек Django
User = get_user_model()


class LoginView(viewsets.ViewSet):
    """
    ViewSet для аутентификации пользователей (логин)
    
    Endpoint: POST /login/
    Позволяет пользователю войти в систему, используя email и password.
    При успешной аутентификации возвращает JWT токены (access и refresh).
    """
    permission_classes = [permissions.AllowAny]  # Доступ без аутентификации
    serializer_class = LoginSerializer

    def create(self, request):
        """
        Обработка POST запроса на логин
        
        Args:
            request: HTTP запрос с данными email и password
            
        Returns:
            Response с данными пользователя и JWT токенами при успехе,
            или ошибку при неверных учетных данных
        """
        # Валидация входящих данных через сериализатор
        serializer = self.serializer_class(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data['email']
            password = serializer.validated_data['password']
            
            # Аутентификация пользователя через кастомный backend (по email)
            user = authenticate(request, email=email, password=password)
            
            if user:
                # Генерация JWT токенов для аутентифицированного пользователя
                refresh = RefreshToken.for_user(user)
                return Response({
                    'user': UserSerializer(user).data,  # Данные пользователя
                    'refresh': str(refresh),  # Refresh токен для обновления access токена
                    'access': str(refresh.access_token)  # Access токен для авторизованных запросов
                })
            else:
                # Неверные учетные данные
                return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)
        else:
            # Ошибки валидации данных
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class RegisterView(viewsets.ViewSet):
    """
    ViewSet для регистрации новых пользователей
    
    Endpoint: POST /register/
    Создает нового пользователя и автоматически выдает JWT токены.
    """
    permission_classes = [permissions.AllowAny]  # Доступ без аутентификации
    queryset = User.objects.all()
    serializer_class = RegisterSerializer

    def create(self, request):
        """
        Обработка POST запроса на регистрацию
        
        Args:
            request: HTTP запрос с данными email и password
            
        Returns:
            Response с данными созданного пользователя и JWT токенами при успехе,
            или ошибки валидации при неудаче
        """
        # Валидация и создание пользователя через сериализатор
        serializer = self.serializer_class(data=request.data)
        if serializer.is_valid():
            # Создание пользователя с хэшированным паролем
            user = serializer.save()
            
            # Генерация JWT токенов для нового пользователя
            refresh = RefreshToken.for_user(user)
            return Response({
                'user': UserSerializer(user).data,
                'refresh': str(refresh),
                'access': str(refresh.access_token)
            }, status=status.HTTP_201_CREATED)
        else:
            # Ошибки валидации данных
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UserView(viewsets.ViewSet):
    """
    ViewSet для получения списка пользователей
    
    Endpoint: GET /users/
    Возвращает список всех зарегистрированных пользователей.
    ВНИМАНИЕ: В production следует ограничить доступ через permissions!
    """
    permission_classes = [permissions.AllowAny]  # Временно для разработки
    queryset = User.objects.all()
    serializer_class = RegisterSerializer  # Используется для сериализации списка

    def list(self, request):
        """
        Обработка GET запроса на получение списка пользователей
        
        Args:
            request: HTTP запрос
            
        Returns:
            Response со списком всех пользователей
        """
        queryset = User.objects.all()
        # Сериализация списка пользователей (many=True для множественных объектов)
        serializer = self.serializer_class(queryset, many=True)
        return Response(serializer.data)
