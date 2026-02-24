"""
API Views для аутентификации и управления пользователями
Использует Django REST Framework ViewSets и JWT токены для аутентификации
"""

from rest_framework import viewsets, permissions, status
from .serializers import (
    LoginSerializer,
    RegisterSerializer,
    UserSerializer,
    UserUpdateSerializer,
    PasswordChangeSerializer,
    ElectricBoilerSerializer,
    ElectricBoilerDetailSerializer,
    DeliverySerializer,
)
from .models import ElectricBoiler, Delivery
from rest_framework.response import Response
from django.contrib.auth import get_user_model, authenticate
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.decorators import action


# Получаем модель пользователя из настроек Django
User = get_user_model()


class ManufacturersView(viewsets.ViewSet):
    """
    Список производителей котлов по данным из БД.

    Endpoint: GET /manufacturers/
    Возвращает уникальные производители (третье слово из наименования котла),
    отсортированные по имени. Формат: [{"name": "...", "slug": "..."}, ...].
    """

    permission_classes = [permissions.AllowAny]

    def list(self, request):
        names = ElectricBoiler.objects.values_list("name", flat=True).distinct()
        seen = set()
        result = []
        for raw_name in names:
            if not raw_name or not raw_name.strip():
                continue
            words = raw_name.strip().split()
            # Производитель = третье слово наименования (индекс 2)
            if len(words) < 3:
                continue
            third_word = words[2]
            if not third_word:
                continue
            slug = third_word.lower()
            if slug in seen:
                continue
            seen.add(slug)
            result.append({"name": third_word, "slug": slug})
        result.sort(key=lambda x: x["name"].lower())
        return Response(result)


class BoilersView(viewsets.ViewSet):
    """
    Список и детали котлов (товаров) из БД.

    Endpoints:
    - GET /boilers/ — все записи для страницы Каталог
    - GET /boilers/{id}/ — одна запись для страницы описания товара
    """

    permission_classes = [permissions.AllowAny]
    serializer_class = ElectricBoilerSerializer

    def list(self, request):
        qs = ElectricBoiler.objects.all().order_by("name")
        serializer = self.serializer_class(qs, many=True)
        return Response(serializer.data)

    def retrieve(self, request, pk=None):
        try:
            boiler = ElectricBoiler.objects.get(pk=pk)
        except ElectricBoiler.DoesNotExist:
            return Response(
                {"detail": "Товар не найден"},
                status=status.HTTP_404_NOT_FOUND,
            )
        serializer = ElectricBoilerDetailSerializer(boiler)
        return Response(serializer.data)


class DeliveryView(viewsets.ViewSet):
    """
    Список условий доставки из таблицы Доставка.

    Endpoint: GET /delivery/
    Возвращает все записи (title, value_number, value_text, sort_order) для модального окна.
    """

    permission_classes = [permissions.AllowAny]

    def list(self, request):
        qs = Delivery.objects.all().order_by("sort_order", "id")
        serializer = DeliverySerializer(qs, many=True)
        return Response(serializer.data)


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
            email = serializer.validated_data["email"]
            password = serializer.validated_data["password"]

            # Аутентификация пользователя через кастомный backend (по email)
            user = authenticate(request, email=email, password=password)

            if user:
                # Генерация JWT токенов для аутентифицированного пользователя
                refresh = RefreshToken.for_user(user)
                return Response(
                    {
                        "user": UserSerializer(user).data,  # Данные пользователя
                        "refresh": str(
                            refresh
                        ),  # Refresh токен для обновления access токена
                        "access": str(
                            refresh.access_token
                        ),  # Access токен для авторизованных запросов
                    }
                )
            else:
                # Неверные учетные данные
                return Response(
                    {"error": "Invalid credentials"},
                    status=status.HTTP_401_UNAUTHORIZED,
                )
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
            return Response(
                {
                    "user": UserSerializer(user).data,
                    "refresh": str(refresh),
                    "access": str(refresh.access_token),
                },
                status=status.HTTP_201_CREATED,
            )
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


class CurrentUserView(viewsets.ViewSet):
    """
    ViewSet для работы с текущим авторизованным пользователем

    Endpoints:
    - GET /me/ - получение данных текущего пользователя
    - PUT /me/update-profile/ - обновление данных текущего пользователя
    - PATCH /me/update-profile/ - частичное обновление данных текущего пользователя
    - POST /me/change-password/ - смена пароля
    """

    permission_classes = [permissions.IsAuthenticated]  # Требуется аутентификация
    serializer_class = UserSerializer

    def list(self, request):
        """
        Обработка GET запроса на получение данных текущего пользователя

        Args:
            request: HTTP запрос с JWT токеном в заголовке

        Returns:
            Response с данными текущего пользователя
        """
        # request.user содержит пользователя из JWT токена
        serializer = self.serializer_class(request.user)
        return Response(serializer.data)

    @action(detail=False, methods=["put", "patch"])
    def update_profile(self, request):
        """
        Обработка PUT/PATCH запроса на обновление данных пользователя

        Args:
            request: HTTP запрос с данными для обновления

        Returns:
            Response с обновленными данными пользователя
        """
        serializer = UserUpdateSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            # Обновляем объект пользователя из БД для получения актуальных данных
            request.user.refresh_from_db()
            return Response(UserSerializer(request.user).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=["post"])
    def change_password(self, request):
        """
        Обработка POST запроса на смену пароля

        Args:
            request: HTTP запрос с old_password, new_password, new_password2

        Returns:
            Response с подтверждением успешной смены пароля
        """
        serializer = PasswordChangeSerializer(data=request.data)
        if serializer.is_valid():
            user = request.user
            # Проверка старого пароля
            if not user.check_password(serializer.validated_data["old_password"]):
                return Response(
                    {"old_password": ["Неверный пароль"]},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            # Установка нового пароля
            user.set_password(serializer.validated_data["new_password"])
            user.save()
            return Response({"message": "Пароль успешно изменен"})
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
