# Перенос на Hoster.kz (VPS «Cloud 2-4-50», сервер api.azgroup.kz)

Вместо Vercel + Neon всё работает на одном сервере: **nginx** (HTTPS, сжатие) → **Node** (`server/prod.ts`: сайт + API) → **PostgreSQL** на том же сервере. Файлы для настройки — в `deploy/`.

> Предполагается чистый **Ubuntu 22.04/24.04**. Если при заказе выбрана другая ОС — скажите, адаптирую скрипты.

## 1. Подготовка

1. В панели Hoster.kz возьмите **IP-адрес** сервера и **root-пароль / SSH-ключ**.
2. Не меняйте DNS, пока сайт не проверен на сервере (шаг 5) — так не будет простоя.

## 2. Настройка сервера (один раз)

```bash
ssh root@IP_СЕРВЕРА
curl -fsSL https://raw.githubusercontent.com/maidirova05-a11y/az-group-projects/main/deploy/setup-server.sh -o setup-server.sh
bash setup-server.sh
```

Скрипт ставит Node 22, PostgreSQL, nginx, certbot, firewall; создаёт пользователя `azgroup`, базу и ежедневный бэкап (03:00, 14 дней в `/var/backups/azgroup`). **Пароль БД выводится один раз** — сохраните его. Репозиторий приватный? Тогда сначала склонируйте его в `/opt/az-group` вручную (deploy key или токен), скрипт это увидит.

## 3. Переменные окружения

```bash
nano /opt/az-group/.env.production
```

- `DATABASE_URL` — с паролем из шага 2;
- `JWT_SECRET` — `openssl rand -hex 32`. **Если хотите сохранить текущие сессии админки — возьмите прежнее значение из Vercel**, иначе все админы просто войдут заново;
- `IP_SALT` — прежнее значение из Vercel (иначе старые хэши IP в журнале не совпадут с новыми) или новое `openssl rand -hex 16`;
- `TRUST_PROXY=1` — уже стоит.

## 4. Перенос данных из Neon/Supabase

На своём компьютере (нужен `pg_dump` той же или более новой версии):

```bash
pg_dump --no-owner --no-acl -Fc "СТРОКА_ПОДКЛЮЧЕНИЯ_ИЗ_VERCEL" -f azgroup.dump
scp azgroup.dump root@IP_СЕРВЕРА:/tmp/
```

На сервере:

```bash
sudo -u postgres pg_restore --no-owner --role=azgroup -d azgroup /tmp/azgroup.dump
rm /tmp/azgroup.dump
```

Если база была пустой/новой — вместо переноса: `cd /opt/az-group && sudo -u azgroup npm run db:migrate:prod && sudo -u azgroup npm run db:seed` (сид — только для пустой базы) и `npm run admin:create:prod` (заполните `ADMIN_EMAIL`/`ADMIN_PASSWORD` в `.env.production`, потом очистите пароль).

## 5. Запуск и проверка

```bash
bash /opt/az-group/deploy/deploy.sh      # git pull, npm ci, сборка, миграции, перезапуск, проверка /api/health
```

Проверка до смены DNS — со своего компьютера подставьте IP в hosts (`IP_СЕРВЕРА www.azgroup.kz`) или `curl -H 'Host: www.azgroup.kz' http://IP_СЕРВЕРА/api/health`.

## 6. DNS и HTTPS

В DNS-зоне azgroup.kz (у регистратора домена) укажите **A-запись на IP сервера** для `@` и `www` (и `api`, если нужен). Для az-group.kz — A-записи `@` и `www` на тот же IP: старый домен 301-редиректит на www.azgroup.kz (`server/prod.ts`). TTL заранее снизьте до 300 с.

Когда DNS обновился:

```bash
certbot --nginx -d azgroup.kz -d www.azgroup.kz -d az-group.kz -d www.az-group.kz --redirect -m ВАШ_EMAIL --agree-tos
```

Сертификат продлевается автоматически (systemd timer certbot). Проверьте: `certbot renew --dry-run`.
Редирект `azgroup.kz → www.azgroup.kz` (без www на www) при желании добавьте отдельным `server`-блоком в nginx.

## 7. После переезда

- Отправьте `https://www.azgroup.kz/sitemap.xml` в Google Search Console / Яндекс Вебмастер заново только если менялся домен — здесь он тот же.
- Vercel-проект оставьте на пару дней как запасной, затем удалите; Neon-базу — после того как убедитесь, что бэкапы сервера работают.
- В Hoster.kz включите **снимки/бекапы** всего сервера (вкладки «Снимки», «Бекапы») — это дополнение к `pg_dump`.
- Обновление сайта: `git push` в `main` → на сервере `bash /opt/az-group/deploy/deploy.sh`.
- Логи: `journalctl -u azgroup -f`, `tail -f /var/log/nginx/error.log`.

## Что изменилось в коде

- `server/prod.ts` — новый production-сервер (заменяет Vercel Functions + rewrites + headers; CSP берётся из `vercel.json`, поэтому `node scripts/csp-hashes.mjs --check` по-прежнему актуален).
- `package.json`: `npm start`, `db:migrate:prod`, `admin:create:prod` (читают `.env.production`).
- `vercel.json`, `api/index.ts`, `scripts/vercel-build.mjs` оставлены — пока Vercel нужен как запасной вариант.
