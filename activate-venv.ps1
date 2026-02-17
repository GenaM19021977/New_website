# Активация виртуального окружения backend при открытии терминала в Cursor/VS Code
$backend = Join-Path $PSScriptRoot "backend"
$venv1 = Join-Path $backend "venv\Scripts\Activate.ps1"
$venv2 = Join-Path $backend ".venv\Scripts\Activate.ps1"
if (Test-Path $venv1) { & $venv1; Write-Host "venv активирован (backend/venv)" -ForegroundColor Green }
elseif (Test-Path $venv2) { & $venv2; Write-Host "venv активирован (backend/.venv)" -ForegroundColor Green }
