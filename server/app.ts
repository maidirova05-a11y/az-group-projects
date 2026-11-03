/**
 * Hono-приложение API. Один и тот же объект работает локально (server/dev.ts)
 * и на Vercel (api/index.ts). Все маршруты — под /api.
 */
import { randomUUID } from 'node:crypto';
import { Hono } from 'hono';
import { sql } from 'drizzle-orm';
import { secureHeaders } from 'hono/secure-headers';
import { bodyLimit } from 'hono/body-limit';
import { createMiddleware } from 'hono/factory';
import type { AppEnv } from './types.js';
import { ApiFail, errorResponse } from './lib/http.js';
import { envProblems } from './env.js';
import { log } from './lib/logger.js';
import { db } from './db/client.js';
import { requireAdmin } from './auth/middleware.js';
import auth from './routes/auth.js';
import publicRoutes from './routes/public.js';
import leads from './routes/leads.js';
import sitemap from './routes/sitemap.js';
import registrations from './routes/registrations.js';
import legacy from './routes/legacy.js';
import adminRegistrations from './routes/admin/registrations.js';
import adminContent from './routes/admin/content.js';
import adminLeads from './routes/admin/leads.js';
import adminAdmins from './routes/admin/admins.js';
import adminStats from './routes/admin/stats.js';

export const app = new Hono<AppEnv>().basePath('/api');

/** Максимальный размер тела запроса (JSON админки и заявок намного меньше). */
export const MAX_BODY_BYTES = 256 * 1024;

/** Ответы с персональными/служебными данными не кэшируются ни браузером, ни CDN (в т.ч. ошибки 401/403). */
const noStore = createMiddleware<AppEnv>(async (c, next) => {
  await next();
  c.header('Cache-Control', 'no-store');
});

/** Идентификатор запроса (из x-request-id Vercel или новый) + одна строка access-лога на запрос. */
const requestLog = createMiddleware<AppEnv>(async (c, next) => {
  const started = Date.now();
  const id = c.req.header('x-vercel-id') ?? randomUUID();
  c.set('requestId', id);
  await next();
  c.header('X-Request-Id', id);
  log.info('request', { requestId: id, method: c.req.method, path: c.req.path, status: c.res.status, ms: Date.now() - started });
});

app.use('*', requestLog);
app.use('*', secureHeaders());
app.use('*', bodyLimit({ maxSize: MAX_BODY_BYTES, onError: () => { throw new ApiFail(413, 'payload_too_large', 'Слишком большой запрос'); } }));
// До requireAdmin и маршрутов: заголовок ставится и на ответы-ошибки.
app.use('/admin/*', noStore);
app.use('/auth/*', noStore);
app.onError(errorResponse);
app.notFound(c => c.json({ error: { code: 'not_found', message: 'Маршрут не найден' } }, 404));

// Liveness: процесс жив. Readiness: окружение настроено и база отвечает (для мониторинга и балансировщика).
app.get('/health', c => c.json({ ok: true }));
app.get('/health/ready', async c => {
  c.header('Cache-Control', 'no-store');
  const problems = envProblems();
  if (problems.length) return c.json({ ok: false, checks: { env: false, db: false } }, 503);
  try {
    await db().execute(sql`select 1`);
    return c.json({ ok: true, checks: { env: true, db: true } });
  } catch (e) {
    log.error('readiness: db check failed', e);
    return c.json({ ok: false, checks: { env: true, db: false } }, 503);
  }
});

// Публичная часть
app.route('/public', publicRoutes); // GET /api/public/content
app.route('/leads', leads);         // POST /api/leads
app.route('/registrations', registrations); // POST /api/registrations
app.route('/legacy', legacy);       // GET /api/legacy/news/:id — 301 со старых адресов az-group.kz
app.route('/', sitemap);            // GET /api/sitemap.xml (на Vercel — /sitemap.xml)
app.route('/auth', auth);           // POST /login, POST /logout, GET /me, POST /password

// Админка — всё за requireAdmin
app.use('/admin/*', requireAdmin);
app.route('/admin', adminContent);  // programs, events, projects, news, partners, faqs, settings, reorder
app.route('/admin/leads', adminLeads);
app.route('/admin/registrations', adminRegistrations);
app.route('/admin/admins', adminAdmins);
app.route('/admin/stats', adminStats);

export default app;
