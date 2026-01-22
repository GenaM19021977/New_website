"""
Вспомогательные утилиты для парсера
"""
import logging
import os
import time
from functools import wraps
from typing import Callable, Any

# Настройка логирования
logger = logging.getLogger(__name__)


def retry_on_failure(
    max_attempts: int = 3,
    delay: float = 5.0,
    exceptions: tuple = (Exception,),
):
    """
    Декоратор для повторных попыток выполнения функции при ошибках

    Args:
        max_attempts: Максимальное количество попыток
        delay: Задержка между попытками в секундах
        exceptions: Кортеж исключений, при которых нужно повторять попытку

    Returns:
        Декорированная функция
    """

    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs) -> Any:
            last_exception = None
            for attempt in range(1, max_attempts + 1):
                try:
                    return func(*args, **kwargs)
                except exceptions as e:
                    last_exception = e
                    if attempt < max_attempts:
                        logger.warning(
                            f"Попытка {attempt}/{max_attempts} не удалась для {func.__name__}: {e}. "
                            f"Повтор через {delay} секунд..."
                        )
                        time.sleep(delay)
                    else:
                        logger.error(
                            f"Все {max_attempts} попыток не удались для {func.__name__}: {e}"
                        )
            raise last_exception

        return wrapper

    return decorator


def validate_product_data(product_data: dict) -> tuple[bool, str]:
    """
    Валидация данных товара перед сохранением в БД

    Args:
        product_data: Словарь с данными товара

    Returns:
        tuple: (bool, str) - (валидность, сообщение об ошибке)
    """
    # Проверка обязательных полей
    if not product_data.get("name") or not product_data["name"].strip():
        return False, "Название товара не может быть пустым"

    if not product_data.get("product_url") or not product_data["product_url"].strip():
        return False, "URL товара не может быть пустым"

    # Проверка формата URL
    if not product_data["product_url"].startswith(("http://", "https://")):
        return False, f"Некорректный формат URL: {product_data['product_url']}"

    # Проверка цены
    if not product_data.get("price"):
        logger.warning(f"Цена не указана для товара: {product_data.get('name')}")

    return True, ""


def setup_logging(log_level: str = "INFO", log_format: str = None, log_file: str = None):
    """
    Настройка логирования для парсера

    Args:
        log_level: Уровень логирования (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        log_format: Формат логов
        log_file: Путь к файлу для записи логов (опционально)
    """
    if log_format is None:
        log_format = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"

    # Получаем корневой логгер
    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, log_level.upper(), logging.INFO))

    # Очищаем существующие обработчики
    root_logger.handlers.clear()

    # Создаем форматтер
    formatter = logging.Formatter(log_format)

    # Добавляем обработчик для консоли
    console_handler = logging.StreamHandler()
    console_handler.setLevel(getattr(logging, log_level.upper(), logging.INFO))
    console_handler.setFormatter(formatter)
    root_logger.addHandler(console_handler)

    # Добавляем обработчик для файла, если указан
    if log_file:
        try:
            from logging.handlers import RotatingFileHandler
            
            # Создаем директорию для логов, если её нет
            log_dir = os.path.dirname(log_file)
            if log_dir and not os.path.exists(log_dir):
                os.makedirs(log_dir, exist_ok=True)
            
            # Используем RotatingFileHandler для ротации логов
            file_handler = RotatingFileHandler(
                log_file,
                maxBytes=10 * 1024 * 1024,  # 10 MB
                backupCount=5,  # Храним 5 резервных копий
                encoding="utf-8",
            )
            file_handler.setLevel(getattr(logging, log_level.upper(), logging.INFO))
            file_handler.setFormatter(formatter)
            root_logger.addHandler(file_handler)
            logger.info(f"Логирование в файл включено: {log_file}")
        except Exception as e:
            logger.warning(f"Не удалось настроить логирование в файл: {e}")


def measure_time(func: Callable) -> Callable:
    """
    Декоратор для измерения времени выполнения функции

    Args:
        func: Функция для измерения

    Returns:
        Декорированная функция с логированием времени выполнения
    """
    @wraps(func)
    def wrapper(*args, **kwargs) -> Any:
        start_time = time.time()
        try:
            result = func(*args, **kwargs)
            elapsed = time.time() - start_time
            logger.debug(f"{func.__name__} выполнен за {elapsed:.2f}с")
            return result
        except Exception as e:
            elapsed = time.time() - start_time
            logger.error(f"{func.__name__} завершился с ошибкой за {elapsed:.2f}с: {e}")
            raise
    return wrapper
