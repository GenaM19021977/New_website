"""
Скрипт для запуска Django сервера с автоматическим открытием браузера
Использование: python runserver.py
"""
import os
import sys
import time
import webbrowser
import threading
from django.core.management import execute_from_command_line

def open_browser():
    """Открывает браузер через 1.5 секунды после запуска сервера"""
    time.sleep(1.5)
    url = 'http://127.0.0.1:8000/'
    webbrowser.open(url)
    print(f"\n✓ Браузер открыт: {url}")

if __name__ == '__main__':
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'electric_boiler.settings')
    
    # Запускаем открытие браузера в отдельном потоке
    browser_thread = threading.Thread(target=open_browser)
    browser_thread.daemon = True
    browser_thread.start()
    
    # Запускаем Django сервер
    sys.argv = ['manage.py', 'runserver']
    execute_from_command_line(sys.argv)

