python -m pip install virtualenv # создание виртуального окружения
python -m venv venv
venv/scripts/activate 
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

# Выполнил пцнкты плана

# установил доп библиотеки
Установка библиотек для парсинга данных
1. Установить библиотеку `pip install selenium` - для автоматизации браузера и парсинга динамических страниц
2. Установить библиотеку `pip install beautifulsoup4` - для парсинга HTML-контента
3. Установить библиотеку `pip install requests` - для HTTP-запросов при парсинге
4. Установить библиотеку `pip install lxml` - для быстрого парсинга XML/HTML

Подключение к базе данных PostgreSQL
5. Установить библиотеку `pip install psycopg2-binary` - драйвер для подключения к PostgreSQL
6. Установить библиотеку `pip install django-environ` - для работы с переменными окружения
7. Создать базу данных PostgreSQL для проекта
8. Настроить подключение к БД в settings.py через переменные окружения

## Этап 3: Настройка безопасности и переменных окружения
9. Установить библиотеку `pip install python-decouple` - альтернатива для работы с .env файлами
10. Создать файл `.env` в папке backend с секретными ключами (SECRET_KEY, DB настройки)
11. Создать файл `.env.example` как шаблон для других разработчиков
12. Обновить settings.py для чтения переменных из .env файла

## Этап 4: Аутентификация и авторизация пользователей
13. Установить библиотеку `pip install djangorestframework-simplejwt` - для JWT токенов
14. Установить библиотеку `pip install django-allauth` - для социальной аутентификации (опционально)
На данном этапе создаем модели пользователей и суперпользователя, в settings прописали AUTH_USER_MODEL = 'products.CustomUser'
superuser BHUgbuyii@mail.org | ZXCzxc321

установка доп библиотек для пользовательского интерфейса
npm install react-router-dom
npm install @mui/material @emotion/react @emotion/styled #библиотека иконок пользователького интерфейса
npm install @mui/icons-material

background-image: url('D:\Developer\Turiki\New_website\frontend\src\pictures\87168176238132.jpg'); # код для вставки изображения на фон страницы сайта

npm i axios # Запросы из браузера: выполняйте XMLHttpRequests непосредственно из браузера
npm install react-hook-form # устанвливаем обработчик форм
pip install django-rest-knox # Попробую аутентификацию чезе Knox вместо JWT