#!/usr/bin/env node
/**
 * Сборка на Vercel (npm-скрипт vercel-build — Vercel запускает его вместо build).
 * 1. В production-деплое применяет новые миграции к боевой базе (DATABASE_URL из настроек Vercel),
 *    чтобы код и схема базы не расходились: новые колонки появляются до того, как их начнёт читать API.
 *    Preview-деплои базу не трогают (у них может быть та же DATABASE_URL). Отключить: SKIP_DB_MIGRATE=1.
 * 2. Обычная сборка — то же, что npm run build (tsc -b && vite build).
 */
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const run = (args) => execFileSync(process.execPath, args, { cwd: root, stdio: 'inherit', env: process.env });
const bin = (...p) => path.join(root, 'node_modules', ...p);

const isProd = process.env.VERCEL_ENV === 'production';
if (process.env.SKIP_DB_MIGRATE === '1') {
  console.log('[vercel-build] SKIP_DB_MIGRATE=1 — миграции пропущены');
} else if (!isProd) {
  console.log(`[vercel-build] VERCEL_ENV=${process.env.VERCEL_ENV ?? 'не задан'} — миграции только для production`);
} else if (!process.env.DATABASE_URL) {
  console.error('[vercel-build] DATABASE_URL не задан — миграции не применены');
  process.exit(1);
} else {
  run([bin('tsx', 'dist', 'cli.mjs'), 'server/db/migrate.ts']);
}

run([bin('typescript', 'bin', 'tsc'), '-b']);
run([bin('vite', 'bin', 'vite.js'), 'build']);
