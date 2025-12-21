import os
import sys
import django
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin
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


def get_product_details(product_url):
    """
    Получение дополнительной информации со страницы товара

    Args:
        product_url (str): URL страницы товара

    Returns:
        dict: Словарь с данными товара (description, image_urls, specifications)
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

        return {
            "description": full_description,
            "image_urls": image_urls,
            "specifications": specs_text.strip() if specs_text else "",
        }
    except requests.RequestException as e:
        print(f"Ошибка при запросе страницы товара {product_url}: {e}")
        return {"description": "", "image_urls": [], "specifications": ""}
    except Exception as e:
        print(f"Ошибка при парсинге страницы товара {product_url}: {e}")
        return {"description": "", "image_urls": [], "specifications": ""}


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
