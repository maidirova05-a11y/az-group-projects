/**
 * Middleware авторизации админки. Сигнатуры менять нельзя: на них опираются маршруты админки.
 */
import { createMiddleware } from 'hono/factory';
import { eq } from 'drizzle-orm';
import type { AppEnv } from '../types.js';
import { ApiFail } from '../lib/http.js';
import { db, schema } from '../db/client.js';
import { readSessionCookie, verifySession } from './session.js';
import { assertCsrf, toAdminDTO } from './util.js';

/** Пропускает только вошедшего активного администратора; кладёт его в c.get('admin'). Проверяет CSRF для изменяющих запросов. */
export const requireAdmin = createMiddleware<AppEnv>(async (c, next) => {
  const token = readSessionCookie(c);
  if (!token) throw new ApiFail(401, 'unauthorized', 'Требуется вход');
  const claims = await verifySession(token);
  if (!claims) throw new ApiFail(401, 'unauthorized', 'Сессия истекла, войдите снова');
  const [admin] = await db().select().from(schema.admins).where(eq(schema.admins.id, claims.sub)).limit(1);
  if (!admin || !admin.active) throw new ApiFail(401, 'unauthorized', 'Требуется вход');
  // Пароль сменили/сбросили, админа деактивировали или он вышел — старые сессии больше не действуют.
  if (claims.ver !== admin.sessionVersion) throw new ApiFail(401, 'unauthorized', 'Сессия завершена, войдите снова');
  assertCsrf(c);
  c.set('admin', toAdminDTO(admin));
  await next();
});

/** Только роль owner (управление администраторами). Ставится после requireAdmin. */
export const requireOwner = createMiddleware<AppEnv>(async (c, next) => {
  if (c.get('admin')?.role !== 'owner') throw new ApiFail(403, 'forbidden', 'Недостаточно прав');
  await next();
});
