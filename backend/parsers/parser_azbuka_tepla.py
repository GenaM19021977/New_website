import os
import sys
import django
import requests
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

url = "https://azbukatepla.by/product-cat/kotly-otopleniya/elektricheskie-kotly"
headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36"
}


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
            if "производство" in line_lower:
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


def get_product_details(product_url):
    """
    Получение дополнительной информации со страницы товара

    Args:
        product_url (str): URL страницы товара

    Returns:
        dict: Словарь с данными товара (description, image_urls, specifications, country, documentation)
    """
    try:
        response = requests.get(product_url, headers=headers, timeout=30)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, "lxml")

        # Получаем описание товара
        description_blocks = soup.find_all("p", style="text-align: justify;", limit=2)
        description_parts = [
            block.get_text(strip=True)
            for block in description_blocks
            if block.get_text(strip=True)
        ]
        full_description = (
            " ".join(description_parts).replace("\n", " ").replace("|", "-")
        )

        # Получаем все изображения товара
        image_urls = []
        gallery = soup.find("div", class_="woocommerce-product-gallery")
        if gallery:
            for img in gallery.find_all("img"):
                if "src" in img.attrs and img["src"] not in image_urls:
                    image_urls.append(img["src"])

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
        print(f"Ошибка при запросе страницы товара {product_url}: {e}")
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
    field_mapping = {
        "Мощность, кВт": "power",
        "Регулировка мощности": "power_regulation",
        "Площадь отопления, рекомендуемая до": "heating_area",
        "Начальный вариант работы": "work_type",
        "Возможность для работы самостоятельно": "self_work",
        "Возможность для нагрева воды": "water_heating",
        "Возможность нагрева теплого пола": "floor_heating",
        "Расширительный бак": "expansion_tank",
        "Циркуляционный насос": "circulation_pump",
        "Питание от сети, Вольт": "voltage",
        "Кабель подключения": "cable",
        "Предохранитель, А": "fuse",
        "Диапазон выбираемых температур": "temp_range",
        "КПД": "efficiency",
        "Подключение к системе": "connection",
        "Габаритные размеры": "dimensions",
        "WiFi": "wifi",
        "Возможность подключения WiFi": "wifi",
        "Возможность подключения комнатного термостата": "thermostat",
        "Комнатный термостат в комплекте": "thermostat_included",
        "Возможно подключение датчика уличной температуры": "outdoor_sensor",
    }

    # Парсим характеристики построчно
    for line in specs_text.split("\n"):
        if ":" in line:
            key, value = line.split(":", 1)
            key = key.strip()
            value = value.strip()

            # Ищем соответствие в маппинге
            for spec_key, field_name in field_mapping.items():
                if spec_key in key:
                    specs_dict[field_name] = value
                    break

    return specs_dict


def save_to_database(product_data):
    """
    Сохранение данных товара в базу данных

    Args:
        product_data (dict): Словарь с данными товара

    Returns:
        tuple: (bool, str) - (успех, сообщение)
    """
    try:
        # Парсим характеристики
        specs_dict = parse_specifications(product_data.get("specifications", ""))

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
        else:
            defaults["image_1"] = None
            defaults["image_2"] = None
            defaults["image_3"] = None
            defaults["image_4"] = None

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


def azbukatepla_parser():
    """
    Основная функция парсера для сайта azbukatepla.by

    Парсит страницу с электрическими котлами и сохраняет данные в базу данных
    """
    try:
        response = requests.get(url, headers=headers, timeout=30)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, "lxml")

        # Находим все элементы товаров
        products = soup.find_all("li", class_="product-type-simple")

        if not products:
            print("Товары не найдены на странице")
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
                    print(f"Цена не найдена для товара: {name}")
                    continue

                price = price_element.text.strip()

                # Извлекаем ссылку на товар
                link_element = product.find("a")
                if not link_element or "href" not in link_element.attrs:
                    print(f"Ссылка не найдена для товара: {name}")
                    continue

                product_url = urljoin(url, link_element["href"])

                # Получаем дополнительную информацию со страницы товара
                details = get_product_details(product_url)

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
                    for i, img_url in enumerate(details["image_urls"][:4], 1):
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
        print(f"Ошибок: {error_count}")
        print("=" * 50)

    except requests.RequestException as e:
        print(f"Ошибка при запросе главной страницы: {e}")
    except Exception as e:
        print(f"Критическая ошибка парсера: {e}")


if __name__ == "__main__":
    azbukatepla_parser()
