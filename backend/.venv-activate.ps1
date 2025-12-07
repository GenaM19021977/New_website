# Автоматическая активация виртуального окружения для PowerShell
# Этот скрипт будет автоматически активировать venv при входе в директорию backend

if (Test-Path ".\venv\Scripts\Activate.ps1") {
    & ".\venv\Scripts\Activate.ps1"
    Write-Host "Виртуальное окружение активировано!" -ForegroundColor Green
}

