/**
 * Админ-API контента: программы и события, проекты, новости, партнёры, FAQ,
 * порядок (reorder) и настройки. requireAdmin уже стоит в app.ts.
 */
import { Hono, type Context } from 'hono';
import { asc, desc, eq, inArray, sql, type SQL } from 'drizzle-orm';
import { z } from 'zod';
import type { AppEnv } from '../../types.js';
import { db, schema } from '../../db/client.js';
import { ApiFail, assertJson, body, idParam, notFound } from '../../lib/http.js';
import { audit } from '../../lib/audit.js';
import { DEFAULT_SETTINGS } from '../public.js';
import {
  SETTINGS, SETTING_TRANSLATIONS, eventInput, faqInput, newsInput, partnerInput, programInput, projectInput, reorderInput,
  type SettingKey,
} from '../../../shared/schemas.js';

const r = new Hono<AppEnv>();
type C = Context<AppEnv>;

// ---------- Помощники ----------

/** Строка БД → DTO: timestamp-поля в ISO-строки. */
function dto<T extends Record<string, unknown>>(row: T): T {
  const out: Record<string, unknown> = { ...row };
  for (const [k, v] of Object.entries(out)) if (v instanceof Date) out[k] = v.toISOString();
  return out as T;
}

/** Нарушение уникальности (слаг) → 409. Drizzle может обернуть ошибку postgres в cause. */
function isUniqueViolation(e: unknown): boolean {
  const err = e as { code?: string; cause?: { code?: string } } | null;
  return err?.code === '23505' || err?.cause?.code === '23505';
}
async function guard<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (isUniqueViolation(e)) throw new ApiFail(409, 'conflict', 'Такой слаг уже есть');
    throw e;
  }
}

/**
 * Тело PATCH: валидируем `.partial()`, но оставляем только присланные ключи —
 * иначе zod подставит значения по умолчанию (sort=0, published=true) и затрёт данные.
 */
async function patchBody<T extends z.ZodObject>(c: C, s: T): Promise<Partial<z.infer<T>>> {
  const parsed = (await body(c, s.partial())) as Record<string, unknown>;
  const raw = (await c.req.json()) as unknown;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new ApiFail(422, 'validation', 'Ожидался объект');
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(raw)) if (k in s.shape && k in parsed) out[k] = parsed[k];
  return out as Partial<z.infer<T>>;
}

/**
 * Если в PATCH пришли translations — сливаем по языкам на стороне БД (jsonb `||` верхнего уровня):
 * присланный язык заменяется целиком, остальные сохраняются ({ kk } не стирает en).
 */
function withTranslationsMerge<D extends { translations?: unknown }>(column: unknown, data: D) {
  if (data.translations === undefined) return data;
  const clean = JSON.parse(JSON.stringify(data.translations)) as Record<string, unknown>;
  return { ...data, translations: sql`coalesce(${column}, '{}'::jsonb) || ${JSON.stringify(clean)}::jsonb` };
}

// ---------- Простые ресурсы: projects, news, partners, faqs ----------

type SimpleTable = typeof schema.projects | typeof schema.news | typeof schema.partners | typeof schema.faqs;

function crud(path: string, entity: string, anyTable: SimpleTable, input: z.ZodObject, order: () => SQL[]) {
  // Все четыре таблицы имеют id/updatedAt; для типизации запросов приводим к одной из них,
  // конкретные колонки проверены zod-схемой input.
  const table = anyTable as typeof schema.faqs;

  r.get(`/${path}`, async c => {
    const rows = await db().select().from(table).orderBy(...order());
    return c.json(rows.map(row => dto(row as Record<string, unknown>)));
  });
  r.post(`/${path}`, async c => {
    const data = await body(c, input);
    const [row] = await guard(() => db().insert(table).values(data as never).returning());
    await audit(c, 'create', entity, (row as { id: number }).id);
    return c.json(dto(row as Record<string, unknown>), 201);
  });
  r.patch(`/${path}/:id`, async c => {
    const id = idParam(c);
    const data = withTranslationsMerge(table.translations, await patchBody(c, input) as { translations?: unknown });
    const [row] = await guard(() =>
      db().update(table).set({ ...data, updatedAt: new Date() } as never).where(eq(table.id, id)).returning());
    if (!row) throw notFound();
    await audit(c, 'update', entity, id);
    return c.json(dto(row as Record<string, unknown>));
  });
  r.delete(`/${path}/:id`, async c => {
    const id = idParam(c);
    const [row] = await db().delete(table).where(eq(table.id, id)).returning({ id: table.id });
    if (!row) throw notFound();
    await audit(c, 'delete', entity, id);
    return c.json({ ok: true });
  });
}

const { projects, news, partners, faqs, programs, events, settings } = schema;
crud('projects', 'project', projects, projectInput, () => [asc(projects.sort), asc(projects.id)]);
crud('news', 'news', news, newsInput, () => [desc(news.date), desc(news.id)]);
crud('partners', 'partner', partners, partnerInput, () => [asc(partners.sort), asc(partners.id)]);
crud('faqs', 'faq', faqs, faqInput, () => [asc(faqs.sort), asc(faqs.id)]);

// ---------- Программы и события ----------

type EventRow = typeof events.$inferSelect;
type ProgramRow = typeof programs.$inferSelect;
const eventOrder = [sql`${events.startDate} asc nulls last`, asc(events.sort), asc(events.id)];

const programDto = (p: ProgramRow, evs: EventRow[]) => ({ ...dto(p), events: evs.map(e => dto(e)) });

async function loadProgram(id: number) {
  const [p] = await db().select().from(programs).where(eq(programs.id, id));
  if (!p) throw notFound('Программа');
  const evs = await db().select().from(events).where(eq(events.programId, id)).orderBy(...eventOrder);
  return programDto(p, evs);
}

r.get('/programs', async c => {
  const ps = await db().select().from(programs).orderBy(asc(programs.sort), asc(programs.id));
  const evs = await db().select().from(events).orderBy(...eventOrder);
  const byProgram = new Map<number, EventRow[]>();
  for (const e of evs) {
    const list = byProgram.get(e.programId) ?? [];
    list.push(e);
    byProgram.set(e.programId, list);
  }
  return c.json(ps.map(p => programDto(p, byProgram.get(p.id) ?? [])));
});

r.get('/programs/:id', async c => c.json(await loadProgram(idParam(c))));

r.post('/programs', async c => {
  const data = await body(c, programInput);
  const [row] = await guard(() => db().insert(programs).values(data).returning());
  await audit(c, 'create', 'program', row.id);
  return c.json(programDto(row, []), 201);
});

r.patch('/programs/:id', async c => {
  const id = idParam(c);
  const data = withTranslationsMerge(programs.translations, await patchBody(c, programInput));
  const [row] = await guard(() =>
    db().update(programs).set({ ...data, updatedAt: new Date() } as never).where(eq(programs.id, id)).returning({ id: programs.id }));
  if (!row) throw notFound('Программа');
  await audit(c, 'update', 'program', id);
  return c.json(await loadProgram(id));
});

r.delete('/programs/:id', async c => {
  const id = idParam(c);
  const [row] = await db().delete(programs).where(eq(programs.id, id)).returning({ id: programs.id });
  if (!row) throw notFound('Программа');
  await audit(c, 'delete', 'program', id);
  return c.json({ ok: true });
});

r.post('/programs/:id/events', async c => {
  const programId = idParam(c);
  const data = await body(c, eventInput);
  const [p] = await db().select({ id: programs.id }).from(programs).where(eq(programs.id, programId));
  if (!p) throw notFound('Программа');
  const [row] = await db().insert(events).values({ ...data, programId }).returning();
  await audit(c, 'create', 'event', row.id);
  return c.json(dto(row), 201);
});

/**
 * eventInput содержит refine, а .partial() в zod v4 на таких схемах бросает исключение.
 * Поэтому частичное тело проверяем схемой без refine, а объединённый результат — полной eventInput.
 */
const eventFields = z.object(eventInput.shape);
r.patch('/events/:id', async c => {
  const id = idParam(c);
  const patch = await patchBody(c, eventFields);
  const [cur] = await db().select().from(events).where(eq(events.id, id));
  if (!cur) throw new ApiFail(404, 'not_found', 'Событие не найдено');
  const merged = eventInput.safeParse({
    label: cur.label, place: cur.place, startDate: cur.startDate, endDate: cur.endDate, monthOnly: cur.monthOnly,
    registrationUrl: cur.registrationUrl, price: cur.price, sort: cur.sort, ...patch,
  });
  if (!merged.success) {
    const fields: Record<string, string> = {};
    for (const issue of merged.error.issues) fields[issue.path.join('.') || '_'] ??= issue.message;
    throw new ApiFail(422, 'validation', 'Проверьте поля формы', fields);
  }
  const set = withTranslationsMerge(events.translations, { ...merged.data, translations: patch.translations });
  const [row] = await db().update(events).set({ ...set, updatedAt: new Date() } as never).where(eq(events.id, id)).returning();
  if (!row) throw new ApiFail(404, 'not_found', 'Событие не найдено');
  await audit(c, 'update', 'event', id);
  return c.json(dto(row));
});

r.delete('/events/:id', async c => {
  const id = idParam(c);
  const [row] = await db().delete(events).where(eq(events.id, id)).returning({ id: events.id });
  if (!row) throw new ApiFail(404, 'not_found', 'Событие не найдено');
  await audit(c, 'delete', 'event', id);
  return c.json({ ok: true });
});

// ---------- Порядок ----------

const REORDERABLE = { programs, projects, partners, faqs } as const;

r.put('/reorder/:resource', async c => {
  const resource = c.req.param('resource');
  if (!Object.hasOwn(REORDERABLE, resource)) throw new ApiFail(404, 'not_found', 'Неизвестный раздел');
  const table = REORDERABLE[resource as keyof typeof REORDERABLE] as typeof faqs;
  const { ids } = await body(c, reorderInput);
  if (new Set(ids).size !== ids.length) throw new ApiFail(422, 'validation', 'Идентификаторы повторяются', { ids: 'Повторы' });
  await db().transaction(async tx => {
    const found = await tx.select({ id: table.id }).from(table).where(inArray(table.id, ids));
    if (found.length !== ids.length) throw new ApiFail(422, 'validation', 'Некоторые записи не найдены', { ids: 'Неизвестный id' });
    const now = new Date();
    for (const [i, id] of ids.entries()) await tx.update(table).set({ sort: i, updatedAt: now }).where(eq(table.id, id));
  });
  await audit(c, 'reorder', resource.replace(/s$/, ''), null, { ids });
  return c.json({ ok: true });
});

// ---------- Настройки ----------

r.get('/settings', async c => {
  const rows = await db().select().from(settings);
  return c.json(Object.fromEntries(rows.map(s => [s.key, s.value])));
});

/** Контакты и ссылки сайта (куда ведут кнопки и телефоны) меняет только владелец. */
const OWNER_ONLY_SETTINGS = new Set<SettingKey>(['contacts', 'links']);
function assertSettingAccess(c: Context<AppEnv>, key: SettingKey) {
  if (OWNER_ONLY_SETTINGS.has(key) && c.get('admin')?.role !== 'owner') {
    throw new ApiFail(403, 'forbidden', 'Контакты и ссылки сайта может менять только владелец');
  }
}

/**
 * PUT /settings/:key — тело либо само значение (как раньше, страница «Настройки» админки),
 * либо `{ value, translations? }`. Во втором случае ответ — `{ value, translations }`, иначе — value.
 */
r.put('/settings/:key', async c => {
  const key = settingKey(c);
  assertSettingAccess(c, key);
  assertJson(c);
  let raw: unknown;
  try { raw = await c.req.json(); } catch { throw new ApiFail(400, 'bad_json', 'Некорректный JSON'); }
  const wrapped = isWrapped(raw);
  const schema = wrapped
    ? z.object({ value: SETTINGS[key], translations: SETTING_TRANSLATIONS[key].optional() })
    : SETTINGS[key];
  const parsed = validate(schema, raw);
  const value = wrapped ? (parsed as { value: unknown }).value : parsed;
  const trPatch = wrapped ? (parsed as { translations?: Record<string, unknown> }).translations : undefined;
  const now = new Date();
  const [row] = await db().insert(settings).values({ key, value, translations: trPatch ?? {}, updatedAt: now })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value, updatedAt: now, ...(trPatch && withTranslationsMerge(settings.translations, { translations: trPatch })) } as never,
    }).returning();
  await audit(c, 'update', 'setting', key);
  return c.json(wrapped ? { value: row.value, translations: row.translations } : row.value);
});

/** GET /settings/translations → { [key]: { kk?, en? } } для всех ключей (по умолчанию {}). */
r.get('/settings/translations', async c => {
  const rows = await db().select({ key: settings.key, translations: settings.translations }).from(settings);
  const byKey = new Map(rows.map(x => [x.key, x.translations]));
  return c.json(Object.fromEntries((Object.keys(SETTINGS) as SettingKey[]).map(k => [k, byKey.get(k) ?? {}])));
});

/** PUT /settings/:key/translations — тело `{ kk?, en? }`, слияние по языкам; ответ — итоговый объект переводов. */
r.put('/settings/:key/translations', async c => {
  const key = settingKey(c);
  assertSettingAccess(c, key);
  const patch = await body(c, SETTING_TRANSLATIONS[key]) as Record<string, unknown>;
  const now = new Date();
  // Если ключа ещё нет в БД, создаём его со значением по умолчанию (как его видит сайт).
  const [row] = await db().insert(settings)
    .values({ key, value: DEFAULT_SETTINGS[key], translations: JSON.parse(JSON.stringify(patch)), updatedAt: now })
    .onConflictDoUpdate({ target: settings.key, set: { ...withTranslationsMerge(settings.translations, { translations: patch }), updatedAt: now } as never })
    .returning();
  await audit(c, 'update', 'setting_translations', key);
  return c.json(row.translations);
});

function settingKey(c: C): SettingKey {
  const key = c.req.param('key') ?? '';
  if (!Object.hasOwn(SETTINGS, key)) throw new ApiFail(404, 'not_found', 'Неизвестная настройка');
  return key as SettingKey;
}

/** `{ value, translations? }` (и никаких других ключей) — новая форма тела PUT /settings/:key. */
function isWrapped(raw: unknown): boolean {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return false;
  const keys = Object.keys(raw);
  return keys.includes('value') && keys.every(k => k === 'value' || k === 'translations');
}

function validate<T extends z.ZodType>(schema: T, raw: unknown): z.infer<T> {
  const r = schema.safeParse(raw);
  if (!r.success) {
    const fields: Record<string, string> = {};
    for (const issue of r.error.issues) fields[issue.path.join('.') || '_'] ??= issue.message;
    throw new ApiFail(422, 'validation', 'Проверьте поля формы', fields);
  }
  return r.data;
}

export default r;
