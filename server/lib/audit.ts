import type { Context } from 'hono';
import type { AppEnv } from '../types.js';
import { db, schema } from '../db/client.js';
import { invalidatePublicCache } from './cache.js';

/** Пишет действие администратора в audit_log. Ошибки журнала не ломают основной запрос. */
export async function audit(c: Context<AppEnv>, action: 'create' | 'update' | 'delete' | 'reorder' | 'login' | 'logout' | string, entity: string, entityId?: string | number | null, details?: unknown) {
  // Любое изменение контента — публичные ответы (контент, sitemap) собираются заново.
  if (!['login', 'logout', 'login_failed', 'password_change'].includes(action)) invalidatePublicCache();
  try {
    await db().insert(schema.auditLog).values({
      adminId: c.get('admin')?.id ?? null,
      action,
      entity,
      entityId: entityId == null ? null : String(entityId),
      details: details === undefined ? null : (details as object),
    });
  } catch (e) {
    console.error('audit failed', e);
  }
}
