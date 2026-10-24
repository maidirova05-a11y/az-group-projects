#!/usr/bin/env node
/**
 * Печатает sha256-хэши inline-<script> из index.html и admin.html для Content-Security-Policy (vercel.json).
 * Хэш считается от точного текста между <script> и </script> (с отступами и переводами строк),
 * поэтому ЛЮБАЯ правка такого скрипта требует обновить script-src в vercel.json.
 *
 *   node scripts/csp-hashes.mjs          — показать хэши
 *   node scripts/csp-hashes.mjs --check  — проверить, что все хэши есть в CSP vercel.json (код выхода 1, если нет)
 *
 * Если есть dist/ (после `npm run build`), хэши собранных HTML тоже считаются — они должны совпадать с исходными.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const files = ['index.html', 'admin.html', 'dist/index.html', 'dist/admin.html'].filter(f => existsSync(root + f));

/** Исполняемые inline-скрипты: без src и не JSON-данные (ld+json, importmap не исполняются как JS). */
function inlineScripts(html) {
  const out = [];
  for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    const attrs = m[1];
    if (/\bsrc\s*=/.test(attrs)) continue;
    const type = /\btype\s*=\s*["']?([^"'\s>]+)/i.exec(attrs)?.[1]?.toLowerCase();
    if (type && !['text/javascript', 'module', 'application/javascript'].includes(type)) continue;
    out.push(m[2]);
  }
  return out;
}

const hashes = new Set();
for (const f of files) {
  const scripts = inlineScripts(readFileSync(root + f, 'utf8'));
  for (const s of scripts) {
    const h = `'sha256-${createHash('sha256').update(s, 'utf8').digest('base64')}'`;
    hashes.add(h);
    console.log(`${f.padEnd(16)} ${h}`);
  }
  if (!scripts.length) console.log(`${f.padEnd(16)} (нет inline-скриптов)`);
}

if (process.argv.includes('--check')) {
  const vercel = JSON.parse(readFileSync(root + 'vercel.json', 'utf8'));
  const csp = (vercel.headers ?? []).flatMap(h => h.headers).find(h => h.key === 'Content-Security-Policy')?.value ?? '';
  const missing = [...hashes].filter(h => !csp.includes(h));
  if (missing.length) {
    console.error(`\nВ vercel.json (Content-Security-Policy, script-src) нет хэшей: ${missing.join(' ')}`);
    process.exit(1);
  }
  console.log('\nOK: все хэши есть в CSP vercel.json');
}
