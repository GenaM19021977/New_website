python -m pip install virtualenv # создание виртуального окружения
python -m venv venv
.\venv\Scripts\Activate.ps1 # активация виртуального окружения

# Установка библиотек
# yна начальном этапе
python.exe -m pip install --upgrade pip
python -m pip install Django
python -m pip install djangorestframework # для работы с API




# Создание проекта на Django
django-admin startproject electric_boiler
python manage.py startapp products

# Применение миграций и запуск
python manage.py makemigrations
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver

# Работа с git
git push

# Работа с Refct
npm create vite@latest # использовал этот порт проекта будет 5173
npm install # установка дополнительного софта
npm run dev # запуск сервера

# Можно и так порт будет 3000
npm install -g npm
npx create-react-app .
npm start

# Установка библиотек для взаимодействия Django и React 
python -m pip install django-cors-headers # в \backend

# Создание пользовательской модели аутентификации

# ============================================
# АВТОМАТИЧЕСКАЯ АКТИВАЦИЯ ВИРТУАЛЬНОГО ОКРУЖЕНИЯ
# ============================================

# 1. В Cursor/VS Code - автоматически настроено через .vscode/settings.json
#    Интерпретатор будет выбран автоматически при открытии проекта

# 2. В PowerShell терминале:
#    - Используйте команду: backend
#    - Или: cd-backend
#    - Это переведет вас в папку backend и активирует venv автоматически

# 3. Ручная активация (если нужно):
#    .\venv\Scripts\Activate.ps1

# установил доп библиотеки
Установка библиотек для парсинга данных
1. Установить библиотеку `pip install selenium` - для автоматизации браузера и парсинга динамических страниц
2. Установить библиотеку `pip install beautifulsoup4` - для парсинга HTML-контента
3. Установить библиотеку `pip install requests` - для HTTP-запросов при парсинге
4. Установить библиотеку `pip install lxml` - для быстрого парсинга XML/HTML