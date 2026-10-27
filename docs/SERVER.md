# Все сайты на своём сервере api.azgroup.kz

Сервер: **Cloud 2-4-50** (2 vCPU, 4 ГБ RAM, 50 ГБ), Астана, IP **109.235.118.220**.
На нём живут все восемь проектов: каждый в своём Docker-контейнере со своей базой, а
снаружи стоит Caddy, который отдаёт сайты по HTTPS и сам выпускает сертификаты.

```
посетитель ──HTTPS──► Caddy :443 ──► 127.0.0.1:3101 onerlab          (+ база)
                                 ├─► 127.0.0.1:3102 astanatechcup    (+ база)
                                 ├─► 127.0.0.1:3103 itecx-landing    (+ база)
                                 ├─► 127.0.0.1:3104 Ascora-Education (+ база)
                                 ├─► 127.0.0.1:3105 smarthub-kz      (+ база)
                                 ├─► 127.0.0.1:3106 az-group-projects(+ база)
                                 ├─► 127.0.0.1:3107 atlantia-olympiads-kz  (заявки → Bitrix24)
                                 └─► 127.0.0.1:3108 fibonacci-olympiads-kz (заявки → Bitrix24)
```

| Проект | Домен | Порт |
|---|---|---|
| onerlab | onerlab.kz | 3101 |
| astanatechcup | astanatechcup.kz | 3102 |
| itecx-landing | itecx.kz | 3103 |
| Ascora-Education | www.ascora.education | 3104 |
| smarthub-kz | smarthub-kz.com | 3105 |
| az-group-projects | www.azgroup.kz (и старый az-group.kz) | 3106 |
| atlantia-olympiads-kz | atlantia-olympiads.kz | 3107 |
| fibonacci-olympiads-kz | fibonacci-olympiads.kz | 3108 |

Файлы в этом репозитории:

| Файл | Что делает |
|---|---|
| `deploy/server/setup.sh` | готовит чистый сервер: Docker, Caddy, firewall, подкачка, cron бэкапа |
| `deploy/server/projects.txt` | список проектов, портов и веток |
| `deploy/server/deploy.sh` | скачивает свежий код из GitHub и пересобирает сайты |
| `deploy/server/Caddyfile` | домены → порты, HTTPS, редиректы с www |
| `deploy/server/backup-all.sh` | ночная зашифрованная копия всех баз в облако |

Время: подготовка сервера займёт около часа, переезд каждого сайта — 10–15 минут
плюс ожидание DNS.

> ⚠ Пароли и ключи никуда не пересылайте открытым текстом (в мессенджеры, в чат с ИИ).
> Храните их в менеджере паролей (1Password, Bitwarden).

---

## 1. Заранее (за сутки до переезда)

1. **Слить в `main` ветки с Docker-версией** для `az-group-projects`,
   `atlantia-olympiads-kz` и `fibonacci-olympiads-kz`: сервер собирает сайты из `main`.
2. **Уменьшить TTL** DNS-записей всех доменов до 300 секунд (hoster.kz → домен → DNS).
   Тогда в день переезда новые адреса разойдутся за минуты, а не за часы.
3. **Собрать секреты.** Для каждого проекта откройте Vercel → проект → Settings →
   Environment Variables и перенесите значения в менеджер паролей. Какие именно нужны,
   видно в `docker.env.example` каждого репозитория. **Обязательно те же, что на Vercel:**
   - `ENCRYPTION_KEY` в astanatechcup: с другим ключом персональные данные из базы не прочитать;
   - `IP_SALT` в az-group-projects: иначе не совпадут хэши IP в старых заявках.
4. **Пароль шифрования копий** (`BACKUP_PASSPHRASE`): если бэкапы уже настроены по
   BACKUP.md, возьмите тот же. Если нет — создайте его командой `openssl rand -base64 32`.
5. **Прямые адреса боевых баз** (откуда переносим данные):
   - Neon: проект → Connect → выключить *Connection pooling* → в адресе не должно быть `-pooler`;
   - база на сервере Forge (ITECX, ASCORA, если они там): логин и пароль из `.env` на Forge.

## 2. Подготовить сервер

Подключитесь к серверу (пароль root — из письма хостера или панели):

```bash
ssh root@109.235.118.220
```

Сначала смените пароль root (`passwd`) и, если ещё нет, добавьте свой SSH-ключ
(`ssh-copy-id root@109.235.118.220` со своего компьютера).

**Если репозитории приватные**, сначала дайте серверу доступ к GitHub: GitHub → Settings →
Developer settings → Fine-grained tokens → Generate. Только эти 8 репозиториев,
права **Contents: Read-only**, срок — год. Затем на сервере:

```bash
git config --global credential.helper store
```

При первом `git clone` Git спросит логин (ваш логин GitHub) и пароль — вставьте токен.
Git его запомнит.

Дальше:

```bash
apt-get update && apt-get install -y git
git clone https://github.com/maidirova05-a11y/az-group-projects.git /srv/sites/az-group-projects
bash /srv/sites/az-group-projects/deploy/server/setup.sh
```

Скрипт ставит Docker и Caddy, добавляет подкачку на 4 ГБ (без неё не соберётся Next.js),
открывает наружу только порты 22, 80 и 443 и включает автоматические обновления
безопасности.

## 3. Скачать проекты и заполнить секреты

```bash
/srv/sites/az-group-projects/deploy/server/deploy.sh
```

Первый запуск клонирует все репозитории в `/srv/sites/<имя>` и пропускает их: секретов
ещё нет. Заполните их для каждого проекта:

```bash
cd /srv/sites/onerlab
cp docker.env.example docker.env
nano docker.env          # значения из менеджера паролей (шаг 1.3)
chmod 600 docker.env
```

То же самое сделайте для `astanatechcup`, `itecx-landing`, `Ascora-Education`, `smarthub-kz`,
`az-group-projects`, `atlantia-olympiads-kz` и `fibonacci-olympiads-kz`.

Особые случаи:

- **astanatechcup:** публичные ключи (`NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `NEXT_PUBLIC_ANALYTICS_*`)
  вшиваются при сборке. Они кладутся не в `docker.env`, а в файл `.env` рядом с `compose.yaml`.
- **Если боевая база на Postgres 18** (это видно по имени копии на шаге 5: `…-pg18.dump.gpg`),
  добавьте `POSTGRES_MAJOR=18` в файл `.env` проекта до первого запуска.

## 4. Запустить

```bash
/srv/sites/az-group-projects/deploy/server/deploy.sh
```

Проекты собираются по очереди, весь первый раз занимает около 15–25 минут. В конце
скрипт пишет, какие проекты отвечают. Сайты пока пустые и доступны только с самого
сервера.

Посмотреть сайт до переключения домена можно через SSH-туннель со своего компьютера:

```bash
ssh -L 3101:127.0.0.1:3101 root@109.235.118.220
# и открыть http://localhost:3101 в браузере
```

## 5. Перенести данные

Перенести нужно базы шести проектов: onerlab, astanatechcup, itecx-landing,
Ascora-Education, smarthub-kz и az-group-projects. У atlantia и fibonacci базы нет.

Для каждого из них на сервере:

```bash
cd /srv/sites/onerlab
read -rsp 'Пароль шифрования: ' BACKUP_PASSPHRASE; export BACKUP_PASSPHRASE; echo

# 1) снять копию с текущей боевой базы (Neon/Forge) — в файл на сервере
DATABASE_URL='postgresql://…адрес из шага 1.5…' BACKUP_NAME=onerlab \
  BACKUP_OUT_DIR=/srv/backups/move backup/backup.sh

# 2) развернуть её в базу на сервере (сайт на это время останавливается)
backup/restore.sh /srv/backups/move/onerlab-<дата>-pg17.dump.gpg
```

`restore.sh` в конце печатает таблицы и число строк. Сверьте их с админкой на старом сайте.
Учётки админов переносятся вместе с базой.

**База на Forge** (если наружу она закрыта) — пробросьте порт через SSH прямо с нового сервера:

```bash
ssh -fN -L 6543:127.0.0.1:5432 forge@IP_FORGE
DATABASE_URL='postgresql://itecx_app:ПАРОЛЬ@127.0.0.1:6543/itecx' BACKUP_NAME=itecx-landing \
  BACKUP_OUT_DIR=/srv/backups/move backup/backup.sh
```

## 6. Переключить домены

Делайте по одному сайту, начиная с наименее важного.

1. **Снимите свежую копию** и разверните её (шаг 5 ещё раз — `restore.sh` заменяет данные).
   Так в новую базу попадут заявки, пришедшие за это время.
2. **Поменяйте DNS у регистратора домена** (hoster.kz → домен → DNS-записи):

   | Тип | Имя | Было | Стало |
   |---|---|---|---|
   | A | `@` | `76.76.21.21` (Vercel) | `109.235.118.220` |
   | CNAME → A | `www` | `cname.vercel-dns.com` | удалить CNAME, добавить **A** `109.235.118.220` |

   Для azgroup.kz сделайте то же для **az-group.kz**, тогда старые адреса продолжат
   работать. Заодно можно добавить запись `A api → 109.235.118.220`: по имени
   `api.azgroup.kz` удобнее заходить на сервер.
3. **Один раз включите Caddy** со всеми доменами. Пока DNS какого-то домена ещё не
   переключён, Caddy просто будет повторять попытки получить для него сертификат:

   ```bash
   cp /srv/sites/az-group-projects/deploy/server/Caddyfile /etc/caddy/Caddyfile
   caddy validate --config /etc/caddy/Caddyfile && systemctl reload caddy
   ```

4. **Проверьте** с телефона через мобильный интернет (там DNS обновляется быстрее): сайт
   открывается, замок HTTPS на месте, тестовая заявка видна в админке (для atlantia и
   fibonacci — в Bitrix24). Сертификат Caddy выпускает за минуту после того, как DNS разошёлся.
5. **Сутки после переключения** часть посетителей ещё может попадать на Vercel. На следующий
   день откройте админку старого сайта и перенесите вручную заявки, которые пришли туда
   после копии из пункта 1.

## 7. Бэкапы на новом сервере

Теперь боевые базы живут на сервере, поэтому копии снимает сам сервер, каждую ночь в 02:17.

```bash
cat > /etc/sites-backup.env <<'EOF'
BACKUP_PASSPHRASE=…
S3_BUCKET=…
S3_ENDPOINT=…
AWS_ACCESS_KEY_ID=…
AWS_SECRET_ACCESS_KEY=…
AWS_DEFAULT_REGION=auto
EOF
chmod 600 /etc/sites-backup.env

/srv/sites/az-group-projects/deploy/server/backup-all.sh   # проверить вручную
```

Хранилище — то же S3-совместимое, что описано в BACKUP.md проектов (Cloudflare R2,
Backblaze B2 и т. п.). Копии ложатся в те же папки, поэтому
`backup/restore.sh latest` работает как раньше. Журнал — `/var/log/sites-backup.log`.

Дополнительно:

- в панели хостера (вкладка **Бекапы**) включите автоматические бэкапы сервера — это
  второй уровень защиты на случай, если сервер умрёт целиком;
- после переезда **отключите** в каждом репозитории GitHub Actions → «Резервная копия
  базы» → `…` → Disable workflow: он копирует старую базу Neon, а она больше не меняется.

## 8. Как обновлять сайты после переезда

Vercel больше не выкладывает изменения сам: после слияния в `main` обновите сайт на сервере.

```bash
ssh root@109.235.118.220 /srv/sites/az-group-projects/deploy/server/deploy.sh onerlab
```

Без имени проекта обновляются все.

## 9. Через неделю, когда всё стабильно

- Vercel: в каждом проекте удалите домены (Settings → Domains), затем остановите или
  удалите проект.
- Neon / Forge: снимите последнюю копию (шаг 5, пункт 1), сохраните файл и удалите базы
  и серверы, чтобы не платить за них.

## Полезные команды

```bash
cd /srv/sites/onerlab
docker compose ps                 # что запущено
docker compose logs -f --tail 100 # логи сайта
docker compose restart app        # перезапустить сайт
docker stats --no-stream          # память и процессор по контейнерам
df -h /                           # место на диске
journalctl -u caddy --since today # логи Caddy (сертификаты, ошибки)

# новый пароль админа AZ Group
cd /srv/sites/az-group-projects
docker compose exec app node dist-server/scripts/create-admin.mjs admin@azgroup.kz 'новый-пароль'
```

## Хватит ли сервера

8 сайтов и 6 баз в работе занимают примерно 1,5–2 ГБ RAM из 4 ГБ. Больше всего памяти
нужно при сборке Next.js-проектов (onerlab, astanatechcup), поэтому `deploy.sh` собирает
сайты по одному, а `setup.sh` добавляет 4 ГБ подкачки. Диск: образы и базы занимают 6–10 ГБ.
`deploy.sh` после каждого запуска удаляет старые образы и кэш сборки старше недели.
Если сайты начнут тормозить, в первую очередь стоит перейти на тариф с 8 ГБ RAM.
