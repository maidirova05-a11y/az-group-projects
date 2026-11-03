/**
 * Production-сервер для обычного VPS (Hoster.kz): один Node-процесс отдаёт и API (/api/*), и собранный сайт (dist/).
 * Повторяет поведение vercel.json: редирект со старого домена, переписывания SPA, кеш и заголовки безопасности.
 * Заголовки и CSP читаются из vercel.json — единый источник, `node scripts/csp-hashes.mjs --check` продолжает работать.
 * Запуск: `npm start` (порт PORT, по умолчанию 3000; слушает только 127.0.0.1 — снаружи стоит nginx).
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { app as api } from './app.js';

const root = path.resolve(import.meta.dirname, '..');
const dist = path.join(root, 'dist');
if (!existsSync(path.join(dist, 'index.html'))) {
  console.error('dist/ не найден — сначала выполните `npm run build`');
  process.exit(1);
}
const rel = path.relative(process.cwd(), dist) || '.';

const SITE = 'https://www.azgroup.kz';
const OLD_HOST = /^(www\.)?az-group\.kz$/i;

type Rule = { source: string; headers: { key: string; value: string }[] };
const vercel = JSON.parse(readFileSync(path.join(root, 'vercel.json'), 'utf8')) as { headers?: Rule[] };
const headerValue = (key: string) => vercel.headers?.flatMap(r => r.headers).find(h => h.key === key)?.value;
const CSP = headerValue('Content-Security-Policy');
const SECURITY = ['X-Frame-Options', 'X-Content-Type-Options', 'Referrer-Policy', 'Permissions-Policy', 'Strict-Transport-Security']
  .flatMap(k => { const v = headerValue(k); return v ? [[k, v] as const] : []; });

const web = new Hono();

// Старый домен az-group.kz → основной сайт (301), как redirects в vercel.json.
web.use('*', async (c, next) => {
  const host = (c.req.header('host') ?? '').split(':')[0];
  if (!OLD_HOST.test(host)) return next();
  const { pathname, search } = new URL(c.req.url);
  const news = pathname.match(/^\/news\/(\d+)$/);
  let to = `${SITE}${pathname}${search}`;
  if (pathname === '/public-offer') to = `${SITE}/offer`;
  else if (pathname === '/auth') to = `${SITE}/register`;
  else if (news) to = `${SITE}/api/legacy/news/${news[1]}`;
  return c.redirect(to, 301);
});

// Старые адреса новостей и страниц.
web.get('/news/:id{[0-9]+}', c => c.redirect(`/api/legacy/news/${c.req.param('id')}`, 301));
web.get('/:lang{kk|en}/news/:id{[0-9]+}', c => c.redirect(`/api/legacy/news/${c.req.param('id')}?lang=${c.req.param('lang')}`, 301));
web.get('/public-offer', c => c.redirect('/offer', 301));
web.get('/auth', c => c.redirect('/register', 301));

// Заголовки безопасности для всего, кроме /api (у API свои — secureHeaders в server/app.ts).
web.use('*', async (c, next) => {
  await next();
  const p = c.req.path;
  if (p.startsWith('/api/')) return;
  for (const [k, v] of SECURITY) c.header(k, v);
  if (p.startsWith('/admin')) c.header('X-Robots-Tag', 'noindex, nofollow');
  const isPage = !p.startsWith('/assets/') && !/\.[A-Za-z0-9]+$/.test(p);
  if (CSP && isPage) c.header('Content-Security-Policy', CSP);
  if (p.startsWith('/assets/')) c.header('Cache-Control', 'public, max-age=31536000, immutable');
  else if (!c.res.headers.has('Cache-Control')) c.header('Cache-Control', 'public, max-age=0, must-revalidate');
});

// API; /sitemap.xml → /api/sitemap.xml
web.get('/sitemap.xml', c => api.fetch(new Request(new URL('/api/sitemap.xml', c.req.url), c.req.raw)));
web.route('/', api);

// Статика, затем SPA-переписывания: /admin* → admin.html, прочие маршруты без расширения → index.html.
web.use('*', serveStatic({ root: rel }));
const fallback = (page: string) => serveStatic({ root: rel, rewriteRequestPath: () => `/${page}` });
web.get('/admin', fallback('admin.html'));
web.get('/admin/*', fallback('admin.html'));
web.get('/*', async (c, next) => (/\.[A-Za-z0-9]+$/.test(c.req.path) ? next() : fallback('index.html')(c, next)));
web.notFound(c => c.text('Not found', 404));

const port = Number(process.env.PORT) || 3000;
serve({ fetch: web.fetch, port, hostname: process.env.HOST || '127.0.0.1' }, () => console.log(`AZ Group: http://127.0.0.1:${port}`));
