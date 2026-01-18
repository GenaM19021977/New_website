import os
import sys
import time
import logging
import re
import django
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse
from django.db.utils import IntegrityError

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

# Получаем абсолютный путь к корню проекта
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(project_root)


def init_django():
    """
    Инициализация Django окружения
    Вызывается автоматически при необходимости использования модели
    """
    try:
        # Пробуем проверить, инициализирован ли Django
        from django.apps import apps

        if apps.ready:
            return
    except (ImportError, AttributeError):
        # Django еще не инициализирован, нужно настроить
        pass

    # Настраиваем Django
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "electric_boiler.settings")
    django.setup()


# Константы парсера
BASE_URL = "https://azbukatepla.by/product-cat/kotly-otopleniya/elektricheskie-kotly"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36"
}

# Настройки для rate limiting и retry
REQUEST_DELAY = 1.0  # Задержка между запросами в секундах
MAX_RETRIES = 3  # Максимальное количество попыток при ошибке
RETRY_DELAY = 2.0  # Задержка перед повтором при ошибке в секундах


def make_request_with_retry(url, retries=MAX_RETRIES, delay=RETRY_DELAY):
    """
    Выполнение HTTP запроса с retry логикой и rate limiting

    Args:
        url (str): URL для запроса
        retries (int): Количество попыток при ошибке
        delay (float): Задержка перед повтором в секундах

    Returns:
        requests.Response: Объект ответа от сервера

    Raises:
        requests.RequestException: Если все попытки неудачны
    """
    last_exception = None
    for attempt in range(retries):
        try:
            response = requests.get(url, headers=HEADERS, timeout=30)
            response.raise_for_status()
            # Rate limiting: задержка после успешного запроса
            time.sleep(REQUEST_DELAY)
            return response
        except requests.RequestException as e:
            last_exception = e
            if attempt < retries - 1:
                # Экспоненциальная задержка перед повтором
                wait_time = delay * (2**attempt)
                time.sleep(wait_time)
            else:
                raise last_exception

    raise last_exception


def _extract_country_from_text(text, patterns):
    """
    Вспомогательная функция для извлечения страны из текста

    Args:
        text (str): Текст для поиска
        patterns (list): Список паттернов для поиска

    Returns:
        str: Название страны или пустая строка
    """
    lines = text.split("\n")
    for line in lines:
        line_lower = line.lower()
        for pattern in patterns:
            pattern_lower = pattern.lower()
            # Проверяем, что паттерн есть в строке
            if pattern_lower in line_lower:
                country = ""
                # Извлекаем страну (приоритет - через двоеточие)
                if ":" in line:
                    # Берем текст после последнего двоеточия
                    parts = line.split(":")
                    country = parts[-1].strip()
                else:
                    # Если нет двоеточия, берем текст после паттерна
                    pattern_idx = line_lower.find(pattern_lower)
                    if pattern_idx != -1:
                        # Берем текст после паттерна
                        country = line[pattern_idx + len(pattern) :].strip()
                        # Убираем возможные артикли и предлоги в начале
                        country = country.lstrip(", -").strip()

                if country:
                    # Очищаем от лишних символов
                    country = country.replace(".", "").strip()
                    # Берем только первое слово (обычно страна - одно слово)
                    country = country.split()[0] if country.split() else country
                    return country

    return ""


def extract_country(soup):
    """
    Извлечение страны производства со страницы товара

    Args:
        soup: BeautifulSoup объект страницы товара

    Returns:
        str: Название страны или пустая строка
    """
    # Паттерны для поиска страны производства (от более конкретных к менее)
    country_patterns = [
        "Страна производства",
        "Страна-производитель",
        "Производство",
        "Производитель",
    ]

    # Ищем страну в описании товара (itemprop="description")
    description_div = soup.find("div", itemprop="description")
    if description_div:
        description_text = description_div.get_text("\n", strip=True)
        country = _extract_country_from_text(description_text, country_patterns)
        if country:
            return country

    # Также ищем в кратком описании
    short_description = soup.find(
        "div", class_="product-short-description"
    ) or soup.find("div", class_="woocommerce-product-details__short-description")
    if short_description:
        short_text = short_description.get_text("\n", strip=True)
        country = _extract_country_from_text(short_text, country_patterns)
        if country:
            return country

    return ""


def extract_documentation(soup, base_url):
    """
    Извлечение ссылки на документацию со страницы товара

    Args:
        soup: BeautifulSoup объект страницы товара
        base_url: Базовый URL сайта для преобразования относительных ссылок

    Returns:
        str: URL ссылки на документацию или пустая строка
    """
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
    description_div = soup.find("div", itemprop="description")
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

    # Также ищем в основном контенте страницы
    content_areas = [
        soup.find("div", class_="woocommerce-Tabs-panel--description"),
        soup.find("div", class_="entry-content"),
        soup.find("div", class_="product-short-description"),
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
                        return documentation_url

    return documentation_url


def get_product_details(product_url):
    """
    Получение дополнительной информации со страницы товара

    Args:
        product_url (str): URL страницы товара

    Returns:
        dict: Словарь с данными товара (description, image_urls, specifications, country, documentation)
    """
    try:
        # Используем функцию с retry и rate limiting
        response = make_request_with_retry(product_url)
        soup = BeautifulSoup(response.text, "lxml")

        # Получаем описание товара из вкладки "Описание"
        # Ищем контейнер вкладки "Описание"
        description_panel = soup.find(
            "div", class_="woocommerce-Tabs-panel--description"
        )

        full_description = ""

        if description_panel:
            # Создаем копию панели для работы
            panel_copy = BeautifulSoup(str(description_panel), "lxml")

            # Удаляем заголовок "Описание" если он есть
            for heading in panel_copy.find_all(["h1", "h2", "h3", "h4"]):
                heading_text = heading.get_text(strip=True)
                if heading_text == "Описание":
                    heading.decompose()
                    break

            # Удаляем все изображения
            for img in panel_copy.find_all("img"):
                img.decompose()

            # Ищем и удаляем ссылку на инструкцию и всё после неё
            instruction_patterns = [
                "Инструкция на электрический котел TECline серии BO",
                "Инструкция на электрический котел TECline",
                "Инструкция на электрический котел",
            ]

            # Находим ссылку на инструкцию
            instruction_link = None
            for link in panel_copy.find_all("a", href=True):
                link_text = link.get_text(strip=True)
                for pattern in instruction_patterns:
                    if pattern in link_text:
                        instruction_link = link
                        break
                if instruction_link:
                    break

            # Если нашли ссылку, удаляем её и всё после неё
            if instruction_link:
                # Находим родительский элемент ссылки
                parent = instruction_link.parent
                if parent:
                    # Удаляем ссылку и все последующие элементы в родителе
                    found_link = False
                    for child in list(parent.children):
                        if child == instruction_link:
                            found_link = True
                            if hasattr(child, "extract"):
                                child.extract()
                        elif found_link:
                            if hasattr(child, "extract"):
                                child.extract()
                else:
                    instruction_link.decompose()

            # Извлекаем весь текст из очищенной панели
            full_description = panel_copy.get_text(separator=" ", strip=True)

            # Очищаем от лишних пробелов и символов
            full_description = re.sub(r"\s+", " ", full_description).strip()
            full_description = full_description.replace("|", "-")

            # Дополнительная проверка: удаляем текст после ссылки на инструкцию, если он остался
            for marker in instruction_patterns:
                if marker in full_description:
                    full_description = full_description.split(marker)[0].strip()
                    break
        else:
            # Fallback: ищем в других местах, если вкладка не найдена
            description_blocks = soup.find_all(
                "p", style="text-align: justify;", limit=2
            )
            description_parts = []
            for block in description_blocks:
                # Удаляем изображения из блока
                block_copy = BeautifulSoup(str(block), "lxml")
                for img in block_copy.find_all("img"):
                    img.decompose()
                text = block_copy.get_text(strip=True)
                if text:
                    description_parts.append(text)
            full_description = (
                " ".join(description_parts).replace("\n", " ").replace("|", "-")
            )

        # Получаем все изображения товара (приоритет полноразмерным)
        image_urls = []
        gallery = soup.find("div", class_="woocommerce-product-gallery")
        if gallery:
            for img in gallery.find_all("img"):
                img_url = None
                # Приоритет атрибутов для полноразмерных изображений
                # WooCommerce часто использует data-full-image, data-large_image, data-src
                if "data-full-image" in img.attrs:
                    img_url = img["data-full-image"]
                elif "data-large_image" in img.attrs:
                    img_url = img["data-large_image"]
                elif "data-src" in img.attrs:
                    img_url = img["data-src"]
                elif "data-lazy-src" in img.attrs:
                    img_url = img["data-lazy-src"]
                elif "src" in img.attrs:
                    img_url = img["src"]

                # Добавляем URL если он валидный и еще не добавлен
                if img_url and img_url not in image_urls:
                    # Проверяем, что это не placeholder или миниатюра
                    if (
                        "placeholder" not in img_url.lower()
                        and "thumbnail" not in img_url.lower()
                    ):
                        # Преобразуем относительные URL в абсолютные
                        if not img_url.startswith("http"):
                            img_url = urljoin(product_url, img_url)
                        image_urls.append(img_url)

        # Извлекаем технические характеристики
        specs_text = ""
        start_marker = "Мощность, кВт :"
        end_marker = "Возможно подключение датчика уличной температуры :"

        # Ищем контейнер с характеристиками
        container = (
            soup.find("div", class_="product-short-description")
            or soup.find("div", class_="woocommerce-product-details__short-description")
            or soup.find("div", class_="entry-content")
        )

        if container:
            # Получаем текст и разбиваем по строкам
            text = container.get_text("\n", strip=True)
            lines = text.split("\n")

            # Находим начало и конец характеристик
            start_idx = next(
                (i for i, line in enumerate(lines) if start_marker in line), -1
            )
            end_idx = next(
                (i for i, line in enumerate(lines) if end_marker in line), -1
            )

            if start_idx != -1:
                # Обрабатываем строки от начала до конца (или до конца списка)
                end_range = end_idx + 1 if end_idx != -1 else len(lines)
                for line in lines[start_idx:end_range]:
                    if ":" in line:
                        # Форматируем строку (убираем лишние пробелы вокруг :)
                        key, value = line.split(":", 1)
                        specs_text += f"{key.strip()}: {value.strip()}\n"

        # Извлекаем страну производства
        country = extract_country(soup)

        # Извлекаем ссылку на документацию
        # Получаем базовый URL сайта (протокол + домен)
        parsed_url = urlparse(product_url)
        base_url = f"{parsed_url.scheme}://{parsed_url.netloc}"
        documentation = extract_documentation(soup, base_url)

        return {
            "description": full_description,
            "image_urls": image_urls,
            "specifications": specs_text.strip() if specs_text else "",
            "country": country,
            "documentation": documentation,
        }
    except requests.RequestException as e:
        logger.error(f"Ошибка при запросе страницы товара {product_url}: {e}")
        return {
            "description": "",
            "image_urls": [],
            "specifications": "",
            "country": "",
            "documentation": "",
        }
    except Exception as e:
        logger.error(f"Ошибка при парсинге страницы товара {product_url}: {e}")
        return {
            "description": "",
            "image_urls": [],
            "specifications": "",
            "country": "",
            "documentation": "",
        }


def parse_specifications(specs_text):
    """
    Парсинг текста характеристик в словарь

    Args:
        specs_text (str): Текст характеристик

    Returns:
        dict: Словарь с распарсенными характеристиками
    """
    specs_dict = {}

    if not specs_text:
        return specs_dict

    # Маппинг названий характеристик на поля модели
    # Сортируем по длине (от длинных к коротким) для корректного сопоставления
    field_mapping = [
        ("Возможно подключение датчика уличной температуры", "outdoor_sensor"),
        ("Возможность подключения комнатного термостата", "thermostat"),
        ("Возможность подключения WiFi", "wifi"),
        ("Комнатный термостат в комплекте", "thermostat_included"),
        ("Площадь отопления, рекомендуемая до", "heating_area"),
        ("Возможность для работы самостоятельно", "self_work"),
        ("Возможность для нагрева воды", "water_heating"),
        ("Возможность нагрева теплого пола", "floor_heating"),
        ("Диапазон выбираемых температур, °C", "temp_range"),
        ("Диапазон выбираемых температур", "temp_range"),
        ("радиаторное отопление, °C", "temp_range_radiator"),
        ("радиаторное отопление", "temp_range_radiator"),
        ("теплый пол, °C", "temp_range_floor"),
        ("теплый пол", "temp_range_floor"),
        ("Габаритные размеры", "dimensions"),
        ("Регулировка мощности", "power_regulation"),
        ("Циркуляционный насос", "circulation_pump"),
        ("Питание от сети, Вольт", "voltage"),
        ("Кабель подключения", "cable"),
        ("Расширительный бак", "expansion_tank"),
        ("Начальный вариант работы", "work_type"),
        ("Предохранитель, А", "fuse"),
        ("Подключение к системе", "connection"),
        ("Мощность, кВт", "power"),
        ("КПД", "efficiency"),
        ("WiFi", "wifi"),
    ]

    # Парсим характеристики построчно
    lines = specs_text.split("\n")
    i = 0
    while i < len(lines):
        line = lines[i].strip()

        # Обработка диапазона температур
        if "Диапазон выбираемых температур" in line and ":" in line:
            # Проверяем, является ли это обычным полем со значением
            # (например: "Диапазон выбираемых температур: 30-80°C")
            key, value = line.split(":", 1)
            key = key.strip()
            value = value.strip()

            # Если после "Диапазон выбираемых температур" есть значение напрямую
            if value and not value.startswith("-"):
                # Сохраняем как temp_range, если это не подзаголовок с подстроками
                key_lower = key.lower()
                if key_lower in [
                    "диапазон выбираемых температур, °c",
                    "диапазон выбираемых температур",
                ]:
                    specs_dict["temp_range"] = value
                    i += 1
                    continue

            # Если это подзаголовок без значения, ищем следующие строки с подзаголовками
            i += 1
            while i < len(lines):
                next_line = lines[i].strip()
                if ":" in next_line:
                    key, value = next_line.split(":", 1)
                    key = key.strip().lower()
                    value = value.strip()

                    if "радиаторное отопление" in key:
                        specs_dict["temp_range_radiator"] = value
                    elif "теплый пол" in key:
                        specs_dict["temp_range_floor"] = value
                    else:
                        # Если встретили другую характеристику, останавливаемся
                        i -= 1
                        break
                elif next_line and not next_line.startswith("-"):
                    # Если строка не пустая и не начинается с "-", значит вышли из блока температур
                    i -= 1
                    break
                i += 1

        # Обычная обработка остальных характеристик
        elif ":" in line:
            key, value = line.split(":", 1)
            key = key.strip()
            value = value.strip()

            # Ищем соответствие в маппинге (от длинных к коротким для приоритета)
            for spec_key, field_name in field_mapping:
                key_lower = key.lower()
                spec_key_lower = spec_key.lower()
                # Проверяем точное совпадение или начало ключа совпадает с паттерном
                if key_lower == spec_key_lower or key_lower.startswith(spec_key_lower):
                    specs_dict[field_name] = value
                    break  # Прерываем, так как нашли совпадение (от длинных к коротким)

        i += 1

    return specs_dict


def save_to_database(product_data):
    """
    Сохранение данных товара в базу данных

    Args:
        product_data (dict): Словарь с данными товара

    Returns:
        tuple: (bool, str) - (успех, сообщение)
    """
    # Инициализируем Django и импортируем модель
    init_django()
    from products.models import ElectricBoiler

    try:
        # Парсим характеристики
        specs_dict = parse_specifications(product_data.get("specifications", ""))

        # Если temp_range не найден на странице, используем значение из temp_range_radiator
        if "temp_range" not in specs_dict or not specs_dict.get("temp_range"):
            if specs_dict.get("temp_range_radiator"):
                specs_dict["temp_range"] = specs_dict["temp_range_radiator"]

        # Подготавливаем данные для сохранения
        defaults = {
            "price": product_data.get("price", ""),
            "product_url": product_data.get("product_url", ""),
            "description": product_data.get("description") or None,
            "country": product_data.get("country") or None,  # Страна производства
            "documentation": product_data.get("documentation")
            or None,  # Ссылка на документацию
            **specs_dict,  # Добавляем все распарсенные характеристики
        }

        # Обрабатываем изображения
        image_urls = product_data.get("image_urls", [])
        if image_urls:
            defaults["image_1"] = image_urls[0] if len(image_urls) > 0 else None
            defaults["image_2"] = image_urls[1] if len(image_urls) > 1 else None
            defaults["image_3"] = image_urls[2] if len(image_urls) > 2 else None
            defaults["image_4"] = image_urls[3] if len(image_urls) > 3 else None
            defaults["image_5"] = image_urls[4] if len(image_urls) > 4 else None
        else:
            defaults["image_1"] = None
            defaults["image_2"] = None
            defaults["image_3"] = None
            defaults["image_4"] = None
            defaults["image_5"] = None

        # Создаем или обновляем запись по product_url (уникальному ключу)
        # Используем product_url вместо name, так как URL уникальнее
        boiler, created = ElectricBoiler.objects.update_or_create(
            product_url=product_data["product_url"], defaults=defaults
        )

        status_message = "Успешно сохранено" if created else "Успешно обновлено"
        return True, status_message

    except IntegrityError as e:
        return False, f"Ошибка целостности данных: {str(e)}"
    except Exception as e:
        return False, f"Ошибка при сохранении: {str(e)}"


def azbukatepla_parser():
    """
    Основная функция парсера для сайта azbukatepla.by

    Парсит страницу с электрическими котлами и сохраняет данные в базу данных
    """
    try:
        # Используем функцию с retry и rate limiting
        response = make_request_with_retry(BASE_URL)
        soup = BeautifulSoup(response.text, "lxml")

        # Находим все элементы товаров
        products = soup.find_all("li", class_="product-type-simple")

        if not products:
            logger.warning("Товары не найдены на странице")
            return

        processed_count = 0
        error_count = 0

        for product in products:
            try:
                # Извлекаем название товара
                name_element = product.find(
                    "h2", class_="woocommerce-loop-product__title"
                )
                if not name_element:
                    continue

                name = name_element.text.strip()

                # Пропускаем если это не Электрический котел TECLine
                if "Электрический котел TECLine" not in name:
                    continue

                # Извлекаем цену
                price_element = product.find(
                    "span", class_="woocommerce-Price-amount amount"
                )
                if not price_element:
                    logger.warning(f"Цена не найдена для товара: {name}")
                    continue

                price = price_element.text.strip()

                # Извлекаем ссылку на товар
                link_element = product.find("a")
                if not link_element or "href" not in link_element.attrs:
                    logger.warning(f"Ссылка не найдена для товара: {name}")
                    continue

                product_url = urljoin(BASE_URL, link_element["href"])

                # Получаем дополнительную информацию со страницы товара
                details = get_product_details(product_url)

                # Логирование информации о товаре
                logger.info("=" * 50)
                logger.info(f"Название: {name}")
                logger.info(f"Цена: {price}")
                logger.info(
                    f"Страна производства: {details.get('country', 'Не указана')}"
                )
                documentation_url = details.get("documentation", "")
                logger.info(
                    f"Документация: {documentation_url if documentation_url else 'Не найдена'}"
                )
                logger.info(f"Ссылка на товар: {product_url}")
                description_preview = (
                    f"{details['description'][:100]}..."
                    if len(details["description"]) > 100
                    else details["description"]
                )
                logger.info(f"Описание: {description_preview}")

                # Логирование характеристик
                if details["specifications"]:
                    logger.info("Характеристики:")
                    logger.info(details["specifications"])

                # Логирование изображений
                if details["image_urls"]:
                    logger.info(f"Найдено изображений: {len(details['image_urls'])}")
                    for i, img_url in enumerate(details["image_urls"][:4], 1):
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

                # Сохраняем в базу данных
                success, message = save_to_database(product_data)
                if success:
                    processed_count += 1
                    logger.info(f"✓ Сохранение в БД: {message}")
                else:
                    error_count += 1
                    logger.error(f"✗ Ошибка сохранения: {message}")

                logger.info("=" * 50)

            except AttributeError as e:
                error_count += 1
                logger.error(f"Ошибка при извлечении данных товара: {e}", exc_info=True)
                continue
            except Exception as e:
                error_count += 1
                logger.error(f"Ошибка при обработке товара: {e}", exc_info=True)
                continue

        # Итоговая статистика
        logger.info("=" * 50)
        logger.info("Парсинг завершен!")
        logger.info(f"Успешно обработано: {processed_count}")
        logger.info(f"Ошибок: {error_count}")
        logger.info("=" * 50)

    except requests.RequestException as e:
        logger.error(f"Ошибка при запросе главной страницы: {e}", exc_info=True)
    except Exception as e:
        logger.error(f"Критическая ошибка парсера: {e}", exc_info=True)


if __name__ == "__main__":
    # Инициализируем Django при запуске скрипта напрямую
    init_django()
    azbukatepla_parser()
