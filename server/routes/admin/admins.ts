/**
 * Управление администраторами (только owner). Монтируется на /api/admin/admins.
 * Защита: нельзя удалить/деактивировать/понизить себя и последнего активного owner; email уникален.
 */
import { Hono } from 'hono';
import { hashPassword } from '../../auth/password.js';
import { setSessionCookie, signSession } from '../../auth/session.js';
import { and, asc, eq, ne, sql } from 'drizzle-orm';
import type { AppEnv } from '../../types.js';
import { db, schema } from '../../db/client.js';
import { requireOwner } from '../../auth/middleware.js';
import { ApiFail, body, idParam } from '../../lib/http.js';
import { audit } from '../../lib/audit.js';
import { adminInput, type AdminDTO } from '../../../shared/schemas.js';

const { admins } = schema;
const r = new Hono<AppEnv>();
r.use('*', requireOwner);

const cols = { id: admins.id, email: admins.email, name: admins.name, role: admins.role, active: admins.active, lastLoginAt: admins.lastLoginAt };
type Row = { id: number; email: string; name: string; role: AdminDTO['role']; active: boolean; lastLoginAt: Date | null };
const toDTO = (a: Row): AdminDTO => ({ ...a, lastLoginAt: a.lastLoginAt ? a.lastLoginAt.toISOString() : null });

const emailTaken = () => new ApiFail(409, 'email_taken', 'Администратор с таким e-mail уже есть', { email: 'E-mail уже используется' });
const isUniqueViolation = (e: unknown) => {
  const err = e as { code?: string; cause?: { code?: string } };
  return err?.code === '23505' || err?.cause?.code === '23505';
};

type Tx = Parameters<Parameters<ReturnType<typeof db>['transaction']>[0]>[0];

/** Число активных owner, кроме указанного id (строки блокируются до конца транзакции). */
async function otherActiveOwners(tx: Tx, exceptId: number) {
  const rows = await tx.select({ id: admins.id }).from(admins)
    .where(and(eq(admins.role, 'owner'), eq(admins.active, true), ne(admins.id, exceptId))).for('update');
  return rows.length;
}

async function ensureEmailFree(tx: Tx, email: string, exceptId?: number) {
  const [hit] = await tx.select({ id: admins.id }).from(admins)
    .where(exceptId ? and(sql`lower(${admins.email}) = ${email}`, ne(admins.id, exceptId)) : sql`lower(${admins.email}) = ${email}`).limit(1);
  if (hit) throw emailTaken();
}

r.get('/', async c => {
  const rows = await db().select(cols).from(admins).orderBy(asc(admins.id));
  return c.json(rows.map(toDTO));
});

r.post('/', async c => {
  const input = await body(c, adminInput);
  if (!input.password) throw new ApiFail(422, 'validation', 'Проверьте поля формы', { password: 'Пароль обязателен' });
  const email = input.email.trim().toLowerCase();
  const passwordHash = await hashPassword(input.password);
  try {
    const row = await db().transaction(async tx => {
      await ensureEmailFree(tx, email);
      const [created] = await tx.insert(admins).values({ email, name: input.name, role: input.role, active: input.active, passwordHash }).returning(cols);
      return created;
    });
    await audit(c, 'create', 'admin', row.id, { email, role: row.role, active: row.active });
    return c.json(toDTO(row), 201);
  } catch (e) {
    if (isUniqueViolation(e)) throw emailTaken();
    throw e;
  }
});

r.patch('/:id', async c => {
  const id = idParam(c);
  const me = c.get('admin');
  const input = await body(c, adminInput.partial());
  // zod v4 заполняет default-поля даже в .partial(): берём только ключи, реально присланные клиентом.
  const raw: unknown = await c.req.json().catch(() => ({}));
  const sent = new Set(raw && typeof raw === 'object' ? Object.keys(raw) : []);
  const changes: Partial<typeof admins.$inferInsert> = {};
  if (sent.has('email') && input.email !== undefined) changes.email = input.email.trim().toLowerCase();
  if (sent.has('name') && input.name !== undefined) changes.name = input.name;
  if (sent.has('role') && input.role !== undefined) changes.role = input.role;
  if (sent.has('active') && input.active !== undefined) changes.active = input.active;
  if (sent.has('password') && input.password) changes.passwordHash = await hashPassword(input.password);

  try {
    const row = await db().transaction(async tx => {
      const [cur] = await tx.select(cols).from(admins).where(eq(admins.id, id)).for('update');
      if (!cur) throw new ApiFail(404, 'not_found', 'Администратор не найден');
      if (id === me.id) {
        if (changes.active === false) throw new ApiFail(409, 'self_deactivate', 'Нельзя деактивировать себя');
        if (changes.role && changes.role !== cur.role && cur.role === 'owner') throw new ApiFail(409, 'self_demote', 'Нельзя понизить себя');
      }
      const losesOwner = cur.role === 'owner' && cur.active && (changes.role === 'editor' || changes.active === false);
      if (losesOwner && (await otherActiveOwners(tx, id)) === 0) throw new ApiFail(409, 'last_owner', 'Нельзя понизить или деактивировать последнего владельца');
      if (changes.email && changes.email !== cur.email) await ensureEmailFree(tx, changes.email, id);
      if (!Object.keys(changes).length) return cur;
      // Сброс пароля или деактивация — все сессии этого админа завершаются (session_version + 1).
      const revoke = changes.passwordHash !== undefined || changes.active === false;
      const [updated] = await tx.update(admins)
        .set({ ...changes, ...(revoke && { sessionVersion: sql`${admins.sessionVersion} + 1` }), updatedAt: new Date() })
        .where(eq(admins.id, id)).returning(cols);
      return updated;
    });
    const { passwordHash, ...logged } = changes;
    if (id === me.id && passwordHash) {
      // Owner сбросил пароль себе через этот экран: остаёмся в системе на текущем устройстве.
      const [fresh] = await db().select().from(admins).where(eq(admins.id, id)).limit(1);
      if (fresh) setSessionCookie(c, await signSession(fresh));
    }
    await audit(c, 'update', 'admin', id, { ...logged, ...(passwordHash && { passwordReset: true }) });
    return c.json(toDTO(row));
  } catch (e) {
    if (isUniqueViolation(e)) throw emailTaken();
    throw e;
  }
});

r.delete('/:id', async c => {
  const id = idParam(c);
  if (id === c.get('admin').id) throw new ApiFail(409, 'self_delete', 'Нельзя удалить себя');
  const row = await db().transaction(async tx => {
    const [cur] = await tx.select(cols).from(admins).where(eq(admins.id, id)).for('update');
    if (!cur) throw new ApiFail(404, 'not_found', 'Администратор не найден');
    if (cur.role === 'owner' && cur.active && (await otherActiveOwners(tx, id)) === 0) throw new ApiFail(409, 'last_owner', 'Нельзя удалить последнего владельца');
    await tx.delete(admins).where(eq(admins.id, id));
    return cur;
  });
  await audit(c, 'delete', 'admin', id, { email: row.email });
  return c.json({ ok: true });
});

export default r;
