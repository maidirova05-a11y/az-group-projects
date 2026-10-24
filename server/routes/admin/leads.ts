/**
 * Заявки с сайта: список с фильтрами, смена статуса/заметки, удаление, выгрузка в CSV.
 * Монтируется на /api/admin/leads (requireAdmin стоит в app.ts). ipHash наружу не отдаём.
 */
import { Hono } from 'hono';
import { and, count, desc, eq, ilike, or, type SQL } from 'drizzle-orm';
import type { AppEnv } from '../../types.js';
import { db, schema } from '../../db/client.js';
import { ApiFail, body, idParam, notFound } from '../../lib/http.js';
import { audit } from '../../lib/audit.js';
import { requireOwner } from '../../auth/middleware.js';
import { LEAD_STATUSES, leadUpdate, type LeadDTO, type LeadUtm } from '../../../shared/schemas.js';
import { LANGS, type Lang } from '../../../shared/i18n.js';

const { leads } = schema;
const r = new Hono<AppEnv>();

/** Колонки без ipHash. */
const cols = {
  id: leads.id, name: leads.name, phone: leads.phone, topic: leads.topic, message: leads.message,
  page: leads.page, status: leads.status, note: leads.note, lang: leads.lang, referrer: leads.referrer, utm: leads.utm,
  createdAt: leads.createdAt, updatedAt: leads.updatedAt,
};
type Row = Omit<typeof leads.$inferSelect, 'ipHash'>;

const toDTO = (l: Row): LeadDTO => ({
  ...l, lang: (LANGS as readonly string[]).includes(l.lang ?? '') ? (l.lang as Lang) : null, utm: l.utm ?? null,
  createdAt: l.createdAt.toISOString(), updatedAt: l.updatedAt.toISOString(),
});

/** Источник заявки одной строкой для CSV: utm_source / medium / campaign, иначе хост перехода. */
export const leadSource = (l: { utm: LeadUtm | null; referrer: string | null }) => {
  const u = l.utm;
  if (u && (u.source || u.medium || u.campaign)) return [u.source, u.medium, u.campaign].filter(Boolean).join(' / ');
  return l.referrer ?? '';
};

/** Условие WHERE из ?status=&q=. */
function filters(status?: string, q?: string): SQL | undefined {
  const conds: SQL[] = [];
  if (status) {
    if (!(LEAD_STATUSES as readonly string[]).includes(status)) throw new ApiFail(400, 'bad_status', 'Некорректный статус');
    conds.push(eq(leads.status, status as (typeof LEAD_STATUSES)[number]));
  }
  const term = q?.trim();
  if (term) {
    const p = `%${term.replace(/[\\%_]/g, m => '\\' + m)}%`;
    conds.push(or(ilike(leads.name, p), ilike(leads.phone, p), ilike(leads.topic, p), ilike(leads.message, p))!);
  }
  return conds.length ? and(...conds) : undefined;
}

const posInt = (v: string | undefined, def: number, max = Number.MAX_SAFE_INTEGER) => {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? Math.min(n, max) : def;
};

r.get('/', async c => {
  const where = filters(c.req.query('status'), c.req.query('q'));
  const page = posInt(c.req.query('page'), 1);
  const limit = posInt(c.req.query('limit'), 50, 200);
  const [items, [{ total }]] = await Promise.all([
    db().select(cols).from(leads).where(where).orderBy(desc(leads.createdAt), desc(leads.id)).limit(limit).offset((page - 1) * limit),
    db().select({ total: count() }).from(leads).where(where),
  ]);
  return c.json({ items: items.map(toDTO), total });
});

// ---------- CSV ----------
const almaty = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'Asia/Almaty', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
});
const almatyDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Almaty', year: 'numeric', month: '2-digit', day: '2-digit' });

const STATUS_RU: Record<string, string> = { new: 'новая', in_progress: 'в работе', done: 'обработана', spam: 'спам' };

/** Экранирование ячейки CSV + защита от формул (=, +, -, @, а также таб/CR в начале). */
export function csvCell(v: unknown): string {
  let s = v == null ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return /[";\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// Выгрузка всех заявок (персональные данные) и удаление — только владелец.
r.get('/export.csv', requireOwner, async c => {
  const where = filters(c.req.query('status'), c.req.query('q'));
  const rows = await db().select(cols).from(leads).where(where).orderBy(desc(leads.createdAt), desc(leads.id));
  const header = ['id', 'дата', 'имя', 'телефон', 'тема', 'сообщение', 'страница', 'язык', 'источник', 'utm_term', 'статус', 'заметка'];
  const lines = [header.join(';')];
  for (const l of rows) {
    lines.push([
      l.id, almaty.format(l.createdAt), l.name, l.phone, l.topic, l.message, l.page, l.lang, leadSource(l), l.utm?.term,
      STATUS_RU[l.status] ?? l.status, l.note,
    ].map(csvCell).join(';'));
  }
  const csv = '﻿' + lines.join('\r\n') + '\r\n';
  return c.body(csv, 200, {
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': `attachment; filename="leads-${almatyDate.format(new Date())}.csv"`,
    'Cache-Control': 'no-store',
  });
});

r.patch('/:id', async c => {
  const id = idParam(c);
  const patch = await body(c, leadUpdate);
  const [row] = await db().update(leads).set({ ...patch, updatedAt: new Date() }).where(eq(leads.id, id)).returning(cols);
  if (!row) throw notFound('Заявка');
  await audit(c, 'update', 'lead', id, patch);
  return c.json(toDTO(row));
});

r.delete('/:id', requireOwner, async c => {
  const id = idParam(c);
  const [row] = await db().delete(leads).where(eq(leads.id, id)).returning({ id: leads.id });
  if (!row) throw notFound('Заявка');
  await audit(c, 'delete', 'lead', id);
  return c.json({ ok: true });
});

export default r;
