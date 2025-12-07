"""
Переопределенная команда runserver с автоматическим открытием браузера
Использование: python manage.py runserver
"""
import time
import webbrowser
import threading
from django.core.management.commands.runserver import Command as RunserverCommand


class Command(RunserverCommand):
    help = 'Запускает сервер разработки с автоматическим открытием браузера'

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.should_open_browser = True
        self.server_url = None

    def add_arguments(self, parser):
        super().add_arguments(parser)
        parser.add_argument(
            '--no-browser',
            action='store_true',
            dest='no_browser',
            help='Не открывать браузер автоматически',
        )

    def handle(self, *args, **options):
        # Сохраняем настройку для открытия браузера
        self.should_open_browser = not options.get('no_browser', False)
        
        # Парсим адрес и порт
        addrport = ''
        if args:
            addrport = args[0]
        
        if addrport:
            if ':' in addrport:
                addr, _, port = addrport.rpartition(':')
                try:
                    port = int(port)
                except ValueError:
                    addr = addrport
                    port = self.default_port
            else:
                try:
                    port = int(addrport)
                    addr = self.default_addr
                except ValueError:
                    addr = addrport
                    port = self.default_port
        else:
            addr = self.default_addr
            port = self.default_port
        
        # Формируем URL
        protocol = 'https' if options.get('insecure_serving', False) else 'http'
        if addr == '0.0.0.0' or addr == '*':
            addr = '127.0.0.1'
        self.server_url = f'{protocol}://{addr}:{port}/'
        
        # Вызываем родительский метод для запуска сервера
        super().handle(*args, **options)
        
        # Запускаем открытие браузера ПОСЛЕ того, как сервер начал запускаться
        if self.should_open_browser and self.server_url:
            def open_browser_delayed():
                time.sleep(2.5)  # Ждем, пока сервер полностью запустится
                try:
                    webbrowser.open(self.server_url)
                    self.stdout.write(
                        self.style.SUCCESS(f'\n✓ Браузер автоматически открыт: {self.server_url}')
                    )
                except Exception as e:
                    self.stdout.write(
                        self.style.WARNING(f'\n⚠ Не удалось открыть браузер: {e}')
                    )
            
            browser_thread = threading.Thread(target=open_browser_delayed)
            browser_thread.daemon = True
            browser_thread.start()

