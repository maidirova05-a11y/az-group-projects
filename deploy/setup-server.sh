#!/usr/bin/env bash
# Настройка Node-сайта на сервере, где УЖЕ работают другие проекты (Django на :8000, eurika на :3100).
# Ничего чужого не трогает: свои пользователь azsite, база azgroup_site, порт 3200, сайт nginx azgroup-site.
# Firewall и сайт nginx default не меняются. Идемпотентен. Запуск от root: bash setup-server.sh
set -euo pipefail
REPO="${REPO:-https://github.com/maidirova05-a11y/az-group-projects.git}"
BRANCH="${BRANCH:-main}"
APP=/opt/az-group-site

apt-get install -y curl git nginx postgresql certbot python3-certbot-nginx sudo
if ! command -v node >/dev/null || [ "$(node -p 'process.versions.node.split(".")[0]')" -lt 20 ]; then
  echo "Нужен Node.js 20+"; exit 1
fi

id azsite >/dev/null 2>&1 || useradd --system --create-home --shell /usr/sbin/nologin azsite

# База: отдельная роль и база, существующие проекты не затрагиваются
if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='azgroup_site'" | grep -q 1; then
  DBPASS="$(openssl rand -hex 16)"
  sudo -u postgres psql -c "CREATE ROLE azgroup_site LOGIN PASSWORD '$DBPASS'"
  echo "ПАРОЛЬ БД (впишите в .env.production): $DBPASS"
fi
sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='azgroup_site'" | grep -q 1 \
  || sudo -u postgres createdb -O azgroup_site azgroup_site

if [ ! -d "$APP/.git" ]; then git clone --branch "$BRANCH" "$REPO" "$APP"; fi
chown -R azsite:azsite "$APP"
if [ ! -f "$APP/.env.production" ]; then
  cp "$APP/deploy/env.production.example" "$APP/.env.production"
  chown azsite:azsite "$APP/.env.production"; chmod 600 "$APP/.env.production"
fi

cp "$APP/deploy/azgroup-site.service" /etc/systemd/system/azgroup-site.service
systemctl daemon-reload && systemctl enable azgroup-site

# nginx: только наш новый файл; существующие сайты не трогаем
cp "$APP/deploy/nginx.conf" /etc/nginx/sites-available/azgroup-site
ln -sf /etc/nginx/sites-available/azgroup-site /etc/nginx/sites-enabled/azgroup-site
nginx -t && systemctl reload nginx

install -m 755 "$APP/deploy/backup.sh" /usr/local/bin/azgroup-site-backup
echo '30 3 * * * root /usr/local/bin/azgroup-site-backup' > /etc/cron.d/azgroup-site-backup

echo "Готово. Дальше: заполнить $APP/.env.production → bash $APP/deploy/deploy.sh"
