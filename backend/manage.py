#!/usr/bin/env python
"""Django's command-line utility for administrative tasks."""
import os
import sys
import time
import webbrowser
import threading


def open_browser_after_delay(url, delay=2.5):
    """Открывает браузер через указанную задержку"""
    def open_browser():
        time.sleep(delay)
        try:
            webbrowser.open(url)
            print(f'\n✓ Браузер автоматически открыт: {url}')
        except Exception as e:
            print(f'\n⚠ Не удалось открыть браузер: {e}')
    
    thread = threading.Thread(target=open_browser)
    thread.daemon = True
    thread.start()


def main():
    """Run administrative tasks."""
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'electric_boiler.settings')
    try:
        from django.core.management import execute_from_command_line
        
        # Если запускается runserver, открываем браузер автоматически
        if len(sys.argv) > 1 and sys.argv[1] == 'runserver' and '--no-browser' not in sys.argv:
            # Определяем URL сервера
            addrport = '127.0.0.1:8000'
            if len(sys.argv) > 2:
                # Проверяем, не является ли второй аргумент флагом
                if sys.argv[2] not in ['--help', '--version', '--noreload', '--nothreading', 
                                      '--nostatic', '--insecure', '--ipv6', '--no-browser']:
                    addrport = sys.argv[2]
            
            # Парсим адрес и порт
            if ':' in addrport:
                addr, port = addrport.rsplit(':', 1)
            else:
                addr = '127.0.0.1'
                port = addrport
            
            if addr == '0.0.0.0' or addr == '*':
                addr = '127.0.0.1'
            
            url = f'http://{addr}:{port}/'
            open_browser_after_delay(url)
        
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc
    
    execute_from_command_line(sys.argv)


if __name__ == '__main__':
    main()