#!/usr/bin/env bash
# Первичная настройка чистого Ubuntu 22.04/24.04 на Hoster.kz. Запускать от root: bash setup-server.sh
# Идемпотентен: повторный запуск ничего не ломает.
set -euo pipefail
REPO="${REPO:-https://github.com/maidirova05-a11y/az-group-projects.git}"
BRANCH="${BRANCH:-main}"
APP=/opt/az-group

apt-get update
apt-get install -y curl git nginx postgresql ufw certbot python3-certbot-nginx ca-certificates gnupg sudo

# Node.js 22 LTS
if ! command -v node >/dev/null || [ "$(node -p 'process.versions.node.split(".")[0]')" -lt 20 ]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi

id azgroup >/dev/null 2>&1 || useradd --system --create-home --shell /usr/sbin/nologin azgroup

# База данных
if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='azgroup'" | grep -q 1; then
  DBPASS="$(openssl rand -hex 16)"
  sudo -u postgres psql -c "CREATE ROLE azgroup LOGIN PASSWORD '$DBPASS'"
  sudo -u postgres createdb -O azgroup azgroup
  echo "Пароль БД (впишите в .env.production): $DBPASS"
fi

# Код
if [ ! -d "$APP/.git" ]; then git clone --branch "$BRANCH" "$REPO" "$APP"; fi
chown -R azgroup:azgroup "$APP"
if [ ! -f "$APP/.env.production" ]; then
  cp "$APP/deploy/env.production.example" "$APP/.env.production"
  chown azgroup:azgroup "$APP/.env.production"; chmod 600 "$APP/.env.production"
  echo ">>> Заполните $APP/.env.production (DATABASE_URL, JWT_SECRET, IP_SALT), затем: bash $APP/deploy/deploy.sh"
fi

# systemd, nginx, firewall
cp "$APP/deploy/azgroup.service" /etc/systemd/system/azgroup.service
systemctl daemon-reload && systemctl enable azgroup
cp "$APP/deploy/nginx.conf" /etc/nginx/sites-available/azgroup
ln -sf /etc/nginx/sites-available/azgroup /etc/nginx/sites-enabled/azgroup
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
ufw allow OpenSSH && ufw allow 'Nginx Full' && ufw --force enable

# Ежедневный бэкап БД в 03:00
install -m 755 "$APP/deploy/backup.sh" /usr/local/bin/azgroup-backup
echo '0 3 * * * root /usr/local/bin/azgroup-backup' > /etc/cron.d/azgroup-backup

echo "Готово. Дальше: заполнить .env.production → deploy.sh → certbot (см. docs/HOSTER-KZ.md)"
