# Архитектура AZ Group: сайт + админка + API

## Стек
- Публичный сайт: React 18 + Vite, `index.html` → `src/main.tsx` (страницы в `src/pages`, каркас в `src/components`).
- Админка: отдельная точка входа `admin.html` → `src/admin/main.tsx`, адрес `/admin`.
- API: Hono (`server/app.ts`), все маршруты под `/api`. Локально `npm run dev:api` (порт 8787, Vite проксирует `/api`), на Vercel — функция `api/index.ts`.
- БД: PostgreSQL + Drizzle ORM. Схема — `server/db/schema.ts`. Контракт валидации и типов API — `shared/schemas.ts` (zod v4).
- Локальная БД: `npm run db:start` (кластер на `localhost:5433`, без пароля), базы `azgroup` и `azgroup_test`. Переменные — `.env.local` (см. `.env.example`).
- Импорты между папками — относительные (`../../shared/schemas`). В `src/` можно `@shared/schemas`.

## Команды
`npm run dev` (сайт + API), `npm run db:generate`, `npm run db:migrate`, `npm run db:seed`, `npm run admin:create`, `npm run test`, `npm run typecheck`, `npm run build`.

## Контракт API
Ошибки: `{ error: { code, message, fields? } }` (`server/lib/http.ts`: `ApiFail`, `body(c, schema)`, `idParam`, `notFound`).
Тело запроса — только `Content-Type: application/json` (иначе `415 unsupported_media_type`), не больше 256 КБ (иначе `413 payload_too_large`, `hono/body-limit` в `server/app.ts`).
Строки БД Drizzle уже в camelCase и совпадают с DTO; `date` приходит строкой `YYYY-MM-DD`; `timestamp` → отдавать `toISOString()`.

Публичные:
- `GET /api/public/content?lang=ru|kk|en` → `{ lang, ...PublicContent }` (язык по умолчанию и при неизвестном значении — `ru`; тексты уже на нужном языке, см. «Мультиязычность»; только `published`, сортировка по `sort`, затем id; события внутри программ по `startDate`, null в конце). Заголовок `Cache-Control: public, s-maxage=60, stale-while-revalidate=600`.
- `POST /api/leads` (`leadInput`) → `201 { ok: true }`. Ловушка `website`, не более 5 заявок с одного IP за 10 минут (ipHash в таблице leads; проверка и вставка атомарны — `pg_advisory_xact_lock(hashtext(ipHash))` в транзакции).

Авторизация (`/api/auth`): `POST /login` (`loginInput`) → ставит httpOnly-cookie `az_admin` (JWT HS256, 24 часа = Max-Age cookie, SameSite=Strict, Secure на Vercel и в проде), отвечает `AdminDTO`; `POST /logout`; `GET /me` → `AdminDTO` или 401; `POST /password` (`passwordChange`).
CSRF: все изменяющие запросы к `/api/admin/*` и `/api/auth/*`, **включая login**, обязаны иметь заголовок `X-Requested-With: az-admin` (иначе 403 `csrf`).
Ответы `/api/admin/*` и `/api/auth/*` (в том числе ошибки) — `Cache-Control: no-store`.

## Безопасность
- **Сессии и `session_version`.** В `admins.session_version` (миграция `0003`) — версия сессий; JWT несёт claim `ver`, `requireAdmin` отклоняет токен, если `ver` ≠ версии в БД (токены без `ver` тоже недействительны). Версия +1 при: смене пароля (`POST /auth/password` — текущему устройству сразу выдаётся новый cookie), сбросе пароля owner-ом (`PATCH /admin/admins/:id` с `password`; если owner сбросил пароль себе — тоже новый cookie), деактивации и **выходе: `POST /auth/logout` = «выйти на всех устройствах»** (все cookie этого админа перестают действовать).
- **Перебор паролей.** 10 неудач на пару e-mail+IP за 15 минут и 30 неудач на e-mail (с любых IP) за час → 429 `too_many_attempts`. Счётчики — по `audit_log` (`action='login_failed'`, частичные индексы `audit_login_failed_*`); ~1% неудачных входов удаляет `login_failed` старше суток. Запасной счётчик — в памяти.
- **IP клиента** — одна реализация `clientIp()` в `server/lib/ratelimit.ts`: на Vercel `x-vercel-forwarded-for`, затем `x-real-ip`; `X-Forwarded-For` — только при `TRUST_PROXY=1`; иначе адрес сокета (`@hono/node-server/conninfo`) или `'unknown'`.
- **Переменные окружения** (`server/env.ts`): `JWT_SECRET` ≥ 32 символов и без «change-me», иначе сервер падает с понятной ошибкой; `IP_SALT` обязателен в production (`VERCEL_ENV`/`NODE_ENV=production`), локально — `'dev-salt'`.
- **Ссылки (stored XSS).** Все URL-поля (`projects.url/logo`, `news.image/externalUrl`, `events.registrationUrl`, `partners.image`, настройки `contacts`/`links`, `about.pillars[].image`) проверяются `isSafeHref` (`shared/url.ts`, реэкспорт из `shared/schemas.ts`): только `http:`, `https:`, `mailto:`, `tel:` или путь от одного `/` (не `//host`, без `\` и управляющих символов). `contacts.phoneHref` — только `tel:`; в `contacts`/`links` пустая строка допустима. Публичный `/api/public/content` повторно валидирует настройки и при ошибке отдаёт значения по умолчанию. Фронтенду: перед подстановкой в `href`/`src` значения из API тоже проверять `isSafeHref` (защита в глубину).
- **Заголовки HTML-страниц** (`vercel.json`): CSP `default-src 'self'; script-src 'self' 'sha256-…'` (хэши inline-скриптов темы/языка из `index.html` и `admin.html`), `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' https: data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'`; плюс `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`. CSP ставится только на пути страниц (без `api/`, `assets/` и файлов с расширением — PDF/картинки из `public/` её не получают).
  **Если меняется inline-`<script>` в `index.html` или `admin.html` (даже отступ), хэш меняется** — запустите `node scripts/csp-hashes.mjs` и замените хэши в `script-src` в `vercel.json`; `node scripts/csp-hashes.mjs --check` проверяет, что все хэши на месте (можно в CI/перед деплоем). Новые внешние скрипты, iframe, шрифты или API других доменов требуют правки CSP.
- **Права редакторов.** Только владелец (`owner`) может удалять и выгружать заявки (`DELETE /admin/leads/:id`, `GET /admin/leads/export.csv` — `requireOwner`) и менять настройки `contacts`/`links` вместе с их переводами (`assertSettingAccess` в `routes/admin/content.ts`). Редактор работает с контентом, меняет статусы и заметки заявок, правит «Цифры» и «О компании»; в админке эти кнопки и разделы ему не показываются.

Админка (всё за `requireAdmin`, `c.get('admin')` — текущий админ; каждое изменение пишет `audit(c, action, entity, id)` из `server/lib/audit.ts`):
- `GET|POST /api/admin/programs`, `GET|PATCH|DELETE /api/admin/programs/:id` (GET списка и по id — с `events`)
- `POST /api/admin/programs/:id/events`, `PATCH|DELETE /api/admin/events/:id`
- `GET|POST /api/admin/projects`, `PATCH|DELETE /api/admin/projects/:id`
- `GET|POST /api/admin/news`, `PATCH|DELETE /api/admin/news/:id`
- `GET|POST /api/admin/partners`, `PATCH|DELETE /api/admin/partners/:id`
- `GET|POST /api/admin/faqs`, `PATCH|DELETE /api/admin/faqs/:id`
- `PUT /api/admin/reorder/:resource` (`programs|projects|partners|faqs`, тело `reorderInput`) — sort = индекс в массиве
- `GET /api/admin/settings` → `{ [key]: value }` (без переводов); `PUT /api/admin/settings/:key` (`contacts|links|stats|about`): тело — само значение по `SETTINGS[key]` (ответ — значение) **или** `{ value, translations? }` (ответ — `{ value, translations }`)
- `GET /api/admin/settings/translations` → `{ [key]: { kk?, en? } }`; `PUT /api/admin/settings/:key/translations` (тело `SETTING_TRANSLATIONS[key]`) → итоговые переводы ключа
- Контент (`programs`, `events`, `projects`, `news`, `partners`, `faqs`): GET отдаёт поле `translations`, POST/PATCH его принимают (см. «Мультиязычность»)
- PATCH принимает частичный объект (`schema.partial()`), POST — полный.
- `GET /api/admin/leads?status=&q=&page=1&limit=50` → `{ items: LeadDTO[], total }`; `PATCH /api/admin/leads/:id` (`leadUpdate`); `DELETE /api/admin/leads/:id`; `GET /api/admin/leads/export.csv` (UTF-8 с BOM, для Excel)
- `GET /api/admin/admins` (owner), `POST` (`adminInput`, пароль обязателен), `PATCH /:id`, `DELETE /:id` (нельзя удалить/понизить себя и последнего owner)
- `GET /api/admin/stats` → `{ counts: { programs, events, upcomingEvents, projects, news, partners, faqs, leadsNew, leadsTotal }, leadsByDay: {date,count}[] (30 дней), recentAudit: {id, action, entity, entityId, adminName, createdAt}[] (20) }`

## Мультиязычность (RU основной, KZ = `kk`, ENG = `en`)
Контракт — `shared/i18n.ts` (`Lang`, `LANGS`, `TranslatableFields`, `Translations<T>`, `ContentTranslationSource`), помощники — `server/lib/i18n.ts`.
- БД: русский текст — в обычных колонках; в `programs`, `events`, `projects`, `news`, `partners`, `faqs`, `settings` есть `translations jsonb not null default '{}'` вида `{ kk?: {...}, en?: {...} }` (миграция `0002`).
  Переводимые поля: programs `name, subtitle`; events `label, place`; projects `name, tagline, description, category`; news `title, body`; partners `name`; faqs `question, answer`.
  Настройки: частичные формы `ContentTranslationSource['settings']` — contacts `{ address }`, stats `[{ value, label }]`, about `{ title, pillars: [{ title, text }], directions: string[], achievements: [{ value, label }] }`; `links` не переводится.
- Валидация (`shared/schemas.ts`): `translations` необязательно в `programInput` … `faqInput` (`programTranslations` и т.д.), строки trim, лимиты как у русских полей; пустая строка = «перевода нет». Настройки — `SETTING_TRANSLATIONS[key]`.
- Правила подстановки (публичный API): непустой (после trim) перевод строкового поля заменяет русский, иначе русский. Настройки сливаются глубоко; массив перевода берётся только при той же длине, что и русский (поэлементно, тем же правилом), иначе — русский массив; нестроковые значения (картинки, цены, даты, ссылки) всегда русские. Поле `translations` в публичный ответ не попадает. Язык — в query, поэтому CDN кэширует каждый URL отдельно (`Cache-Control` прежний, `Vary` не нужен).
- Админ-API: PATCH с `translations` заменяет только присланные языки (`{ kk }` не стирает `en`; внутри языка объект заменяется целиком — присылайте все поля языка). PATCH без `translations` их не трогает.
- Сид: после русского контента применяет `src/i18n/content/{kk,en}.ts` (если есть) по естественным ключам: slug программы; `${slug}#${индекс события}` (строка с теми же русскими label+place); slug проекта; id новости из `src/data/site.ts` (по externalUrl/заголовку); русское название партнёра; индекс FAQ (по русскому вопросу). `npm run db:seed -- --translations-only` — только (пере)применяет переводы к существующим строкам, не трогая русский текст и id; ненайденные ключи выводятся в отчёте.

## Владение файлами (агенты не трогают чужие файлы)
| Агент | Файлы |
|---|---|
| БД | `server/db/migrate.ts`, `server/db/seed.ts`, `server/db/migrations/**` |
| Авторизация | `server/auth/**`, `server/routes/auth.ts`, `scripts/create-admin.ts` |
| Публичное API | `server/routes/public.ts`, `server/routes/leads.ts`, `server/lib/ratelimit.ts` |
| Безопасность | `shared/url.ts`, `scripts/csp-hashes.mjs`, `vercel.json` (заголовки) |
| API контента | `server/routes/admin/content.ts` |
| API заявок/админов/статистики | `server/routes/admin/leads.ts`, `server/routes/admin/admins.ts`, `server/routes/admin/stats.ts` |
| Каркас админки | `src/admin/**` кроме `src/admin/pages/{Programs,Projects,News,Partners,Faqs,Leads,Settings,Admins}.tsx` |
| Страницы админки | свои файлы в `src/admin/pages/` |
| Тексты | тексты в `src/data/*.ts`, `src/pages/*.tsx`, `index.html` |
| Иллюстрации | `public/illustrations/**` |
| Визуал сайта | `src/index.css` |
| Интеграция сайта с API | `src/content/**`, `src/pages/**`, `src/components/**`, `src/App.tsx`, `src/main.tsx` (волна 2) |
| Тесты | `tests/**`, `vitest.config.ts` |
Общие файлы (`shared/schemas.ts`, `server/db/schema.ts`, `server/app.ts`, `server/lib/*`, `package.json`, конфиги) меняет только координатор — если нужно, опишите изменение в отчёте. Новые npm-пакеты не ставить.
