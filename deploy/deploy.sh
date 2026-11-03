#!/usr/bin/env bash
# Обновление сайта на сервере: bash /opt/az-group-site/deploy/deploy.sh  (от root)
set -euo pipefail
APP=/opt/az-group-site
BRANCH="${BRANCH:-main}"
cd "$APP"
sudo -u azsite git fetch origin "$BRANCH"
sudo -u azsite git checkout "$BRANCH"
sudo -u azsite git reset --hard "origin/$BRANCH"
sudo -u azsite npm ci
sudo -u azsite node scripts/csp-hashes.mjs --check >/dev/null
sudo -u azsite npm run build
sudo -u azsite npm run db:migrate:prod
systemctl restart azgroup-site
sleep 3
curl -fsS http://127.0.0.1:3200/api/health && echo " — OK"
