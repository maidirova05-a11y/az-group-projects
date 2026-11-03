#!/usr/bin/env bash
# Ежедневный дамп БД в /var/backups/azgroup, хранится 14 дней. Желательно копировать и за пределы сервера (снимки/бекапы Hoster.kz).
set -euo pipefail
DIR=/var/backups/azgroup
mkdir -p "$DIR"
sudo -u postgres pg_dump -Fc azgroup > "$DIR/azgroup-$(date +%F).dump"
find "$DIR" -name '*.dump' -mtime +14 -delete
