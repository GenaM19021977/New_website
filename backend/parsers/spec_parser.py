"""
Модуль для парсинга технических характеристик
Разбивает большую функцию parse_specifications на более мелкие части
"""
import re
from typing import Dict


def extract_power_for_target_brands(specs_text: str, product_name: str) -> Dict[str, str]:
    """
    Извлечение мощности для целевых марок котлов

    Args:
        specs_text: Текст характеристик
        product_name: Название товара

    Returns:
        dict: Словарь с извлеченными значениями мощности
    """
    result = {}
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

    if not is_target_brand:
        return result

    max_power_found = False

    for line in specs_text.split("\n"):
        if ":" not in line:
            continue

        key = line.split(":")[0].strip().lower()
        value = line.split(":", 1)[1].strip() if ":" in line else ""

        # Проверяем "Максимальная тепловая мощность" (приоритет)
        if (
            "максимальная тепловая мощность" in key
            and value
            and not max_power_found
        ):
            value_clean = value.strip()
            power_match = re.search(
                r"(\d+(?:[.,]\d+)?(?:\s*-\s*\d+(?:[.,]\d+)?)?)", value_clean
            )
            if power_match:
                result["power"] = power_match.group(1).strip()
                max_power_found = True
            else:
                power_value_clean = re.sub(
                    r"\s*квт\s*", "", value_clean, flags=re.IGNORECASE
                ).strip()
                result["power"] = (
                    power_value_clean if power_value_clean else value_clean
                )
                max_power_found = True

        # Проверяем "Регулировка мощности"
        elif "регулировка мощности" in key and value:
            value_clean = value.strip()
            power_match = re.search(
                r"(\d+(?:[.,]\d+)?(?:\s*-\s*\d+(?:[.,]\d+)?)?)", value_clean
            )
            if power_match:
                power_value = power_match.group(1).strip()
                if not max_power_found:
                    result["power"] = power_value
                result["power_regulation"] = power_value
            else:
                power_value_clean = re.sub(
                    r"\s*квт\s*", "", value_clean, flags=re.IGNORECASE
                ).strip()
                if not max_power_found:
                    result["power"] = (
                        power_value_clean if power_value_clean else value_clean
                    )
                result["power_regulation"] = (
                    power_value_clean if power_value_clean else value_clean
                )

            if max_power_found:
                break

    # Если не нашли ни максимальную мощность, ни регулировку, ищем просто "Мощность"
    if "power" not in result:
        for line in specs_text.split("\n"):
            if ":" in line:
                key = line.split(":")[0].strip().lower()
                value = line.split(":", 1)[1].strip() if ":" in line else ""

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
                        result["power"] = power_match.group(1).strip()
                    else:
                        power_value_clean = re.sub(
                            r"\s*квт\s*", "", value_clean, flags=re.IGNORECASE
                        ).strip()
                        result["power"] = (
                            power_value_clean if power_value_clean else value_clean
                        )
                    break

    return result


def process_water_heating_value(value: str, line: str) -> str:
    """
    Обработка значения для ГВС (нагрев воды)

    Args:
        value: Исходное значение
        line: Полная строка для проверки контекста

    Returns:
        str: Обработанное значение или пустая строка для пропуска
    """
    line_lower = line.lower()
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

    # Убираем единицы измерения
    units_pattern = re.compile(
        r"\s*\d+(?:[.,]\d+)?\s*(?:л/мин|л\/мин|l/min|l\/min|л/мин\.?)\s*",
        re.IGNORECASE,
    )
    simple_units_pattern = re.compile(
        r"\s*(?:л/мин|л\/мин|l/min|l\/min|л/мин\.?)\s*", re.IGNORECASE
    )
    value_clean = units_pattern.sub("", value)
    value_clean = simple_units_pattern.sub("", value_clean).strip()
    value_clean_lower = value_clean.lower()

    has_external_tank_in_value = any(
        indicator in value_clean_lower for indicator in external_tank_indicators
    )

    if has_external_tank_in_value or has_external_tank:
        return "в выносном баке"
    elif value_clean.strip() in ["Ø", "", "-", "—", "нет", "no"]:
        return ""  # Пустая строка означает пропуск
    elif value_clean.strip() not in ["Ø", "", "-", "—", "нет", "no"]:
        return value_clean
    else:
        return ""


def get_field_mapping() -> Dict[str, str]:
    """
    Получение маппинга названий характеристик на поля модели

    Returns:
        dict: Словарь маппинга
    """
    return {
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
