# AZ Group — сайт компании и админка

Публичный сайт международной образовательной компании AZ Group (https://www.azgroup.kz) и панель управления контентом. Макет — в духе egov.kz: серый фон, шапка с поиском, слева меню разделов, контент белыми карточками; на телефоне — нижняя панель вкладок и лист «Ещё».

Разделы сайта: главная, «Мероприятия» (живой календарь сезона 2026–2027 с фильтром по программам), «Проекты», «О компании», «Новости», «Партнёры», «Вопросы», «Контакты» (форма заявки → админка).

## Стек

- **Сайт:** React 18 + TypeScript + Vite 6, Tailwind CSS v4 и обычный CSS (`src/index.css`), значки `lucide-react`. Точка входа `index.html` → `src/main.tsx`.
- **Админка:** отдельная точка входа `admin.html` → `src/admin/main.tsx`, адрес `/admin`.
- **API:** Hono (`server/app.ts`), все маршруты под `/api`; на Vercel — функция `api/index.ts`.
- **БД:** PostgreSQL + Drizzle ORM (`server/db/schema.ts`), валидация — zod (`shared/schemas.ts`).
- **Тесты:** Vitest — интеграционные тесты API на тестовой базе (`tests/`).

Подробно об устройстве, контракте API, безопасности и мультиязычности — [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Быстрый старт (Windows)

Нужны Node.js 20+ и PostgreSQL 18 (скрипт ищет его в `C:\Program Files\PostgreSQL\18\bin`, другой путь — переменная `PG_BIN`).

```powershell
npm install
copy .env.example .env.local     # и заполните значения (см. ниже)
npm run db:start                 # локальный кластер Postgres на localhost:5433, базы azgroup и azgroup_test
npm run db:migrate               # схема БД
npm run db:seed                  # стартовый контент (программы, проекты, новости, партнёры, FAQ, настройки)
npm run admin:create             # владелец админки из ADMIN_EMAIL / ADMIN_PASSWORD
npm run dev                      # сайт + API одной командой
```

- Сайт: http://localhost:5173 (казахская версия — `/kk`, английская — `/en`).
- Админка: http://localhost:5173/admin.
- API слушает порт 8787 (`API_PORT`), Vite проксирует на него `/api`.

Остановить базу: `npm run db:stop`. Данные кластера лежат вне OneDrive: `%LOCALAPPDATA%\az-group\pgdata`.

## Переменные окружения (`.env.local`)

Полный список с комментариями — в [`.env.example`](.env.example):

| Переменная | Зачем |
|---|---|
| `DATABASE_URL` | строка подключения к Postgres (локально `postgres://postgres@localhost:5433/azgroup`) |
| `TEST_DATABASE_URL` | отдельная база для тестов (`…/azgroup_test`) |
| `JWT_SECRET` | секрет подписи сессий админки, не короче 32 символов, без «change-me» |
| `IP_SALT` | соль хэша IP (заявки, журнал входов); обязательна в production |
| `TRUST_PROXY` | `1` — доверять `X-Forwarded-For` (только за своим reverse-proxy; на Vercel не нужно) |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | первый владелец для `npm run admin:create` (пароль от 10 символов) |

## Команды

| Команда | Что делает |
|---|---|
| `npm run dev` | сайт (Vite) + API (tsx watch) |
| `npm run dev:web` / `npm run dev:api` | по отдельности |
| `npm run typecheck` | проверка типов (`tsc --noEmit`) |
| `npm run test` | тесты API (нужна запущенная база, `TEST_DATABASE_URL`) |
| `npm run build` | сборка в `dist/` (сайт и админка — отдельные бандлы) |
| `npm run preview` | просмотр сборки |
| `npm run db:generate` | новая миграция Drizzle после правки `server/db/schema.ts` |
| `npm run db:migrate` / `npm run db:seed` | применить миграции / залить стартовый контент |
| `npm run admin:create` | создать или обновить владельца админки |
| `node scripts/csp-hashes.mjs [--check]` | хэши inline-скриптов для CSP в `vercel.json` |

## Где живёт контент

- **Основной источник — база данных**, её редактируют менеджеры в админке (`/admin`): программы и даты календаря, проекты, новости, партнёры, FAQ, контакты, ссылки, цифры, «О компании», а также заявки с сайта.
- Сайт берёт контент из `GET /api/public/content?lang=ru|kk|en`.
- `src/data/*` — **стартовый сид** для `npm run db:seed` и **офлайн-запас**: если API недоступно, сайт показывает эти данные (`src/content/static.ts`). Правка этих файлов не меняет уже заполненную базу.
- Переводы стартового контента — `src/i18n/content/{kk,en}.ts`, в базе переводы хранятся в колонке `translations`.

## Языки

Русский — основной, казахский (`kk`) и английский (`en`) — префиксом пути: `/events`, `/kk/events`, `/en/events`. Выбор запоминается (`localStorage['az-lang']`).

- Строки интерфейса — `src/i18n/ui/{ru,kk,en}.ts`. Тип словаря выводится из `ru.ts`: TypeScript не даст забыть ключ в `kk`/`en`.
- `src/components/Seo.tsx` в рантайме ставит `<html lang>`, title, description, `canonical`, `og:*` и `hreflang`-альтернативы. В `index.html` — только русские значения по умолчанию и картинка для соцсетей `public/images/og-cover.jpg` (1200×630).

## Тема

Светлая, тёмная или «как в системе» — переключатель в шапке (на телефоне — в листе «Ещё»), выбор хранится в `localStorage['az-theme']`. Inline-скрипт в `index.html` ставит тему до первой отрисовки (без вспышки), логика — `src/content/theme.ts`. Цвета — CSS-переменные в `src/index.css`.

## Сборка и деплой (Vercel)

1. В настройках проекта Vercel задайте переменные `DATABASE_URL` (лучше pooled-строку Neon/Supabase), `JWT_SECRET`, `IP_SALT`.
2. Примените миграции к боевой базе с локальной машины: временно подставьте боевую строку в `DATABASE_URL` в `.env.local` и выполните `npm run db:migrate` (затем верните локальную). Сид на проде — только для пустой базы.
3. Создайте владельца админки на проде так же: `npm run admin:create` с боевым `DATABASE_URL`.
4. `vercel.json`: SPA-переписывание (`/admin/*` → `admin.html`, остальное → `index.html`), долгий кеш `/assets`, заголовки безопасности и CSP. Статические файлы (`robots.txt`, PDF, картинки) Vercel отдаёт раньше переписываний; `/sitemap.xml` переписывается на `/api/sitemap.xml`.
5. **CSP:** если меняли inline-`<script>` в `index.html` или `admin.html` (даже отступ), выполните `node scripts/csp-hashes.mjs` и обновите хэши в `script-src` в `vercel.json`; перед деплоем — `node scripts/csp-hashes.mjs --check`.
6. **Sitemap:** `GET /api/sitemap.xml` (`server/routes/sitemap.ts`) строится из базы: разделы (`shared/routes.ts`) × языки с hreflang и опубликованные новости с текстом, `lastmod` по дате изменения. Новый раздел добавляйте в `SITE_ROUTES` в `shared/routes.ts`. `public/robots.txt` закрывает `/admin` и `/api`, склеивает параметры фильтров календаря (`Clean-param`) и указывает на sitemap.

Канонический домен — `https://www.azgroup.kz`.
