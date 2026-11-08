# azhost — подключение проектов на общий сервер

Одна команда подключает проект (репозиторий GitHub) к серверу: клонирует код, поднимает его через Docker Compose (приложение + своя база Postgres), создаёт сайт в nginx, выпускает HTTPS, включает автообновление по слиянию в `main` и ежедневный бекап базы. Существующие проекты на сервере, их nginx-сайты, базы и firewall **не затрагиваются**.

Здесь нет ни IP-адресов, ни паролей: репозиторий публичный.

## Что понимает azhost

| Тип проекта | Как определяется | Как запускается |
|---|---|---|
| `compose` | в репозитории есть `compose.yaml` (приложение + база) | `docker compose` из репозитория; порт берётся из `APP_PORT:-NNNN` |
| `static-fn` | `index.html` + каталог `api/`, но без `compose.yaml` (статика и функции Vercel, без базы) | мини-сервер `static-fn/server.cjs` (без зависимостей): раздаёт файлы и выполняет `api/<имя>.js` и вложенные `api/<папка>/<имя>.js` как функции Vercel, повторяет `cleanUrls`, `headers`, `redirects` из `vercel.json`. Запасной вариант для проектов без Docker; Atlantia и Fibonacci теперь имеют свой `compose.yaml` и подключаются как `compose` |

## 1. Установка (один раз)

На сервере от root:

```bash
git clone --depth 1 https://github.com/maidirova05-a11y/az-group-projects /opt/azhost-src
bash /opt/azhost-src/deploy/azhost/install.sh
```

Скрипт ставит Docker (из репозиториев Ubuntu), включает ротацию журналов контейнеров, создаёт swap 2 ГБ (если его нет), каталоги `/opt/apps`, `/etc/azhost` и две cron-задачи: автодеплой (каждые 3 минуты) и бекап баз (03:50). Обновить сам azhost позже: `azhost update`.

## 2. Подключение проекта

```bash
azhost add <имя> <git-url> <домен> [домен…] [--port N] [--branch B] [--cloudflare]
azhost env <имя>                        # заполнить секреты (docker.env)
azhost up <имя>                         # собрать и запустить
azhost db-import <имя> --from-url       # перенести данные из старой базы (если есть база)
azhost status                           # убедиться, что отвечает (HTTP 200)
# …переключить DNS домена на сервер…
azhost ssl <имя>                        # HTTPS
```

Проверка до смены DNS: `curl -H 'Host: <домен>' http://127.0.0.1:<порт>/`.

**Перенос базы.** `azhost db-import <имя> --from-url` спросит строку подключения старой базы (ввод скрыт), снимет дамп клиентом PostgreSQL 18, остановит приложение, загрузит данные и запустит снова. Строку берут в Neon/Vercel (`DATABASE_URL_UNPOOLED` — прямое подключение). Образ базы в контейнере — `postgres:18` (читает дампы любых более старых версий). Нужен установленный на хосте `postgresql-client-18`, если дамп снимается с Neon (на PG 18).

**DNS.** В панели хостера создайте A-записи домена (`@` и `www`, если используется) на IP сервера. Пока старые записи указывают на Vercel, сайт продолжает работать там, так что переключайте DNS только после проверки.

**HTTPS.** `azhost ssl <имя>` сначала проверяет, что домены указывают на этот сервер, затем запускает certbot (редирект http → https включается).

### Проект за Cloudflare
Подключайте с `--cloudflare`: nginx будет брать реальный IP посетителя из `CF-Connecting-IP` (список адресов Cloudflare загружается автоматически). Для выпуска сертификата в Cloudflare временно поставьте режим SSL «Full» (не «Flexible»), после выпуска можно «Full (strict)».

## 3. Проекты владельца

| Репозиторий | Тип | Порт | Домен (по коду проектов, уточнить) | Что заполнить в `docker.env` |
|---|---|---|---|---|
| `onerlab` | compose | 3101 | `onerlab.kz` | `ADMIN_PASSWORD_HASH`, `ADMIN_SESSION_SECRET`, `CAPTCHA_PROVIDER`, `CAPTCHA_SECRET_KEY` |
| `astanatechcup` | compose | 3102 | `astanatechcup.kz` | `ENCRYPTION_KEY` (**тот же, что на Vercel**), `CSRF_SECRET`, `ADMIN_PASSWORD_HASH`, `JUDGE_PASSWORD_HASH`, при необходимости Turnstile/Stripe |
| `itecx-landing` | compose | 3103 | `itecx.kz` | `ADMIN_PASSWORD_HASH`, `TOKEN_SECRET`, `BITRIX_WEBHOOK_URL` |
| `Ascora-Education` | compose | 3104 | `www.ascora.education` (+ `ascora.education`), **Cloudflare** | `JWT_SECRET`, Bitrix24 (`BITRIX_WEBHOOK`, `BITRIX_CATEGORY_ID`, `BITRIX_STAGE_ID`), Google Sheets (`GOOGLE_CLIENT_EMAIL`, `GOOGLE_PRIVATE_KEY_B64`) |
| `smarthub-kz` | compose | 3105 | `smarthub-kz.com` (+ `www`) | `ADMIN_PASSWORD`, `ADMIN_SECRET`, `BITRIX_WEBHOOK_URL`, `BITRIX_CATEGORY_ID`, `BITRIX_STAGE_ID`, `BITRIX_ASSIGNED_BY_ID` |
| `atlantia-olympiads-kz` | compose (сайт + функция заявок + Postgres) | 3106 | `atlantia-olympiads.kz` (+ `www`, редирект на без-`www` делает сайт) | `BITRIX_WEBHOOK_URL` (и необязательные `BITRIX_*`) |
| `fibonacci-olympiads-kz` | compose (сайт + функции + кабинет результатов + Postgres) | 3107 | `fibonacci-olympiads.kz` (+ `www`) | `BITRIX_WEBHOOK_URL`, `RESULTS_SESSION_SECRET`, `RESEND_API_KEY`, `MAIL_FROM` |

**Atlantia и Fibonacci:** заявки с форм сохраняются в таблицу `leads` до отправки в Bitrix24 (при сбое CRM заявка остаётся со статусом `failed`). Старой базы у них нет, поэтому `db-import` не нужен. Недоставленные заявки:
`cd /opt/apps/<имя> && docker compose -p <имя> exec db psql -U app -d app -c "select id, created_at, name, phone, crm_error from leads where crm_status <> 'ok' order by id"`.
**Fibonacci:** кабинет результатов (`/results`) раньше хранил данные в облачном Redis (Upstash), теперь — в Postgres на сервере (таблица `kv`). Результаты загружают заново из таблицы: `docker compose -p fibonacci cp "Результаты.xlsx" app:/tmp/r.xlsx`, затем `docker compose -p fibonacci exec app node scripts/import-results.mjs /tmp/r.xlsx` (сначала с `--dry`). Подробности — `docs/BACKEND.md` в репозитории проекта.

Значения секретов — те же, что в Vercel → Settings → Environment Variables (у проектов на Forge/Render — из их `.env`). Адрес базы указывать не нужно: он прописан в `compose.yaml` проекта.

Значения, которые попадают в **сборку** (например, `SITE_URL`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY` у `astanatechcup`), задаются не в `docker.env`, а в файле `.env` в каталоге проекта (`/opt/apps/<имя>/.env`); потом `azhost up <имя>`.

## 4. Ежедневная работа

```bash
azhost status            # все проекты, HTTP-ответ, память, контейнеры
azhost logs <имя> [app]  # журнал
azhost down <имя>        # остановить (данные остаются)
azhost vhost <имя>       # пересоздать nginx-сайт (потом azhost ssl <имя>, если уже был HTTPS)
```

- **Автодеплой:** слияние в `main` репозитория проекта → в течение ~3 минут проект пересобирается и перезапускается (`/var/log/azhost.log`). Проект участвует в автодеплое после первого `azhost up`. Упавшая сборка оставляет прежнюю версию, тот же коммит повторно не пробуется.
- **Бекапы:** `/var/backups/apps/<имя>/*.dump`, ежедневно, хранятся 14 дней. Восстановить: `azhost db-import <имя> /var/backups/apps/<имя>/<файл>.dump`. Копии стоит дополнительно хранить вне сервера (снимки хостера).
- **Секреты** лежат только в `/opt/apps/<имя>/docker.env` (права 600) и в git не попадают.
- Базы запущены в контейнерах и **не публикуются** наружу (доступны только своему приложению).

## 5. Ограничения

- Сервер небольшой: каждый проект с отдельной базой занимает ~0,3–0,7 ГБ памяти (лимиты по умолчанию: приложение 512 МБ, база 384 МБ; меняются в `/opt/apps/<имя>/.env`: `MEM_APP`, `MEM_DB`). Подключайте проекты по одному и смотрите `azhost status`.
- Образы собираются на самом сервере (по одному): во время сборки Next.js-проектов сайты на сервере могут отвечать медленнее.
