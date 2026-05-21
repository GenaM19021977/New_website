"""
API Views для аутентификации и управления пользователями
Использует Django REST Framework ViewSets и JWT токены для аутентификации
"""

from rest_framework import viewsets, permissions, status

from .authentication import OptionalJWTAuthentication
from .serializers import (
    LoginSerializer,
    RegisterSerializer,
    UserSerializer,
    UserUpdateSerializer,
    PasswordChangeSerializer,
    PasswordResetRequestSerializer,
    PasswordResetConfirmSerializer,
    ElectricBoilerSerializer,
    ElectricBoilerDetailSerializer,
    DeliverySerializer,
    OrderHistoryCreateSerializer,
    OrderHistoryReadSerializer,
    UserQuestionCreateSerializer,
    UserQuestionReadSerializer,
)
from .models import ElectricBoiler, Delivery, OrderHistory, UserQuestion
from rest_framework.response import Response
from django.contrib.auth import get_user_model, authenticate
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.decorators import action
from django.contrib.auth.tokens import default_token_generator
from django.utils.encoding import force_str
from django.utils.http import urlsafe_base64_decode
from django.conf import settings
import logging
import threading

from django.db import close_old_connections

from .password_reset_email import send_password_reset_email, build_password_reset_url

logger = logging.getLogger(__name__)

# Получаем модель пользователя из настроек Django
User = get_user_model()

PASSWORD_RESET_REQUEST_MESSAGE = (
    "Если указанный email зарегистрирован, на него отправлена "
    "инструкция по восстановлению пароля."
)


def _send_password_reset_email_async(user_id: int) -> None:
    """Отправка письма в фоне, чтобы API ответил сразу (SMTP может занимать >5 с)."""

    def task():
        close_old_connections()
        try:
            user = User.objects.get(pk=user_id)
            send_password_reset_email(user)
        except Exception:
            logger.exception(
                "Background password reset email failed for user_id=%s",
                user_id,
            )
            if settings.DEBUG:
                try:
                    user = User.objects.get(pk=user_id)
                    logger.error(
                        "DEV: ссылка сброса пароля (если SMTP недоступен): %s",
                        build_password_reset_url(user),
                    )
                except Exception:
                    pass
        finally:
            close_old_connections()

    threading.Thread(target=task, daemon=True).start()


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
    Возвращает все записи (title, value_number, amount, sort_order) для модального окна.
    """

    permission_classes = [permissions.AllowAny]

    def list(self, request):
        qs = Delivery.objects.all().order_by("sort_order", "id")
        serializer = DeliverySerializer(qs, many=True)
        return Response(serializer.data)


class OrderHistoryCreateView(viewsets.ViewSet):
    """
    GET /orders/ — список заказов текущего пользователя (JWT обязателен).
    POST /orders/ — сохранение заказа в историю (гость или пользователь).
    DELETE /orders/{pk}/ — отмена своего заказа (статус «Отменен пользователем»).
    products_subtotal в БД = «Стоимость заказа, BYN» (каталог ± products_subtotal_byn с checkout).
    """

    authentication_classes = [OptionalJWTAuthentication]
    permission_classes = [permissions.AllowAny]

    def list(self, request):
        if not request.user.is_authenticated:
            return Response(
                {"detail": "Требуется авторизация."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        qs = OrderHistory.objects.filter(user=request.user).prefetch_related(
            "items",
        )
        serializer = OrderHistoryReadSerializer(qs, many=True)
        return Response(serializer.data)

    def create(self, request):
        serializer = OrderHistoryCreateSerializer(
            data=request.data,
            context={"request": request},
        )
        if serializer.is_valid():
            order = serializer.save()
            return Response(
                OrderHistoryReadSerializer(order).data,
                status=status.HTTP_201_CREATED,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def destroy(self, request, pk=None):
        """Отмена заказа владельцем: статус canceled_by_user, запись остаётся в истории."""
        if not request.user.is_authenticated:
            return Response(
                {"detail": "Требуется авторизация."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        try:
            order = OrderHistory.objects.prefetch_related("items").get(pk=pk)
        except OrderHistory.DoesNotExist:
            return Response(
                {"detail": "Заказ не найден."},
                status=status.HTTP_404_NOT_FOUND,
            )
        if order.user_id != request.user.id:
            return Response(
                {"detail": "Заказ не найден."},
                status=status.HTTP_404_NOT_FOUND,
            )
        if order.status == OrderHistory.OrderStatus.SHIPPED:
            return Response(
                {
                    "detail": "Нельзя отменить заказ, который уже отправлен.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        if order.status == OrderHistory.OrderStatus.CANCELED_BY_USER:
            return Response(
                {"detail": "Заказ уже отменён."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        order.status = OrderHistory.OrderStatus.CANCELED_BY_USER
        order.save(update_fields=["status"])
        return Response(
            OrderHistoryReadSerializer(order).data,
            status=status.HTTP_200_OK,
        )


class UserQuestionView(viewsets.ViewSet):
    """
    GET /user-questions/ — вопросы текущего пользователя (JWT обязателен).
    POST /user-questions/ — отправка вопроса (JWT обязателен).
    """

    permission_classes = [permissions.IsAuthenticated]

    def list(self, request):
        qs = UserQuestion.objects.filter(user=request.user)
        serializer = UserQuestionReadSerializer(qs, many=True)
        return Response(serializer.data)

    def create(self, request):
        serializer = UserQuestionCreateSerializer(
            data=request.data,
            context={"request": request},
        )
        if serializer.is_valid():
            question = serializer.save()
            return Response(
                UserQuestionReadSerializer(question).data,
                status=status.HTTP_201_CREATED,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class PasswordResetView(viewsets.ViewSet):
    """
    Восстановление пароля при забытом пароле.

    POST /password-reset/request/ — письмо со ссылкой (не раскрывает, есть ли email в БД).
    POST /password-reset/confirm/ — новый пароль по uid и token из ссылки.
    """

    permission_classes = [permissions.AllowAny]

    @action(detail=False, methods=["post"], url_path="request")
    def request_reset(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        email = serializer.validated_data["email"]
        user = User.objects.filter(email__iexact=email).first()
        if user and user.is_active:
            _send_password_reset_email_async(user.pk)

        return Response({"message": PASSWORD_RESET_REQUEST_MESSAGE})

    @action(detail=False, methods=["post"], url_path="confirm")
    def confirm_reset(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        uidb64 = serializer.validated_data["uid"]
        token = serializer.validated_data["token"]
        new_password = serializer.validated_data["new_password"]

        try:
            uid = force_str(urlsafe_base64_decode(uidb64))
            user = User.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            return Response(
                {"detail": "Ссылка для сброса пароля недействительна или устарела."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not user.is_active:
            return Response(
                {"detail": "Ссылка для сброса пароля недействительна или устарела."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not default_token_generator.check_token(user, token):
            return Response(
                {"detail": "Ссылка для сброса пароля недействительна или устарела."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.set_password(new_password)
        user.save(update_fields=["password"])

        return Response(
            {"message": "Пароль успешно изменён. Теперь вы можете войти с новым паролем."}
        )


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
