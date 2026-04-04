"""
Сериализаторы для валидации и преобразования данных пользователей
Используются в API endpoints для работы с пользовательскими данными
"""

import re
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP

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

    email = serializers.CharField()
    password = serializers.CharField()

    def validate_email(self, value):
        if not value or "@" not in str(value):
            raise serializers.ValidationError("Некорректный адрес электронной почты!")
        return value.strip()


class ElectricBoilerSerializer(serializers.ModelSerializer):
    """Сериализатор для карточки товара (котла) в каталоге."""

    class Meta:
        model = ElectricBoiler
        fields = (
            "id",
            "name",
            "price",
            "power",
            "heating_area",
            "product_url",
            "image_1",
            "image_2",
            "image_3",
        )


class ElectricBoilerDetailSerializer(serializers.ModelSerializer):
    """Сериализатор для страницы описания товара (все поля модели)."""

    class Meta:
        model = ElectricBoiler
        fields = "__all__"


class DeliverySerializer(serializers.ModelSerializer):
    """Сериализатор для списка условий доставки (модальное окно «Информация о доставке»)."""

    class Meta:
        model = Delivery
        fields = ("id", "title", "value_number", "amount", "sort_order")


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
            "id",
            "email",
            "username",
            "birthday",
            "first_name",
            "last_name",
            "phone",
            "avatar",
            "country",
            "region",
            "district",
            "city",
            "street",
            "house_number",
            "building_number",
            "apartment_number",
        )  # Поля для сериализации
        read_only_fields = ("id",)  # ID только для чтения (генерируется автоматически)


def validate_phone_format(value):
    """Валидация телефона: + и ровно 12 цифр."""
    if not value or not str(value).strip():
        return value
    if not re.match(r"^\+[0-9]{12}$", str(value).strip()):
        raise serializers.ValidationError("Некорректный ввод номера телефона.")
    return str(value).strip()


class UserUpdateSerializer(serializers.ModelSerializer):
    """
    Сериализатор для обновления данных пользователя
    """

    avatar = serializers.ImageField(required=False, allow_null=True)
    phone = serializers.CharField(required=False, allow_blank=True, validators=[validate_phone_format])

    class Meta:
        model = User
        fields = (
            "first_name",
            "last_name",
            "phone",
            "avatar",
            "country",
            "region",
            "district",
            "city",
            "street",
            "house_number",
            "building_number",
            "apartment_number",
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
        if attrs["new_password"] != attrs["new_password2"]:
            raise serializers.ValidationError(
                {"new_password2": "Новые пароли не совпадают"}
            )
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
        fields = (
            "id",
            "email",
            "password",
            "password2",
            "first_name",
            "last_name",
            "phone",
            "avatar",
        )  # Поля для регистрации
        extra_kwargs = {
            "email": {"required": True},  # Email обязателен
            "password": {
                "write_only": True,
                "required": True,
                "min_length": 8,
            },  # Пароль обязателен, минимум 8 символов
            "first_name": {"required": True, "allow_blank": False},  # Имя обязательно
            "last_name": {
                "required": True,
                "allow_blank": False,
            },  # Фамилия обязательна
        }

    def validate_email(self, value):
        """
        Валидация email: наличие @ и уникальность.
        """
        if not value:
            raise serializers.ValidationError("Email обязателен для заполнения")
        if "@" not in value:
            raise serializers.ValidationError("Некорректный адрес электронной почты!")
        if User.objects.filter(email__iexact=value.strip()).exists():
            raise serializers.ValidationError(
                "Пользователь с таким адресом электронной почты уже зарегистрирован!"
            )
        return value.strip()

    def validate_password(self, value):
        """
        Валидация пароля

        Проверяет, что пароль не пустой и соответствует минимальным требованиям.
        """
        if not value:
            raise serializers.ValidationError("Пароль обязателен для заполнения")
        if len(value) < 8:
            raise serializers.ValidationError(
                "Пароль должен содержать минимум 8 символов"
            )
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

    def validate_phone(self, value):
        """
        Валидация телефона: + и ровно 12 цифр.
        """
        return validate_phone_format(value)

    def validate(self, attrs):
        """
        Валидация данных регистрации

        Проверяет совпадение пароля и подтверждения пароля.
        """
        if attrs["password"] != attrs["password2"]:
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
        validated_data.pop("password2")

        # Извлекаем пароль
        password = validated_data.pop("password")

        # create_user автоматически хэширует пароль
        user = User.objects.create_user(password=password, **validated_data)
        user.save()  # Явно сохраняем пользователя в БД
        return user


def parse_boiler_price(value):
    """Число BYN из строки цены котла (как parsePrice на фронте)."""
    if value is None:
        return Decimal("0.00")
    s = re.sub(r"\s", "", str(value))
    m = re.search(r"[\d.,]+", s)
    if not m:
        return Decimal("0.00")
    raw = m.group(0).replace(",", ".")
    try:
        return Decimal(raw).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    except InvalidOperation:
        return Decimal("0.00")


class OrderCartItemSerializer(serializers.Serializer):
    id = serializers.IntegerField(min_value=1)
    quantity = serializers.IntegerField(min_value=1, max_value=9999)


class OrderDeliveryAddressSerializer(serializers.Serializer):
    country = serializers.CharField(allow_blank=True, required=False, default="")
    region = serializers.CharField(allow_blank=True, required=False, default="")
    district = serializers.CharField(allow_blank=True, required=False, default="")
    city = serializers.CharField(allow_blank=True, required=False, default="")
    street = serializers.CharField(allow_blank=True, required=False, default="")
    house_number = serializers.CharField(allow_blank=True, required=False, default="")
    building_number = serializers.CharField(allow_blank=True, required=False, default="")
    apartment_number = serializers.CharField(allow_blank=True, required=False, default="")


class OrderHistoryCreateSerializer(serializers.Serializer):
    """
    Создание заказа (доставка курьером).
    products_subtotal в order_history — стоимость заказа (сумма позиций по ценам каталога).
    """

    payment_method = serializers.ChoiceField(choices=OrderHistory.PaymentMethod.choices)
    delivery_type = serializers.ChoiceField(
        choices=[OrderHistory.DeliveryType.COURIER],
        default=OrderHistory.DeliveryType.COURIER,
        required=False,
    )
    phone = serializers.CharField(allow_blank=True, required=False, default="")
    comment = serializers.CharField(allow_blank=True, required=False, default="")
    items = OrderCartItemSerializer(many=True)
    delivery_address = OrderDeliveryAddressSerializer(required=False)
    courier_delivery_cost_byn = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        required=False,
        default=Decimal("0.00"),
    )
    # Сумма как на странице checkout; если парсинг цены из каталога дал 0, берём это значение
    products_subtotal_byn = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        required=False,
        allow_null=True,
        write_only=True,
    )

    def validate_items(self, value):
        if not value:
            raise serializers.ValidationError("Добавьте хотя бы один товар.")
        return value

    def validate(self, attrs):
        attrs.setdefault("delivery_type", OrderHistory.DeliveryType.COURIER)

        raw_items = attrs["items"]
        resolved = []
        subtotal = Decimal("0.00")
        for row in raw_items:
            pid = row["id"]
            qty = row["quantity"]
            try:
                boiler = ElectricBoiler.objects.get(pk=pid)
            except ElectricBoiler.DoesNotExist:
                raise serializers.ValidationError(
                    {"items": f"Товар с id={pid} не найден в каталоге."}
                )
            unit = parse_boiler_price(boiler.price)
            line_total = (unit * qty).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
            subtotal += line_total
            name = (boiler.name or "")[:300]
            resolved.append(
                {
                    "product_id": pid,
                    "product_name": name,
                    "unit_price": unit,
                    "quantity": qty,
                    "line_total": line_total,
                }
            )
        subtotal = subtotal.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

        client_sub = attrs.pop("products_subtotal_byn", None)
        if client_sub is not None:
            client_sub = Decimal(str(client_sub)).quantize(
                Decimal("0.01"), rounding=ROUND_HALF_UP
            )
            if subtotal == Decimal("0.00") and client_sub > 0:
                subtotal = client_sub
            elif subtotal > 0:
                diff = abs(client_sub - subtotal)
                tol = max(Decimal("0.02"), subtotal * Decimal("0.02"))
                if diff <= tol:
                    subtotal = client_sub

        addr_in = attrs.get("delivery_address") or {}
        city = (addr_in.get("city") or "").strip()
        street = (addr_in.get("street") or "").strip()
        house = (addr_in.get("house_number") or "").strip()
        if not city or not street or not house:
            raise serializers.ValidationError(
                {
                    "delivery_address": "Укажите город, улицу и номер дома для доставки."
                }
            )

        dc = attrs.get("courier_delivery_cost_byn")
        if dc is None:
            dc = Decimal("0.00")
        if dc < 0:
            raise serializers.ValidationError(
                {"courier_delivery_cost_byn": "Стоимость доставки не может быть отрицательной."}
            )
        dc = dc.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        total = (subtotal + dc).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

        attrs["_resolved_lines"] = resolved
        attrs["_products_subtotal"] = subtotal
        attrs["_delivery_cost"] = dc
        attrs["_total"] = total

        phone = (attrs.get("phone") or "").strip()
        if phone:
            attrs["phone"] = validate_phone_format(phone)
        else:
            attrs["phone"] = ""

        return attrs

    def create(self, validated_data):
        from django.db import transaction

        resolved_lines = validated_data.pop("_resolved_lines")
        products_subtotal = validated_data.pop("_products_subtotal")
        delivery_cost = validated_data.pop("_delivery_cost")
        total = validated_data.pop("_total")
        validated_data.pop("items", None)
        validated_data.pop("courier_delivery_cost_byn", None)

        addr = validated_data.pop("delivery_address", None) or {}
        if not isinstance(addr, dict):
            addr = dict(addr)

        request = self.context.get("request")
        user = (
            request.user
            if request and getattr(request.user, "is_authenticated", False)
            else None
        )

        with transaction.atomic():
            order = OrderHistory.objects.create(
                user=user,
                delivery_type=OrderHistory.DeliveryType.COURIER,
                payment_method=validated_data["payment_method"],
                phone=validated_data.get("phone") or "",
                comment=validated_data.get("comment") or "",
                products_subtotal=products_subtotal,
                delivery_cost=delivery_cost,
                total=total,
                country=(addr.get("country") or "")[:100],
                region=(addr.get("region") or "")[:100],
                district=(addr.get("district") or "")[:100],
                city=(addr.get("city") or "")[:100],
                street=(addr.get("street") or "")[:200],
                house_number=(addr.get("house_number") or "")[:20],
                building_number=(addr.get("building_number") or "")[:20],
                apartment_number=(addr.get("apartment_number") or "")[:20],
            )
            for row in resolved_lines:
                OrderHistoryItem.objects.create(order=order, **row)

        return order


class OrderHistoryItemReadSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderHistoryItem
        fields = (
            "product_id",
            "product_name",
            "unit_price",
            "quantity",
            "line_total",
        )


class OrderHistoryReadSerializer(serializers.ModelSerializer):
    items = OrderHistoryItemReadSerializer(many=True, read_only=True)

    class Meta:
        model = OrderHistory
        fields = (
            "id",
            "created_at",
            "status",
            "delivery_type",
            "payment_method",
            "products_subtotal",
            "delivery_cost",
            "total",
            "phone",
            "comment",
            "country",
            "region",
            "district",
            "city",
            "street",
            "house_number",
            "building_number",
            "apartment_number",
            "items",
        )
