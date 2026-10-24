/** /api/auth — вход, выход, текущий админ, смена пароля. */
import { Hono } from 'hono';
import { and, eq, gt, lt, sql } from 'drizzle-orm';
import type { AppEnv } from '../types.js';
import { ApiFail, body } from '../lib/http.js';
import { audit } from '../lib/audit.js';
import { db, schema } from '../db/client.js';
import { loginInput, passwordChange } from '../../shared/schemas.js';
import { requireAdmin } from '../auth/middleware.js';
import { dummyHash, hashPassword, verifyPassword } from '../auth/password.js';
import { clearSessionCookie, readSessionCookie, setSessionCookie, signSession, verifySession } from '../auth/session.js';
import { assertCsrf, clientIp, ipHash, toAdminDTO } from '../auth/util.js';

/** Лимит на пару e-mail + IP: 10 неудач за 15 минут. */
const MAX_FAILS = 10;
const WINDOW_MS = 15 * 60 * 1000;
/** Лимит на e-mail независимо от IP (распределённый перебор): 30 неудач за час. */
export const MAX_EMAIL_FAILS = 30;
const EMAIL_WINDOW_MS = 60 * 60 * 1000;
/** Записи login_failed старше суток не нужны лимитам: ~1% неудачных входов чистит их. */
const PRUNE_AFTER_MS = 24 * 60 * 60 * 1000;
const PRUNE_PROBABILITY = 0.01;

/** Запасной счётчик в памяти — если журнал в БД недоступен. Ключи: `email|ipHash` и `email|*`. */
const memFails = new Map<string, number[]>();
const memCount = (k: string, sinceMs: number) => (memFails.get(k) ?? []).filter(t => t > sinceMs).length;

async function recentFailures(email: string, ip: string): Promise<{ pair: number; email: number }> {
  const now = Date.now();
  const since = new Date(now - WINDOW_MS);
  const emailSince = new Date(now - EMAIL_WINDOW_MS);
  try {
    // Использует частичный индекс audit_login_failed_email_idx ((details->>'email'), created_at) WHERE action = 'login_failed'.
    const [row] = await db()
      .select({
        email: sql<number>`count(*)::int`,
        pair: sql<number>`(count(*) filter (where ${schema.auditLog.createdAt} > ${since.toISOString()}::timestamptz and ${schema.auditLog.details}->>'ipHash' = ${ip}))::int`,
      })
      .from(schema.auditLog)
      .where(and(
        eq(schema.auditLog.action, 'login_failed'),
        gt(schema.auditLog.createdAt, emailSince),
        sql`${schema.auditLog.details}->>'email' = ${email}`,
      ));
    return { pair: row?.pair ?? 0, email: row?.email ?? 0 };
  } catch (e) {
    console.error('login rate check failed, using memory fallback', e);
    return { pair: memCount(`${email}|${ip}`, since.getTime()), email: memCount(`${email}|*`, emailSince.getTime()) };
  }
}

function rememberFailure(email: string, ip: string) {
  const cutoff = Date.now() - EMAIL_WINDOW_MS;
  for (const k of [`${email}|${ip}`, `${email}|*`]) {
    const list = (memFails.get(k) ?? []).filter(t => t > cutoff);
    list.push(Date.now());
    memFails.set(k, list);
  }
  if (memFails.size > 10_000) memFails.clear();
}

/** Изредка удаляет старые login_failed, чтобы журнал не рос от перебора. Ошибки не мешают ответу. */
async function maybePruneFailures() {
  if (Math.random() >= PRUNE_PROBABILITY) return;
  try {
    await db().delete(schema.auditLog).where(and(
      eq(schema.auditLog.action, 'login_failed'),
      lt(schema.auditLog.createdAt, new Date(Date.now() - PRUNE_AFTER_MS)),
    ));
  } catch (e) {
    console.error('login_failed prune failed', e);
  }
}

const r = new Hono<AppEnv>();

r.post('/login', async c => {
  // Админка шлёт X-Requested-With на каждом запросе; без него — не наш клиент (login CSRF).
  assertCsrf(c);
  const input = await body(c, loginInput);
  const email = input.email.trim().toLowerCase();
  const ip = ipHash(clientIp(c));

  const fails = await recentFailures(email, ip);
  if (fails.pair >= MAX_FAILS) {
    throw new ApiFail(429, 'too_many_attempts', 'Слишком много попыток входа. Попробуйте через 15 минут');
  }
  if (fails.email >= MAX_EMAIL_FAILS) {
    throw new ApiFail(429, 'too_many_attempts', 'Слишком много попыток входа для этого e-mail. Попробуйте через час');
  }

  const [admin] = await db().select().from(schema.admins)
    .where(sql`lower(${schema.admins.email}) = ${email}`).limit(1);

  // bcrypt выполняется всегда — время ответа не зависит от того, есть ли такой e-mail.
  const ok = await verifyPassword(input.password, admin?.passwordHash ?? await dummyHash());

  if (!admin || !ok || !admin.active) {
    rememberFailure(email, ip);
    await audit(c, 'login_failed', 'admin', admin?.id ?? null, { email, ipHash: ip });
    await maybePruneFailures();
    throw new ApiFail(401, 'invalid_credentials', 'Неверный e-mail или пароль');
  }

  const [updated] = await db().update(schema.admins)
    .set({ lastLoginAt: new Date() })
    .where(eq(schema.admins.id, admin.id))
    .returning();
  const row = updated ?? admin;
  const dto = toAdminDTO(row);
  c.set('admin', dto);
  setSessionCookie(c, await signSession(row));
  await audit(c, 'login', 'admin', dto.id, { ipHash: ip });
  return c.json(dto);
});

/**
 * Выход = «выйти везде»: session_version увеличивается, и все cookie этого админа (на любых устройствах)
 * перестают действовать. Версию меняем только по действующему токену (с актуальной ver).
 */
r.post('/logout', async c => {
  assertCsrf(c);
  const token = readSessionCookie(c);
  const claims = token ? await verifySession(token) : null;
  if (claims) {
    const [admin] = await db().update(schema.admins)
      .set({ sessionVersion: sql`${schema.admins.sessionVersion} + 1` })
      .where(and(eq(schema.admins.id, claims.sub), eq(schema.admins.sessionVersion, claims.ver)))
      .returning();
    if (admin) {
      c.set('admin', toAdminDTO(admin));
      await audit(c, 'logout', 'admin', admin.id);
    }
  }
  clearSessionCookie(c);
  return c.json({ ok: true });
});

r.get('/me', requireAdmin, c => c.json(c.get('admin')));

r.post('/password', requireAdmin, async c => {
  const input = await body(c, passwordChange);
  const me = c.get('admin');
  const [admin] = await db().select().from(schema.admins).where(eq(schema.admins.id, me.id)).limit(1);
  if (!admin || !(await verifyPassword(input.current, admin.passwordHash))) {
    throw new ApiFail(422, 'validation', 'Текущий пароль неверный', { current: 'Текущий пароль неверный' });
  }
  if (input.current === input.next) {
    throw new ApiFail(422, 'validation', 'Новый пароль совпадает с текущим', { next: 'Новый пароль совпадает с текущим' });
  }
  // Новая версия сессий: все остальные устройства разлогиниваются, текущему выдаём свежий cookie.
  const [updated] = await db().update(schema.admins)
    .set({ passwordHash: await hashPassword(input.next), sessionVersion: sql`${schema.admins.sessionVersion} + 1`, updatedAt: new Date() })
    .where(eq(schema.admins.id, admin.id))
    .returning();
  if (updated) setSessionCookie(c, await signSession(updated));
  await audit(c, 'password_change', 'admin', admin.id);
  return c.json({ ok: true });
});

export default r;
