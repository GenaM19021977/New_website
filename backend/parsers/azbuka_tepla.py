# Стандартная библиотека
import logging
import os
import re
import sys
import time
from typing import Any, Dict, List, Optional, Set, Tuple
from urllib.error import HTTPError, URLError
from urllib.parse import urljoin, urlparse
from urllib.request import Request, urlopen

# Django
import django
from django.db.utils import IntegrityError

# Сторонние библиотеки
from bs4 import BeautifulSoup
from selenium import webdriver
from selenium.common.exceptions import (
    NoSuchElementException,
    StaleElementReferenceException,
    TimeoutException,
    WebDriverException,
)
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

# Получаем абсолютный путь к корню проекта
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, project_root)

# Локальные импорты (после добавления project_root в sys.path)
from parsers.config import PARSER_CONFIG
from parsers.utils import (
    measure_time,
    retry_on_failure,
    setup_logging,
    validate_product_data,
)


# Настройка Django окружения
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "electric_boiler.settings")
django.setup()

# Импорт Django модели после django.setup() необходим для корректной работы ORM
from products.models import ElectricBoiler  # noqa: E402  # ruff: noqa: E402


# Настройка логирования
# Используем setup_logging() из utils.py для структурированного логирования
log_file = PARSER_CONFIG.get("LOG_FILE")
# Если LOG_FILE пустой, None или "None", отключаем запись в файл
if log_file and log_file.strip() and log_file.lower() != "none":
    setup_logging(
        log_level=PARSER_CONFIG["LOG_LEVEL"],
        log_format=PARSER_CONFIG["LOG_FORMAT"],
        log_file=log_file,
    )
else:
    setup_logging(
        log_level=PARSER_CONFIG["LOG_LEVEL"],
        log_format=PARSER_CONFIG["LOG_FORMAT"],
    )
logger = logging.getLogger(__name__)
logger.info("Логирование инициализировано")

# URL страницы с электрическими котлами (из конфигурации)
base_url = PARSER_CONFIG["BASE_URL"]
target_page = PARSER_CONFIG["TARGET_PAGE"]
filter_params = PARSER_CONFIG["FILTER_PARAMS"]
url = f"{base_url}{target_page}{filter_params}"

# Марки котлов для парсинга используются напрямую из конфигурации
# PARSER_CONFIG["TARGET_BRANDS"] - единственный источник истины

# ============================================================================
# Константы для регулярных выражений
# ============================================================================

# Паттерн для извлечения числовых значений (мощность, диапазоны)
# Извлекает: целые числа, десятичные числа (с точкой или запятой),
# диапазоны чисел (например: "6-12", "3.5-7.5")
# Примеры совпадений: "6", "12.5", "3,5", "6-12", "3.5-7.5"
REGEX_POWER_NUMERIC_VALUE = r"(\d+(?:[.,]\d+)?(?:\s*-\s*\d+(?:[.,]\d+)?)?)"

# Паттерн для извлечения простого числового значения (без диапазона)
# Используется для извлечения мощности из уже найденного значения
# Примеры совпадений: "6", "12.5", "3,5"
REGEX_SIMPLE_NUMERIC_VALUE = r"(\d+(?:[.,]\d+)?)"

# Паттерн для удаления единиц измерения "кВт" из значений мощности
# Удаляет "кВт", "квт", "КВт" и т.д. с любым количеством пробелов вокруг
REGEX_REMOVE_KW_UNIT = r"\s*квт\s*"

# Паттерн для удаления единиц измерения ГВС с числовым значением
# Удаляет паттерны типа "12.5 л/мин", "10 л/мин" и т.д.
# Поддерживает различные варианты написания: л/мин, л\/мин, l/min, l\/min
REGEX_REMOVE_DHW_UNIT_WITH_NUMBER = (
    r"\s*\d+(?:[.,]\d+)?\s*(?:л/мин|л\/мин|l/min|l\/min|л/мин\.?)\s*"
)

# Паттерн для удаления единиц измерения ГВС без числового значения
# Удаляет просто "л/мин" без предшествующего числа
REGEX_REMOVE_DHW_UNIT_SIMPLE = r"\s*(?:л/мин|л\/мин|l/min|l\/min|л/мин\.?)\s*"

# Паттерн для поиска напряжения для котлов 6 и 9 кВт
# Ищет текст типа: "котлы мощностью 6 кВт и 9 кВт ... могут работать ...
# от сети ... с напряжением ~220 В и ~380 В"
# Извлекает часть с напряжением (220 В и 380 В)
REGEX_VOLTAGE_6_9_KW = (
    r"котлы\s+мощностью\s+6\s+квт\s+и\s+9\s+квт"
    r".*?(?:могут\s+работать|работать)"
    r".*?(?:от\s+сети|сети)"
    r".*?(?:с\s+напряжением|напряжением)\s*"
    r"(~?\s*220\s*в\s+и\s+~?\s*380\s*в)"
)

# Паттерн для поиска напряжения для котлов 12+ кВт (обычный вариант)
# Ищет текст типа: "модели ... начиная с 12 кВт ... могут работать ...
# только от сети ... напряжением ~380 В"
REGEX_VOLTAGE_12_PLUS_KW = (
    r"модели.*?начиная\s+с\s+12\s+квт"
    r".*?(?:могут\s+работать|работать)"
    r".*?(?:только\s+от\s+сети|от\s+сети)"
    r".*?(?:мощностью|напряжением)\s*"
    r"(~?\s*380\s*в)"
)

# Паттерн для поиска напряжения для котлов 12+ кВт (вариант с "Важно")
# Ищет текст типа: "важно ... модели ... начиная с 12 кВт ...
# могут работать ... только от сети ... напряжением ~380 В"
REGEX_VOLTAGE_12_PLUS_KW_IMPORTANT = (
    r"важно.*?модели.*?начиная\s+с\s+12\s+квт"
    r".*?(?:могут\s+работать|работать)"
    r".*?(?:только\s+от\s+сети|от\s+сети)"
    r".*?(?:мощностью|напряжением)\s*"
    r"(~?\s*380\s*в)"
)

# Паттерн для удаления символа "~" (тильда) из текста напряжения
REGEX_REMOVE_TILDE = r"~"

# Паттерн для очистки цены от нецифровых символов
# Оставляет только цифры, запятые, точки и пробелы
# Используется для нормализации цен перед сохранением
REGEX_PRICE_CLEANUP = r"[^\d,.\s]"


@retry_on_failure(
    max_attempts=PARSER_CONFIG["RETRY_COUNT"],
    delay=PARSER_CONFIG["RETRY_DELAY"],
    exceptions=(Exception,),
)
def get_driver() -> Any:
    """
    Создание и настройка WebDriver для Selenium.

    Настраивает Chrome WebDriver с headless режимом и оптимальными параметрами
    для парсинга. Использует конфигурацию из PARSER_CONFIG.

    Returns:
        Настроенный экземпляр Chrome WebDriver

    Raises:
        WebDriverException: При ошибках создания или настройки WebDriver
        Exception: При других неожиданных ошибках

    Note:
        Функция использует декоратор @retry_on_failure для автоматических повторов.
        WebDriver запускается в headless режиме (без открытия окна браузера).
    """
    chrome_options = Options()
    # Запуск в headless режиме (без открытия окна браузера)
    chrome_options.add_argument("--headless")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("--disable-gpu")
    chrome_options.add_argument(f"--window-size={PARSER_CONFIG['WINDOW_SIZE']}")
    # Установка User-Agent из конфигурации
    chrome_options.add_argument(f"user-agent={PARSER_CONFIG['USER_AGENT']}")

    try:
        driver = webdriver.Chrome(options=chrome_options)
        # Неявное ожидание элементов из конфигурации
        driver.implicitly_wait(PARSER_CONFIG["IMPLICIT_WAIT"])
        logger.info("WebDriver успешно создан")
        return driver
    except WebDriverException as e:
        logger.error(f"Ошибка WebDriver при создании драйвера: {e}")
        logger.error("Убедитесь, что ChromeDriver установлен и доступен в PATH")
        raise
    except Exception as e:
        logger.error(f"Неожиданная ошибка при создании WebDriver: {e}")
        logger.error("Убедитесь, что ChromeDriver установлен и доступен в PATH")
        raise


def is_target_brand(name: str) -> bool:
    """
    Проверка, принадлежит ли товар одной из целевых марок.

    Проверяет, содержит ли название товара одно из целевых названий марок
    из конфигурации PARSER_CONFIG["TARGET_BRANDS"]. Сравнение выполняется
    без учета регистра.

    Args:
        name: Название товара для проверки

    Returns:
        True если товар принадлежит одной из целевых марок, False в противном случае

    Example:
        >>> is_target_brand("Vaillant eloBLOCK VE 6")
        True
        >>> is_target_brand("Произвольный котел")
        False

    Note:
        Использует TARGET_BRANDS из PARSER_CONFIG для проверки марок.
    """
    name_lower = name.lower()
    # Используем TARGET_BRANDS напрямую из конфигурации
    for brand in PARSER_CONFIG["TARGET_BRANDS"]:
        if brand.lower() in name_lower:
            return True
    return False


def validate_image_url_format(url: str) -> bool:
    """
    Валидация формата URL изображения.

    Проверяет, что URL имеет валидный формат изображения (jpg, jpeg, png, gif, webp).

    Args:
        url: URL изображения для проверки

    Returns:
        True если URL имеет валидный формат изображения, False в противном случае

    Example:
        >>> validate_image_url_format("https://example.com/image.jpg")
        True
        >>> validate_image_url_format("https://example.com/image.txt")
        False
        >>> validate_image_url_format("placeholder.png")
        False

    Note:
        Также проверяет, что URL не является placeholder-изображением.
    """
    if not url or not isinstance(url, str):
        return False

    # Проверка формата URL
    if not url.startswith(("http://", "https://")):
        return False

    # Проверка на валидные расширения изображений
    valid_extensions = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".bmp"]
    url_lower = url.lower()

    # Проверяем расширение в URL (до знака ? для query параметров)
    url_without_params = url_lower.split("?")[0]
    has_valid_extension = any(
        url_without_params.endswith(ext) for ext in valid_extensions
    )

    # Также проверяем наличие расширения в пути (может быть в середине пути)
    has_extension_in_path = any(
        f".{ext}" in url_without_params
        for ext in ["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp"]
    )

    # Если нет явного расширения, но есть индикаторы изображения в URL
    has_image_indicator = any(
        indicator in url_lower
        for indicator in ["/image/", "/img/", "/photo/", "/picture/", "image=", "img="]
    )

    return has_valid_extension or has_extension_in_path or has_image_indicator


def check_image_availability(url: str, timeout: Optional[int] = None) -> bool:
    """
    Проверка доступности изображения по URL.

    Выполняет HEAD-запрос к URL для проверки доступности изображения
    без загрузки всего файла. Проверяет статус код и content-type.

    Args:
        url: URL изображения для проверки
        timeout: Таймаут в секундах. Если не указан, используется
            значение из PARSER_CONFIG["IMAGE_VALIDATION_TIMEOUT"]

    Returns:
        True если изображение доступно и имеет валидный content-type,
        False в противном случае

    Example:
        >>> check_image_availability("https://example.com/image.jpg")
        True
        >>> check_image_availability("https://example.com/404.jpg")
        False

    Raises:
        URLError: При ошибках сети или недоступности URL
        HTTPError: При HTTP ошибках (404, 500 и т.д.)
        TimeoutError: При превышении таймаута
        ValueError: При некорректном URL
        ConnectionError: При ошибках соединения
        OSError: При системных ошибках

    Note:
        Функция выполняет HEAD-запрос, что быстрее чем GET, но не все серверы
        поддерживают HEAD. В случае ошибки возвращается False.
    """
    if timeout is None:
        timeout = PARSER_CONFIG.get("IMAGE_VALIDATION_TIMEOUT", 3)

    try:
        # Используем HEAD запрос для проверки без загрузки всего изображения
        request = Request(url, method="HEAD")
        request.add_header("User-Agent", PARSER_CONFIG["USER_AGENT"])

        with urlopen(request, timeout=timeout) as response:
            # Проверяем статус код
            if response.status != 200:
                return False

            # Проверяем Content-Type
            content_type = response.headers.get("Content-Type", "").lower()
            if "image" not in content_type:
                logger.debug(
                    f"URL не является изображением (Content-Type: {content_type}): {url}"
                )
                return False

            return True

    except (URLError, HTTPError, TimeoutError, ValueError) as e:
        logger.debug(f"Изображение недоступно {url}: {e}")
        return False
    except (ConnectionError, OSError) as e:
        logger.debug(f"Ошибка соединения при проверке изображения {url}: {e}")
        return False
    except Exception as e:
        logger.debug(f"Неожиданная ошибка при проверке изображения {url}: {e}")
        return False


def validate_and_filter_image_urls(
    image_urls: List[str], base_url: Optional[str] = None
) -> List[str]:
    """
    Валидация и фильтрация URL изображений

    Args:
        image_urls: Список URL изображений
        base_url: Базовый URL для преобразования относительных ссылок

    Returns:
        list: Список валидных URL изображений
    """
    if not PARSER_CONFIG.get("VALIDATE_IMAGE_URLS", True):
        return image_urls

    validated_urls = []
    invalid_count = 0

    for url in image_urls:
        if not url:
            continue

        # Преобразуем относительные ссылки в абсолютные
        if base_url and not url.startswith(("http://", "https://")):
            if url.startswith("/"):
                url = urljoin(base_url, url)
            else:
                url = urljoin(base_url + "/", url)

        # Пропускаем placeholder изображения
        url_lower = url.lower()
        if any(
            placeholder in url_lower
            for placeholder in [
                "placeholder",
                "woocommerce-placeholder",
                "no-image",
                "default-image",
                "missing",
            ]
        ):
            logger.debug(f"Пропущено placeholder изображение: {url}")
            invalid_count += 1
            continue

        # Валидация формата URL
        if not validate_image_url_format(url):
            logger.debug(f"Некорректный формат URL изображения: {url}")
            invalid_count += 1
            continue

        # Опциональная проверка доступности (может быть медленной)
        if PARSER_CONFIG.get("CHECK_IMAGE_AVAILABILITY", False):
            if not check_image_availability(url):
                logger.debug(f"Изображение недоступно: {url}")
                invalid_count += 1
                continue

        # Добавляем валидный URL
        if url not in validated_urls:
            validated_urls.append(url)

    if invalid_count > 0:
        logger.debug(f"Отфильтровано невалидных изображений: {invalid_count}")

    return validated_urls


class SoupCache:
    """
    Кэш для результатов поиска BeautifulSoup элементов
    Устраняет множественные вызовы find() для одних и тех же элементов
    """

    def __init__(self, soup: BeautifulSoup) -> None:
        """
        Инициализация кэша для объекта BeautifulSoup

        Args:
            soup: BeautifulSoup объект
        """
        self.soup = soup
        self._cache: Dict[Any, Any] = {}

    def find(
        self,
        name: Optional[str] = None,
        attrs: Optional[Dict[str, Any]] = None,
        **kwargs: Any,
    ) -> Any:
        """
        Кэшированный поиск элемента через find()

        Args:
            name: Имя тега
            attrs: Атрибуты для поиска
            **kwargs: Дополнительные аргументы для find()

        Returns:
            Найденный элемент или None
        """
        # Создаем ключ кэша на основе параметров поиска
        cache_key = (name, str(attrs) if attrs else None, str(kwargs))

        if cache_key not in self._cache:
            self._cache[cache_key] = self.soup.find(name, attrs, **kwargs)

        return self._cache[cache_key]

    def find_all(
        self,
        name: Optional[str] = None,
        attrs: Optional[Dict[str, Any]] = None,
        **kwargs: Any,
    ) -> Any:
        """
        Кэшированный поиск элементов через find_all()

        Args:
            name: Имя тега
            attrs: Атрибуты для поиска
            **kwargs: Дополнительные аргументы для find_all()

        Returns:
            Список найденных элементов
        """
        # Создаем ключ кэша с префиксом для find_all
        cache_key = ("find_all", name, str(attrs) if attrs else None, str(kwargs))

        if cache_key not in self._cache:
            self._cache[cache_key] = self.soup.find_all(name, attrs, **kwargs)

        return self._cache[cache_key]

    def select_one(self, selector: str) -> Any:
        """
        Кэшированный поиск элемента через CSS селектор

        Args:
            selector: CSS селектор

        Returns:
            Найденный элемент или None
        """
        cache_key = ("select_one", selector)

        if cache_key not in self._cache:
            self._cache[cache_key] = self.soup.select_one(selector)

        return self._cache[cache_key]

    def get_cached(self, key: Any) -> Optional[Any]:
        """
        Получение значения из кэша по ключу

        Args:
            key: Ключ кэша

        Returns:
            Значение из кэша или None
        """
        return self._cache.get(key)


def extract_country(soup: BeautifulSoup, cache: Optional["SoupCache"] = None) -> str:
    """
    Извлечение страны производства со страницы товара.

    Ищет информацию о стране производства в описании товара, проверяя
    различные паттерны и варианты написания. Поддерживает поиск в основном
    описании и кратком описании товара.

    Args:
        soup: BeautifulSoup объект страницы товара
        cache: Опциональный SoupCache объект для переиспользования кэша.
            Если не указан, создается новый кэш.

    Returns:
        Название страны производства или пустая строка, если не найдено

    Example:
        >>> from bs4 import BeautifulSoup
        >>> html = '<div itemprop="description">Производство: Германия</div>'
        >>> soup = BeautifulSoup(html, 'lxml')
        >>> extract_country(soup)
        'Германия'

    Note:
        Ищет следующие паттерны: "Производство", "Страна производства",
        "Страна-производитель", "Производитель", "Made in", "Country"
    """
    # Используем кэш для оптимизации поиска
    if cache is None:
        cache = SoupCache(soup)
    country = ""

    # Ищем страну в описании товара (itemprop="description")
    description_div = cache.find("div", itemprop="description")
    if description_div:
        description_text = description_div.get_text("\n", strip=True)
        lines = description_text.split("\n")

        # Паттерны для поиска страны производства
        country_patterns = [
            "Производство",
            "Страна производства",
            "Страна-производитель",
            "Производитель",
            "Made in",
            "Country",
        ]

        for line in lines:
            line_lower = line.lower()
            for pattern in country_patterns:
                if pattern.lower() in line_lower:
                    # Извлекаем страну (удаляем паттерн и оставляем только название)
                    if ":" in line:
                        country = line.split(":")[-1].strip()
                    else:
                        # Если нет двоеточия, берем текст после паттерна
                        parts = line.split(pattern, 1)
                        if len(parts) > 1:
                            country = parts[1].strip()

                    if country:
                        # Убираем возможные лишние символы
                        country = country.replace(".", "").strip()
                        # Явная проверка на пустую строку после очистки
                        if country and country.strip():
                            return country

    # Также ищем в кратком описании (используем кэш)
    short_description = cache.find(
        "div", class_="product-short-description"
    ) or cache.find("div", class_="woocommerce-product-details__short-description")
    if short_description and not country:
        short_text = short_description.get_text("\n", strip=True)
        for line in short_text.split("\n"):
            line_lower = line.lower()
            if "производство" in line_lower or "производитель" in line_lower:
                if ":" in line:
                    country = line.split(":")[-1].strip()
                else:
                    parts = line.split("Производство", 1)
                    if len(parts) > 1:
                        country = parts[1].strip()
                if country:
                    country = country.replace(".", "").strip()
                    # Явная проверка на пустую строку после очистки
                    if country and country.strip():
                        return country

    # Явно возвращаем пустую строку вместо None
    return country if country else ""


def extract_documentation(
    soup: BeautifulSoup, base_url: str, cache: Optional["SoupCache"] = None
) -> str:
    """
    Извлечение ссылки на документацию со страницы товара.

    Ищет ссылки на документацию (инструкции, руководства) в описании товара
    и других контейнерах страницы. Поддерживает преобразование относительных
    ссылок в абсолютные.

    Args:
        soup: BeautifulSoup объект страницы товара
        base_url: Базовый URL сайта для преобразования относительных ссылок
        cache: Опциональный SoupCache объект для переиспользования кэша.
            Если не указан, создается новый кэш.

    Returns:
        URL ссылки на документацию или пустая строка, если не найдено

    Example:
        >>> from bs4 import BeautifulSoup
        >>> html = '<div><a href="/manual.pdf">Инструкция</a></div>'
        >>> soup = BeautifulSoup(html, 'lxml')
        >>> extract_documentation(soup, "https://example.com")
        'https://example.com/manual.pdf'

    Note:
        Ищет ссылки с текстом: "инструкция", "документация", "руководство",
        "manual" (без учета регистра).
    """
    # Используем кэш для оптимизации поиска
    if cache is None:
        cache = SoupCache(soup)
    documentation_url = ""

    # Паттерны для поиска ссылок на документацию
    doc_patterns = [
        "инструкция",
        "Инструкция",
        "документация",
        "Документация",
        "руководство",
        "Руководство",
        "manual",
        "Manual",
    ]

    # Ищем ссылки в описании товара (itemprop="description")
    description_div = cache.find("div", itemprop="description")
    if description_div:
        # Ищем все ссылки в описании
        links = description_div.find_all("a", href=True)
        for link in links:
            link_text = link.get_text(strip=True).lower()
            link_href = link.get("href", "")

            # Проверяем, содержит ли текст ссылки один из паттернов
            for pattern in doc_patterns:
                if pattern.lower() in link_text:
                    # Проверяем, что ссылка ведет на PDF или является валидной
                    if link_href:
                        # Преобразуем относительную ссылку в абсолютную
                        if link_href.startswith("/"):
                            documentation_url = urljoin(base_url, link_href)
                        elif link_href.startswith("http"):
                            documentation_url = link_href
                        else:
                            documentation_url = urljoin(base_url, link_href)
                        return documentation_url

    # Также ищем в основном контенте страницы (используем кэш)
    content_areas = [
        cache.find("div", class_="woocommerce-Tabs-panel--description"),
        cache.find("div", class_="entry-content"),
        cache.find("div", class_="product-short-description"),
    ]

    for content_area in content_areas:
        if content_area and not documentation_url:
            links = content_area.find_all("a", href=True)
            for link in links:
                link_text = link.get_text(strip=True).lower()
                link_href = link.get("href", "")

                for pattern in doc_patterns:
                    if pattern.lower() in link_text and link_href:
                        if link_href.startswith("/"):
                            documentation_url = urljoin(base_url, link_href)
                        elif link_href.startswith("http"):
                            documentation_url = link_href
                        else:
                            documentation_url = urljoin(base_url, link_href)
                        # Явная проверка на валидность URL перед возвратом
                        if documentation_url and documentation_url.strip():
                            return documentation_url

    # Явно возвращаем пустую строку вместо None или пустого значения
    return (
        documentation_url if (documentation_url and documentation_url.strip()) else ""
    )


def extract_description_between_markers(
    soup: BeautifulSoup, cache: Optional["SoupCache"] = None
) -> str:
    """
    Извлечение описания товара между заголовком "Описание" и ссылкой "Инструкция".

    Ищет текст описания между маркерами начала ("Описание") и конца ("Инструкция"),
    объединяет все части описания и нормализует текст.

    Args:
        soup: BeautifulSoup объект страницы товара
        cache: Опциональный SoupCache объект для переиспользования кэша.
            Если не указан, создается новый кэш.

    Returns:
        Полное описание товара или пустая строка, если не найдено

    Example:
        >>> from bs4 import BeautifulSoup
        >>> html = '<div>Описание: Текст описания. Инструкция: ссылка</div>'
        >>> soup = BeautifulSoup(html, 'lxml')
        >>> extract_description_between_markers(soup)
        'Текст описания.'

    Note:
        Удаляет символы новой строки и заменяет "|" на "-" в описании.
    """
    # Используем кэш для оптимизации поиска
    if cache is None:
        cache = SoupCache(soup)
    description_parts = []

    # Ищем контейнер с описанием (панель вкладки "Описание")
    description_container = cache.find(
        "div", class_="woocommerce-Tabs-panel--description"
    ) or cache.find("div", class_="entry-content")

    if not description_container:
        return ""

    # Находим ссылку на инструкцию (конечная точка для извлечения)
    instruction_link_text = None
    links = description_container.find_all("a", href=True)
    for link in links:
        link_text = link.get_text(strip=True)
        # Ищем ссылку, содержащую "Инструкция"
        if "Инструкция" in link_text:
            instruction_link_text = link_text
            break

    # Находим все дочерние элементы контейнера (параграфы, заголовки и т.д.)
    all_elements = description_container.find_all(
        ["p", "h2", "h3", "div"], recursive=False
    )

    for element in all_elements:
        element_text = element.get_text(strip=True)
        has_instruction_link = False

        # Пропускаем заголовок "Описание" (если он есть как отдельный элемент)
        if element_text == "Описание":
            continue

        # Если это заголовок "Технические характеристики", останавливаемся
        if "Технические характеристики" in element_text:
            break

        # Проверяем, содержит ли элемент ссылку на инструкцию
        if instruction_link_text:
            element_links = element.find_all("a", href=True, recursive=True)

            for link in element_links:
                link_text = link.get_text(strip=True)
                if "Инструкция" in link_text or (
                    instruction_link_text and instruction_link_text in link_text
                ):
                    has_instruction_link = True
                    break

            # Если элемент содержит ссылку на инструкцию, извлекаем только текст до неё
            if has_instruction_link:
                # Извлекаем текст только до ссылки на инструкцию
                text_before_link = ""
                for content in element.descendants:
                    # Если это ссылка на инструкцию, останавливаемся
                    if hasattr(content, "name") and content.name == "a":
                        link_text = content.get_text(strip=True)
                        if "Инструкция" in link_text:
                            break
                    # Если это текстовый узел, добавляем его
                    if (
                        hasattr(content, "string")
                        and content.string
                        and not hasattr(content, "name")
                    ):
                        text = content.string.strip()
                        if text:
                            text_before_link += text + " "

                if text_before_link.strip():
                    description_parts.append(text_before_link.strip())
                break

        # Добавляем текст элемента (если он не содержит ссылку на инструкцию)
        if element_text and not has_instruction_link:
            description_parts.append(element_text)

    # Объединяем все части описания
    full_description = " ".join(description_parts)
    full_description = full_description.replace("\n", " ")
    full_description = full_description.replace("|", "-")

    # Убираем лишние пробелы
    full_description = " ".join(full_description.split())

    return full_description


def extract_specifications_flexible(
    soup: BeautifulSoup, cache: Optional["SoupCache"] = None
) -> str:
    """
    Гибкое извлечение технических характеристик с учетом разных структур данных.

    Поддерживает различные форматы представления характеристик:
    - Таблицы (table)
    - Списки (ul, ol)
    - Текстовые блоки с маркерами начала/конца

    Args:
        soup: BeautifulSoup объект страницы товара
        cache: Опциональный SoupCache объект для переиспользования кэша.
            Если не указан, создается новый кэш.

    Returns:
        Текст технических характеристик в формате "Ключ: Значение" или пустая строка

    Example:
        >>> from bs4 import BeautifulSoup
        >>> html = '<table><tr><td>Мощность</td><td>6 кВт</td></tr></table>'
        >>> soup = BeautifulSoup(html, 'lxml')
        >>> extract_specifications_flexible(soup)
        'Мощность: 6 кВт'

    Note:
        Ищет характеристики в различных контейнерах: таблицах, списках,
        блоках с классом "specifications" и т.д.
    """
    # Используем кэш для оптимизации поиска
    if cache is None:
        cache = SoupCache(soup)
    specs_text = ""

    # Ищем контейнеры с характеристиками в разных местах (используем кэш)
    containers = [
        cache.find(
            "table", class_="spec_sheet"
        ),  # Таблица с классом spec_sheet (приоритет)
        cache.find("div", class_="product-short-description"),
        cache.find("div", class_="woocommerce-product-details__short-description"),
        cache.find("div", class_="entry-content"),
        cache.find("div", class_="woocommerce-Tabs-panel--description"),
        cache.find("table", class_="woocommerce-product-attributes"),
    ]

    for container in containers:
        if not container:
            continue

        # Если это таблица характеристик с классом spec_sheet
        if container.name == "table" and "spec_sheet" in container.get("class", []):
            rows = container.find_all("tr")
            for row in rows:
                # Ищем все ячейки в строке
                cells = row.find_all("td")
                if len(cells) >= 3:
                    # Структура: название параметра, единица измерения, значение
                    param_name = cells[0].get_text(strip=True)
                    unit = cells[1].get_text(strip=True)
                    # Получаем полный текст из ячейки значения (включая примечания)
                    value_cell = cells[2]
                    value = value_cell.get_text("\n", strip=True)
                    # Если есть несколько строк в ячейке (значение и примечание), объединяем их
                    value = " ".join(value.split("\n"))

                    if param_name and value:
                        # Объединяем значение и единицу измерения
                        if unit:
                            specs_text += f"{param_name}: {value} {unit}\n"
                        else:
                            specs_text += f"{param_name}: {value}\n"
                elif len(cells) == 2:
                    # Альтернативная структура: название и значение
                    param_name = cells[0].get_text(strip=True)
                    # Получаем полный текст из ячейки значения (включая примечания)
                    value_cell = cells[1]
                    value = value_cell.get_text("\n", strip=True)
                    # Если есть несколько строк в ячейке, объединяем их
                    value = " ".join(value.split("\n"))
                    if param_name and value:
                        specs_text += f"{param_name}: {value}\n"
            if specs_text.strip():
                break

        # Если это обычная таблица характеристик
        elif container.name == "table":
            rows = container.find_all("tr")
            for row in rows:
                th = row.find("th")
                td = row.find("td")
                if th and td:
                    key = th.get_text(strip=True)
                    value = td.get_text(strip=True)
                    if key and value:
                        specs_text += f"{key}: {value}\n"
            if specs_text.strip():
                break

        # Если это текстовая структура
        text = container.get_text("\n", strip=True)
        lines = text.split("\n")

        # Различные маркеры начала характеристик
        start_markers = [
            "Мощность",
            "Питание от сети",
            "Напряжение",
            "Регулировка мощности",
            "Технические характеристики",
        ]

        # Различные маркеры конца характеристик
        end_markers = [
            "Возможно подключение датчика уличной температуры",
            "Документация",
            "Инструкция",
            "Описание",
            "Доставка",
        ]

        start_idx = -1
        end_idx = -1

        # Находим начало характеристик
        for i, line in enumerate(lines):
            for marker in start_markers:
                if marker in line:
                    start_idx = i
                    break
            if start_idx != -1:
                break

        # Находим конец характеристик
        if start_idx != -1:
            for i, line in enumerate(lines[start_idx + 1 :], start=start_idx + 1):
                for marker in end_markers:
                    if marker in line:
                        end_idx = i
                        break
                if end_idx != -1:
                    break

        # Извлекаем характеристики
        if start_idx != -1:
            end_range = end_idx + 1 if end_idx != -1 else len(lines)
            for line in lines[start_idx:end_range]:
                # Пропускаем пустые строки и заголовки
                if not line.strip() or line.strip() in [
                    "Описание",
                    "Технические характеристики",
                ]:
                    continue
                # Извлекаем строки с характеристиками (содержат двоеточие)
                if ":" in line:
                    specs_text += line.strip() + "\n"

        # Если нашли характеристики, прекращаем поиск
        if specs_text.strip():
            break

    return specs_text.strip()


def normalize_spec_value(value: str) -> str:
    """
    Нормализация значения характеристики (удаление лишних пробелов, символов).

    Удаляет лишние пробелы, двоеточия в конце и нормализует строку
    для последующего использования в парсинге.

    Args:
        value: Исходное значение характеристики

    Returns:
        Нормализованное значение без лишних пробелов и символов

    Example:
        >>> normalize_spec_value("  6 кВт  :")
        '6 кВт'
        >>> normalize_spec_value("220  В")
        '220 В'

    Note:
        Если value пустая строка или None, возвращается пустая строка.
    """
    if not value:
        return ""
    # Убираем лишние пробелы
    value = " ".join(value.split())
    # Убираем лишние двоеточия в конце
    value = value.rstrip(":")
    return value.strip()


def extract_power(specs_text: str, product_name: str = "") -> Dict[str, str]:
    """
    Извлечение мощности из текста характеристик.

    Извлекает значения мощности для целевых марок котлов с приоритетом:
    1. "Максимальная тепловая мощность"
    2. "Регулировка мощности" (для power_regulation и как запасной вариант)
    3. Просто "Мощность" (если предыдущие не найдены)

    Args:
        specs_text: Текст характеристик в формате "Ключ: Значение"
        product_name: Название товара для определения целевых марок.
            Если товар не является целевой маркой, возвращается пустой словарь.

    Returns:
        Словарь с извлеченными значениями:
        - power (str): Значение мощности в кВт
        - power_regulation (str): Значение регулировки мощности (опционально)

    Example:
        >>> specs = "Максимальная тепловая мощность: 6-12 кВт"
        >>> extract_power(specs, "Vaillant eloBLOCK")
        {'power': '6-12'}

    Note:
        Работает только для целевых марок: vaillant, eloblock, protherm,
        скат, teknix, espro, tecline. Для других марок возвращает пустой словарь.
    """
    result = {}

    if not specs_text:
        return result

    # Определяем марки, для которых нужно извлекать мощность из "Регулировка мощности"
    target_brands_for_power_extraction = [
        "vaillant",
        "eloblock",
        "protherm",
        "скат",
        "teknix",
        "espro",
        "tecline",
    ]

    is_target_brand = any(
        brand in product_name.lower() for brand in target_brands_for_power_extraction
    )

    if is_target_brand:
        # Сначала ищем "Максимальная тепловая мощность" (приоритет)
        # Затем ищем "Регулировка мощности" (если максимальная мощность не найдена)
        max_power_found = False

        for line in specs_text.split("\n"):
            if ":" in line:
                key = line.split(":")[0].strip().lower()
                value = line.split(":", 1)[1].strip() if ":" in line else ""

                # Проверяем "Максимальная тепловая мощность" (приоритет)
                if (
                    "максимальная тепловая мощность" in key
                    and value
                    and not max_power_found
                ):
                    value_clean = value.strip()

                    # Извлекаем числовое значение (убираем "кВт" и другие единицы измерения)
                    power_match = re.search(REGEX_POWER_NUMERIC_VALUE, value_clean)
                    if power_match:
                        power_value = power_match.group(1).strip()
                        # Сохраняем только числовое значение без "кВт"
                        result["power"] = power_value
                        max_power_found = True
                    else:
                        # Если не нашли число, убираем "кВт" если есть
                        power_value_clean = re.sub(
                            REGEX_REMOVE_KW_UNIT, "", value_clean, flags=re.IGNORECASE
                        ).strip()
                        result["power"] = (
                            power_value_clean if power_value_clean else value_clean
                        )
                        max_power_found = True
                    # Не прерываем цикл, продолжаем искать
                    # "Регулировка мощности" для power_regulation

                # Проверяем "Регулировка мощности"
                # (для power_regulation и как запасной вариант для power)
                elif "регулировка мощности" in key and value:
                    value_clean = value.strip()

                    # Извлекаем числовое значение
                    power_match = re.search(REGEX_POWER_NUMERIC_VALUE, value_clean)
                    if power_match:
                        power_value = power_match.group(1).strip()
                        # Если максимальная мощность не найдена, используем регулировку для power
                        if not max_power_found:
                            result["power"] = power_value
                        # Для power_regulation сохраняем числовое значение без "кВт"
                        result["power_regulation"] = power_value
                    else:
                        # Если не нашли число, убираем "кВт" если есть
                        power_value_clean = re.sub(
                            REGEX_REMOVE_KW_UNIT, "", value_clean, flags=re.IGNORECASE
                        ).strip()
                        if not max_power_found:
                            result["power"] = (
                                power_value_clean if power_value_clean else value_clean
                            )
                        # Для power_regulation сохраняем без "кВт"
                        result["power_regulation"] = (
                            power_value_clean if power_value_clean else value_clean
                        )

                    # Если уже нашли максимальную мощность, можно прервать
                    if max_power_found:
                        break

        # Если не нашли ни максимальную мощность, ни регулировку, ищем просто "Мощность"
        if "power" not in result:
            for line in specs_text.split("\n"):
                if ":" in line:
                    key = line.split(":")[0].strip().lower()
                    value = line.split(":", 1)[1].strip() if ":" in line else ""

                    # Ищем просто "Мощность" (без "максимальная" и "регулировка")
                    if (
                        "мощность" in key
                        and "максимальная" not in key
                        and "регулировка" not in key
                        and value
                    ):
                        value_clean = value.strip()
                        power_match = re.search(REGEX_POWER_NUMERIC_VALUE, value_clean)
                        if power_match:
                            power_value = power_match.group(1).strip()
                            result["power"] = power_value
                        else:
                            power_value_clean = re.sub(
                                REGEX_REMOVE_KW_UNIT,
                                "",
                                value_clean,
                                flags=re.IGNORECASE,
                            ).strip()
                            result["power"] = (
                                power_value_clean if power_value_clean else value_clean
                            )
                        break

    return result


def extract_voltage(specs_text: str) -> str:
    """
    Извлечение напряжения из текста характеристик.

    Ищет строки с ключевыми словами "питание от сети" или "напряжение"
    и извлекает значение напряжения.

    Args:
        specs_text: Текст характеристик в формате "Ключ: Значение"

    Returns:
        Извлеченное значение напряжения или пустая строка, если не найдено

    Example:
        >>> specs = "Питание от сети: 220 В"
        >>> extract_voltage(specs)
        '220 В'

    Note:
        Ищет ключевые слова: "питание от сети", "напряжение"
    """
    if not specs_text:
        return ""

    voltage_keywords = [
        "питание от сети",
        "напряжение",
    ]

    for line in specs_text.split("\n"):
        if ":" not in line:
            continue

        key = line.split(":")[0].strip().lower()
        value = line.split(":", 1)[1].strip() if ":" in line else ""

        # Проверяем наличие ключевых слов напряжения
        if any(keyword in key for keyword in voltage_keywords):
            value_clean = normalize_spec_value(value)
            if value_clean:
                return value_clean

    return ""


def extract_water_heating(value: str, line: str) -> str:
    """
    Извлечение и обработка значения ГВС (нагрев воды).

    Обрабатывает значения ГВС, удаляя единицы измерения (л/мин) и проверяя
    наличие упоминаний о внешнем баке. Фильтрует пустые и невалидные значения.

    Args:
        value: Исходное значение характеристики ГВС
        line: Полная строка для проверки контекста (используется для
            поиска упоминаний о внешнем баке)

    Returns:
        Обработанное значение ГВС или пустая строка для пропуска невалидных значений

    Example:
        >>> extract_water_heating("12.5 л/мин", "ГВС: 12.5 л/мин")
        '12.5'
        >>> extract_water_heating("в выносном баке", "ГВС: в выносном баке")
        'в выносном баке'
        >>> extract_water_heating("Ø", "ГВС: Ø")
        ''

    Note:
        Удаляет единицы измерения: л/мин, l/min
        Проверяет наличие упоминаний о внешнем баке в значении и строке
    """
    if not value:
        return ""

    line_lower = line.lower()

    # Проверяем наличие примечаний о внешнем баке
    external_tank_indicators = [
        "в выносном баке",
        "внешний бак",
        "выносной бак",
        "external tank",
        "внешнем баке",
    ]

    has_external_tank = any(
        indicator in line_lower for indicator in external_tank_indicators
    )

    # Убираем единицы измерения (л/мин, л/мин, л/мин и т.д.)
    # Паттерны для удаления единиц измерения и числовых значений с единицами
    # Удаляем паттерны типа "12.5 л/мин", "10 л/мин", "л/мин" и т.д.
    units_pattern = re.compile(REGEX_REMOVE_DHW_UNIT_WITH_NUMBER, re.IGNORECASE)
    # Также удаляем просто "л/мин" без числа
    simple_units_pattern = re.compile(REGEX_REMOVE_DHW_UNIT_SIMPLE, re.IGNORECASE)
    value_clean = units_pattern.sub("", value)
    value_clean = simple_units_pattern.sub("", value_clean).strip()
    value_clean_lower = value_clean.lower()

    # Проверяем наличие упоминания о внешнем баке в очищенном значении
    has_external_tank_in_value = any(
        indicator in value_clean_lower for indicator in external_tank_indicators
    )

    # Если есть упоминание о внешнем баке в очищенном значении или в исходной строке
    if has_external_tank_in_value or has_external_tank:
        # Оставляем только текст о внешнем баке, убирая единицы измерения
        return "в выносном баке"
    # Если значение "Ø" или пустое после очистки
    elif value_clean.strip() in ["Ø", "", "-", "—", "нет", "no"]:
        # Не сохраняем пустые значения
        return ""
    # Если значение не пустое и не "Ø" после очистки
    elif value_clean.strip() not in ["Ø", "", "-", "—", "нет", "no"]:
        return value_clean
    # Иначе не сохраняем
    else:
        return ""


def parse_specifications(specs_text: str, product_name: str = "") -> Dict[str, Any]:
    """
    Парсинг текста характеристик в словарь с нормализацией данных.

    Извлекает технические характеристики из текста и преобразует их в словарь
    с нормализованными ключами. Поддерживает специальную обработку для целевых
    марок котлов (извлечение мощности из "Регулировка мощности").

    Args:
        specs_text: Текст характеристик в формате "Ключ: Значение"
        product_name: Название товара для специальной обработки.
            Используется для определения целевых марок.

    Returns:
        Словарь с распарсенными характеристиками. Ключи соответствуют полям
        модели ElectricBoiler (power, voltage, water_heating и т.д.)

    Example:
        >>> specs = "Мощность: 6 кВт\\nНапряжение: 220 В"
        >>> parse_specifications(specs)
        {'power': '6', 'voltage': '220 В'}

    Raises:
        ValueError: Если specs_text содержит некорректные данные
        (обрабатывается внутри функции, возвращается пустой словарь)

    Note:
        Для целевых марок (vaillant, protherm и др.) выполняется специальная
        обработка мощности из поля "Регулировка мощности".
    """
    specs_dict = {}

    if not specs_text:
        return specs_dict

    # Извлекаем мощность с помощью специализированной функции
    power_data = extract_power(specs_text, product_name)
    specs_dict.update(power_data)

    # Определяем, является ли товар целевой маркой для специальной обработки мощности
    target_brands_for_power_extraction = [
        "vaillant",
        "eloblock",
        "protherm",
        "скат",
        "teknix",
        "espro",
        "tecline",
    ]

    is_target_brand = any(
        brand in product_name.lower() for brand in target_brands_for_power_extraction
    )

    # Расширенный маппинг названий характеристик на поля модели
    # Учитываем различные варианты написания
    field_mapping = {
        "Максимальная тепловая мощность": "power",
        "Максимальная мощность": "power",
        "Мощность": "power",
        "Мощность, кВт": "power",
        "Мощность (кВт)": "power",
        "Регулировка мощности": "power_regulation",
        "Регулировка": "power_regulation",
        "Площадь отопления": "heating_area",
        "Площадь отопления, рекомендуемая до": "heating_area",
        "Площадь отопления (м²)": "heating_area",
        "Начальный вариант работы": "work_type",
        "Режим работы": "work_type",
        "Возможность для работы самостоятельно": "self_work",
        "Автономная работа": "self_work",
        "Возможность для нагрева воды": "water_heating",
        "Нагрев воды": "water_heating",
        "ГВС (вода)": "water_heating",
        "ГВС": "water_heating",
        "DHW (water)": "water_heating",
        "DHW": "water_heating",
        "Возможность нагрева теплого пола": "floor_heating",
        "Теплый пол": "floor_heating",
        "Расширительный бак": "expansion_tank",
        "Объем расширительного бака": "expansion_tank",
        "Expansion tank volume": "expansion_tank",
        "Циркуляционный насос": "circulation_pump",
        "Насос": "circulation_pump",
        "Питание от сети": "voltage",
        "Питание от сети, Вольт": "voltage",
        "Напряжение": "voltage",
        "Напряжение (В)": "voltage",
        "Кабель подключения": "cable",
        "Кабель": "cable",
        "Предохранитель": "fuse",
        "Предохранитель, А": "fuse",
        "Предохранитель (А)": "fuse",
        "Диапазон выбираемых температур": "temp_range",
        "Диапазон температур": "temp_range",
        "Температура радиаторного отопления": "temp_range_radiator",
        "Температура теплого пола": "temp_range_floor",
        "Подключение к системе": "connection",
        "Подключение": "connection",
        "Габаритные размеры": "dimensions",
        "Размеры": "dimensions",
        "Размеры (мм)": "dimensions",
        "WiFi": "wifi",
        "Возможность подключения WiFi": "wifi",
        "Wi-Fi": "wifi",
        "Возможность подключения комнатного термостата": "thermostat",
        "Комнатный термостат": "thermostat",
        "Комнатный термостат в комплекте": "thermostat_included",
        "Термостат в комплекте": "thermostat_included",
        "Возможно подключение датчика уличной температуры": "outdoor_sensor",
        "Датчик уличной температуры": "outdoor_sensor",
    }

    # Парсим характеристики построчно
    for line in specs_text.split("\n"):
        if ":" not in line:
            continue

        # Разделяем на ключ и значение
        parts = line.split(":", 1)
        if len(parts) != 2:
            continue

        key = parts[0].strip()
        value = parts[1].strip()

        # Нормализуем значение
        value = normalize_spec_value(value)

        # Ищем соответствие в маппинге (проверяем точное совпадение и вхождение)
        matched_field = None

        # Специальная проверка для ГВС (приоритет)
        key_lower = key.lower()
        if "гвс" in key_lower or "dhw" in key_lower:
            # Проверяем наличие упоминания воды или если это просто ГВС/DHW
            if (
                "вода" in key_lower
                or "water" in key_lower
                or key_lower.strip() in ["гвс", "dhw"]
            ):
                matched_field = "water_heating"

        # Специальная проверка для объема расширительного бака (приоритет)
        if not matched_field:
            if (
                "объем расширительного бака" in key_lower
                or "expansion tank volume" in key_lower
            ):
                matched_field = "expansion_tank"

        # Если специальные проверки не сработали, используем обычный маппинг
        if not matched_field:
            for spec_key, field_name in field_mapping.items():
                # Проверяем точное совпадение ключа
                if spec_key.lower() == key_lower:
                    matched_field = field_name
                    break
                # Проверяем вхождение ключа
                if spec_key.lower() in key_lower:
                    matched_field = field_name
                    break

        if matched_field:
            # Для целевых марок: если мощность уже извлечена из "Максимальная тепловая мощность"
            # или "Регулировка мощности", не перезаписываем её обычным парсингом
            if matched_field == "power" and is_target_brand and "power" in specs_dict:
                # Пропускаем установку мощности, если она уже была извлечена специальной логикой
                continue

            # Для мощности убираем "кВт" из значения
            if matched_field == "power":
                # Убираем "кВт" и другие единицы измерения, оставляем только числовое значение
                power_value_clean = re.sub(
                    REGEX_REMOVE_KW_UNIT, "", value, flags=re.IGNORECASE
                ).strip()
                specs_dict[matched_field] = (
                    power_value_clean if power_value_clean else value
                )
            # Для регулировки мощности также убираем "кВт" из значения
            elif matched_field == "power_regulation":
                # Убираем "кВт" и другие единицы измерения, оставляем только числовое значение
                power_reg_value_clean = re.sub(
                    REGEX_REMOVE_KW_UNIT, "", value, flags=re.IGNORECASE
                ).strip()
                specs_dict[matched_field] = (
                    power_reg_value_clean if power_reg_value_clean else value
                )
            # Для температурных диапазонов нужно проверить контекст
            elif matched_field == "temp_range":
                # Если в ключе есть "радиатор", то это temp_range_radiator
                if "радиатор" in key.lower():
                    specs_dict["temp_range_radiator"] = value
                    continue
                # Если в ключе есть "пол" или "теплый", то это temp_range_floor
                elif "пол" in key.lower() or "теплый" in key.lower():
                    specs_dict["temp_range_floor"] = value
                    continue
                else:
                    specs_dict[matched_field] = value
            # Специальная обработка для ГВС (нагрев воды) с помощью специализированной функции
            elif matched_field == "water_heating":
                water_heating_value = extract_water_heating(value, line)
                # Если функция вернула пустую строку, пропускаем это значение
                if not water_heating_value:
                    continue
                specs_dict[matched_field] = water_heating_value
            # Специальная обработка для объема расширительного бака
            elif matched_field == "expansion_tank":
                # Сохраняем значение с единицей измерения (если есть)
                # Если единица уже в значении, оставляем как есть
                if value and value.strip() not in ["Ø", "", "-", "—", "нет", "no"]:
                    # Нормализуем значение, убирая лишние пробелы
                    value_clean = " ".join(value.split())
                    specs_dict[matched_field] = value_clean
                elif value.strip() in ["Ø", "", "-", "—", "нет", "no"]:
                    # Если значение пустое или "Ø", не сохраняем
                    continue
            else:
                specs_dict[matched_field] = value

    return specs_dict


@retry_on_failure(
    max_attempts=PARSER_CONFIG["RETRY_COUNT"],
    delay=PARSER_CONFIG["RETRY_DELAY"],
    exceptions=(TimeoutException, Exception),
)
@measure_time
def get_product_details(driver: Any, product_url: str) -> Dict[str, Any]:
    """
    Получение дополнительной информации со страницы товара с использованием Selenium.

    Загружает страницу товара, извлекает описание, изображения, технические
    характеристики, страну производства и ссылку на документацию.
    Использует кэширование BeautifulSoup для оптимизации производительности.

    Args:
        driver: Selenium WebDriver объект для навигации по страницам
        product_url: URL страницы товара для парсинга

    Returns:
        Словарь с данными товара, содержащий следующие ключи:
        - description (str): Полное описание товара
        - image_urls (list): Список URL изображений товара
        - specifications (str): Текст технических характеристик
        - country (str): Страна производства
        - documentation (str): URL ссылки на документацию

    Example:
        >>> driver = get_driver()
        >>> details = get_product_details(driver, "https://example.com/product/123")
        >>> print(details["description"])
        'Описание товара...'

    Raises:
        TimeoutException: Если страница не загрузилась в течение таймаута
        NoSuchElementException: Если не найдены необходимые элементы на странице
        StaleElementReferenceException: Если элемент стал устаревшим
        WebDriverException: При ошибках WebDriver
        Exception: При других неожиданных ошибках

    Note:
        Функция использует декораторы @retry_on_failure и @measure_time
        для автоматических повторов и измерения времени выполнения.
    """
    try:
        # Переход на страницу товара
        driver.get(product_url)

        # Ожидание загрузки страницы (ждем появления основного контента)
        try:
            WebDriverWait(driver, PARSER_CONFIG["PAGE_LOAD_TIMEOUT"]).until(
                EC.presence_of_element_located((By.CLASS_NAME, "product"))
            )
        except TimeoutException:
            logger.warning(f"Таймаут при загрузке страницы товара: {product_url}")

        # Задержка для rate limiting (избежание блокировки IP)
        time.sleep(PARSER_CONFIG["PAGE_DELAY"])

        # Получаем HTML страницы для парсинга BeautifulSoup
        page_source = driver.page_source
        soup = BeautifulSoup(page_source, "lxml")

        # Создаем единый кэш для всех операций поиска на этой странице
        # Это устраняет множественные вызовы find() для одних и тех же элементов
        # и позволяет переиспользовать кэш между функциями
        cache = SoupCache(soup)

        # Извлекаем описание товара (передаем кэш для переиспользования)
        full_description = extract_description_between_markers(soup, cache)

        # Получаем все изображения товара (используем кэш)
        raw_image_urls = []
        gallery = cache.find("div", class_="woocommerce-product-gallery")
        if gallery:
            for img in gallery.find_all("img"):
                src = img.get("src") or img.get("data-src") or img.get("data-lazy-src")
                if src and src not in raw_image_urls:
                    raw_image_urls.append(src)

        # Валидация и фильтрация URL изображений
        # Получаем базовый URL для преобразования относительных ссылок
        parsed_url = urlparse(product_url)
        base_url_str = f"{parsed_url.scheme}://{parsed_url.netloc}"
        image_urls = validate_and_filter_image_urls(raw_image_urls, base_url_str)

        if len(image_urls) < len(raw_image_urls):
            logger.debug(
                f"Отфильтровано изображений: {len(raw_image_urls)} -> {len(image_urls)}"
            )

        # Извлекаем технические характеристики (передаем кэш для переиспользования)
        specs_text = extract_specifications_flexible(soup, cache)

        # Извлекаем страну производства (передаем кэш для переиспользования)
        country = extract_country(soup, cache)
        # Проверяем, что страна не пустая и не None
        if not country or country.strip() == "":
            country = ""
            logger.debug(f"Страна производства не найдена для товара: {product_url}")

        # Извлекаем ссылку на документацию (передаем кэш для переиспользования)
        # Получаем базовый URL сайта (протокол + домен)
        parsed_url = urlparse(product_url)
        base_url_str = f"{parsed_url.scheme}://{parsed_url.netloc}"
        documentation = extract_documentation(soup, base_url_str, cache)
        # Проверяем, что документация не пустая и не None
        if not documentation or documentation.strip() == "":
            documentation = ""
            logger.debug(f"Документация не найдена для товара: {product_url}")

        # Проверяем другие поля на пустые значения
        if not full_description or full_description.strip() == "":
            logger.debug(f"Описание не найдено для товара: {product_url}")
        if not specs_text or specs_text.strip() == "":
            logger.warning(
                f"Технические характеристики не найдены для товара: {product_url}"
            )
        if not image_urls:
            logger.debug(f"Изображения не найдены для товара: {product_url}")

        logger.debug(f"Успешно извлечены данные для товара: {product_url}")
        return {
            "description": full_description or "",
            "image_urls": image_urls or [],
            "specifications": specs_text or "",
            "country": country or "",
            "documentation": documentation or "",
        }
    except TimeoutException as e:
        logger.error(f"Таймаут при запросе страницы товара {product_url}: {e}")
        return {
            "description": "",
            "image_urls": [],
            "specifications": "",
            "country": "",
            "documentation": "",
        }
    except (NoSuchElementException, StaleElementReferenceException) as e:
        logger.warning(f"Проблема с элементом на странице товара {product_url}: {e}")
        return {
            "description": "",
            "image_urls": [],
            "specifications": "",
            "country": "",
            "documentation": "",
        }
    except WebDriverException as e:
        logger.error(
            f"Ошибка WebDriver при парсинге страницы товара {product_url}: {e}"
        )
        return {
            "description": "",
            "image_urls": [],
            "specifications": "",
            "country": "",
            "documentation": "",
        }
    except Exception as e:
        logger.error(
            f"Неожиданная ошибка при парсинге страницы товара {product_url}: {e}"
        )
        return {
            "description": "",
            "image_urls": [],
            "specifications": "",
            "country": "",
            "documentation": "",
        }


def extract_voltage_from_description(
    description: str, product_name: str, power_value: str
) -> str:
    """
    Извлечение напряжения питания из описания товара на основе мощности.

    Специализированная функция для котлов Vaillant eloBLOCK, которая извлекает
    информацию о напряжении из описания на основе мощности котла.

    Для котлов Vaillant eloBLOCK:
    - Котлы мощностью 6 кВт и 9 кВт могут работать от сети с напряжением ~220В и ~380В
    - Модели, начиная с 12 кВт, могут работать только от сети мощностью ~380 В

    Args:
        description: Описание товара для поиска информации о напряжении
        product_name: Название товара для проверки марки
        power_value: Значение мощности котла в кВт

    Returns:
        Текст с информацией о напряжении или пустая строка, если не найдено

    Example:
        >>> desc = "Котлы мощностью 6 кВт и 9 кВт могут работать от сети с напряжением ~220В и ~380В"
        >>> extract_voltage_from_description(desc, "Vaillant eloBLOCK VE 6", "6")
        '220 В и 380 В'

    Note:
        Работает только для товаров марки Vaillant eloBLOCK.
        Использует регулярные выражения для поиска паттернов напряжения.
    """
    if not description or not product_name:
        return ""

    # Проверяем, является ли это котлом Vaillant eloBLOCK
    name_lower = product_name.lower()
    if "vaillant" not in name_lower or "eloblock" not in name_lower:
        return ""

    description_lower = description.lower()

    # Определяем мощность котла
    power_num = None
    if power_value:
        try:
            # Извлекаем числовое значение мощности
            power_match = re.search(REGEX_SIMPLE_NUMERIC_VALUE, str(power_value))
            if power_match:
                power_num = float(power_match.group(1).replace(",", "."))
        except (ValueError, AttributeError):
            pass

    # Паттерны для поиска информации о напряжении в описании
    # Паттерн 1: "Котлы мощностью 6 кВт и 9 кВт могут работать от сети с напряжением ~220В и ~380В"
    pattern_6_9 = re.compile(REGEX_VOLTAGE_6_9_KW, re.IGNORECASE | re.DOTALL)

    # Паттерн 2: "Модели, начиная с 12 кВт, могут работать только от сети мощностью ~380 В"
    pattern_12_plus = re.compile(REGEX_VOLTAGE_12_PLUS_KW, re.IGNORECASE | re.DOTALL)

    # Паттерн 3: "Важно!!! Модели, начиная с 12 кВт,
    # могут работать только от сети мощностью ~380 В"
    pattern_important = re.compile(
        REGEX_VOLTAGE_12_PLUS_KW_IMPORTANT, re.IGNORECASE | re.DOTALL
    )

    # Ищем информацию о напряжении в описании
    # Сначала проверяем паттерн для 6 и 9 кВт
    match_6_9 = pattern_6_9.search(description_lower)
    if match_6_9:
        voltage_text = match_6_9.group(1)
        if voltage_text:
            # Нормализуем текст напряжения (убираем ~ и лишние пробелы)
            voltage_text = re.sub(REGEX_REMOVE_TILDE, "", voltage_text)
            voltage_text = " ".join(voltage_text.split())
            # Если мощность соответствует, возвращаем найденное значение
            if power_num is None or power_num == 6 or power_num == 9:
                return voltage_text

    # Проверяем паттерн для 12 кВт и выше
    match_12_plus = pattern_12_plus.search(
        description_lower
    ) or pattern_important.search(description_lower)
    if match_12_plus:
        voltage_text = match_12_plus.group(1)
        if voltage_text:
            # Нормализуем текст напряжения
            voltage_text = re.sub(REGEX_REMOVE_TILDE, "", voltage_text)
            voltage_text = " ".join(voltage_text.split())
            # Если мощность соответствует, возвращаем найденное значение
            if power_num is None or power_num >= 12:
                return voltage_text

    # Если не нашли точные паттерны, определяем на основе мощности и наличия упоминаний
    if power_num is not None:
        # Для мощности 6 кВт или 9 кВт
        if power_num == 6 or power_num == 9:
            # Проверяем, есть ли в описании упоминание о 220В и 380В
            if "220" in description_lower and "380" in description_lower:
                # Проверяем контекст - должны быть упоминания о мощности 6 или 9 кВт
                if (
                    "6" in description_lower or "9" in description_lower
                ) and "квт" in description_lower:
                    return "220В и 380В"

        # Для мощности 12 кВт и выше
        elif power_num >= 12:
            # Проверяем, есть ли в описании упоминание о 380В и "только"
            if "380" in description_lower and (
                "только" in description_lower or "начиная с 12" in description_lower
            ):
                return "380В"

    return ""


def get_default_country_by_brand(name: str) -> str:
    """
    Получение страны производителя по умолчанию на основе марки товара.

    Определяет страну производства на основе названия марки товара.
    Используется как fallback, когда страна не найдена на странице товара.

    Args:
        name: Название товара для определения марки

    Returns:
        Название страны производства или пустая строка, если марка не определена

    Example:
        >>> get_default_country_by_brand("Vaillant eloBLOCK VE 6")
        'Германия'
        >>> get_default_country_by_brand("Protherm СКАТ 12")
        'Словакия'
        >>> get_default_country_by_brand("Неизвестная марка")
        ''

    Note:
        Поддерживаемые марки и их страны:
        - Vaillant, eloBLOCK -> Германия
        - Protherm, СКАТ -> Словакия
        - TEKNIX, ESPRO -> Словакия
        - TECLine -> Словакия
    """
    name_lower = name.lower()

    # Vaillant eloBLOCK VE -> Германия
    if "vaillant" in name_lower and "eloblock" in name_lower:
        return "Германия"

    # Teknix ESPRO -> Венгрия
    if "teknix" in name_lower and "espro" in name_lower:
        return "Венгрия"

    # PROTHERM СКАТ -> Словакия
    if "protherm" in name_lower and "скат" in name_lower:
        return "Словакия"

    return ""


@retry_on_failure(
    max_attempts=PARSER_CONFIG["RETRY_COUNT"],
    delay=PARSER_CONFIG["RETRY_DELAY"],
    exceptions=(TimeoutException, NoSuchElementException),
)
def get_all_pages_urls(driver: Any, base_url: str) -> List[str]:
    """
    Получение всех URL страниц пагинации каталога.

    Находит все ссылки на страницы пагинации, переходя по кнопке "Следующая"
    или извлекая прямые ссылки на страницы. Поддерживает ограничение
    максимального количества проверяемых страниц.

    Args:
        driver: Selenium WebDriver объект для навигации по страницам
        base_url: URL первой страницы каталога

    Returns:
        Список URL всех страниц каталога. Всегда включает base_url как первый элемент

    Example:
        >>> driver = get_driver()
        >>> urls = get_all_pages_urls(driver, "https://example.com/catalog")
        >>> print(f"Найдено страниц: {len(urls)}")

    Raises:
        TimeoutException: Если страница не загрузилась в течение таймаута
        NoSuchElementException: Если не найдены элементы пагинации
        StaleElementReferenceException: Если элементы стали устаревшими
        WebDriverException: При ошибках WebDriver
        Exception: При других неожиданных ошибках

    Note:
        Максимальное количество проверяемых страниц ограничено
        PARSER_CONFIG["MAX_PAGES_TO_CHECK"].
        Функция использует декоратор @retry_on_failure для автоматических повторов.
    """
    page_urls = [base_url]  # Начинаем с первой страницы
    logger.info(f"Начинаем сбор URL страниц пагинации с: {base_url}")

    try:
        # Переходим на первую страницу с retry
        if not navigate_to_page(driver, base_url):
            logger.warning(
                "Не удалось загрузить первую страницу для определения пагинации"
            )
            return page_urls

        # Получаем HTML для парсинга пагинации
        page_source = driver.page_source
        soup = BeautifulSoup(page_source, "lxml")

        # Ищем элементы пагинации (различные варианты)
        pagination_selectors = [
            "nav.woocommerce-pagination",
            "div.woocommerce-pagination",
            "ul.page-numbers",
            "div.pagination",
            "nav.pagination",
        ]

        pagination_container = None
        for selector in pagination_selectors:
            pagination_container = soup.select_one(selector)
            if pagination_container:
                logger.debug(f"Найден контейнер пагинации: {selector}")
                break

        if not pagination_container:
            logger.info(
                "Элементы пагинации не найдены, обрабатываем только первую страницу"
            )
            return page_urls

        # Ищем все ссылки на страницы
        page_links = pagination_container.find_all("a", href=True)

        # Собираем уникальные URL страниц
        found_urls = set(page_urls)
        for link in page_links:
            href = link.get("href", "")
            if href:
                # Преобразуем относительные ссылки в абсолютные
                if href.startswith("/"):
                    full_url = urljoin(base_url, href)
                elif href.startswith("http"):
                    full_url = href
                else:
                    full_url = urljoin(base_url, href)

                # Проверяем, что это ссылка на страницу каталога (содержит фильтр)
                if (
                    PARSER_CONFIG["TARGET_PAGE"] in full_url
                    or PARSER_CONFIG["FILTER_PARAMS"] in full_url
                ):
                    if full_url not in found_urls:
                        found_urls.add(full_url)
                        page_urls.append(full_url)

        # Альтернативный метод: ищем кнопку "Следующая" и переходим по ней
        # Это более надежный способ для динамических сайтов
        try:
            max_pages_to_check = PARSER_CONFIG["MAX_PAGES_TO_CHECK"]
            pages_checked = 1

            while pages_checked < max_pages_to_check:
                # Ищем кнопку "Следующая" или ссылку на следующую страницу
                next_selectors = [
                    "a.next.page-numbers",
                    "a.next",
                    'a[aria-label="Next"]',
                    "a.page-numbers.next",
                    'a[rel="next"]',
                ]

                next_button = None
                for selector in next_selectors:
                    try:
                        next_button = driver.find_element(By.CSS_SELECTOR, selector)
                        # Проверяем, что кнопка активна (не disabled)
                        if next_button and next_button.is_enabled():
                            # Проверяем классы на наличие disabled
                            classes = next_button.get_attribute("class") or ""
                            if "disabled" not in classes.lower():
                                break
                            else:
                                next_button = None
                    except NoSuchElementException:
                        continue

                if not next_button:
                    logger.debug("Кнопка 'Следующая' не найдена или неактивна")
                    break

                # Получаем URL следующей страницы
                next_url = next_button.get_attribute("href")
                if not next_url:
                    break

                # Преобразуем в абсолютный URL
                if next_url.startswith("/"):
                    next_url = urljoin(base_url, next_url)
                elif not next_url.startswith("http"):
                    next_url = urljoin(base_url, next_url)

                # Проверяем, что это новая страница
                if next_url in found_urls:
                    logger.debug(f"Достигнута уже обработанная страница: {next_url}")
                    break

                # Добавляем URL в список
                found_urls.add(next_url)
                page_urls.append(next_url)
                logger.debug(f"Найдена страница {pages_checked + 1}: {next_url}")

                # Переходим на следующую страницу
                try:
                    next_button.click()
                    pages_checked += 1

                    # Небольшая задержка для загрузки страницы
                    time.sleep(PARSER_CONFIG["PAGINATION_DELAY"])

                    # Ожидание загрузки новой страницы с retry
                    if not navigate_to_page(driver, next_url):
                        logger.warning(
                            f"Не удалось загрузить страницу {pages_checked}: {next_url}"
                        )
                        break
                except StaleElementReferenceException as e:
                    logger.warning(
                        f"Элемент стал устаревшим при переходе на следующую страницу: {e}"
                    )
                    break
                except TimeoutException as e:
                    logger.warning(f"Таймаут при переходе на следующую страницу: {e}")
                    break
                except Exception as e:
                    logger.warning(
                        f"Неожиданная ошибка при переходе на следующую страницу: {e}"
                    )
                    break

        except (NoSuchElementException, StaleElementReferenceException) as e:
            logger.debug(f"Элемент пагинации не найден или устарел: {e}")
        except TimeoutException as e:
            logger.warning(f"Таймаут при обработке пагинации: {e}")
        except WebDriverException as e:
            logger.warning(f"Ошибка WebDriver при обработке пагинации: {e}")
        except Exception as e:
            logger.warning(f"Неожиданная ошибка при обработке пагинации: {e}")

        # Удаляем дубликаты и сортируем
        page_urls = list(dict.fromkeys(page_urls))  # Сохраняем порядок

        logger.info(f"Найдено страниц для обработки: {len(page_urls)}")
        for i, page_url in enumerate(page_urls, 1):
            logger.debug(f"Страница {i}: {page_url}")

        return page_urls

    except (
        TimeoutException,
        NoSuchElementException,
        StaleElementReferenceException,
    ) as e:
        logger.warning(f"Ошибка Selenium при получении URL страниц пагинации: {e}")
        return page_urls  # Возвращаем хотя бы первую страницу
    except WebDriverException as e:
        logger.error(f"Ошибка WebDriver при получении URL страниц пагинации: {e}")
        return page_urls  # Возвращаем хотя бы первую страницу
    except Exception as e:
        logger.error(f"Неожиданная ошибка при получении URL страниц пагинации: {e}")
        return page_urls  # Возвращаем хотя бы первую страницу


@retry_on_failure(
    max_attempts=PARSER_CONFIG["RETRY_COUNT"],
    delay=PARSER_CONFIG["RETRY_DELAY"],
    exceptions=(TimeoutException, Exception),
)
def navigate_to_page(driver: Any, page_url: str) -> bool:
    """
    Переход на страницу с обработкой ошибок и retry.

    Выполняет переход на указанную страницу и ожидает загрузки основного
    контента (элемент с классом "products").

    Args:
        driver: Selenium WebDriver объект для навигации
        page_url: URL страницы для перехода

    Returns:
        True если переход и загрузка страницы успешны, False в противном случае

    Example:
        >>> driver = get_driver()
        >>> success = navigate_to_page(driver, "https://example.com/page1")
        >>> if success:
        ...     print("Страница загружена")

    Raises:
        TimeoutException: Если страница не загрузилась в течение таймаута
        NoSuchElementException: Если не найден элемент "products" на странице
        StaleElementReferenceException: Если элемент стал устаревшим
        WebDriverException: При ошибках WebDriver
        Exception: При других неожиданных ошибках

    Note:
        Функция использует декоратор @retry_on_failure для автоматических повторов.
        Таймаут ожидания загрузки определяется PARSER_CONFIG["PAGE_LOAD_TIMEOUT"].
    """
    try:
        driver.get(page_url)
        # Ожидание загрузки страницы
        WebDriverWait(driver, PARSER_CONFIG["PAGE_LOAD_TIMEOUT"]).until(
            EC.presence_of_element_located((By.CLASS_NAME, "products"))
        )
        # Задержка для rate limiting (избежание блокировки IP)
        time.sleep(PARSER_CONFIG["PAGE_DELAY"])
        return True
    except TimeoutException:
        logger.warning(f"Таймаут при загрузке страницы: {page_url}")
        return False
    except (NoSuchElementException, StaleElementReferenceException) as e:
        logger.warning(f"Проблема с элементом при загрузке страницы {page_url}: {e}")
        return False
    except WebDriverException as e:
        logger.error(f"Ошибка WebDriver при переходе на страницу {page_url}: {e}")
        return False
    except Exception as e:
        logger.error(f"Неожиданная ошибка при переходе на страницу {page_url}: {e}")
        return False


def parse_products_from_page(
    driver: Any, page_url: str, existing_names: Optional[Set[str]] = None
) -> Tuple[List[Dict[str, Any]], int, int]:
    """
    Парсинг товаров с одной страницы каталога.

    Извлекает список товаров со страницы каталога, фильтрует по целевым маркам,
    получает детальную информацию для каждого товара и валидирует данные.

    Args:
        driver: Selenium WebDriver объект для навигации по страницам
        page_url: URL страницы каталога для парсинга
        existing_names: Множество названий существующих товаров в БД.
            Товары с названиями из этого множества пропускаются.

    Returns:
        Кортеж из трех элементов:
        - products_data (list): Список словарей с данными товаров
        - error_count (int): Количество ошибок при парсинге
        - skipped_count (int): Количество пропущенных товаров (не целевые марки)

    Example:
        >>> driver = get_driver()
        >>> existing = {"Товар 1", "Товар 2"}
        >>> products, errors, skipped = parse_products_from_page(driver, "https://example.com/page1", existing)
        >>> print(f"Найдено товаров: {len(products)}")

    Raises:
        TimeoutException: Если страница не загрузилась в течение таймаута
        NoSuchElementException: Если не найдены элементы товаров на странице
        StaleElementReferenceException: Если элементы стали устаревшими
        WebDriverException: При ошибках WebDriver
        Exception: При других неожиданных ошибках

    Note:
        Товары фильтруются по целевым маркам из PARSER_CONFIG["TARGET_BRANDS"].
        Для каждого товара вызывается get_product_details() для получения
        детальной информации.
    """
    if existing_names is None:
        existing_names = set()

    products_data = []
    error_count = 0
    skipped_count = 0
    skipped_existing_count = 0

    try:
        # Переход на страницу каталога с retry
        if not navigate_to_page(driver, page_url):
            logger.error(f"Не удалось загрузить страницу: {page_url}")
            return products_data, error_count, skipped_count

        # Получаем HTML страницы для парсинга BeautifulSoup
        page_source = driver.page_source
        soup = BeautifulSoup(page_source, "lxml")

        # Находим все элементы товаров
        products = soup.find_all("li", class_="product-type-simple")

        # Если не нашли с классом product-type-simple, пробуем другие варианты
        if not products:
            products = soup.find_all(
                "li", class_=lambda x: x and "product" in x.lower()
            )

        if not products:
            logger.warning(f"Товары не найдены на странице: {page_url}")
            return products_data, error_count, skipped_count

        logger.info(f"Найдено товаров на странице {page_url}: {len(products)}")

        for product in products:
            try:
                # Извлекаем название товара
                name_element = product.find(
                    "h2", class_="woocommerce-loop-product__title"
                ) or product.find("h2", class_=lambda x: x and "title" in x.lower())

                if not name_element:
                    continue

                name = name_element.text.strip()

                # Проверяем, принадлежит ли товар одной из целевых марок
                if not is_target_brand(name):
                    skipped_count += 1
                    continue

                # Проверяем существование товара в БД перед парсингом
                # Это позволяет избежать дорогих HTTP-запросов для уже существующих товаров
                if name in existing_names:
                    skipped_existing_count += 1
                    logger.debug(
                        f"Товар '{name}' уже существует в БД, пропускаем парсинг"
                    )
                    continue

                # Извлекаем цену
                price_element = product.find(
                    "span", class_="woocommerce-Price-amount amount"
                ) or product.find(
                    "span", class_=lambda x: x and "price" in x.lower() if x else False
                )

                if not price_element:
                    logger.warning(
                        f"Цена не найдена для товара: {name}, "
                        "устанавливаем значение по умолчанию"
                    )
                    price = "Цену и наличие товара уточняйте у продавца"
                else:
                    price = price_element.text.strip()

                # Извлекаем ссылку на товар
                link_element = product.find("a")
                if not link_element or "href" not in link_element.attrs:
                    logger.warning(f"Ссылка не найдена для товара: {name}")
                    continue

                product_url = urljoin(page_url, link_element["href"])

                # Получаем дополнительную информацию со страницы товара
                logger.info(f"Обработка товара: {name}")
                details = get_product_details(driver, product_url)

                # Задержка между запросами к страницам товаров для rate limiting
                # (избежание блокировки IP-адреса сайтом)
                time.sleep(PARSER_CONFIG["PAGE_DELAY"])

                # Логирование основной информации
                logger.debug("=" * 50)
                logger.debug(f"Название: {name}")
                logger.debug(f"Цена: {price}")
                logger.debug(
                    f"Страна производства: {details.get('country', 'Не указана')}"
                )
                documentation_url = details.get("documentation", "")
                logger.debug(
                    f"Документация: {documentation_url if documentation_url else 'Не найдена'}"
                )
                logger.debug(f"Ссылка на товар: {product_url}")
                if details["description"]:
                    desc_preview = (
                        f"{details['description'][:100]}..."
                        if len(details["description"]) > 100
                        else details["description"]
                    )
                    logger.debug(f"Описание: {desc_preview}")

                # Логирование характеристик
                if details["specifications"]:
                    logger.debug("\nХарактеристики:")
                    logger.debug(details["specifications"])

                # Логирование изображений
                if details["image_urls"]:
                    logger.debug(f"\nНайдено изображений: {len(details['image_urls'])}")
                    max_images = PARSER_CONFIG["MAX_IMAGES_PER_PRODUCT"]
                    for i, img_url in enumerate(details["image_urls"][:max_images], 1):
                        logger.debug(f"Изображение {i}: {img_url}")

                # Подготавливаем данные для сохранения
                product_data = {
                    "name": name,
                    "price": price,
                    "product_url": product_url,
                    "description": details["description"],
                    "specifications": details["specifications"],
                    "image_urls": details["image_urls"],
                    "country": details.get("country", ""),
                    "documentation": details.get("documentation", ""),
                }

                # Валидация данных перед добавлением в список
                is_valid, validation_error = validate_product_data(product_data)
                if not is_valid:
                    error_count += 1
                    logger.error(
                        f"Данные товара '{name}' не прошли валидацию: {validation_error}"
                    )
                    logger.debug(f"Данные товара: {product_data}")
                    continue

                # Добавляем товар в список для пакетного сохранения
                products_data.append(product_data)
                logger.debug("=" * 50)

            except AttributeError as e:
                error_count += 1
                logger.error(f"Ошибка атрибута при извлечении данных товара: {e}")
                continue
            except (NoSuchElementException, StaleElementReferenceException) as e:
                error_count += 1
                logger.warning(f"Проблема с элементом при обработке товара: {e}")
                continue
            except TimeoutException as e:
                error_count += 1
                logger.warning(f"Таймаут при обработке товара: {e}")
                continue
            except (KeyError, ValueError) as e:
                error_count += 1
                logger.error(f"Ошибка данных при обработке товара: {e}")
                continue
            except Exception as e:
                error_count += 1
                logger.error(f"Неожиданная ошибка при обработке товара: {e}")
                continue

    except (
        TimeoutException,
        NoSuchElementException,
        StaleElementReferenceException,
    ) as e:
        logger.warning(f"Ошибка Selenium при парсинге страницы {page_url}: {e}")
        error_count += 1
    except WebDriverException as e:
        logger.error(f"Ошибка WebDriver при парсинге страницы {page_url}: {e}")
        error_count += 1
    except Exception as e:
        logger.error(f"Неожиданная ошибка при парсинге страницы {page_url}: {e}")
        error_count += 1

    # Логируем статистику пропущенных существующих товаров
    if skipped_existing_count > 0:
        logger.info(
            f"Пропущено существующих товаров (уже в БД): {skipped_existing_count}"
        )

    return products_data, error_count, skipped_count


def prepare_boiler_object(product_data: Dict[str, Any]) -> Any:
    """
    Подготовка объекта ElectricBoiler из словаря данных товара.

    Преобразует словарь с данными товара в объект модели ElectricBoiler,
    выполняя парсинг характеристик, нормализацию цены и обработку изображений.

    Args:
        product_data: Словарь с данными товара. Должен содержать:
            - name (str): Название товара (обязательно)
            - price (str): Цена товара
            - product_url (str): URL страницы товара
            - description (str): Описание товара
            - specifications (str): Текст технических характеристик
            - image_urls (list): Список URL изображений
            - country (str): Страна производства
            - documentation (str): URL документации

    Returns:
        Объект модели ElectricBoiler с заполненными полями

    Example:
        >>> product = {"name": "Котел 1", "price": "1000", "specifications": "Мощность: 6 кВт"}
        >>> boiler = prepare_boiler_object(product)
        >>> print(boiler.name)
        'Котел 1'

    Raises:
        KeyError: При отсутствии обязательного поля "name"
        AttributeError: При ошибках доступа к данным
        ValueError: При некорректных значениях данных
        Exception: При других неожиданных ошибках

    Note:
        Данные должны быть предварительно валидированы через validate_product_data().
        Количество изображений ограничено PARSER_CONFIG["MAX_IMAGES_PER_PRODUCT"].
    """
    # Парсим характеристики (передаем название товара для специальной обработки)
    specs_dict = parse_specifications(
        product_data.get("specifications", ""), product_data.get("name", "")
    )

    # Если напряжение не найдено в характеристиках, пытаемся извлечь из описания
    if "voltage" not in specs_dict or not specs_dict.get("voltage"):
        description = product_data.get("description", "")
        product_name = product_data.get("name", "")
        power_value = specs_dict.get("power", "")

        voltage_from_description = extract_voltage_from_description(
            description, product_name, power_value
        )

        if voltage_from_description:
            specs_dict["voltage"] = voltage_from_description

    # Нормализация цены (извлекаем только цифры и знаки)
    price = product_data.get("price", "")

    # Если цена не указана или пустая, устанавливаем значение по умолчанию
    if not price or price.strip() == "":
        price = "Цену и наличие товара уточняйте у продавца"
    # Если цена найдена, нормализуем её
    elif "уточняйте" not in price.lower():
        price = re.sub(REGEX_PRICE_CLEANUP, "", price).strip()
        # Если после нормализации цена стала пустой, устанавливаем значение по умолчанию
        if not price:
            price = "Цену и наличие товара уточняйте у продавца"

    # Получаем страну, если не указана - устанавливаем значение по умолчанию
    country = product_data.get("country") or ""
    # Явная проверка на None и пустую строку
    if country is None or (isinstance(country, str) and country.strip() == ""):
        country = get_default_country_by_brand(product_data.get("name", ""))
        # Если и по умолчанию не найдено, оставляем пустую строку
        if not country or country.strip() == "":
            country = ""

    # Получаем документацию с явной проверкой на None и пустую строку
    documentation = product_data.get("documentation") or ""
    if documentation is None or (
        isinstance(documentation, str) and documentation.strip() == ""
    ):
        documentation = ""

    # Получаем описание с явной проверкой на None и пустую строку
    description = product_data.get("description") or ""
    if description is None or (
        isinstance(description, str) and description.strip() == ""
    ):
        description = None  # Для описания None допустимо

    # Получаем URL товара с явной проверкой
    product_url = product_data.get("product_url", "")
    if product_url is None or (
        isinstance(product_url, str) and product_url.strip() == ""
    ):
        product_url = ""

    # Создаем объект ElectricBoiler
    boiler = ElectricBoiler(
        name=product_data["name"],
        price=price,
        product_url=product_url,
        description=description,
        country=country or None,  # Пустая строка преобразуется в None
        documentation=documentation or None,  # Пустая строка преобразуется в None
        **specs_dict,  # Добавляем все распарсенные характеристики
    )

    # Обрабатываем изображения (количество из конфигурации)
    max_images = PARSER_CONFIG["MAX_IMAGES_PER_PRODUCT"]
    image_urls = product_data.get("image_urls", [])
    if image_urls:
        # Ограничиваем количество изображений значением из конфигурации
        image_urls = image_urls[:max_images]
        # Динамически устанавливаем поля для изображений
        for i in range(1, max_images + 1):
            setattr(
                boiler,
                f"image_{i}",
                image_urls[i - 1] if len(image_urls) >= i else None,
            )
    else:
        # Если изображений нет, устанавливаем все в None
        for i in range(1, max_images + 1):
            setattr(boiler, f"image_{i}", None)

    return boiler


@retry_on_failure(
    max_attempts=PARSER_CONFIG["RETRY_COUNT"],
    delay=PARSER_CONFIG["RETRY_DELAY"],
    exceptions=(IntegrityError, Exception),
)
def bulk_save_to_database(
    products_data: List[Dict[str, Any]], existing_names: Set[str]
) -> Tuple[int, int, int]:
    """
    Пакетное сохранение товаров в базу данных с использованием bulk_create и bulk_update.

    Разделяет товары на новые и существующие, валидирует данные и выполняет
    пакетные операции для оптимизации производительности.

    Args:
        products_data: Список словарей с данными товаров. Каждый словарь должен
            содержать ключ "name" и другие поля модели ElectricBoiler
        existing_names: Множество названий существующих товаров в БД для
            определения, какие товары нужно создать, а какие обновить

    Returns:
        Кортеж из трех элементов:
        - created_count (int): Количество созданных товаров
        - updated_count (int): Количество обновленных товаров
        - error_count (int): Количество ошибок при сохранении

    Example:
        >>> products = [{"name": "Котел 1", "price": "1000"}, ...]
        >>> existing = {"Котел 2"}
        >>> created, updated, errors = bulk_save_to_database(products, existing)
        >>> print(f"Создано: {created}, Обновлено: {updated}")

    Raises:
        IntegrityError: При нарушении целостности данных БД
        ValueError: При некорректных значениях данных
        Exception: При других неожиданных ошибках

    Note:
        Функция использует декоратор @retry_on_failure для автоматических повторов.
        Валидация данных выполняется для каждого товара перед сохранением.
    """
    if not products_data:
        return 0, 0, 0

    created_count = 0
    updated_count = 0
    error_count = 0

    try:
        # Разделяем товары на новые и существующие
        products_to_create = []
        products_to_update = []

        for product_data in products_data:
            # Валидация данных
            is_valid, error_message = validate_product_data(product_data)
            if not is_valid:
                logger.error(
                    f"Данные товара '{product_data.get('name')}' "
                    f"не прошли валидацию: {error_message}"
                )
                error_count += 1
                continue

            try:
                boiler = prepare_boiler_object(product_data)
                product_name = product_data["name"]

                if product_name in existing_names:
                    # Товар существует - добавляем в список для обновления
                    products_to_update.append(boiler)
                else:
                    # Новый товар - добавляем в список для создания
                    products_to_create.append(boiler)
            except (KeyError, AttributeError) as e:
                logger.error(
                    f"Ошибка доступа к данным при подготовке товара "
                    f"'{product_data.get('name')}': {e}"
                )
                error_count += 1
                continue
            except ValueError as e:
                logger.error(
                    f"Ошибка значения при подготовке товара '{product_data.get('name')}': {e}"
                )
                error_count += 1
                continue
            except Exception as e:
                logger.error(
                    f"Неожиданная ошибка при подготовке товара '{product_data.get('name')}': {e}"
                )
                error_count += 1
                continue

        # Получаем список всех полей модели для bulk_update
        # Исключаем поля, которые не должны обновляться
        update_fields = [
            "price",
            "product_url",
            "description",
            "country",
            "documentation",
            "power",
            "power_regulation",
            "heating_area",
            "work_type",
            "self_work",
            "water_heating",
            "floor_heating",
            "expansion_tank",
            "circulation_pump",
            "voltage",
            "cable",
            "fuse",
            "temp_range",
            "temp_range_radiator",
            "temp_range_floor",
            "connection",
            "dimensions",
            "wifi",
            "thermostat",
            "thermostat_included",
            "outdoor_sensor",
        ]
        # Добавляем поля изображений
        max_images = PARSER_CONFIG["MAX_IMAGES_PER_PRODUCT"]
        for i in range(1, max_images + 1):
            update_fields.append(f"image_{i}")

        # Пакетное создание новых товаров
        if products_to_create:
            try:
                # Выполняем bulk_create для новых товаров
                created_boilers = ElectricBoiler.objects.bulk_create(
                    products_to_create, ignore_conflicts=True
                )
                created_count = len(created_boilers)
                logger.info(f"Создано новых товаров: {created_count}")

            except IntegrityError as e:
                logger.error(f"Ошибка целостности данных при bulk_create: {e}")
                error_count += len(products_to_create)
            except ValueError as e:
                logger.error(f"Ошибка значения при bulk_create: {e}")
                error_count += len(products_to_create)
            except Exception as e:
                logger.error(f"Неожиданная ошибка при bulk_create: {e}")
                error_count += len(products_to_create)

        # Пакетное обновление существующих товаров
        if products_to_update:
            try:
                # Получаем существующие объекты из БД
                update_names = [p.name for p in products_to_update]
                existing_boilers = ElectricBoiler.objects.filter(name__in=update_names)
                existing_boilers_dict = {
                    boiler.name: boiler for boiler in existing_boilers
                }

                # Обновляем существующие объекты значениями из новых
                boilers_to_bulk_update = []
                for boiler in products_to_update:
                    if boiler.name in existing_boilers_dict:
                        existing_boiler = existing_boilers_dict[boiler.name]
                        # Копируем значения из нового объекта в существующий
                        for field in update_fields:
                            setattr(existing_boiler, field, getattr(boiler, field))
                        boilers_to_bulk_update.append(existing_boiler)

                # Выполняем bulk_update
                if boilers_to_bulk_update:
                    ElectricBoiler.objects.bulk_update(
                        boilers_to_bulk_update, update_fields
                    )
                    updated_count = len(boilers_to_bulk_update)
                    logger.info(f"Обновлено существующих товаров: {updated_count}")

            except IntegrityError as e:
                logger.error(f"Ошибка целостности данных при bulk_update: {e}")
                error_count += len(products_to_update)
            except ValueError as e:
                logger.error(f"Ошибка значения при bulk_update: {e}")
                error_count += len(products_to_update)
            except Exception as e:
                logger.error(f"Неожиданная ошибка при bulk_update: {e}")
                error_count += len(products_to_update)

    except IntegrityError as e:
        logger.error(
            f"Критическая ошибка целостности данных при пакетном сохранении: {e}"
        )
        error_count += len(products_data)
    except ValueError as e:
        logger.error(f"Критическая ошибка значения при пакетном сохранении: {e}")
        error_count += len(products_data)
    except Exception as e:
        logger.error(f"Критическая неожиданная ошибка при пакетном сохранении: {e}")
        error_count += len(products_data)

    return created_count, updated_count, error_count


@retry_on_failure(
    max_attempts=PARSER_CONFIG["RETRY_COUNT"],
    delay=PARSER_CONFIG["RETRY_DELAY"],
    exceptions=(IntegrityError, Exception),
)
def save_to_database(product_data: Dict[str, Any]) -> Tuple[bool, str]:
    """
    Сохранение данных товара в базу данных.

    Создает новую запись или обновляет существующую в таблице ElectricBoiler
    на основе названия товара. Выполняет парсинг характеристик, нормализацию
    цены и обработку изображений.

    Args:
        product_data: Словарь с данными товара. Должен содержать:
            - name (str): Название товара (обязательно)
            - price (str): Цена товара
            - product_url (str): URL страницы товара
            - description (str): Описание товара
            - specifications (str): Текст технических характеристик
            - image_urls (list): Список URL изображений
            - country (str): Страна производства
            - documentation (str): URL документации

    Returns:
        Кортеж из двух элементов:
        - bool: True если сохранение успешно, False в противном случае
        - str: Сообщение о результате операции

    Example:
        >>> product = {
        ...     "name": "Vaillant eloBLOCK VE 6",
        ...     "price": "100000",
        ...     "specifications": "Мощность: 6 кВт"
        ... }
        >>> success, message = save_to_database(product)
        >>> print(message)
        'Успешно сохранено'

    Raises:
        IntegrityError: При нарушении целостности данных БД (дубликат названия)
        KeyError: При отсутствии обязательного поля "name"
        AttributeError: При ошибках доступа к данным
        ValueError: При некорректных значениях данных
        Exception: При других неожиданных ошибках

    Note:
        Валидация данных выполняется внутри функции, но рекомендуется
        вызывать validate_product_data() перед вызовом этой функции.
        Функция использует декоратор @retry_on_failure для автоматических повторов.
    """
    # Дополнительная проверка на случай, если валидация не была выполнена
    # (защита от прямого вызова функции)
    is_valid, error_message = validate_product_data(product_data)
    if not is_valid:
        logger.error(
            f"Попытка сохранить невалидные данные: {error_message}. "
            "Валидация должна выполняться перед вызовом save_to_database()"
        )
        return False, f"Ошибка валидации: {error_message}"

    try:
        # Парсим характеристики (передаем название товара для специальной обработки)
        specs_dict = parse_specifications(
            product_data.get("specifications", ""), product_data.get("name", "")
        )

        # Если напряжение не найдено в характеристиках, пытаемся извлечь из описания
        if "voltage" not in specs_dict or not specs_dict.get("voltage"):
            description = product_data.get("description", "")
            product_name = product_data.get("name", "")
            power_value = specs_dict.get("power", "")

            voltage_from_description = extract_voltage_from_description(
                description, product_name, power_value
            )

            if voltage_from_description:
                specs_dict["voltage"] = voltage_from_description

        # Нормализация цены (извлекаем только цифры и знаки)
        price = product_data.get("price", "")

        # Если цена не указана или пустая, устанавливаем значение по умолчанию
        if not price or price.strip() == "":
            price = "Цену и наличие товара уточняйте у продавца"
        # Если цена найдена, нормализуем её
        # (удаляем лишние символы, оставляем только цифры, точку, запятую и пробелы)
        elif "уточняйте" not in price.lower():
            price = re.sub(REGEX_PRICE_CLEANUP, "", price).strip()
            # Если после нормализации цена стала пустой, устанавливаем значение по умолчанию
            if not price:
                price = "Цену и наличие товара уточняйте у продавца"

        # Получаем страну, если не указана - устанавливаем значение по умолчанию
        country = product_data.get("country") or ""
        # Явная проверка на None и пустую строку
        if country is None or (isinstance(country, str) and country.strip() == ""):
            country = get_default_country_by_brand(product_data.get("name", ""))
            # Если и по умолчанию не найдено, оставляем пустую строку
            if not country or country.strip() == "":
                country = ""

        # Получаем документацию с явной проверкой на None и пустую строку
        documentation = product_data.get("documentation") or ""
        if documentation is None or (
            isinstance(documentation, str) and documentation.strip() == ""
        ):
            documentation = ""

        # Получаем описание с явной проверкой на None и пустую строку
        description = product_data.get("description") or ""
        if description is None or (
            isinstance(description, str) and description.strip() == ""
        ):
            description = None  # Для описания None допустимо

        # Получаем URL товара с явной проверкой
        product_url = product_data.get("product_url", "")
        if product_url is None or (
            isinstance(product_url, str) and product_url.strip() == ""
        ):
            product_url = ""

        # Подготавливаем данные для сохранения
        defaults = {
            "price": price,
            "product_url": product_url,
            "description": description,
            "country": country or None,  # Пустая строка преобразуется в None
            "documentation": documentation
            or None,  # Пустая строка преобразуется в None
            **specs_dict,  # Добавляем все распарсенные характеристики
        }

        # Обрабатываем изображения (количество из конфигурации)
        max_images = PARSER_CONFIG["MAX_IMAGES_PER_PRODUCT"]
        image_urls = product_data.get("image_urls", [])
        if image_urls:
            # Ограничиваем количество изображений значением из конфигурации
            image_urls = image_urls[:max_images]
            # Динамически создаем поля для изображений
            for i in range(1, max_images + 1):
                defaults[f"image_{i}"] = (
                    image_urls[i - 1] if len(image_urls) >= i else None
                )
        else:
            # Если изображений нет, устанавливаем все в None
            for i in range(1, max_images + 1):
                defaults[f"image_{i}"] = None

        # Создаем или обновляем запись
        boiler, created = ElectricBoiler.objects.update_or_create(
            name=product_data["name"], defaults=defaults
        )

        status_message = "Успешно сохранено" if created else "Успешно обновлено"
        logger.info(f"{status_message}: {product_data['name']}")
        return True, status_message

    except IntegrityError as e:
        error_msg = f"Ошибка целостности данных: {str(e)}"
        logger.error(error_msg)
        return False, error_msg
    except (KeyError, AttributeError) as e:
        error_msg = f"Ошибка доступа к данным при сохранении: {str(e)}"
        logger.error(error_msg)
        return False, error_msg
    except ValueError as e:
        error_msg = f"Ошибка значения при сохранении: {str(e)}"
        logger.error(error_msg)
        return False, error_msg
    except Exception as e:
        error_msg = f"Неожиданная ошибка при сохранении: {str(e)}"
        logger.error(error_msg)
        return False, error_msg


def parse_azbuka_tepla() -> None:
    """
    Основная функция парсера для сайта azbukatepla.by.

    Парсит все страницы каталога с электрическими котлами и сохраняет данные
    в базу данных для целевых марок. Обрабатывает пагинацию, собирает товары
    со всех доступных страниц и использует пакетную обработку БД.

    Процесс работы:
    1. Инициализация WebDriver
    2. Получение всех URL страниц пагинации
    3. Парсинг товаров с каждой страницы
    4. Пакетное сохранение в БД (при достижении BATCH_SIZE)
    5. Финальное сохранение оставшихся товаров
    6. Закрытие WebDriver

    Returns:
        None. Результаты работы логируются в консоль и файл.

    Example:
        >>> parse_azbuka_tepla()
        # Начинает парсинг всех страниц каталога
        # Логирует прогресс и статистику

    Raises:
        Exception: При критических ошибках парсера. Ошибки логируются
            с уровнем CRITICAL, включая полный traceback.

    Note:
        Целевые марки определяются в PARSER_CONFIG["TARGET_BRANDS"]:
        - TECLine
        - vaillant eloBLOCK VE
        - Protherm КE Скат
        - TEKNIX ESPRO

        Размер батча для сохранения определяется в PARSER_CONFIG["BATCH_SIZE"].
        WebDriver автоматически закрывается в блоке finally.
    """
    driver = None
    try:
        # Создаем WebDriver
        driver = get_driver()

        logger.info("=" * 50)
        logger.info("Начало парсинга azbukatepla.by")
        logger.info(f"Ищем товары марок: {', '.join(PARSER_CONFIG['TARGET_BRANDS'])}")
        logger.info("=" * 50)

        # Загружаем существующие названия товаров в память для оптимизации
        logger.info("Загрузка существующих товаров из БД...")
        existing_names = set(ElectricBoiler.objects.values_list("name", flat=True))
        logger.info(f"Найдено существующих товаров в БД: {len(existing_names)}")

        # Получаем все URL страниц пагинации
        page_urls = get_all_pages_urls(driver, url)

        if not page_urls:
            logger.error("Не удалось получить URL страниц для парсинга")
            return

        logger.info(f"Будет обработано страниц: {len(page_urls)}")

        # Собираем все товары для пакетной обработки
        all_products_data = []
        total_errors = 0
        total_skipped = 0
        total_created = 0
        total_updated = 0
        batch_size = PARSER_CONFIG["BATCH_SIZE"]

        # Обрабатываем каждую страницу
        for page_num, page_url in enumerate(page_urls, 1):
            logger.info("-" * 50)
            logger.info(f"Обработка страницы {page_num}/{len(page_urls)}: {page_url}")
            logger.info("-" * 50)

            # Парсим товары со страницы (передаем existing_names для проверки)
            products_data, errors, skipped = parse_products_from_page(
                driver, page_url, existing_names
            )

            # Добавляем товары в общий список
            all_products_data.extend(products_data)
            total_errors += errors
            total_skipped += skipped

            logger.info(
                f"Страница {page_num}: найдено товаров={len(products_data)}, "
                f"ошибок={errors}, пропущено={skipped}"
            )

            # Если накопилось достаточно товаров, сохраняем батч
            if len(all_products_data) >= batch_size:
                logger.info(f"Достигнут размер батча ({batch_size}), сохраняем в БД...")
                created, updated, batch_errors = bulk_save_to_database(
                    all_products_data, existing_names
                )
                total_created += created
                total_updated += updated
                total_errors += batch_errors
                logger.info(
                    f"Батч сохранен: создано={created}, обновлено={updated}, "
                    f"ошибок={batch_errors}"
                )
                # Обновляем список существующих названий для следующих страниц
                # Это позволяет пропускать уже обработанные товары
                for product_data in all_products_data:
                    existing_names.add(product_data["name"])
                # Очищаем список для следующего батча
                all_products_data = []

            # Небольшая задержка между страницами для снижения нагрузки на сервер
            if page_num < len(page_urls):
                time.sleep(PARSER_CONFIG["PAGE_DELAY"])

        # Сохраняем оставшиеся товары
        if all_products_data:
            logger.info(f"Сохранение оставшихся товаров ({len(all_products_data)})...")
            created, updated, batch_errors = bulk_save_to_database(
                all_products_data, existing_names
            )
            total_created += created
            total_updated += updated
            total_errors += batch_errors
            logger.info(
                f"Финальный батч сохранен: создано={created}, обновлено={updated}, "
                f"ошибок={batch_errors}"
            )
            # Обновляем список существующих названий после финального батча
            for product_data in all_products_data:
                existing_names.add(product_data["name"])

        # Итоговая статистика
        total_processed = total_created + total_updated
        logger.info("=" * 50)
        logger.info("Парсинг завершен!")
        logger.info(f"Обработано страниц: {len(page_urls)}")
        logger.info(f"Успешно обработано товаров: {total_processed}")
        logger.info(f"Пропущено (не целевые марки): {total_skipped}")
        logger.info(f"Ошибок: {total_errors}")
        logger.info("=" * 50)

    except Exception as e:
        logger.critical(f"Критическая ошибка парсера: {e}")
        import traceback

        logger.critical(traceback.format_exc())
    finally:
        # Закрываем WebDriver
        if driver:
            driver.quit()
            logger.info("WebDriver закрыт")


if __name__ == "__main__":
    parse_azbuka_tepla()
