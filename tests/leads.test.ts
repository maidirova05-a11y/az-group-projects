import { describe, expect, it } from 'vitest';
import { eq, sql } from 'drizzle-orm';
import { asOwner, Client, db, expectJson, schema, uniq } from './helpers';

const valid = (name: string) => ({ name, phone: '+7 (701) 123-45-67', topic: 'Fibonacci', message: 'Хочу участвовать\nв олимпиаде', page: '/calendar' });
const findByName = (name: string) => db().select().from(schema.leads).where(eq(schema.leads.name, name));

describe('POST /api/leads', () => {
  it('accepts a valid lead: 201 { ok: true } and stores it with status new and ipHash', async () => {
    const name = uniq('Lead');
    const res = await new Client().post('/leads', valid(name), { csrf: false });
    expect(await expectJson(res, 201)).toEqual({ ok: true });
    const rows = await findByName(name);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ status: 'new', topic: 'Fibonacci', page: '/calendar', message: 'Хочу участвовать\nв олимпиаде' });
    expect(rows[0].ipHash).toBeTruthy();
  });

  it('returns 422 with field errors for invalid input', async () => {
    const res = await new Client().post('/leads', { name: '', phone: '12', topic: '' }, { csrf: false });
    const data = await expectJson(res, 422);
    expect(data.error.code).toBe('validation');
    expect(Object.keys(data.error.fields)).toEqual(expect.arrayContaining(['name', 'phone', 'topic']));
  });

  it('returns 400 for malformed JSON', async () => {
    const res = await new Client().req('POST', '/leads', { raw: '{oops', csrf: false });
    expect(res.status).toBe(400);
  });

  it('honeypot: pretends success but does not store', async () => {
    const name = uniq('Bot');
    const res = await new Client().post('/leads', { ...valid(name), website: 'http://spam.example' }, { csrf: false });
    expect(res.status).toBe(201);
    expect(await findByName(name)).toHaveLength(0);
  });

  it('rate limit: 6th lead from one IP within 10 minutes is 429; another IP still OK', async () => {
    const c = new Client();
    for (let i = 0; i < 5; i++) expect((await c.post('/leads', valid(uniq('RL')), { csrf: false })).status).toBe(201);
    const blocked = await c.post('/leads', valid(uniq('RL')), { csrf: false });
    const data = await expectJson(blocked, 429);
    expect(blocked.headers.get('retry-after')).toBe('600');
    expect(data.error.code).toBeTruthy();
    expect((await new Client().post('/leads', valid(uniq('RL2')), { csrf: false })).status).toBe(201);
  });

  it('stores lang, cleaned referrer and utm; drops unknown lang, same-site and non-http referrers', async () => {
    const name = uniq('Src');
    const res = await new Client().post('/leads', {
      ...valid(name), lang: 'kk', referrer: 'https://www.google.com/search?q=олимпиада+фибоначчи',
      utm: { source: 'yandex', medium: 'cpc', campaign: 'spring-2026', term: ' олимпиада\nдля школьников ', content: '' },
    }, { csrf: false });
    expect(res.status).toBe(201);
    const [row] = await findByName(name);
    expect(row).toMatchObject({ lang: 'kk', referrer: 'google.com/search' });
    expect(row.utm).toEqual({ source: 'yandex', medium: 'cpc', campaign: 'spring-2026', term: 'олимпиада для школьников' });

    const name2 = uniq('Src');
    await new Client().post('/leads', { ...valid(name2), lang: 'de', referrer: 'javascript:alert(1)', utm: { source: '  ' } }, { csrf: false, headers: { host: 'www.azgroup.kz' } });
    const [row2] = await findByName(name2);
    expect(row2).toMatchObject({ lang: null, referrer: null, utm: null });

    const name3 = uniq('Src');
    await new Client().post('/leads', { ...valid(name3), referrer: 'https://www.azgroup.kz/events' }, { csrf: false, headers: { host: 'www.azgroup.kz' } });
    expect((await findByName(name3))[0].referrer).toBeNull();
  });

  it('dedupe: resending the same lead within 10 minutes answers 201 but stores it once', async () => {
    const name = uniq('Dup');
    const c = new Client();
    expect((await c.post('/leads', valid(name), { csrf: false })).status).toBe(201);
    expect((await c.post('/leads', valid(name), { csrf: false })).status).toBe(201);
    expect(await findByName(name)).toHaveLength(1);
    // Другое сообщение — уже новая заявка.
    expect((await c.post('/leads', { ...valid(name), message: 'Другой вопрос' }, { csrf: false })).status).toBe(201);
    expect(await findByName(name)).toHaveLength(2);
  });

  it('admin list and CSV expose lang/referrer/utm but never ipHash', async () => {
    const name = uniq('Adm');
    await new Client().post('/leads', { ...valid(name), lang: 'en', utm: { source: 'instagram', medium: 'social' } }, { csrf: false });
    const owner = await asOwner();
    const list = await expectJson(await owner.get(`/admin/leads?q=${name}`), 200);
    expect(list.items[0]).toMatchObject({ name, lang: 'en', referrer: null, utm: { source: 'instagram', medium: 'social' } });
    expect(JSON.stringify(list)).not.toContain('ipHash');
    const csv = await (await owner.get(`/admin/leads/export.csv?q=${name}`)).text();
    expect(csv.split('\r\n')[0]).toContain(';язык;источник;utm_term;');
    expect(csv).toContain(';en;instagram / social;;');
  });

  it('still stores the lead when migration 0004 is missing (no lang/referrer/utm columns)', async () => {
    const name = uniq('NoMig');
    await db().execute(sql`alter table leads rename column utm to utm_missing`);
    try {
      const res = await new Client().post('/leads', { ...valid(name), lang: 'en', utm: { source: 'x' } }, { csrf: false });
      expect(res.status).toBe(201);
    } finally {
      await db().execute(sql`alter table leads rename column utm_missing to utm`);
    }
    const [row] = await findByName(name);
    expect(row).toMatchObject({ name, lang: null, utm: null });
  });

  it('dedupe holds under concurrency from different IPs', async () => {
    const name = uniq('Race');
    const res = await Promise.all(Array.from({ length: 8 }, () => new Client().post('/leads', valid(name), { csrf: false })));
    expect(res.every(r => r.status === 201)).toBe(true);
    expect(await findByName(name)).toHaveLength(1);
  });
});
