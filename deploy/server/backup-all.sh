#!/usr/bin/env bash
# =============================================================================
# Ночная копия баз всех сайтов на сервере (cron из setup.sh, 02:17).
# Для каждого проекта из projects.txt, у которого в compose.yaml есть база,
# запускает его же backup/backup.sh: pg_dump → проверка → шифрование → S3.
# Копии ложатся в тот же бакет и папку <имя репозитория>/, что и раньше из
# GitHub Actions, так что backup/restore.sh latest находит их как обычно.
#
# Настройки — /etc/sites-backup.env (chmod 600, docs/SERVER.md, шаг 7):
#   BACKUP_PASSPHRASE, S3_BUCKET, S3_ENDPOINT, AWS_ACCESS_KEY_ID,
#   AWS_SECRET_ACCESS_KEY, AWS_DEFAULT_REGION
# Без S3_BUCKET копии остаются только в /srv/backups на этом же сервере.
#
#   deploy/server/backup-all.sh              все проекты
#   deploy/server/backup-all.sh onerlab      один
# =============================================================================
set -euo pipefail

main() {
  local here sites
  here=$(dirname "$(readlink -f "$0")")
  sites=${SITES_DIR:-/srv/sites}
  [ -f /etc/sites-backup.env ] || { echo "backup-all: нет /etc/sites-backup.env" >&2; exit 1; }
  set -a
  # shellcheck disable=SC1091
  . /etc/sites-backup.env
  set +a

  local -a failed=()
  local name _port dir id ip user pass db
  while read -r name _port _; do
    [[ -z "$name" || "$name" == \#* ]] && continue
    if [ "$#" -gt 0 ] && ! printf '%s\n' "$@" | grep -qx "$name"; then continue; fi
    dir="$sites/$name"
    [ -f "$dir/backup/backup.sh" ] || continue
    id=$(cd "$dir" && docker compose ps -q db 2>/dev/null || true)
    [ -n "$id" ] || continue
    echo "══ $(date '+%F %T') $name"

    # База не опубликована наружу; с самого сервера она доступна по адресу контейнера.
    ip=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}} {{end}}' "$id" | awk '{print $1}')
    user=$(docker exec "$id" printenv POSTGRES_USER)
    pass=$(docker exec "$id" printenv POSTGRES_PASSWORD)
    db=$(docker exec "$id" printenv POSTGRES_DB)
    if ! (cd "$dir" && DATABASE_URL="postgresql://$user:$pass@$ip:5432/$db" \
        BACKUP_NAME="$name" BACKUP_OUT_DIR="/srv/backups/$name" backup/backup.sh); then
      failed+=("$name")
    fi
    # Локальные копии — неделю (в облаке ротация своя, см. backup.sh).
    find "/srv/backups/$name" -name '*.dump.gpg' -mtime +7 -delete 2>/dev/null || true
  done < "$here/projects.txt"

  if [ "${#failed[@]}" -gt 0 ]; then
    echo "backup-all: ОШИБКА в проектах: ${failed[*]}" >&2
    exit 1
  fi
}

main "$@"
exit
