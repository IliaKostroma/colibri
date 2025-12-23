#!/bin/bash

# Voice Transcriber - Quick Start
# Двойной клик чтобы запустить приложение в браузере

cd "$(dirname "$0")"

echo "🎤 Запуск Voice Transcriber..."
echo ""

# Проверяем установлены ли зависимости
if [ ! -d "node_modules" ]; then
    echo "📦 Первый запуск - устанавливаю зависимости..."
    npm install
    echo ""
fi

echo "🌐 Открываю в браузере..."
echo "   http://localhost:5173"
echo ""
echo "⏹  Для остановки нажми Ctrl+C или закрой это окно"
echo ""

# Запускаем сервер и открываем браузер
npm run start
