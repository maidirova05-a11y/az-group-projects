/** Вспомогательные функции авторизации: DTO, CSRF (IP — в server/lib/ratelimit.ts). */
import type { Context } from 'hono';
import { ApiFail } from '../lib/http.js';
import type { AdminDTO } from '../../shared/schemas.js';
import type { schema } from '../db/client.js';

type AdminRow = typeof schema.admins.$inferSelect;

export const toAdminDTO = (a: AdminRow): AdminDTO => ({
  id: a.id,
  email: a.email,
  name: a.name,
  role: a.role,
  active: a.active,
  lastLoginAt: a.lastLoginAt ? a.lastLoginAt.toISOString() : null,
});

export const CSRF_HEADER = 'X-Requested-With';
export const CSRF_VALUE = 'az-admin';

/** Для изменяющих методов требует заголовок X-Requested-With: az-admin. */
export function assertCsrf(c: Context) {
  const m = c.req.method;
  if (m === 'GET' || m === 'HEAD' || m === 'OPTIONS') return;
  if (c.req.header(CSRF_HEADER) !== CSRF_VALUE) throw new ApiFail(403, 'csrf', 'Запрос отклонён (CSRF)');
}

/** IP клиента и его хэш — единая реализация в server/lib/ratelimit.ts. */
export { clientIp, ipHash } from '../lib/ratelimit.js';
