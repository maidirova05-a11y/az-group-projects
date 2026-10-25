#!/usr/bin/env node
/**
 * Копирует шрифт Montserrat (вариативный, только прямое начертание) из пакета @fontsource-variable/montserrat
 * в public/fonts — сайт и админка подключают его сами (src/fonts.css), без запросов к Google Fonts:
 * нет лишнего соединения и блокирующего CSS, шрифт кэшируется вместе со статикой.
 * Запуск: node scripts/sync-fonts.mjs (после обновления пакета).
 */
import { copyFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const src = `${root}node_modules/@fontsource-variable/montserrat/files/`;
const dst = `${root}public/fonts/`;
mkdirSync(dst, { recursive: true });
for (const subset of ['latin', 'latin-ext', 'cyrillic', 'cyrillic-ext']) {
  const f = `montserrat-${subset}-wght-normal.woff2`;
  copyFileSync(src + f, dst + f);
  console.log('public/fonts/' + f);
}
