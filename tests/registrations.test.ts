import { describe, expect, it } from 'vitest';
import { and, eq, gt, isNotNull, sql } from 'drizzle-orm';
import { asEditor, asOwner, Client, db, expectJson, schema, uniq } from './helpers';
import { invalidatePublicCache } from '../server/lib/cache';

const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Almaty', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

/** Опубликованная программа со ссылкой на оплату и её ближайшая будущая дата с ценой (из сида: Fibonacci). */
async function paidEvent() {
  const [program] = await db().select().from(schema.programs).where(eq(schema.programs.slug, 'fibonacci-math'));
  const [event] = await db().select().from(schema.events)
    .where(and(eq(schema.events.programId, program.id), gt(schema.events.startDate, today()), isNotNull(schema.events.price)))
    .orderBy(schema.events.startDate).limit(1);
  return { program, event };
}

const valid = (programId: number, eventId: number | null, name = uniq('Участник')) => ({
  programId, eventId, participantName: name, grade: '7', school: 'Школа №1', city: 'Астана', subjects: 'математика',
  contactName: 'Родитель', phone: '+7 701 555 44 33', email: 'parent@example.com', comment: 'Тест', consent: true, lang: 'kk',
});
const byName = (name: string) => db().select().from(schema.registrations).where(eq(schema.registrations.participantName, name));

describe('POST /api/registrations', () => {
  it('registers for a paid date: 201 with number, price and Kaspi payment link; snapshot stored', async () => {
    const { program, event } = await paidEvent();
    expect(program.paymentUrl).toMatch(/^https:\/\/kaspi\.kz\/pay\//);
    const body = valid(program.id, event.id);
    const res = await expectJson(await new Client().post('/registrations', body, { csrf: false }), 201);
    expect(res).toMatchObject({ ok: true, amount: 25000, paymentUrl: program.paymentUrl });
    expect(res.id).toBeGreaterThan(0);
    const [row] = await byName(body.participantName);
    expect(row).toMatchObject({
      id: res.id, programId: program.id, eventId: event.id, eventLabel: event.label, place: event.place, eventDate: event.startDate,
      grade: '7', city: 'Астана', phone: '+7 701 555 44 33', email: 'parent@example.com', amount: 25000, lang: 'kk', status: 'new',
    });
    expect(row.programName).toContain(program.name);
    expect(row.ipHash).toBeTruthy();
  });

  it('free programme without payment link: paymentUrl null; date may be left for the manager', async () => {
    const [program] = await db().select().from(schema.programs).where(eq(schema.programs.slug, 'itecx'));
    const res = await expectJson(await new Client().post('/registrations', valid(program.id, null), { csrf: false }), 201);
    expect(res).toMatchObject({ ok: true, amount: null, paymentUrl: null });
  });

  it('validates: consent, grade, phone, unknown programme, event of another programme, past date', async () => {
    const { program, event } = await paidEvent();
    const c = new Client();
    const bad = await expectJson(await c.post('/registrations', { ...valid(program.id, event.id), consent: false, grade: '13', phone: '12' }, { csrf: false }), 422);
    expect(Object.keys(bad.error.fields)).toEqual(expect.arrayContaining(['consent', 'grade', 'phone']));

    const unknown = await expectJson(await c.post('/registrations', valid(999999, null), { csrf: false }), 422);
    expect(unknown.error.fields.programId).toBeTruthy();

    const [other] = await db().select().from(schema.programs).where(eq(schema.programs.slug, 'itecx'));
    const foreign = await expectJson(await c.post('/registrations', valid(other.id, event.id), { csrf: false }), 422);
    expect(foreign.error.fields.eventId).toBeTruthy();

    const [past] = await db().insert(schema.events).values({ programId: program.id, label: 'Прошедший тур', place: 'Астана', startDate: '2020-01-01' }).returning();
    try {
      const closed = await expectJson(await c.post('/registrations', valid(program.id, past.id), { csrf: false }), 422);
      expect(closed.error.fields.eventId).toBeTruthy();
    } finally {
      await db().delete(schema.events).where(eq(schema.events.id, past.id));
    }
  });

  it('dedupe: the same registration within 10 minutes returns the same number and is stored once', async () => {
    const { program, event } = await paidEvent();
    const body = valid(program.id, event.id);
    const res = await Promise.all(Array.from({ length: 5 }, () => new Client().post('/registrations', body, { csrf: false })));
    const ids = await Promise.all(res.map(r => expectJson(r, 201).then(x => x.id)));
    expect(new Set(ids).size).toBe(1);
    expect(await byName(body.participantName)).toHaveLength(1);
  });

  it('honeypot: answers 201 but stores nothing', async () => {
    const { program, event } = await paidEvent();
    const body = { ...valid(program.id, event.id), website: 'http://spam.example' };
    expect((await new Client().post('/registrations', body, { csrf: false })).status).toBe(201);
    expect(await byName(body.participantName)).toHaveLength(0);
  });

  it('rate limit: 21st registration from one IP within 10 minutes is 429', async () => {
    const { program, event } = await paidEvent();
    const c = new Client();
    for (let i = 0; i < 20; i++) expect((await c.post('/registrations', valid(program.id, event.id), { csrf: false })).status).toBe(201);
    expect((await c.post('/registrations', valid(program.id, event.id), { csrf: false })).status).toBe(429);
  });
});

describe('admin registrations', () => {
  it('list/filter for editor, status change, CSV and delete only for owner, stats counter', async () => {
    const { program, event } = await paidEvent();
    const name = uniq('Админ-тест');
    await new Client().post('/registrations', valid(program.id, event.id, name), { csrf: false });
    const editor = await asEditor();
    const list = await expectJson(await editor.get(`/admin/registrations?q=${encodeURIComponent(name)}&program=${program.id}`), 200);
    expect(list.total).toBe(1);
    expect(list.items[0]).toMatchObject({ participantName: name, status: 'new', amount: 25000 });
    expect(JSON.stringify(list)).not.toContain('ipHash');
    const id = list.items[0].id;

    const upd = await expectJson(await editor.patch(`/admin/registrations/${id}`, { status: 'paid', note: 'Оплата Kaspi' }), 200);
    expect(upd).toMatchObject({ status: 'paid', note: 'Оплата Kaspi' });
    expect((await expectJson(await editor.get(`/admin/registrations?q=${encodeURIComponent(name)}&status=paid`), 200)).total).toBe(1);
    expect((await editor.get('/admin/registrations?status=bogus')).status).toBe(400);

    expect((await editor.get('/admin/registrations/export.csv')).status).toBe(403);
    expect((await editor.del(`/admin/registrations/${id}`)).status).toBe(403);
    const owner = await asOwner();
    const csv = await (await owner.get(`/admin/registrations/export.csv?q=${encodeURIComponent(name)}`)).text();
    expect(csv).toContain(name);
    expect(csv).toContain('оплачена');

    const stats = await expectJson(await owner.get('/admin/stats'), 200);
    expect(stats.counts.registrationsTotal).toBeGreaterThan(0);
    expect(stats.counts.registrationsNew).toBeGreaterThanOrEqual(0);

    expect(await expectJson(await owner.del(`/admin/registrations/${id}`), 200)).toEqual({ ok: true });
    expect((await owner.del(`/admin/registrations/${id}`)).status).toBe(404);
  });
});

describe('old site links', () => {
  it('GET /api/legacy/news/:id → 301 to the news page by old number (with language), unknown → /news', async () => {
    const [n] = await db().select().from(schema.news).where(eq(schema.news.legacyId, 12));
    expect(n).toBeTruthy();
    const c = new Client();
    const ru = await c.get('/legacy/news/12');
    expect(ru.status).toBe(301);
    expect(ru.headers.get('location')).toBe(`https://www.azgroup.kz/news?id=${n.id}`);
    expect((await c.get('/legacy/news/12?lang=kk')).headers.get('location')).toBe(`https://www.azgroup.kz/kk/news?id=${n.id}`);
    expect((await c.get('/legacy/news/987654')).headers.get('location')).toBe('https://www.azgroup.kz/news');
  });

  it('seeded content no longer points to az-group.kz: news have full text, registration and offer are local', async () => {
    invalidatePublicCache();
    const data = await expectJson(await new Client().get('/public/content?lang=en'), 200);
    expect(JSON.stringify(data)).not.toMatch(/https?:\/\/(www\.)?az-group\.kz\/(events|auth|public-offer|news)/);
    expect(data.settings.links.registration).toBe('/register');
    expect(data.settings.contacts.offer).toBe('/offer');
    expect(data.news.every((x: { body: string }) => x.body.length > 200)).toBe(true);
    const [{ n }] = await db().select({ n: sql<number>`count(*)::int` }).from(schema.news).where(isNotNull(schema.news.legacyId));
    expect(n).toBe(6);
  });
});
