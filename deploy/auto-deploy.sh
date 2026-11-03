#!/usr/bin/env bash
# Автодеплой: если в origin/main появился новый коммит — запускает deploy.sh. Журнал: /var/log/azgroup-deploy.log
# Ставится в /usr/local/bin/azgroup-autodeploy и запускается cron каждые 2 минуты (см. setup-server.sh).
# Упавший деплой (сборка/миграция) до перезапуска сайта не доходит — работает прежняя версия; тот же коммит повторно не пробуется.
set -uo pipefail
APP=/opt/az-group-site
FAILED=/var/lib/azgroup-deploy.failed
exec 9>/var/lock/azgroup-deploy.lock; flock -n 9 || exit 0
cd "$APP"
sudo -u azsite git fetch -q origin main || exit 0
NEW=$(sudo -u azsite git rev-parse origin/main)
[ "$(sudo -u azsite git rev-parse HEAD)" = "$NEW" ] && exit 0
[ -f "$FAILED" ] && [ "$(cat "$FAILED")" = "$NEW" ] && exit 0
echo "$(date -Is) deploy ${NEW:0:7}"
if BRANCH=main bash "$APP/deploy/deploy.sh"; then rm -f "$FAILED"; echo "$(date -Is) OK ${NEW:0:7}"
else echo "$NEW" > "$FAILED"; echo "$(date -Is) FAILED ${NEW:0:7}"; fi
