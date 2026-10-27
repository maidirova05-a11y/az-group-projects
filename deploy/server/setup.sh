#!/usr/bin/env bash
# =============================================================================
# Подготовка чистого сервера Ubuntu 22.04/24.04 под все сайты. Запускать один раз
# от root (docs/SERVER.md, шаг 2). Повторный запуск безопасен.
#
#   - обновления системы и автоматические обновления безопасности
#   - файл подкачки 4 ГБ (сборке Next.js не хватает 4 ГБ RAM)
#   - Docker (логи контейнеров ограничены по размеру), Caddy, AWS CLI для бэкапов
#   - firewall: наружу открыты только SSH, 80 и 443; fail2ban от перебора SSH
#   - каталог /srv/sites, ночной бэкап баз (cron)
# =============================================================================
set -euo pipefail
[ "$(id -u)" -eq 0 ] || { echo "setup: запустите от root (sudo)"; exit 1; }
export DEBIAN_FRONTEND=noninteractive

echo "── Система"
timedatectl set-timezone Asia/Almaty || true
apt-get update
apt-get -y upgrade
apt-get install -y ca-certificates curl git gnupg ufw fail2ban unattended-upgrades \
  debian-keyring debian-archive-keyring apt-transport-https unzip
dpkg-reconfigure -f noninteractive unattended-upgrades

echo "── Файл подкачки"
if ! swapon --show | grep -q .; then
  fallocate -l 4G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
  sysctl -w vm.swappiness=10
  echo 'vm.swappiness=10' > /etc/sysctl.d/99-swappiness.conf
fi

echo "── Docker"
mkdir -p /etc/docker
[ -f /etc/docker/daemon.json ] || cat > /etc/docker/daemon.json <<'JSON'
{
  "log-driver": "local",
  "log-opts": { "max-size": "20m", "max-file": "3" }
}
JSON
command -v docker >/dev/null || curl -fsSL https://get.docker.com | sh
systemctl enable --now docker

echo "── Caddy"
if ! command -v caddy >/dev/null; then
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
    | gpg --dearmor --yes -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
    > /etc/apt/sources.list.d/caddy-stable.list
  apt-get update
  apt-get install -y caddy
fi
systemctl enable --now caddy

echo "── AWS CLI (загрузка бэкапов в S3-хранилище)"
if ! command -v aws >/dev/null; then
  ARCH=$(uname -m)
  TMP=$(mktemp -d)
  curl -fsSL "https://awscli.amazonaws.com/awscli-exe-linux-${ARCH}.zip" -o "$TMP/aws.zip"
  unzip -q "$TMP/aws.zip" -d "$TMP"
  "$TMP/aws/install"
  rm -rf "$TMP"
fi

echo "── Firewall"
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 443/udp
ufw --force enable
systemctl enable --now fail2ban

echo "── Каталог сайтов и ночной бэкап"
mkdir -p /srv/sites
HERE=$(dirname "$(readlink -f "$0")")
cat > /etc/cron.d/sites-backup <<CRON
# Ночная копия баз всех сайтов (docs/SERVER.md, шаг 7).
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
17 2 * * * root $HERE/backup-all.sh >> /var/log/sites-backup.log 2>&1
CRON

echo
echo "Готово. Дальше — docs/SERVER.md, шаг 3 (доступ к GitHub)."
docker --version
caddy version
