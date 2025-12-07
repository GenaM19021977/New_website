@echo off
REM Скрипт для запуска Django сервера с автоматическим открытием браузера
cd /d %~dp0
call venv\Scripts\activate.bat
python runserver.py

