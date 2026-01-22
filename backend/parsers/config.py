"""
Конфигурация для парсера azbukatepla.by
"""
import os

# Базовые настройки парсера
PARSER_CONFIG = {
    # URL для парсинга
    "BASE_URL": "https://azbukatepla.by",
    "TARGET_PAGE": "/product-cat/kotly-otopleniya/elektricheskie-kotly",
    "FILTER_PARAMS": "?fwp__k_type=elektricheskij",
    
    # Таймауты (в секундах)
    "PAGE_LOAD_TIMEOUT": 15,
    "ELEMENT_WAIT_TIMEOUT": 10,
    "IMPLICIT_WAIT": 10,
    
    # Retry настройки
    "RETRY_COUNT": 3,
    "RETRY_DELAY": 5,  # секунды между попытками
    
    # Задержки между операциями (в секундах)
    "PAGE_DELAY": 1,  # Задержка между переходами на страницы
    "PAGINATION_DELAY": 1,  # Задержка при обработке пагинации
    
    # Ограничения
    "MAX_PAGES_TO_CHECK": 50,  # Максимальное количество страниц для проверки пагинации
    "MAX_IMAGES_PER_PRODUCT": 5,  # Максимальное количество изображений для товара
    "BATCH_SIZE": 50,  # Размер батча для пакетной обработки БД
    
    # Настройки валидации изображений
    "VALIDATE_IMAGE_URLS": True,  # Валидировать формат URL изображений
    "CHECK_IMAGE_AVAILABILITY": False,  # Проверять доступность изображений (медленно)
    "IMAGE_VALIDATION_TIMEOUT": 3,  # Таймаут для проверки доступности изображения (секунды)
    
    # User-Agent
    "USER_AGENT": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
    
    # Размер окна браузера
    "WINDOW_SIZE": "1920,1080",
    
    # Марки котлов для парсинга (без дубликатов, сравнение без учета регистра)
    "TARGET_BRANDS": [
        "TECLine",
        "vaillant eloBLOCK VE",
        "PROTHERM СКАТ",
        "TEKNIX ESPRO",
    ],
    
    # Настройки логирования
    "LOG_LEVEL": os.getenv("LOG_LEVEL", "INFO"),
    "LOG_FORMAT": "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    "LOG_FILE": os.getenv("LOG_FILE", "logs/parser.log"),  # Путь к файлу логов (пустая строка или "None" для отключения)
}
