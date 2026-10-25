/**
 * Регистрации на мероприятия: список с фильтрами, смена статуса/заметки, удаление, выгрузка в CSV.
 * Монтируется на /api/admin/registrations (requireAdmin стоит в app.ts). ipHash наружу не отдаём.
 * Удаление и выгрузка (персональные данные участников) — только владелец.
 */
import { Hono } from 'hono';
import { and, count, desc, eq, ilike, or, type SQL } from 'drizzle-orm';
import type { AppEnv } from '../../types.js';
import { db, schema } from '../../db/client.js';
import { ApiFail, body, idParam, notFound } from '../../lib/http.js';
import { audit } from '../../lib/audit.js';
import { requireOwner } from '../../auth/middleware.js';
import { REGISTRATION_STATUSES, registrationUpdate, type RegistrationDTO } from '../../../shared/schemas.js';
import { LANGS, type Lang } from '../../../shared/i18n.js';
import { csvCell, leadSource } from './leads.js';

const { registrations: t } = schema;
const r = new Hono<AppEnv>();

const { ipHash: _ip, ...cols } = {
  id: t.id, programId: t.programId, eventId: t.eventId, programName: t.programName, eventLabel: t.eventLabel, place: t.place,
  eventDate: t.eventDate, participantName: t.participantName, grade: t.grade, school: t.school, city: t.city, subjects: t.subjects,
  contactName: t.contactName, phone: t.phone, email: t.email, comment: t.comment, amount: t.amount, lang: t.lang,
  referrer: t.referrer, utm: t.utm, status: t.status, note: t.note, createdAt: t.createdAt, updatedAt: t.updatedAt, ipHash: t.ipHash,
};
type Row = Omit<typeof t.$inferSelect, 'ipHash'>;

const toDTO = (x: Row): RegistrationDTO => ({
  ...x,
  grade: x.grade as RegistrationDTO['grade'],
  lang: (LANGS as readonly string[]).includes(x.lang ?? '') ? (x.lang as Lang) : null,
  utm: x.utm ?? null,
  createdAt: x.createdAt.toISOString(), updatedAt: x.updatedAt.toISOString(),
});

/** WHERE из ?status=&program=&q=. */
function filters(status?: string, program?: string, q?: string): SQL | undefined {
  const conds: SQL[] = [];
  if (status) {
    if (!(REGISTRATION_STATUSES as readonly string[]).includes(status)) throw new ApiFail(400, 'bad_status', 'Некорректный статус');
    conds.push(eq(t.status, status as RegistrationDTO['status']));
  }
  if (program) {
    const id = Number(program);
    if (!Number.isInteger(id) || id <= 0) throw new ApiFail(400, 'bad_program', 'Некорректная программа');
    conds.push(eq(t.programId, id));
  }
  const term = q?.trim();
  if (term) {
    const p = `%${term.replace(/[\\%_]/g, m => '\\' + m)}%`;
    conds.push(or(ilike(t.participantName, p), ilike(t.phone, p), ilike(t.school, p), ilike(t.city, p),
      ilike(t.contactName, p), ilike(t.email, p), ilike(t.programName, p))!);
  }
  return conds.length ? and(...conds) : undefined;
}

const posInt = (v: string | undefined, def: number, max = Number.MAX_SAFE_INTEGER) => {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? Math.min(n, max) : def;
};

r.get('/', async c => {
  const where = filters(c.req.query('status'), c.req.query('program'), c.req.query('q'));
  const page = posInt(c.req.query('page'), 1);
  const limit = posInt(c.req.query('limit'), 50, 200);
  const [items, [{ total }]] = await Promise.all([
    db().select(cols).from(t).where(where).orderBy(desc(t.createdAt), desc(t.id)).limit(limit).offset((page - 1) * limit),
    db().select({ total: count() }).from(t).where(where),
  ]);
  return c.json({ items: items.map(toDTO), total });
});

const almaty = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'Asia/Almaty', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
});
const almatyDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Almaty', year: 'numeric', month: '2-digit', day: '2-digit' });
const STATUS_RU: Record<string, string> = { new: 'новая', confirmed: 'подтверждена', paid: 'оплачена', cancelled: 'отменена', spam: 'спам' };
const gradeRu = (g: string) => (g === 'teacher' ? 'педагог' : g === 'other' ? 'другое' : `${g} класс`);

r.get('/export.csv', requireOwner, async c => {
  const where = filters(c.req.query('status'), c.req.query('program'), c.req.query('q'));
  const rows = await db().select(cols).from(t).where(where).orderBy(desc(t.createdAt), desc(t.id));
  const header = ['id', 'дата', 'программа', 'дата/этап', 'место', 'участник', 'класс', 'школа', 'город', 'предметы',
    'контактное лицо', 'телефон', 'e-mail', 'стоимость', 'комментарий', 'язык', 'источник', 'статус', 'заметка'];
  const lines = [header.join(';')];
  for (const x of rows) {
    lines.push([
      x.id, almaty.format(x.createdAt), x.programName, x.eventLabel, x.place, x.participantName, gradeRu(x.grade), x.school, x.city,
      x.subjects, x.contactName, x.phone, x.email, x.amount, x.comment, x.lang, leadSource({ utm: x.utm ?? null, referrer: x.referrer }),
      STATUS_RU[x.status] ?? x.status, x.note,
    ].map(csvCell).join(';'));
  }
  return c.body('﻿' + lines.join('\r\n') + '\r\n', 200, {
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': `attachment; filename="registrations-${almatyDate.format(new Date())}.csv"`,
    'Cache-Control': 'no-store',
  });
});

r.patch('/:id', async c => {
  const id = idParam(c);
  const patch = await body(c, registrationUpdate);
  const [row] = await db().update(t).set({ ...patch, updatedAt: new Date() }).where(eq(t.id, id)).returning(cols);
  if (!row) throw notFound('Регистрация');
  await audit(c, 'update', 'registration', id, patch);
  return c.json(toDTO(row));
});

r.delete('/:id', requireOwner, async c => {
  const id = idParam(c);
  const [row] = await db().delete(t).where(eq(t.id, id)).returning({ id: t.id });
  if (!row) throw notFound('Регистрация');
  await audit(c, 'delete', 'registration', id);
  return c.json({ ok: true });
});

export default r;
