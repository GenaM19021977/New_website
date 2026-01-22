import os
import sys
import re
import django
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from selenium.common.exceptions import TimeoutException
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse
from django.db.utils import IntegrityError

# Получаем абсолютный путь к корню проекта
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(project_root)

# Настройка Django окружения
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "electric_boiler.settings")
django.setup()

from products.models import ElectricBoiler

# URL страницы с электрическими котлами
url = "https://azbukatepla.by/product-cat/kotly-otopleniya/elektricheskie-kotly?fwp__k_type=elektricheskij"

# Марки котлов для парсинга
TARGET_BRANDS = [
    "TECLine",
    "TECline",
    "vaillant eloBLOCK VE",
    "Vaillant eloBLOCK VE",
    "PROTHERM СКАТ",
    "Protherm Скат",
    "TEKNIX ESPRO",
    "Teknix ESPRO",
]


def get_driver():
    """
    Создание и настройка WebDriver для Selenium

    Returns:
        webdriver.Chrome: Настроенный экземпляр Chrome WebDriver
    """
    chrome_options = Options()
    # Запуск в headless режиме (без открытия окна браузера)
    chrome_options.add_argument("--headless")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("--disable-gpu")
    chrome_options.add_argument("--window-size=1920,1080")
    # Установка User-Agent
    chrome_options.add_argument(
        "user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36"
    )

    try:
        driver = webdriver.Chrome(options=chrome_options)
        driver.implicitly_wait(10)  # Неявное ожидание элементов (10 секунд)
        return driver
    except Exception as e:
        print(f"Ошибка при создании WebDriver: {e}")
        print("Убедитесь, что ChromeDriver установлен и доступен в PATH")
        raise


def is_target_brand(name):
    """
    Проверка, принадлежит ли товар одной из целевых марок

    Args:
        name (str): Название товара

    Returns:
        bool: True если товар принадлежит целевой марке
    """
    name_lower = name.lower()
    for brand in TARGET_BRANDS:
        if brand.lower() in name_lower:
            return True
    return False


def extract_country(soup):
    """
    Извлечение страны производства со страницы товара

    Args:
        soup: BeautifulSoup объект страницы товара

    Returns:
        str: Название страны или пустая строка
    """
    country = ""

    # Ищем страну в описании товара (itemprop="description")
    description_div = soup.find("div", itemprop="description")
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
                        return country

    # Также ищем в кратком описании
    short_description = soup.find(
        "div", class_="product-short-description"
    ) or soup.find("div", class_="woocommerce-product-details__short-description")
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
                    return country

    return country


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


def extract_description_between_markers(soup):
    """
    Извлечение описания товара между заголовком "Описание" и ссылкой "Инструкция"

    Args:
        soup: BeautifulSoup объект страницы товара

    Returns:
        str: Извлеченное описание товара
    """
    description_parts = []

    # Ищем контейнер с описанием (панель вкладки "Описание")
    description_container = soup.find(
        "div", class_="woocommerce-Tabs-panel--description"
    ) or soup.find("div", class_="entry-content")

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
    full_description = " ".join(description_parts).replace("\n", " ").replace("|", "-")

    # Убираем лишние пробелы
    full_description = " ".join(full_description.split())

    return full_description


def extract_specifications_flexible(soup):
    """
    Гибкое извлечение технических характеристик с учетом разных структур данных

    Args:
        soup: BeautifulSoup объект страницы товара

    Returns:
        str: Текст характеристик
    """
    specs_text = ""

    # Ищем контейнеры с характеристиками в разных местах
    containers = [
        soup.find(
            "table", class_="spec_sheet"
        ),  # Таблица с классом spec_sheet (приоритет)
        soup.find("div", class_="product-short-description"),
        soup.find("div", class_="woocommerce-product-details__short-description"),
        soup.find("div", class_="entry-content"),
        soup.find("div", class_="woocommerce-Tabs-panel--description"),
        soup.find("table", class_="woocommerce-product-attributes"),
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


def normalize_spec_value(value):
    """
    Нормализация значения характеристики (удаление лишних пробелов, символов)

    Args:
        value (str): Исходное значение

    Returns:
        str: Нормализованное значение
    """
    if not value:
        return ""
    # Убираем лишние пробелы
    value = " ".join(value.split())
    # Убираем лишние двоеточия в конце
    value = value.rstrip(":")
    return value.strip()


def parse_specifications(specs_text, product_name=""):
    """
    Парсинг текста характеристик в словарь с нормализацией данных

    Args:
        specs_text (str): Текст характеристик
        product_name (str): Название товара для специальной обработки

    Returns:
        dict: Словарь с распарсенными характеристиками
    """
    specs_dict = {}

    if not specs_text:
        return specs_dict

    # Специальная обработка для котлов, где мощность указана в строке "Регулировка мощности"
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
                    power_match = re.search(
                        r"(\d+(?:[.,]\d+)?(?:\s*-\s*\d+(?:[.,]\d+)?)?)", value_clean
                    )
                    if power_match:
                        power_value = power_match.group(1).strip()
                        # Сохраняем только числовое значение без "кВт"
                        specs_dict["power"] = power_value
                        max_power_found = True
                    else:
                        # Если не нашли число, убираем "кВт" если есть
                        power_value_clean = re.sub(
                            r"\s*квт\s*", "", value_clean, flags=re.IGNORECASE
                        ).strip()
                        specs_dict["power"] = (
                            power_value_clean if power_value_clean else value_clean
                        )
                        max_power_found = True
                    # Не прерываем цикл, продолжаем искать "Регулировка мощности" для power_regulation

                # Проверяем "Регулировка мощности" (для power_regulation и как запасной вариант для power)
                elif "регулировка мощности" in key and value:
                    value_clean = value.strip()

                    # Извлекаем числовое значение
                    power_match = re.search(
                        r"(\d+(?:[.,]\d+)?(?:\s*-\s*\d+(?:[.,]\d+)?)?)", value_clean
                    )
                    if power_match:
                        power_value = power_match.group(1).strip()
                        # Если максимальная мощность не найдена, используем регулировку для power
                        if not max_power_found:
                            specs_dict["power"] = power_value
                        # Для power_regulation сохраняем числовое значение без "кВт"
                        specs_dict["power_regulation"] = power_value
                    else:
                        # Если не нашли число, убираем "кВт" если есть
                        power_value_clean = re.sub(
                            r"\s*квт\s*", "", value_clean, flags=re.IGNORECASE
                        ).strip()
                        if not max_power_found:
                            specs_dict["power"] = (
                                power_value_clean if power_value_clean else value_clean
                            )
                        # Для power_regulation сохраняем без "кВт"
                        specs_dict["power_regulation"] = (
                            power_value_clean if power_value_clean else value_clean
                        )

                    # Если уже нашли максимальную мощность, можно прервать
                    if max_power_found:
                        break

        # Если не нашли ни максимальную мощность, ни регулировку, ищем просто "Мощность"
        if "power" not in specs_dict:
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
                        power_match = re.search(
                            r"(\d+(?:[.,]\d+)?(?:\s*-\s*\d+(?:[.,]\d+)?)?)", value_clean
                        )
                        if power_match:
                            power_value = power_match.group(1).strip()
                            specs_dict["power"] = power_value
                        else:
                            power_value_clean = re.sub(
                                r"\s*квт\s*", "", value_clean, flags=re.IGNORECASE
                            ).strip()
                            specs_dict["power"] = (
                                power_value_clean if power_value_clean else value_clean
                            )
                        break

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
                    r"\s*квт\s*", "", value, flags=re.IGNORECASE
                ).strip()
                specs_dict[matched_field] = (
                    power_value_clean if power_value_clean else value
                )
            # Для регулировки мощности также убираем "кВт" из значения
            elif matched_field == "power_regulation":
                # Убираем "кВт" и другие единицы измерения, оставляем только числовое значение
                power_reg_value_clean = re.sub(
                    r"\s*квт\s*", "", value, flags=re.IGNORECASE
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
            # Специальная обработка для ГВС (нагрев воды)
            elif matched_field == "water_heating":
                # Если значение "Ø" или пустое, но есть упоминание о внешнем баке
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
                units_pattern = re.compile(
                    r"\s*\d+(?:[.,]\d+)?\s*(?:л/мин|л\/мин|l/min|l\/min|л/мин\.?)\s*",
                    re.IGNORECASE,
                )
                # Также удаляем просто "л/мин" без числа
                simple_units_pattern = re.compile(
                    r"\s*(?:л/мин|л\/мин|l/min|l\/min|л/мин\.?)\s*", re.IGNORECASE
                )
                value_clean = units_pattern.sub("", value)
                value_clean = simple_units_pattern.sub("", value_clean).strip()
                value_clean_lower = value_clean.lower()

                # Проверяем наличие упоминания о внешнем баке в очищенном значении
                has_external_tank_in_value = any(
                    indicator in value_clean_lower
                    for indicator in external_tank_indicators
                )

                # Если есть упоминание о внешнем баке в очищенном значении или в исходной строке
                if has_external_tank_in_value or has_external_tank:
                    # Оставляем только текст о внешнем баке, убирая единицы измерения
                    specs_dict[matched_field] = "в выносном баке"
                # Если значение "Ø" или пустое после очистки
                elif value_clean.strip() in ["Ø", "", "-", "—", "нет", "no"]:
                    # Не сохраняем пустые значения
                    continue
                # Если значение не пустое и не "Ø" после очистки
                elif value_clean.strip() not in ["Ø", "", "-", "—", "нет", "no"]:
                    specs_dict[matched_field] = value_clean
                # Иначе не сохраняем
                else:
                    continue
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


def get_product_details(driver, product_url):
    """
    Получение дополнительной информации со страницы товара с использованием Selenium

    Args:
        driver: Selenium WebDriver объект
        product_url (str): URL страницы товара

    Returns:
        dict: Словарь с данными товара (description, image_urls, specifications, country, documentation)
    """
    try:
        # Переход на страницу товара
        driver.get(product_url)

        # Ожидание загрузки страницы (ждем появления основного контента)
        try:
            WebDriverWait(driver, 15).until(
                EC.presence_of_element_located((By.CLASS_NAME, "product"))
            )
        except TimeoutException:
            print(f"Таймаут при загрузке страницы товара: {product_url}")

        # Получаем HTML страницы для парсинга BeautifulSoup
        page_source = driver.page_source
        soup = BeautifulSoup(page_source, "lxml")

        # Извлекаем описание товара
        full_description = extract_description_between_markers(soup)

        # Получаем все изображения товара
        image_urls = []
        gallery = soup.find("div", class_="woocommerce-product-gallery")
        if gallery:
            for img in gallery.find_all("img"):
                src = img.get("src") or img.get("data-src") or img.get("data-lazy-src")
                if src and src not in image_urls:
                    # Пропускаем placeholder изображения
                    if (
                        "placeholder" not in src.lower()
                        and "woocommerce" not in src.lower()
                    ):
                        image_urls.append(src)

        # Извлекаем технические характеристики (гибкий метод)
        specs_text = extract_specifications_flexible(soup)

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
            "specifications": specs_text,
            "country": country,
            "documentation": documentation,
        }
    except TimeoutException as e:
        print(f"Таймаут при запросе страницы товара {product_url}: {e}")
        return {
            "description": "",
            "image_urls": [],
            "specifications": "",
            "country": "",
            "documentation": "",
        }
    except Exception as e:
        print(f"Ошибка при парсинге страницы товара {product_url}: {e}")
        return {
            "description": "",
            "image_urls": [],
            "specifications": "",
            "country": "",
            "documentation": "",
        }


def extract_voltage_from_description(description, product_name, power_value):
    """
    Извлечение напряжения питания из описания товара на основе мощности

    Для котлов Vaillant eloBLOCK:
    - Котлы мощностью 6 кВт и 9 кВт могут работать от сети с напряжением ~220В и ~380В
    - Модели, начиная с 12 кВт, могут работать только от сети мощностью ~380 В

    Args:
        description (str): Описание товара
        product_name (str): Название товара
        power_value (str): Значение мощности в кВт

    Returns:
        str: Напряжение питания или пустая строка
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
            power_match = re.search(r"(\d+(?:[.,]\d+)?)", str(power_value))
            if power_match:
                power_num = float(power_match.group(1).replace(",", "."))
        except (ValueError, AttributeError):
            pass

    # Паттерны для поиска информации о напряжении в описании
    # Паттерн 1: "Котлы мощностью 6 кВт и 9 кВт могут работать от сети с напряжением ~220В и ~380В"
    pattern_6_9 = re.compile(
        r"котлы\s+мощностью\s+6\s+квт\s+и\s+9\s+квт.*?(?:могут\s+работать|работать).*?(?:от\s+сети|сети).*?(?:с\s+напряжением|напряжением)\s*(~?\s*220\s*в\s+и\s+~?\s*380\s*в)",
        re.IGNORECASE | re.DOTALL,
    )

    # Паттерн 2: "Модели, начиная с 12 кВт, могут работать только от сети мощностью ~380 В"
    pattern_12_plus = re.compile(
        r"модели.*?начиная\s+с\s+12\s+квт.*?(?:могут\s+работать|работать).*?(?:только\s+от\s+сети|от\s+сети).*?(?:мощностью|напряжением)\s*(~?\s*380\s*в)",
        re.IGNORECASE | re.DOTALL,
    )

    # Паттерн 3: "Важно!!! Модели, начиная с 12 кВт, могут работать только от сети мощностью ~380 В"
    pattern_important = re.compile(
        r"важно.*?модели.*?начиная\s+с\s+12\s+квт.*?(?:могут\s+работать|работать).*?(?:только\s+от\s+сети|от\s+сети).*?(?:мощностью|напряжением)\s*(~?\s*380\s*в)",
        re.IGNORECASE | re.DOTALL,
    )

    # Ищем информацию о напряжении в описании
    # Сначала проверяем паттерн для 6 и 9 кВт
    match_6_9 = pattern_6_9.search(description_lower)
    if match_6_9:
        voltage_text = match_6_9.group(1)
        if voltage_text:
            # Нормализуем текст напряжения (убираем ~ и лишние пробелы)
            voltage_text = re.sub(r"~", "", voltage_text)
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
            voltage_text = re.sub(r"~", "", voltage_text)
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


def get_default_country_by_brand(name):
    """
    Получение страны производителя по умолчанию на основе марки товара

    Args:
        name (str): Название товара

    Returns:
        str: Название страны или пустая строка
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


def save_to_database(product_data):
    """
    Сохранение данных товара в базу данных

    Args:
        product_data (dict): Словарь с данными товара

    Returns:
        tuple: (bool, str) - (успех, сообщение)
    """
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
        # Если цена найдена, нормализуем её (удаляем лишние символы, оставляем только цифры, точку, запятую и пробелы)
        elif "уточняйте" not in price.lower():
            price = re.sub(r"[^\d,.\s]", "", price).strip()
            # Если после нормализации цена стала пустой, устанавливаем значение по умолчанию
            if not price:
                price = "Цену и наличие товара уточняйте у продавца"

        # Получаем страну, если не указана - устанавливаем значение по умолчанию
        country = product_data.get("country") or ""
        if not country:
            country = get_default_country_by_brand(product_data.get("name", ""))

        # Подготавливаем данные для сохранения
        defaults = {
            "price": price,
            "product_url": product_data.get("product_url", ""),
            "description": product_data.get("description") or None,
            "country": country or None,  # Страна производства
            "documentation": product_data.get("documentation")
            or None,  # Ссылка на документацию
            **specs_dict,  # Добавляем все распарсенные характеристики
        }

        # Обрабатываем изображения (поддерживаем до 5 изображений)
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

        # Создаем или обновляем запись
        boiler, created = ElectricBoiler.objects.update_or_create(
            name=product_data["name"], defaults=defaults
        )

        status_message = "Успешно сохранено" if created else "Успешно обновлено"
        return True, status_message

    except IntegrityError as e:
        return False, f"Ошибка целостности данных: {str(e)}"
    except Exception as e:
        return False, f"Ошибка при сохранении: {str(e)}"


def parse_azbuka_tepla():
    """
    Основная функция парсера для сайта azbukatepla.by

    Парсит страницу с электрическими котлами и сохраняет данные в базу данных
    для марок: TECLine, vaillant eloBLOCK VE, Protherm КE Скат, TEKNIX ESPRO
    """
    driver = None
    try:
        # Создаем WebDriver
        driver = get_driver()

        # Переход на главную страницу каталога
        driver.get(url)

        # Ожидание загрузки страницы (ждем появления списка товаров)
        try:
            WebDriverWait(driver, 15).until(
                EC.presence_of_element_located((By.CLASS_NAME, "products"))
            )
        except TimeoutException:
            print("Таймаут при загрузке главной страницы")
            return

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
            print("Товары не найдены на странице")
            return

        processed_count = 0
        error_count = 0
        skipped_count = 0

        print(f"\nНайдено товаров на странице: {len(products)}")
        print(f"Ищем товары марок: {', '.join(TARGET_BRANDS)}\n")

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

                # Извлекаем цену
                price_element = product.find(
                    "span", class_="woocommerce-Price-amount amount"
                ) or product.find(
                    "span", class_=lambda x: x and "price" in x.lower() if x else False
                )

                if not price_element:
                    print(
                        f"⚠ Цена не найдена для товара: {name}, устанавливаем значение по умолчанию"
                    )
                    price = "Цену и наличие товара уточняйте у продавца"
                else:
                    price = price_element.text.strip()

                # Извлекаем ссылку на товар
                link_element = product.find("a")
                if not link_element or "href" not in link_element.attrs:
                    print(f"⚠ Ссылка не найдена для товара: {name}")
                    continue

                product_url = urljoin(url, link_element["href"])

                # Получаем дополнительную информацию со страницы товара
                print(f"Обработка товара: {name}")
                details = get_product_details(driver, product_url)

                # Вывод основной информации
                print("=" * 50)
                print(f"Название: {name}")
                print(f"Цена: {price}")
                print(f"Страна производства: {details.get('country', 'Не указана')}")
                documentation_url = details.get("documentation", "")
                print(
                    f"Документация: {documentation_url if documentation_url else 'Не найдена'}"
                )
                print(f"Ссылка на товар: {product_url}")
                if details["description"]:
                    print(
                        f"Описание: {details['description'][:100]}..."
                        if len(details["description"]) > 100
                        else f"Описание: {details['description']}"
                    )

                # Вывод характеристик
                if details["specifications"]:
                    print("\nХарактеристики:")
                    print(details["specifications"])

                # Вывод изображений
                if details["image_urls"]:
                    print(f"\nНайдено изображений: {len(details['image_urls'])}")
                    for i, img_url in enumerate(details["image_urls"][:5], 1):
                        print(f"Изображение {i}: {img_url}")

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
                    print(f"\n✓ Сохранение в БД: {message}")
                else:
                    error_count += 1
                    print(f"\n✗ Ошибка сохранения: {message}")

                print("=" * 50 + "\n")

            except AttributeError as e:
                error_count += 1
                print(f"Ошибка при извлечении данных товара: {e}")
                continue
            except Exception as e:
                error_count += 1
                print(f"Ошибка при обработке товара: {e}")
                continue

        # Итоговая статистика
        print("\n" + "=" * 50)
        print("Парсинг завершен!")
        print(f"Успешно обработано: {processed_count}")
        print(f"Пропущено (не целевые марки): {skipped_count}")
        print(f"Ошибок: {error_count}")
        print("=" * 50)

    except Exception as e:
        print(f"Критическая ошибка парсера: {e}")
        import traceback

        traceback.print_exc()
    finally:
        # Закрываем WebDriver
        if driver:
            driver.quit()


if __name__ == "__main__":
    parse_azbuka_tepla()
