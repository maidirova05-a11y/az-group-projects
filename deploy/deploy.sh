#!/usr/bin/env bash
# Обновление сайта на сервере: bash /opt/az-group/deploy/deploy.sh  (от root)
set -euo pipefail
APP=/opt/az-group
BRANCH="${BRANCH:-main}"
cd "$APP"
sudo -u azgroup git fetch origin "$BRANCH"
sudo -u azgroup git checkout "$BRANCH"
sudo -u azgroup git reset --hard "origin/$BRANCH"
sudo -u azgroup npm ci
sudo -u azgroup node scripts/csp-hashes.mjs --check >/dev/null
sudo -u azgroup npm run build
sudo -u azgroup npm run db:migrate:prod
systemctl restart azgroup
sleep 3
curl -fsS http://127.0.0.1:3000/api/health && echo " — OK"
