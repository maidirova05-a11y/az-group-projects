/**
 * Hono-приложение API. Один и тот же объект работает локально (server/dev.ts)
 * и на Vercel (api/index.ts). Все маршруты — под /api.
 */
import { Hono } from 'hono';
import { secureHeaders } from 'hono/secure-headers';
import { bodyLimit } from 'hono/body-limit';
import { createMiddleware } from 'hono/factory';
import type { AppEnv } from './types.js';
import { ApiFail, errorResponse } from './lib/http.js';
import { requireAdmin } from './auth/middleware.js';
import auth from './routes/auth.js';
import publicRoutes from './routes/public.js';
import leads from './routes/leads.js';
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

app.use('*', secureHeaders());
app.use('*', bodyLimit({ maxSize: MAX_BODY_BYTES, onError: () => { throw new ApiFail(413, 'payload_too_large', 'Слишком большой запрос'); } }));
// До requireAdmin и маршрутов: заголовок ставится и на ответы-ошибки.
app.use('/admin/*', noStore);
app.use('/auth/*', noStore);
app.onError(errorResponse);
app.notFound(c => c.json({ error: { code: 'not_found', message: 'Маршрут не найден' } }, 404));

app.get('/health', c => c.json({ ok: true }));

// Публичная часть
app.route('/public', publicRoutes); // GET /api/public/content
app.route('/leads', leads);         // POST /api/leads
app.route('/auth', auth);           // POST /login, POST /logout, GET /me, POST /password

// Админка — всё за requireAdmin
app.use('/admin/*', requireAdmin);
app.route('/admin', adminContent);  // programs, events, projects, news, partners, faqs, settings, reorder
app.route('/admin/leads', adminLeads);
app.route('/admin/admins', adminAdmins);
app.route('/admin/stats', adminStats);

export default app;
