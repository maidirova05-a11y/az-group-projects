#!/usr/bin/env node
/**
 * Генерирует public/sitemap.xml: все разделы сайта (NAV из src/router.ts) × языки (LANGS из shared/i18n.ts)
 * с альтернативами hreflang. Адреса: ru — без префикса (/events), kk — /kk/events, en — /en/events;
 * x-default → русская версия.
 *
 *   npm run sitemap            — перезаписать public/sitemap.xml
 *   SITE_ORIGIN=https://… npm run sitemap — другой домен (по умолчанию https://www.azgroup.kz)
 *
 * Запускайте после добавления раздела в NAV. Файл в public/ попадает в dist/ как есть и отдаётся Vercel статикой.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const ORIGIN = (process.env.SITE_ORIGIN || 'https://www.azgroup.kz').replace(/\/+$/, '');

const router = readFileSync(`${root}src/router.ts`, 'utf8');
const navBlock = /export const NAV[^=]*=\s*\[([\s\S]*?)\];/.exec(router)?.[1];
if (!navBlock) throw new Error('Не нашли NAV в src/router.ts');
const routes = [...navBlock.matchAll(/path:\s*'([^']+)'/g)].map(m => m[1]);

const i18n = readFileSync(`${root}shared/i18n.ts`, 'utf8');
const langs = [...(/export const LANGS\s*=\s*\[([^\]]*)\]/.exec(i18n)?.[1] ?? '').matchAll(/'([a-z]{2})'/g)].map(m => m[1]);
const DEFAULT = /export const DEFAULT_LANG[^=]*=\s*'([a-z]{2})'/.exec(i18n)?.[1] ?? 'ru';
if (!routes.length || !langs.length) throw new Error('Пустой список разделов или языков');

const url = (path, lang) => {
  if (lang === DEFAULT) return `${ORIGIN}${path}`;
  return `${ORIGIN}/${lang}${path === '/' ? '' : path}`;
};
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const entries = routes.flatMap(path => langs.map(lang => {
  const alternates = [
    ...langs.map(l => `    <xhtml:link rel="alternate" hreflang="${l}" href="${esc(url(path, l))}"/>`),
    `    <xhtml:link rel="alternate" hreflang="x-default" href="${esc(url(path, DEFAULT))}"/>`,
  ];
  return [
    '  <url>',
    `    <loc>${esc(url(path, lang))}</loc>`,
    ...alternates,
    `    <changefreq>${path === '/' || path === '/events' || path === '/news' ? 'weekly' : 'monthly'}</changefreq>`,
    `    <priority>${path === '/' ? '1.0' : path === '/events' ? '0.9' : '0.7'}</priority>`,
    '  </url>',
  ].join('\n');
}));

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!-- Сгенерировано scripts/sitemap.mjs (npm run sitemap) — не редактируйте вручную. -->
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entries.join('\n')}
</urlset>
`;
writeFileSync(`${root}public/sitemap.xml`, xml);
console.log(`public/sitemap.xml: ${routes.length} разделов × ${langs.length} языка = ${entries.length} адресов (${ORIGIN})`);
