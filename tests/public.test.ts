import { describe, expect, it } from 'vitest';
import { eq, sql } from 'drizzle-orm';
import { SETTINGS, type PublicContent } from '../shared/schemas';
import { asOwner, Client, db, expectJson, schema } from './helpers';
import { invalidatePublicCache } from '../server/lib/cache';

const getContent = async () => {
  invalidatePublicCache(); // прямые записи в БД в тестах минуют audit()
  const res = await new Client().get('/public/content');
  return { res, data: await expectJson<PublicContent>(res, 200) };
};

const sortedBy = <T>(arr: T[], cmp: (a: T, b: T) => number) => arr.every((x, i) => i === 0 || cmp(arr[i - 1], x) <= 0);
const bySortId = (a: { sort: number; id: number }, b: { sort: number; id: number }) => a.sort - b.sort || a.id - b.id;

describe('GET /api/public/content', () => {
  it('returns all sections with cache header', async () => {
    const { res, data } = await getContent();
    expect(res.headers.get('cache-control')).toBe('public, s-maxage=60, stale-while-revalidate=600');
    expect(res.headers.get('content-type')).toMatch(/application\/json/);
    expect(Object.keys(data).sort()).toEqual(['faqs', 'lang', 'news', 'partners', 'programs', 'projects', 'settings']);
    expect(data.lang).toBe('ru');
    expect(JSON.stringify(data)).not.toContain('"translations"');
    for (const k of ['programs', 'projects', 'news', 'partners', 'faqs'] as const) {
      expect(Array.isArray(data[k])).toBe(true);
      expect(data[k].length).toBeGreaterThan(0);
    }
    for (const key of Object.keys(SETTINGS) as (keyof typeof SETTINGS)[]) {
      expect(SETTINGS[key].safeParse(data.settings[key]).success).toBe(true);
    }
  });

  it('item shapes match DTOs (no internal fields)', async () => {
    const { data } = await getContent();
    const p = data.programs[0];
    expect(p).toMatchObject({ id: expect.any(Number), slug: expect.any(String), name: expect.any(String), category: expect.any(String), color: expect.stringMatching(/^#/), published: true });
    expect(Array.isArray(p.events)).toBe(true);
    const ev = data.programs.flatMap(x => x.events)[0];
    expect(ev).toMatchObject({ id: expect.any(Number), programId: expect.any(Number), label: expect.any(String), place: expect.any(String) });
    expect(ev.startDate === null || /^\d{4}-\d{2}-\d{2}$/.test(ev.startDate)).toBe(true);
    expect(data.news[0].date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(JSON.stringify(data)).not.toMatch(/passwordHash|ipHash/);
  });

  it('sorts lists by sort then id; events by startDate with nulls last; news newest first', async () => {
    const { data } = await getContent();
    expect(sortedBy(data.programs, bySortId)).toBe(true);
    expect(sortedBy(data.projects, bySortId)).toBe(true);
    expect(sortedBy(data.partners, bySortId)).toBe(true);
    expect(sortedBy(data.faqs, bySortId)).toBe(true);
    expect(sortedBy(data.news, (a, b) => b.date.localeCompare(a.date) || b.id - a.id)).toBe(true);
    for (const p of data.programs) {
      const dates = p.events.map(e => e.startDate);
      const firstNull = dates.indexOf(null);
      if (firstNull >= 0) expect(dates.slice(firstNull).every(d => d === null)).toBe(true);
      const nn = dates.filter((d): d is string => d !== null);
      expect(sortedBy(nn, (a, b) => a.localeCompare(b))).toBe(true);
    }
  });

  it('returns only published records (counts match DB)', async () => {
    const { data } = await getContent();
    const count = async (t: typeof schema.faqs | typeof schema.projects | typeof schema.partners | typeof schema.news | typeof schema.programs) =>
      (await db().select({ n: sql<number>`count(*)::int` }).from(t as typeof schema.faqs).where(eq((t as typeof schema.faqs).published, true)))[0].n;
    expect(data.programs.length).toBe(await count(schema.programs));
    expect(data.projects.length).toBe(await count(schema.projects));
    expect(data.partners.length).toBe(await count(schema.partners));
    expect(data.faqs.length).toBe(await count(schema.faqs));
    expect(data.news.length).toBe(await count(schema.news));
    for (const k of ['programs', 'projects', 'news', 'partners', 'faqs'] as const) {
      expect(data[k].every(x => x.published === true)).toBe(true);
    }
  });

  it('unpublishing a record hides it (and an unpublished program hides its events)', async () => {
    const before = (await getContent()).data;
    const faq = before.faqs[0];
    const program = before.programs.find(p => p.events.length > 0)!;
    const eventIds = program.events.map(e => e.id);
    await db().update(schema.faqs).set({ published: false }).where(eq(schema.faqs.id, faq.id));
    await db().update(schema.programs).set({ published: false }).where(eq(schema.programs.id, program.id));
    try {
      const after = (await getContent()).data;
      expect(after.faqs.find(f => f.id === faq.id)).toBeUndefined();
      expect(after.faqs.length).toBe(before.faqs.length - 1);
      expect(after.programs.find(p => p.id === program.id)).toBeUndefined();
      const allEvents = after.programs.flatMap(p => p.events.map(e => e.id));
      expect(allEvents.some(id => eventIds.includes(id))).toBe(false);
    } finally {
      await db().update(schema.faqs).set({ published: true }).where(eq(schema.faqs.id, faq.id));
      await db().update(schema.programs).set({ published: true }).where(eq(schema.programs.id, program.id));
    }
    const restored = (await getContent()).data;
    expect(restored.faqs.find(f => f.id === faq.id)).toBeDefined();
  });

  it('caches the response in memory with ETag (304 on If-None-Match) and refreshes after an admin change', async () => {
    const c = new Client();
    const first = await c.get('/public/content');
    const etag = first.headers.get('etag');
    expect(etag).toMatch(/^"[A-Za-z0-9_-]+"$/);
    const again = await c.get('/public/content', { headers: { 'If-None-Match': etag! } });
    expect(again.status).toBe(304);
    expect(await again.text()).toBe('');
    expect(again.headers.get('etag')).toBe(etag);
    // Изменение в админке сбрасывает кэш: новый вопрос виден сразу, ETag другой.
    const owner = await asOwner();
    const faq = await expectJson(await owner.post('/admin/faqs', { question: 'Cache test question?', answer: 'Yes', sort: 999, published: true }), 201);
    try {
      const after = await c.get('/public/content');
      expect(after.status).toBe(200);
      expect(after.headers.get('etag')).not.toBe(etag);
      expect((await after.json()).faqs.some((f: { id: number }) => f.id === faq.id)).toBe(true);
    } finally {
      await owner.del(`/admin/faqs/${faq.id}`);
    }
    // Разные языки — разные записи кэша.
    const kk = await c.get('/public/content?lang=kk');
    expect(kk.headers.get('etag')).not.toBe(etag);
  });

  it('health and unknown routes', async () => {
    const c = new Client();
    expect(await expectJson(await c.get('/health'), 200)).toEqual({ ok: true });
    const nf = await expectJson(await c.get('/nope'), 404);
    expect(nf.error.code).toBe('not_found');
  });
});
