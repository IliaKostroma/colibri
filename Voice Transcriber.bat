@echo off
title Voice Transcriber

cd /d "%~dp0"

echo.
echo    Voice Transcriber
echo    =================
echo.

:: Проверяем установлен ли Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js не установлен!
    echo Скачай с https://nodejs.org/
    pause
    exit /b 1
)

:: Проверяем установлены ли зависимости
if not exist "node_modules" (
    echo [*] Первый запуск - устанавливаю зависимости...
    call npm install
    echo.
)

echo [*] Запускаю сервер...
echo [*] Открываю в браузере: http://localhost:5173
echo.
echo [!] Для остановки закрой это окно или нажми Ctrl+C
echo.

call npm run start
