import { beforeAll, describe, expect, it } from 'vitest';
import { and, eq } from 'drizzle-orm';
import { Client, asEditor, asOwner, db, expectJson, schema, uniq } from './helpers';

let owner: Client;
let editor: Client;
beforeAll(async () => { owner = await asOwner(); editor = await asEditor(); });

const auditRows = (action: string, entity: string, id: number | string) =>
  db().select().from(schema.auditLog).where(and(
    eq(schema.auditLog.action, action), eq(schema.auditLog.entity, entity), eq(schema.auditLog.entityId, String(id))));

describe('auth guard', () => {
  it('admin routes require a session', async () => {
    const c = new Client();
    for (const p of ['/admin/programs', '/admin/projects', '/admin/news', '/admin/partners', '/admin/faqs', '/admin/settings']) {
      expect((await c.get(p)).status).toBe(401);
    }
  });
});

describe('programs + events', () => {
  it('full CRUD with events, audit, 409 duplicate slug, 404s', async () => {
    const slug = uniq('prog').toLowerCase();
    const created = await expectJson(await owner.post('/admin/programs', { slug, name: 'Test Program', category: 'science' }), 201);
    expect(created).toMatchObject({ id: expect.any(Number), slug, name: 'Test Program', subtitle: '', color: '#cd0929', sort: 0, published: true, events: [] });
    expect(await auditRows('create', 'program', created.id)).toHaveLength(1);

    const dup = await expectJson(await owner.post('/admin/programs', { slug, name: 'Dup', category: 'science' }), 409);
    expect(dup.error.code).toBe('conflict');

    // события
    const e1 = await expectJson(await owner.post(`/admin/programs/${created.id}/events`, { label: 'Май', place: 'Астана', startDate: '2027-05-10', endDate: '2027-05-12', price: 5000 }), 201);
    expect(e1).toMatchObject({ id: expect.any(Number), programId: created.id, startDate: '2027-05-10', endDate: '2027-05-12', monthOnly: false, price: 5000, registrationUrl: null });
    const e2 = await expectJson(await owner.post(`/admin/programs/${created.id}/events`, { label: 'Сезон', place: 'Онлайн' }), 201);
    const e0 = await expectJson(await owner.post(`/admin/programs/${created.id}/events`, { label: 'Апрель', place: 'Рим', startDate: '2027-04-01' }), 201);
    expect(await auditRows('create', 'event', e1.id)).toHaveLength(1);

    const badEv = await expectJson(await owner.post(`/admin/programs/${created.id}/events`, { label: 'X', place: 'Y', startDate: '2027-05-10', endDate: '2027-05-01' }), 422);
    expect(badEv.error.fields).toHaveProperty('endDate');
    expect((await owner.post('/admin/programs/999999/events', { label: 'X', place: 'Y' })).status).toBe(404);

    const got = await expectJson(await owner.get(`/admin/programs/${created.id}`), 200);
    expect(got.events.map((e: { id: number }) => e.id)).toEqual([e0.id, e1.id, e2.id]);

    const list = await expectJson<any[]>(await owner.get('/admin/programs'), 200);
    expect(list.find(p => p.id === created.id).events).toHaveLength(3);

    // PATCH события: частичное, с проверкой итогового объекта
    const pe = await expectJson(await owner.patch(`/admin/events/${e1.id}`, { place: 'Алматы' }), 200);
    expect(pe).toMatchObject({ place: 'Алматы', startDate: '2027-05-10', price: 5000 });
    const peBad = await expectJson(await owner.patch(`/admin/events/${e1.id}`, { endDate: '2027-01-01' }), 422);
    expect(peBad.error.fields).toHaveProperty('endDate');
    expect((await owner.patch('/admin/events/999999', { place: 'X' })).status).toBe(404);
    expect(await expectJson(await owner.del(`/admin/events/${e2.id}`), 200)).toEqual({ ok: true });
    expect((await owner.del(`/admin/events/${e2.id}`)).status).toBe(404);

    // PATCH программы: частичное, не сбрасывает sort/published
    await db().update(schema.programs).set({ sort: 42, published: false }).where(eq(schema.programs.id, created.id));
    const patched = await expectJson(await owner.patch(`/admin/programs/${created.id}`, { name: 'Renamed' }), 200);
    expect(patched).toMatchObject({ name: 'Renamed', slug, sort: 42, published: false });
    expect(patched.events).toHaveLength(2);
    expect(await auditRows('update', 'program', created.id)).toHaveLength(1);
    const patchBad = await expectJson(await owner.patch(`/admin/programs/${created.id}`, { color: 'red', category: 'cooking' }), 422);
    expect(Object.keys(patchBad.error.fields)).toEqual(expect.arrayContaining(['color', 'category']));

    const other = await expectJson(await owner.post('/admin/programs', { slug: uniq('other').toLowerCase(), name: 'Other', category: 'robotics' }), 201);
    expect((await owner.patch(`/admin/programs/${other.id}`, { slug })).status).toBe(409);

    expect((await owner.patch('/admin/programs/999999', { name: 'X' })).status).toBe(404);
    expect((await owner.get('/admin/programs/999999')).status).toBe(404);
    expect((await owner.get('/admin/programs/abc')).status).toBe(400);

    // DELETE каскадом удаляет события
    expect(await expectJson(await owner.del(`/admin/programs/${created.id}`), 200)).toEqual({ ok: true });
    expect(await auditRows('delete', 'program', created.id)).toHaveLength(1);
    expect((await owner.get(`/admin/programs/${created.id}`)).status).toBe(404);
    expect(await db().select().from(schema.events).where(eq(schema.events.programId, created.id))).toHaveLength(0);
    expect((await owner.del(`/admin/programs/${created.id}`)).status).toBe(404);
    await owner.del(`/admin/programs/${other.id}`);
  });

  it('validation errors on create → 422 with fields', async () => {
    const data = await expectJson(await owner.post('/admin/programs', { slug: 'Bad Slug!', name: '', category: 'x' }), 422);
    expect(data.error.code).toBe('validation');
    expect(Object.keys(data.error.fields)).toEqual(expect.arrayContaining(['slug', 'name', 'category']));
  });

  it('malformed JSON → 400', async () => {
    expect((await owner.req('POST', '/admin/programs', { raw: '{nope' })).status).toBe(400);
  });
});

type Case = { path: string; entity: string; valid: () => Record<string, unknown>; invalid: Record<string, unknown>; invalidFields: string[]; patch: Record<string, unknown>; slug?: boolean };
const cases: Case[] = [
  {
    path: 'projects', entity: 'project', slug: true,
    valid: () => ({ slug: uniq('proj').toLowerCase(), name: 'Test Project', category: 'Олимпиады', url: 'https://example.com', logo: '/logos/x.svg' }),
    invalid: { slug: 'НЕТ', name: '', category: '', url: 'not a url', logoScale: 10 }, invalidFields: ['slug', 'name', 'category', 'url', 'logoScale'],
    patch: { tagline: 'Новый подзаголовок' },
  },
  {
    path: 'news', entity: 'news',
    valid: () => ({ title: uniq('News'), date: '2026-10-01', body: 'Текст', externalUrl: 'https://example.com/n' }),
    invalid: { title: '', date: '01.10.2026' }, invalidFields: ['title', 'date'],
    patch: { title: 'Обновлено' },
  },
  {
    path: 'partners', entity: 'partner',
    valid: () => ({ name: uniq('Partner'), group: 'org', image: '/partners/x.png' }),
    invalid: { name: '', group: 'aliens' }, invalidFields: ['name', 'group'],
    patch: { group: 'gov' },
  },
  {
    path: 'faqs', entity: 'faq',
    valid: () => ({ question: uniq('Вопрос'), answer: 'Ответ' }),
    invalid: { question: '', answer: '' }, invalidFields: ['question', 'answer'],
    patch: { answer: 'Новый ответ' },
  },
];

describe.each(cases)('$path CRUD', ({ path, entity, valid, invalid, invalidFields, patch, slug }) => {
  it('create, list, patch (partial), delete, audit', async () => {
    const input = valid();
    const created = await expectJson(await owner.post(`/admin/${path}`, input), 201);
    expect(created).toMatchObject({ id: expect.any(Number), ...input, published: true });
    expect(typeof created.createdAt === 'undefined' || typeof created.createdAt === 'string').toBe(true);
    expect(await auditRows('create', entity, created.id)).toHaveLength(1);

    const list = await expectJson<any[]>(await owner.get(`/admin/${path}`), 200);
    expect(list.some(x => x.id === created.id)).toBe(true);

    // published=false не должен сбрасываться PATCH-ем другого поля
    await expectJson(await owner.patch(`/admin/${path}/${created.id}`, { published: false }), 200);
    const patched = await expectJson(await owner.patch(`/admin/${path}/${created.id}`, patch), 200);
    expect(patched).toMatchObject({ ...input, ...patch, published: false });
    expect(await auditRows('update', entity, created.id)).toHaveLength(2);

    // неопубликованное видно в админке, но не на сайте
    const pub = await expectJson(await new Client().get('/public/content'), 200);
    expect((pub[path] as { id: number }[]).some(x => x.id === created.id)).toBe(false);

    expect(await expectJson(await owner.del(`/admin/${path}/${created.id}`), 200)).toEqual({ ok: true });
    expect(await auditRows('delete', entity, created.id)).toHaveLength(1);
    expect((await owner.del(`/admin/${path}/${created.id}`)).status).toBe(404);
    expect((await owner.patch(`/admin/${path}/${created.id}`, patch)).status).toBe(404);
  });

  it('422 on invalid create and invalid patch', async () => {
    const data = await expectJson(await owner.post(`/admin/${path}`, invalid), 422);
    expect(data.error.code).toBe('validation');
    expect(Object.keys(data.error.fields)).toEqual(expect.arrayContaining(invalidFields));
    const created = await expectJson(await owner.post(`/admin/${path}`, valid()), 201);
    const bad = await expectJson(await owner.patch(`/admin/${path}/${created.id}`, { [invalidFields[0]]: invalid[invalidFields[0]] }), 422);
    expect(bad.error.fields).toHaveProperty(invalidFields[0]);
    expect((await owner.patch(`/admin/${path}/0`, patch)).status).toBe(400);
    await owner.del(`/admin/${path}/${created.id}`);
  });

  it.runIf(!!slug)('409 on duplicate slug (create and patch)', async () => {
    const a = await expectJson(await owner.post(`/admin/${path}`, valid()), 201);
    const b = await expectJson(await owner.post(`/admin/${path}`, valid()), 201);
    expect((await owner.post(`/admin/${path}`, { ...valid(), slug: a.slug })).status).toBe(409);
    expect((await owner.patch(`/admin/${path}/${b.id}`, { slug: a.slug })).status).toBe(409);
    await owner.del(`/admin/${path}/${a.id}`);
    await owner.del(`/admin/${path}/${b.id}`);
  });

  it('editor can manage content', async () => {
    const created = await expectJson(await editor.post(`/admin/${path}`, valid()), 201);
    await expectJson(await editor.patch(`/admin/${path}/${created.id}`, patch), 200);
    await expectJson(await editor.del(`/admin/${path}/${created.id}`), 200);
  });
});

describe('PUT /api/admin/reorder/:resource', () => {
  it('sets sort = index; reflected in public content order', async () => {
    const before = await expectJson<any[]>(await owner.get('/admin/faqs'), 200);
    const ids = before.map(f => f.id).reverse();
    expect(await expectJson(await editor.put('/admin/reorder/faqs', { ids }), 200)).toEqual({ ok: true });
    const after = await expectJson<any[]>(await owner.get('/admin/faqs'), 200);
    expect(after.map(f => f.id)).toEqual(ids);
    expect(after.map(f => f.sort)).toEqual(ids.map((_, i) => i));
    const pub = await expectJson(await new Client().get('/public/content'), 200);
    const pubIds = (pub.faqs as { id: number }[]).map(f => f.id);
    expect(pubIds).toEqual(ids.filter(id => pubIds.includes(id)));
    const audit = await db().select().from(schema.auditLog).where(eq(schema.auditLog.action, 'reorder'));
    expect(audit.length).toBeGreaterThan(0);
    // вернуть порядок
    await owner.put('/admin/reorder/faqs', { ids: before.map(f => f.id) });
  });

  it('works for programs, projects, partners', async () => {
    for (const res of ['programs', 'projects', 'partners']) {
      const list = await expectJson<any[]>(await owner.get(`/admin/${res}`), 200);
      const ids = list.map(x => x.id);
      const swapped = [ids[1], ids[0], ...ids.slice(2)];
      await expectJson(await owner.put(`/admin/reorder/${res}`, { ids: swapped }), 200);
      const again = await expectJson<any[]>(await owner.get(`/admin/${res}`), 200);
      expect(again.map(x => x.id)).toEqual(swapped);
      await owner.put(`/admin/reorder/${res}`, { ids });
    }
  });

  it('rejects unknown resource, empty list, unknown ids, duplicates', async () => {
    expect((await owner.put('/admin/reorder/news', { ids: [1] })).status).toBe(404);
    expect((await owner.put('/admin/reorder/admins', { ids: [1] })).status).toBe(404);
    expect((await owner.put('/admin/reorder/faqs', { ids: [] })).status).toBe(422);
    expect((await owner.put('/admin/reorder/faqs', { ids: [999999] })).status).toBe(422);
    const [f] = await expectJson<any[]>(await owner.get('/admin/faqs'), 200);
    expect((await owner.put('/admin/reorder/faqs', { ids: [f.id, f.id] })).status).toBe(422);
  });
});

describe('settings', () => {
  it('GET returns all keys', async () => {
    const s = await expectJson(await owner.get('/admin/settings'), 200);
    expect(Object.keys(s).sort()).toEqual(['about', 'contacts', 'links', 'stats']);
  });

  it('PUT valid value saves, audits and shows up publicly; invalid → 422; unknown key → 404', async () => {
    const s = await expectJson(await owner.get('/admin/settings'), 200);
    const contacts = { ...s.contacts, phone: '+7 700 000 00 00' };
    try {
      // Контакты меняет только владелец
      expect((await editor.put('/admin/settings/contacts', contacts)).status).toBe(403);
      expect((await editor.put('/admin/settings/links', s.links)).status).toBe(403);
      const saved = await expectJson(await owner.put('/admin/settings/contacts', contacts), 200);
      expect(saved).toMatchObject({ phone: '+7 700 000 00 00' });
      expect(await auditRows('update', 'setting', 'contacts')).not.toHaveLength(0);
      const pub = await expectJson(await new Client().get('/public/content'), 200);
      expect(pub.settings.contacts.phone).toBe('+7 700 000 00 00');

      const bad = await expectJson(await owner.put('/admin/settings/contacts', { ...contacts, email: 'nope' }), 422);
      expect(bad.error.fields).toHaveProperty('email');
      expect((await owner.put('/admin/settings/stats', [{ value: '', label: 'x' }])).status).toBe(422);
      expect((await owner.put('/admin/settings/secret', { a: 1 })).status).toBe(404);

      const stats = await expectJson(await owner.put('/admin/settings/stats', s.stats), 200);
      expect(stats).toEqual(s.stats);
    } finally {
      await owner.put('/admin/settings/contacts', s.contacts);
    }
  });
});
