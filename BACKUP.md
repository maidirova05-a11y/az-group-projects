# Резервные копии и запасной запуск — AZ Group

Что защищено и от чего:

- **Каждую ночь** GitHub Actions снимает копию боевой базы (Neon), шифрует её (AES-256) и кладёт
  в облачное хранилище. Копии живут 60 дней, а 14 последних не удаляются никогда — даже если
  бэкап месяцами падал.
- **На каждый PR и раз в неделю** проверяется весь путь восстановления: образ Docker собирается,
  сайт с базой поднимается, копия снимается, шифруется, уходит в хранилище и восстанавливается
  обратно (`.github/workflows/docker.yml`).
- **Если Vercel или Neon недоступны**, сайт поднимается на любом сервере с Docker
  одной командой, а данные — из последней копии (раздел 2.2).
- **После переезда на свой сервер** (`docs/SERVER.md`) копии всех баз снимает сам сервер
  (`deploy/server/backup-all.sh`, в то же хранилище и ту же папку), а ночной workflow GitHub
  отключается.

Код и так лежит в GitHub. **Секретов в копиях нет** — их нужно хранить в менеджере паролей
(1Password, Bitwarden и т. п.): `JWT_SECRET` и `IP_SALT`, плюс пароль шифрования копий.

## 1. Настроить один раз

### 1.1. Облачное хранилище

Подойдёт любое S3-совместимое: Cloudflare R2 или Backblaze B2 (у обоих 10 ГБ бесплатно — копий
этих сайтов хватит на годы), AWS S3, Yandex Object Storage. Если важно, чтобы персональные
данные хранились в Казахстане (закон «О персональных данных и их защите»), выберите
казахстанского провайдера с S3-совместимым хранилищем.

Один бакет можно использовать для всех пяти проектов — каждый пишет в свою папку.

На примере Cloudflare R2: R2 → Create bucket (например, `site-backups`) → Manage R2 API Tokens →
Create API token с правом **Object Read & Write** только на этот бакет. Понадобятся
Access Key ID, Secret Access Key и адрес вида `https://<id-аккаунта>.r2.cloudflarestorage.com`.

### 1.2. Пароль шифрования

```bash
openssl rand -base64 32
```

Сохраните его в менеджер паролей. **Без него копию не открыть** — ни вам, ни тому, кто
украдёт файл. Можно один на все пять проектов.

### 1.3. Адрес боевой базы

Neon → проект → **Connect** → выключить *Connection pooling* → скопировать строку
подключения (в адресе не должно быть `-pooler`: `pg_dump` работает только напрямую).

### 1.4. Секреты в GitHub

Репозиторий → Settings → Secrets and variables → Actions → **New repository secret**:

| Секрет | Значение |
|---|---|
| `PROD_DATABASE_URL` | строка из шага 1.3 |
| `BACKUP_PASSPHRASE` | пароль из шага 1.2 |
| `BACKUP_S3_BUCKET` | имя бакета |
| `BACKUP_S3_ENDPOINT` | адрес хранилища (для AWS S3 не нужен) |
| `BACKUP_S3_ACCESS_KEY_ID` | ключ из шага 1.1 |
| `BACKUP_S3_SECRET_ACCESS_KEY` | секрет из шага 1.1 |
| `BACKUP_S3_REGION` | необязательно: для R2 — `auto`, для B2/AWS — регион бакета |

### 1.5. Проверить

Actions → **Резервная копия базы** → Run workflow. Через минуту запуск зелёный, а в бакете
появился файл `az-group-projects/az-group-projects-<дата>-pg<версия>.dump.gpg`. Дальше копия снимается каждую ночь
в 02:17 по Астане.

Если бэкап упадёт, GitHub пришлёт письмо. В публичных репозиториях GitHub выключает расписание,
если 60 дней не было коммитов, — об этом тоже приходит письмо, и расписание включается одной
кнопкой (Actions → workflow → Enable).

## 2. Восстановить

Для команд ниже нужны Linux, macOS или WSL на Windows, а также `gpg`, AWS CLI и Docker.
Параметры хранилища — те же, что в шаге 1.4:

```bash
export S3_BUCKET=… S3_ENDPOINT=… AWS_ACCESS_KEY_ID=… AWS_SECRET_ACCESS_KEY=… AWS_DEFAULT_REGION=auto
export BACKUP_NAME=az-group-projects
```

Пароль шифрования скрипт спросит сам. Вместо `latest` можно указать скачанный файл копии.

### 2.1. Данные испорчены или удалены, хостинг работает

Сначала — встроенное восстановление Neon на момент времени (Neon → Branches → Restore): это
быстрее, если с момента проблемы прошло меньше, чем хранит ваш тариф.

Иначе — из копии в ту же или новую базу Neon:

```bash
backup/restore.sh latest 'postgresql://…neon.tech/neondb?sslmode=require'
```

Скрипт попросит ввести имя хоста базы: данные в ней будут заменены копией. После
восстановления он печатает таблицы и число строк в каждой.

### 2.2. Хостинг недоступен — запустить на своём сервере

Нужен сервер с Ubuntu и Docker (`curl -fsSL https://get.docker.com | sh`).

```bash
git clone https://github.com/maidirova05-a11y/az-group-projects.git && cd az-group-projects
cp docker.env.example docker.env && nano docker.env   # значения из менеджера паролей
docker compose up -d --build                          # сайт + своя база
backup/restore.sh latest                              # данные из последней копии
docker/smoke.sh check                                 # проверить, что всё работает
```

Миграции сервер применяет сам при старте. Учётка админа восстанавливается вместе с базой; для чистой установки её создаёт `docker compose exec app node dist-server/scripts/create-admin.mjs почта 'пароль-от-10-символов'`.

Сайт слушает только `127.0.0.1:3106`. Наружу с HTTPS его отдаёт Caddy (сертификат выпускается
сам):

```bash
sudo apt install -y caddy
sudo nano /etc/caddy/Caddyfile
```

```caddy
www.azgroup.kz, az-group.kz, www.az-group.kz {
    reverse_proxy 127.0.0.1:3106 {
        # Настоящий адрес посетителя — для лимитов и защиты входа в админку.
        header_up X-Real-IP {remote_host}
        header_up -Cf-Connecting-Ip
        header_up -X-Vercel-Forwarded-For
    }
}
```

```bash
sudo systemctl reload caddy
```

Затем в DNS домена (hoster.kz) направьте A-запись на IP сервера. Все проекты компании живут
на одном сервере: у каждого свой порт (3101–3108) и свой блок в Caddyfile — см. `docs/SERVER.md`.

Если боевая база на Postgres новее 17-й версии (видно по имени файла копии, `…-pg18.dump.gpg`),
добавьте `POSTGRES_MAJOR=18` в файл `.env` рядом с `compose.yaml` до первого запуска.

## 3. Из чего это состоит

| Файл | Что делает |
|---|---|
| `backup/backup.sh` | `pg_dump` → проверка архива → шифрование → загрузка → удаление старых копий |
| `backup/restore.sh` | скачивание → расшифровка → `pg_restore` в базу Docker или по адресу |
| `.github/workflows/backup.yml` | ночная копия боевой базы |
| `.github/workflows/docker.yml` | проверка сборки и восстановления на каждый PR и раз в неделю |
| `Dockerfile`, `compose.yaml` | сайт и своя база Postgres для запуска где угодно |
| `server/node.ts` | сервер вне Vercel: API, сайт из `dist/`, редиректы и заголовки из `vercel.json` |
| `docker/db-init/` | при первом запуске базы включает TLS (приложения подключаются к базе только по TLS) |
| `docker/smoke.sh` | проверка поднятого сайта: страницы, запись в базу, вход в админку |
