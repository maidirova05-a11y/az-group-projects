#!/usr/bin/env bash
# Установка azhost на сервер (от root). Идемпотентна.
#   git clone --depth 1 https://github.com/maidirova05-a11y/az-group-projects /opt/azhost-src
#   bash /opt/azhost-src/deploy/azhost/install.sh
# Не трогает существующие проекты, nginx-сайты, firewall и базы. Ставит Docker, swap, каталоги, cron.
set -euo pipefail
[ "$(id -u)" = 0 ] || { echo "запускайте от root"; exit 1; }
HERE="$(cd "$(dirname "$0")" && pwd)"

if [ "${1:-}" != --no-packages ]; then
  apt-get update -qq
  DEBIAN_FRONTEND=noninteractive apt-get install -y -qq docker.io docker-compose-v2 docker-buildx jq curl git nginx certbot python3-certbot-nginx
  systemctl enable --now docker

  # журналы контейнеров не должны заполнять диск
  if [ ! -f /etc/docker/daemon.json ]; then
    mkdir -p /etc/docker
    echo '{ "log-driver": "json-file", "log-opts": { "max-size": "10m", "max-file": "3" } }' > /etc/docker/daemon.json
    systemctl restart docker
  fi

  # swap 2 ГБ, если его ещё нет (на 4 ГБ RAM сборки Next.js без swap могут падать)
  if [ -z "$(swapon --show --noheadings)" ]; then
    echo "• создаю swap 2 ГБ"
    fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile >/dev/null && swapon /swapfile
    grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
    sysctl -w vm.swappiness=10 >/dev/null; echo 'vm.swappiness=10' > /etc/sysctl.d/99-azhost.conf
  fi

  # много доменов в nginx
  [ -f /etc/nginx/conf.d/azhost.conf ] || { echo 'server_names_hash_bucket_size 128;' > /etc/nginx/conf.d/azhost.conf; nginx -t && systemctl reload nginx; }
fi

mkdir -p /etc/azhost /opt/apps /opt/azhost /var/backups/apps /var/lib/azhost
install -m 755 "$HERE/azhost" /usr/local/bin/azhost
rm -rf /opt/azhost/static-fn && cp -r "$HERE/static-fn" /opt/azhost/static-fn

echo '*/3 * * * * root /usr/local/bin/azhost autodeploy >> /var/log/azhost.log 2>&1' > /etc/cron.d/azhost-autodeploy
echo '50 3 * * * root /usr/local/bin/azhost backup >> /var/log/azhost.log 2>&1' > /etc/cron.d/azhost-backup

echo "Готово. Справка: azhost help"
