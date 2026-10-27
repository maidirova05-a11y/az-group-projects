#!/usr/bin/env bash
# =============================================================================
# Скачать свежий код из GitHub и пересобрать сайты на сервере.
#
#   deploy/server/deploy.sh                  все проекты из projects.txt
#   deploy/server/deploy.sh onerlab smarthub-kz
#
# Первый запуск клонирует репозиторий в /srv/sites/<имя>. Проект без
# docker.env пропускается (его секреты нужно заполнить — docs/SERVER.md, шаг 4).
# Сборка идёт по одному проекту: на 4 ГБ RAM параллельно не хватит памяти.
# =============================================================================
set -euo pipefail

# Всё тело — в функции: bash прочитает её целиком до запуска, и обновление
# этого же файла через git pull не сломает выполнение.
main() {
  local here sites owner
  here=$(dirname "$(readlink -f "$0")")
  sites=${SITES_DIR:-/srv/sites}
  owner=${GITHUB_OWNER:-maidirova05-a11y}

  local -a rows=() failed=()
  while read -r name port branch; do
    [[ -z "$name" || "$name" == \#* ]] && continue
    if [ "$#" -gt 0 ] && ! printf '%s\n' "$@" | grep -qx "$name"; then continue; fi
    rows+=("$name ${port} ${branch:-main}")
  done < "$here/projects.txt"
  [ "${#rows[@]}" -gt 0 ] || { echo "deploy: нет таких проектов в projects.txt: $*" >&2; exit 1; }

  local row name port branch dir
  for row in "${rows[@]}"; do
    read -r name port branch <<<"$row"
    dir="$sites/$name"
    echo "══ $name (ветка $branch, порт $port)"

    if [ ! -d "$dir/.git" ]; then
      git clone --branch "$branch" "https://github.com/$owner/$name.git" "$dir" || { failed+=("$name: git clone"); continue; }
    else
      git -C "$dir" fetch origin "$branch" && git -C "$dir" checkout -q "$branch" \
        && git -C "$dir" merge --ff-only "origin/$branch" || { failed+=("$name: git pull"); continue; }
    fi
    if [ ! -f "$dir/docker.env" ]; then
      echo "   нет $dir/docker.env — пропускаю (cp docker.env.example docker.env и заполнить)"
      failed+=("$name: нет docker.env")
      continue
    fi

    if ! (cd "$dir" && APP_PORT=$port docker compose up -d --build --remove-orphans); then
      failed+=("$name: docker compose")
      continue
    fi

    # Ждём, пока сайт ответит (у Next.js-проектов сначала идут миграции).
    local ok=""
    for _ in $(seq 1 60); do
      if curl -sf -o /dev/null "http://127.0.0.1:$port/"; then ok=1; break; fi
      sleep 2
    done
    if [ -n "$ok" ]; then
      echo "   ✓ отвечает на 127.0.0.1:$port"
    else
      echo "   ✗ не отвечает на 127.0.0.1:$port — логи: cd $dir && docker compose logs --tail 50"
      failed+=("$name: не отвечает")
    fi
  done

  # Старые образы и кэш сборки — иначе диск (50 ГБ) закончится через пару месяцев.
  docker image prune -f >/dev/null
  docker builder prune -f --filter until=168h >/dev/null

  if [ "${#failed[@]}" -gt 0 ]; then
    printf '\nНе получилось:\n'
    printf '  - %s\n' "${failed[@]}"
    exit 1
  fi
  echo
  echo "Все проекты обновлены."
}

main "$@"
exit
