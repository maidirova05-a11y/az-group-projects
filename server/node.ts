/**
 * Боевой сервер вне Vercel (Docker, compose.yaml): API + собранный сайт из dist/.
 * Повторяет то, что Vercel делает по vercel.json: редиректы (в том числе со старого
 * домена az-group.kz), заголовки, /sitemap.xml → API и SPA-маршруты → index.html / admin.html.
 * Редиректы и заголовки читаются из самого vercel.json, чтобы правила жили в одном месте.
 *
 * Перед стартом применяет новые миграции (как vercel-build в production), отключить — SKIP_DB_MIGRATE=1.
 */
import { readFile, stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '@hono/node-server';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { Hono } from 'hono';
import postgres from 'postgres';
import { app } from './app.js';
import { env } from './env.js';

const root = process.cwd();
const dist = resolve(root, process.env.DIST_DIR ?? 'dist');
const migrationsFolder = process.env.MIGRATIONS_DIR ?? fileURLToPath(new URL('./db/migrations', import.meta.url));
const port = Number(process.env.PORT) || 3000;

type Match = { type: 'host' | 'query' | 'header'; key?: string; value?: string };
type VercelConfig = {
  redirects?: { source: string; destination: string; permanent?: boolean; has?: Match[] }[];
  headers?: { source: string; headers: { key: string; value: string }[] }[];
};
const vercel = JSON.parse(await readFile(resolve(root, 'vercel.json'), 'utf8')) as VercelConfig;

/** Подмножество path-to-regexp, которое встречается в vercel.json: `:name(regex)`, `:name*`, `:name`, остальное — регулярное выражение. */
function sourceRegex(source: string): RegExp {
  const re = source
    .replace(/:(\w+)\(([^)]*)\)/g, '(?<$1>$2)')
    .replace(/:(\w+)\*/g, '(?<$1>.*)')
    .replace(/:(\w+)(?![\w>])/g, '(?<$1>[^/]+)');
  return new RegExp(`^${re}$`);
}

function hostMatches(has: Match[] | undefined, host: string): boolean {
  return (has ?? []).every(m => m.type !== 'host' || new RegExp(`^${m.value}$`).test(host));
}

const redirects = (vercel.redirects ?? []).map(r => ({ ...r, re: sourceRegex(r.source) }));
const headerRules = (vercel.headers ?? []).map(r => ({ ...r, re: sourceRegex(r.source) }));

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.pdf': 'application/pdf',
  '.mp4': 'video/mp4',
};

/** Файл внутри dist/ или null (выход за пределы dist/ запрещён). */
async function fileAt(pathname: string): Promise<string | null> {
  const full = resolve(dist, `.${pathname}`);
  if (full !== dist && !full.startsWith(dist + sep)) return null;
  try {
    return (await stat(full)).isFile() ? full : null;
  } catch {
    return null;
  }
}

async function sendFile(file: string, method: string): Promise<Response> {
  const data = await readFile(file);
  return new Response(method === 'HEAD' ? null : data, {
    headers: {
      'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream',
      'Content-Length': String(data.length),
      'Cache-Control': 'public, max-age=0, must-revalidate',
    },
  });
}

const site = new Hono();

// Заголовки из vercel.json — на все ответы, включая редиректы и ошибки.
site.use('*', async (c, next) => {
  await next();
  const { pathname } = new URL(c.req.url);
  for (const rule of headerRules) {
    if (rule.re.test(pathname)) for (const h of rule.headers) c.res.headers.set(h.key, h.value);
  }
});

site.use('*', async (c, next) => {
  const url = new URL(c.req.url);
  const host = (c.req.header('host') ?? '').replace(/:\d+$/, '').toLowerCase();
  for (const r of redirects) {
    const m = r.re.exec(url.pathname);
    if (!m || !hostMatches(r.has, host)) continue;
    let dest = r.destination.replace(/:(\w+)\*?/g, (s, name: string) => m.groups?.[name] ?? s);
    if (url.search) dest += (dest.includes('?') ? '&' : '?') + url.search.slice(1);
    return c.redirect(dest, r.permanent === false ? 307 : 308);
  }
  await next();
});

site.all('/api/*', c => app.fetch(c.req.raw));
site.get('/sitemap.xml', c => app.fetch(new Request(new URL('/api/sitemap.xml', c.req.url), c.req.raw)));

site.on(['GET', 'HEAD'], '*', async c => {
  let pathname: string;
  try {
    pathname = decodeURIComponent(new URL(c.req.url).pathname);
  } catch {
    return c.text('Bad request', 400);
  }
  const file = pathname === '/' ? null : await fileAt(pathname);
  if (file) return sendFile(file, c.req.method);
  if (pathname === '/admin' || pathname.startsWith('/admin/')) return sendFile(resolve(dist, 'admin.html'), c.req.method);
  if (!pathname.startsWith('/assets/')) return sendFile(resolve(dist, 'index.html'), c.req.method);
  return c.text('Not found', 404);
});

site.all('*', c => c.text('Method not allowed', 405, { Allow: 'GET, HEAD' }));

if (process.env.SKIP_DB_MIGRATE === '1') {
  console.log('SKIP_DB_MIGRATE=1 — миграции пропущены');
} else {
  const client = postgres(env.databaseUrl, { max: 1, onnotice: () => {} });
  try {
    await migrate(drizzle(client), { migrationsFolder });
    console.log('Миграции применены');
  } finally {
    await client.end();
  }
}

serve({ fetch: site.fetch, port, hostname: '0.0.0.0' }, () => console.log(`AZ Group: http://localhost:${port}`));
