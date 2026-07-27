# DEPLOYMENT — COLIBRI

Три контура: **веб** (Netlify), **база** (Supabase), **десктоп** (Electron). Всё, что ещё не подтверждено, вынесено в раздел «Проверить» с конкретным вопросом.

---

## 0. Реквизиты (подтверждено через Netlify CLI, 2026-07-27)

| | |
|---|---|
| Сайт | **`c0libri`** → **https://c0libri.netlify.app** (отвечает 200) |
| Аккаунт | Ilia Kostroma, `sdby.iliavladimirovich@gmail.com`, команда `sdby-iliavladimirovich's team` |
| Репозиторий | `github.com/IliaKostroma/colibri`, ветка **`main`** |
| Команда сборки | `npm run build`, публикуется `dist` |
| Автодеплой | **включён** (`stop_builds: false`) — пуш в `main` собирает прод |
| Опубликовано сейчас | `47381ee` от 20.01.2026, статус `ready` |

Папка слинкована с сайтом (`.netlify/state.json`, в `.gitignore` проекта). CLI стоит локально: `node_modules/.bin/netlify`.

Полезное:

```bash
node_modules/.bin/netlify status                    # кто я и к чему привязан
node_modules/.bin/netlify env:list --context production
node_modules/.bin/netlify deploy --build --alias preview   # превью-деплой без пуша в main
node_modules/.bin/netlify open:admin                # админка сайта в браузере
```

---

## 1. Веб — Netlify

Конфиг целиком (`netlify.toml`):

```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

- Сборка — `vite build` в `dist/`. Проверено 2026-07-27: 48 модулей, 208 kB (56 kB gzip), 0.4 с.
- Редирект `/*` → `/index.html` нужен, потому что это SPA: без него любой прямой заход не на корень отдаст 404.
- **Деплой = push в `main`.** Отдельного deploy-скрипта нет, коммиты `60f6896 chore: trigger production deploy` подтверждают, что деплой заведён на пуш.

### Что сейчас live

| | коммит | что содержит |
|---|---|---|
| Задеплоено | `47381ee` | версия от 20.01.2026, OpenRouter на пресетах `@preset/bettertext` / `@preset/tran-sto-eng` |
| Локально | `47381ee` + 5 изменённых файлов | OpenRouter на произвольной модели, дефолт `google/gemini-2.0-flash-001`, поле «Модель» в настройках, подпись «(бесплатно)» убрана |

На 2026-07-27 `main == origin/main`, локальные изменения **в прод не ушли**. Пуш выкатит смену модели/биллинга OpenRouter — сначала закрой `T2` (колонка `openrouter_model` в базе), иначе выбор модели не сохранится.

### Переменные окружения

Сборке нужны:

```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

Vite **инлайнит их в бандл** на этапе сборки — это нормально и так задумано: в клиент попадает публичный anon-ключ, доступ ограничивается RLS-политиками на стороне Supabase. Локально они берутся из `.env` (в git не лежит, шаблон — `.env.example`).

✅ **Проверено 27.07.2026:** обе переменные заданы в Netlify в контексте `production`, scope `All`, и указывают на тот же проект Supabase (`yzmbqchwbjlnbmoytfes`), что и локальный `.env`. Прод и локалка ходят в одну базу — правки данных на localhost видны в бою.

---

## 2. База — Supabase

Используются две таблицы:

- **`tasks`** — задачи. Поля, к которым обращается код: `user_id`, `text`, `completed`, `completed_at`, `color`, `created_at`.
- **`user_settings`** — настройки пользователя, по одной строке на `user_id`: `openai_api_key`, `openrouter_api_key`, `ai_provider`, `ai_model` и (в незакоммиченном коде) `openrouter_model`.

Авторизация — Supabase Auth, email + пароль. При регистрации `auth.js:signUp` создаёт строку в `user_settings` с дефолтами `ai_provider: 'openai'`, `ai_model: 'gpt-3.5-turbo'`.

Клиент настроен на `storageKey: 'colibri-auth'` и в standalone-режиме (иконка на домашнем экране iOS) подменяет хранилище сессии на собственное, дублирующее токен в `sessionStorage` — иначе iOS может вычистить `localStorage` и разлогинить.

### Ключи пользователя

Ключи OpenAI и OpenRouter вводит сам пользователь в настройках, и они складываются в `user_settings` **открытым текстом**. Единственная защита — RLS. Проверь, что политики на обеих таблицах ограничивают выборку `auth.uid() = user_id`, иначе чужой ключ читается чужим аккаунтом.

---

## 3. Десктоп — Electron

```bash
npm run electron:dev          # dev: грузит http://localhost:5173, нужен запущенный npm run dev
npm run electron:build:mac    # прод-сборка → release/ (.dmg + .zip, arm64)
npm run electron:build:win    # nsis + portable
npm run electron:build:linux  # AppImage + deb
```

Как устроено (`electron/main.cjs`): приложение поднимает локальный express на `127.0.0.1:45789`, раздаёт из него `dist/` с SPA-фолбэком и открывает окно на этот адрес — то есть по `http://`, а не через `file://`.

На macOS при старте запрашивается доступ к микрофону (`systemPreferences.askForMediaAccess`), в `package.json` прописан `NSMicrophoneUsageDescription`. Окно создаётся с `nodeIntegration: false` и `contextIsolation: true`.

Подписи и нотаризации нет — собранное приложение macOS будет ругаться при первом запуске (правый клик → Открыть). `build.appId` всё ещё `com.voicetranscriber.app`, `productName` уже `COLIBRI` — расхождение от старого имени проекта.

---

## 4. Проверить

Netlify-контур закрыт 27.07.2026 (см. раздел 0). Осталась Supabase — это не видно ни из репозитория, ни из Netlify CLI:

1. ~~**Netlify:** имя сайта, URL, переменные окружения~~ — ✅ закрыто, см. раздел 0.
2. **Supabase:** есть ли в `user_settings` колонка `openrouter_model`?
   `select column_name from information_schema.columns where table_name = 'user_settings';`
3. **Supabase:** есть ли UNIQUE-констрейнт на `user_settings.user_id`? Без него `upsert` без `onConflict` плодит строки, и `getUserSettings().single()` начнёт падать.
   `select conname, contype from pg_constraint where conrelid = 'user_settings'::regclass;`
4. **Supabase:** включён ли RLS на `tasks` и `user_settings` и что именно разрешают политики?

Ответы вписывать сюда же, вместо вопросов.
