import { describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { Client, db, expectJson, schema, uniq } from './helpers';

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
    expect(data.error.code).toBeTruthy();
    expect((await new Client().post('/leads', valid(uniq('RL2')), { csrf: false })).status).toBe(201);
  });
});
