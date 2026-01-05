from django.db import models
from django.contrib.auth.models import AbstractUser
from django.contrib.auth.base_user import BaseUserManager


class CustomUserManager(BaseUserManager):
    def create_user(
        self, email, password=None, **extra_fields
    ):  # создание пользователя
        if not email:
            raise ValueError("Email is required")

        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        # Хэширование пароля перед сохранением
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(
        self, email, password=None, **extra_fields
    ):  # создание суперпользователя
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        return self.create_user(email, password, **extra_fields)


class CustomUser(AbstractUser):  # пользовательская модель
    email = models.EmailField(max_length=200, unique=True)
    birthday = models.DateField(null=True, blank=True)
    username = models.CharField(max_length=200, null=True, blank=True)
    phone = models.CharField(
        max_length=20, null=True, blank=True, verbose_name="Телефон"
    )
    avatar = models.ImageField(
        upload_to="avatars/", null=True, blank=True, verbose_name="Аватар"
    )

    # Адресные данные
    country = models.CharField(
        max_length=100, null=True, blank=True, verbose_name="Страна проживания"
    )
    region = models.CharField(
        max_length=100, null=True, blank=True, verbose_name="Область"
    )
    district = models.CharField(
        max_length=100, null=True, blank=True, verbose_name="Район"
    )
    city = models.CharField(max_length=100, null=True, blank=True, verbose_name="Город")
    street = models.CharField(
        max_length=200, null=True, blank=True, verbose_name="Улица"
    )
    house_number = models.CharField(
        max_length=20, null=True, blank=True, verbose_name="Номер дома"
    )
    building_number = models.CharField(
        max_length=20, null=True, blank=True, verbose_name="Номер корпуса"
    )
    apartment_number = models.CharField(
        max_length=20, null=True, blank=True, verbose_name="Номер квартиры"
    )

    objects = CustomUserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []


class ElectricBoiler(models.Model):
    """
    Модель для хранения данных об электрических котлах

    Используется для сбора и сохранения информации о котлах из парсера.
    Все данные сохраняются в базе данных PostgreSQL.
    """

    # Основная информация
    name = models.CharField(
        max_length=200,
        verbose_name="Наименование котла",
        help_text="Название электрического котла",
    )
    product_url = models.URLField(
        verbose_name="Ссылка на товар",
        help_text="URL ссылка на товар на внешнем ресурсе",
    )
    price = models.CharField(
        max_length=50,
        verbose_name="Цена",
        help_text="Цена товара",
    )
    country = models.CharField(
        max_length=100,
        verbose_name="Страна производитель",
        blank=True,
        null=True,
        help_text="Страна-производитель котла",
    )

    # Технические характеристики
    power = models.CharField(
        max_length=50,
        verbose_name="Мощность кВт",
        blank=True,
        null=True,
        help_text="Мощность котла в киловаттах",
    )
    power_regulation = models.CharField(
        max_length=100,
        verbose_name="Регулировка мощности",
        blank=True,
        null=True,
        help_text="Тип регулировки мощности",
    )
    heating_area = models.CharField(
        max_length=100,
        verbose_name="Площадь отопления, рекомендуемая до",
        blank=True,
        null=True,
        help_text="Рекомендуемая площадь отопления",
    )
    work_type = models.CharField(
        max_length=100,
        verbose_name="Начальный вариант работы",
        blank=True,
        null=True,
        help_text="Начальный режим работы котла",
    )
    self_work = models.CharField(
        max_length=100,
        verbose_name="Возможность для работы самостоятельно",
        blank=True,
        null=True,
        help_text="Возможность автономной работы",
    )
    water_heating = models.CharField(
        max_length=100,
        verbose_name="Возможность для нагрева воды",
        blank=True,
        null=True,
        help_text="Поддержка нагрева воды",
    )
    floor_heating = models.CharField(
        max_length=100,
        verbose_name="Возможность нагрева теплого пола",
        blank=True,
        null=True,
        help_text="Поддержка теплого пола",
    )
    expansion_tank = models.CharField(
        max_length=100,
        verbose_name="Расширительный бак",
        blank=True,
        null=True,
        help_text="Наличие расширительного бака",
    )
    circulation_pump = models.CharField(
        max_length=100,
        verbose_name="Циркуляционный насос",
        blank=True,
        null=True,
        help_text="Наличие циркуляционного насоса",
    )
    voltage = models.CharField(
        max_length=100,
        verbose_name="Питание от сети, Вольт",
        blank=True,
        null=True,
        help_text="Напряжение питания",
    )
    cable = models.CharField(
        max_length=100,
        verbose_name="Кабель подключения",
        blank=True,
        null=True,
        help_text="Тип кабеля подключения",
    )
    fuse = models.CharField(
        max_length=100,
        verbose_name="Предохранитель, А",
        blank=True,
        null=True,
        help_text="Сила тока предохранителя",
    )
    temp_range = models.CharField(
        max_length=100,
        verbose_name="Диапазон выбираемых температур, °C",
        blank=True,
        null=True,
        help_text="Диапазон рабочих температур",
    )
    efficiency = models.CharField(
        max_length=100,
        verbose_name="КПД",
        blank=True,
        null=True,
        help_text="Коэффициент полезного действия",
    )
    connection = models.CharField(
        max_length=50,
        verbose_name="Подключение к системе",
        blank=True,
        null=True,
        help_text="Тип подключения к системе отопления",
    )
    dimensions = models.CharField(
        max_length=100,
        verbose_name="Габаритные размеры, мм",
        blank=True,
        null=True,
        help_text="Размеры котла в миллиметрах",
    )
    wifi = models.CharField(
        max_length=100,
        verbose_name="Возможность подключения WiFi",
        blank=True,
        null=True,
        help_text="Поддержка WiFi подключения",
    )
    thermostat = models.CharField(
        max_length=100,
        verbose_name="Возможность подключения комнатного термостата",
        blank=True,
        null=True,
        help_text="Возможность подключения термостата",
    )
    thermostat_included = models.CharField(
        max_length=100,
        verbose_name="Комнатный термостат в комплекте",
        blank=True,
        null=True,
        help_text="Наличие термостата в комплекте",
    )
    outdoor_sensor = models.CharField(
        max_length=100,
        verbose_name="Возможно подключение датчика уличной температуры",
        blank=True,
        null=True,
        help_text="Поддержка датчика уличной температуры",
    )

    # Описания и документация
    description = models.TextField(
        verbose_name="Описание",
        blank=True,
        null=True,
        help_text="Подробное описание котла",
    )
    documentation = models.URLField(
        verbose_name="Инструкция по котлу (Документация)",
        blank=True,
        null=True,
        help_text="Ссылка на документацию/инструкцию",
    )

    # Изображения
    image_1 = models.URLField(
        verbose_name="Изображение 1",
        blank=True,
        null=True,
        help_text="URL первого изображения",
    )
    image_2 = models.URLField(
        verbose_name="Изображение 2",
        blank=True,
        null=True,
        help_text="URL второго изображения",
    )
    image_3 = models.URLField(
        verbose_name="Изображение 3",
        blank=True,
        null=True,
        help_text="URL третьего изображения",
    )
    image_4 = models.URLField(
        verbose_name="Изображение 4",
        blank=True,
        null=True,
        help_text="URL четвертого изображения",
    )

    # Метаданные
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Дата создания")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Дата обновления")

    class Meta:
        verbose_name = "Электрический котел"
        verbose_name_plural = "Электрические котлы"
        ordering = ["name"]

    def __str__(self):
        return self.name

    @classmethod
    def create_from_parser_data(cls, parser_data):
        """
        Класс-метод для создания объекта из данных парсера

        Args:
            parser_data (dict): Словарь с данными от парсера

        Returns:
            ElectricBoiler: Созданный и сохраненный объект модели
        """
        boiler = cls()
        return boiler.save_from_parser_data(parser_data)

    def save_from_parser_data(self, parser_data):
        """
        Метод для сохранения данных из парсера в модель

        Args:
            parser_data (dict): Словарь с данными от парсера

        Returns:
            ElectricBoiler: Сохраненный объект модели
        """
        # Основная информация
        self.name = parser_data.get("name", "")
        self.product_url = parser_data.get("product_url", "")
        self.price = parser_data.get("price", "")
        self.country = parser_data.get("country") or None

        # Технические характеристики
        self.power = parser_data.get("power") or None
        self.power_regulation = parser_data.get("power_regulation") or None
        self.heating_area = parser_data.get("heating_area") or None
        self.work_type = parser_data.get("work_type") or None
        self.self_work = parser_data.get("self_work") or None
        self.water_heating = parser_data.get("water_heating") or None
        self.floor_heating = parser_data.get("floor_heating") or None
        self.expansion_tank = parser_data.get("expansion_tank") or None
        self.circulation_pump = parser_data.get("circulation_pump") or None
        self.voltage = parser_data.get("voltage") or None
        self.cable = parser_data.get("cable") or None
        self.fuse = parser_data.get("fuse") or None
        self.temp_range = parser_data.get("temp_range") or None
        self.efficiency = parser_data.get("efficiency") or None
        self.connection = parser_data.get("connection") or None
        self.dimensions = parser_data.get("dimensions") or None
        self.wifi = parser_data.get("wifi") or None
        self.thermostat = parser_data.get("thermostat") or None
        self.thermostat_included = parser_data.get("thermostat_included") or None
        self.outdoor_sensor = parser_data.get("outdoor_sensor") or None

        # Описания
        self.description = parser_data.get("description") or None
        self.documentation = parser_data.get("documentation") or None

        # Изображения
        image_urls = parser_data.get("image_urls", [])
        if image_urls:
            self.image_1 = (
                image_urls[0] if len(image_urls) > 0 and image_urls[0] else None
            )
            self.image_2 = (
                image_urls[1] if len(image_urls) > 1 and image_urls[1] else None
            )
            self.image_3 = (
                image_urls[2] if len(image_urls) > 2 and image_urls[2] else None
            )
            self.image_4 = (
                image_urls[3] if len(image_urls) > 3 and image_urls[3] else None
            )
        else:
            self.image_1 = None
            self.image_2 = None
            self.image_3 = None
            self.image_4 = None

        self.save()
        return self
