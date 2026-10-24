/** Регрессионные тесты исправлений по security review: ссылки, сессии, лимиты, заголовки, размер тела. */
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { Hono } from 'hono';
import { SignJWT } from 'jose';
import { eq } from 'drizzle-orm';
import { app } from '../server/app';
import { env } from '../server/env';
import { clientIp } from '../server/lib/ratelimit';
import { isSafeHref } from '../shared/schemas';
import { CSRF, OWNER } from './fixtures';
import { Client, asOwner, createAdmin, db, expectJson, login, schema, uniq } from './helpers';

const UNSAFE = [
  'javascript:alert(1)', 'JaVaScRiPt:alert(1)', ' javascript:alert(1)', 'java\tscript:alert(1)', 'javascript://%0aalert(1)',
  'data:text/html,<script>alert(1)</script>', 'vbscript:msgbox(1)', '//evil.example', '/\\evil.example', '\\\\evil.example',
  'evil.example', 'ftp://example.com', 'http://', 'https:', 'file:///etc/passwd',
];
const SAFE = ['https://example.com/a?b=1#c', 'http://az-group.kz', 'mailto:info@az-group.kz', 'tel:+77770888844', '/calendar-2026-2027.pdf', '/'];

describe('isSafeHref', () => {
  it('rejects dangerous schemes, protocol-relative and backslash URLs', () => {
    for (const u of UNSAFE) expect(isSafeHref(u), u).toBe(false);
    expect(isSafeHref('')).toBe(false);
  });
  it('allows http(s), mailto, tel and same-site paths', () => {
    for (const u of SAFE) expect(isSafeHref(u), u).toBe(true);
  });
});

describe('stored XSS: URL fields are validated', () => {
  let owner: Client;
  beforeAll(async () => { owner = await asOwner(); });

  it('projects.url / projects.logo: unsafe → 422, safe → 201', async () => {
    for (const url of ['javascript:alert(1)', 'data:text/html,x', '//evil.example', '/\\evil.example']) {
      const res = await expectJson(await owner.post('/admin/projects', { slug: uniq('p'), name: 'P', category: 'c', url }), 422);
      expect(res.error.fields).toHaveProperty('url');
    }
    const logoBad = await expectJson(await owner.post('/admin/projects', { slug: uniq('p'), name: 'P', category: 'c', logo: 'javascript:alert(1)' }), 422);
    expect(logoBad.error.fields).toHaveProperty('logo');
    for (const url of SAFE) {
      const p = await expectJson(await owner.post('/admin/projects', { slug: uniq('p'), name: 'P', category: 'c', url }), 201);
      // PATCH тоже проверяется
      expect((await owner.patch(`/admin/projects/${p.id}`, { url: 'javascript:alert(1)' })).status).toBe(422);
      expect((await owner.del(`/admin/projects/${p.id}`)).status).toBe(200);
    }
  });

  it('news.externalUrl / news.image and events.registrationUrl: unsafe → 422', async () => {
    const date = '2026-01-01';
    const a = await expectJson(await owner.post('/admin/news', { title: 'T', date, externalUrl: 'javascript:alert(1)' }), 422);
    expect(a.error.fields).toHaveProperty('externalUrl');
    const b = await expectJson(await owner.post('/admin/news', { title: 'T', date, externalUrl: '//evil.example' }), 422);
    expect(b.error.fields).toHaveProperty('externalUrl');
    expect((await owner.post('/admin/news', { title: 'T', date, image: 'data:image/svg+xml,<svg onload=alert(1)>' })).status).toBe(422);
    const ok = await expectJson(await owner.post('/admin/news', { title: 'T', date, externalUrl: 'https://example.com/n' }), 201);
    await owner.del(`/admin/news/${ok.id}`);
    const [prog] = await db().select({ id: schema.programs.id }).from(schema.programs).limit(1);
    const ev = await expectJson(await owner.post(`/admin/programs/${prog.id}/events`, { label: 'L', place: 'P', registrationUrl: 'javascript:alert(1)' }), 422);
    expect(ev.error.fields).toHaveProperty('registrationUrl');
  });

  it('settings contacts/links/about: unsafe → 422, current values still valid', async () => {
    const all = await expectJson(await owner.get('/admin/settings'), 200);
    const { contacts, links, about } = all;
    for (const [field, value] of [['whatsapp', 'javascript:alert(1)'], ['instagram', '//evil.example'], ['mapUrl', 'data:text/html,x'], ['offer', 'vbscript:x'], ['phoneHref', 'https://example.com']] as const) {
      const r = await expectJson(await owner.put('/admin/settings/contacts', { ...contacts, [field]: value }), 422);
      expect(r.error.fields, field).toHaveProperty(field);
    }
    for (const [field, value] of [['registration', 'javascript:alert(1)'], ['posterPdf', '//evil.example'], ['cabinet', 'data:,x']] as const) {
      const r = await expectJson(await owner.put('/admin/settings/links', { ...links, [field]: value }), 422);
      expect(r.error.fields, field).toHaveProperty(field);
    }
    const wrapped = await expectJson(await owner.put('/admin/settings/links', { value: { ...links, ifo: 'javascript:alert(1)' } }), 422);
    expect(wrapped.error.fields).toHaveProperty('value.ifo');
    if (about.pillars.length) {
      const pillars = about.pillars.map((p: object, i: number) => (i === 0 ? { ...p, image: 'javascript:alert(1)' } : p));
      expect((await owner.put('/admin/settings/about', { ...about, pillars })).status).toBe(422);
    }
    // Текущие значения (сид = src/data/site.ts) проходят новую валидацию; пустая ссылка допустима.
    expect((await owner.put('/admin/settings/contacts', contacts)).status).toBe(200);
    expect((await owner.put('/admin/settings/links', { ...links, ifoCertificate: '' })).status).toBe(200);
    expect((await owner.put('/admin/settings/links', links)).status).toBe(200);
    expect((await owner.put('/admin/settings/contacts', { ...contacts, phoneHref: 'tel:+77001112233', offer: 'mailto:a@b.kz' })).status).toBe(200);
    expect((await owner.put('/admin/settings/contacts', contacts)).status).toBe(200);
  });
});

describe('session invalidation (session_version)', () => {
  it('password change: other sessions are revoked, current one stays logged in', async () => {
    const a = await createAdmin();
    const c1 = await login(a.email, a.password);
    const c2 = await login(a.email, a.password);
    await expectJson(await c1.post('/auth/password', { current: a.password, next: 'changed-password-123' }), 200);
    expect((await c1.get('/auth/me')).status).toBe(200);
    expect((await c2.get('/auth/me')).status).toBe(401);
  });

  it('logout signs out everywhere', async () => {
    const a = await createAdmin();
    const c1 = await login(a.email, a.password);
    const c2 = await login(a.email, a.password);
    const stolen = c2.cookies.get('az_admin')!;
    await expectJson(await c1.post('/auth/logout'), 200);
    expect((await c2.get('/auth/me')).status).toBe(401);
    const replay = new Client();
    replay.cookies.set('az_admin', stolen);
    expect((await replay.get('/auth/me')).status).toBe(401);
  });

  it('owner password reset and deactivation revoke the admin\'s sessions', async () => {
    const owner = await asOwner();
    const a = await createAdmin();
    const c = await login(a.email, a.password);
    await expectJson(await owner.patch(`/admin/admins/${a.id}`, { password: 'owner-reset-password-1' }), 200);
    expect((await c.get('/auth/me')).status).toBe(401);
    const c2 = await login(a.email, 'owner-reset-password-1');
    await expectJson(await owner.patch(`/admin/admins/${a.id}`, { active: false }), 200);
    await expectJson(await owner.patch(`/admin/admins/${a.id}`, { active: true }), 200);
    expect((await c2.get('/auth/me')).status).toBe(401); // реактивация не воскрешает старые cookie
    expect((await owner.get('/auth/me')).status).toBe(200);
  });

  it('owner resetting own password via admins API stays logged in', async () => {
    const o = await createAdmin({ role: 'owner' });
    try {
      const c = await login(o.email, o.password);
      await expectJson(await c.patch(`/admin/admins/${o.id}`, { password: 'self-reset-password-1' }), 200);
      expect((await c.get('/auth/me')).status).toBe(200);
    } finally {
      // Лишний owner мешал бы тестам «последнего владельца» в ops.test.ts.
      await db().delete(schema.admins).where(eq(schema.admins.id, o.id));
    }
  });

  it('a validly signed token without ver claim is rejected', async () => {
    const [owner] = await db().select().from(schema.admins).where(eq(schema.admins.email, OWNER.email));
    const token = await new SignJWT({ role: 'owner' }).setProtectedHeader({ alg: 'HS256' }).setSubject(String(owner.id))
      .setIssuedAt().setExpirationTime('1h').sign(new TextEncoder().encode(env.jwtSecret));
    const c = new Client();
    c.cookies.set('az_admin', token);
    expect((await c.get('/auth/me')).status).toBe(401);
  });
});

describe('login hardening', () => {
  it('per-e-mail lockout: 30 failures from many IPs → 429 even from a fresh IP with the right password', async () => {
    const a = await createAdmin();
    for (let ipN = 0; ipN < 3; ipN++) {
      const c = new Client();
      for (let i = 0; i < 10; i++) expect((await c.post('/auth/login', { email: a.email, password: `wrong-${ipN}-${i}` })).status).toBe(401);
    }
    const blocked = await expectJson(await new Client().post('/auth/login', { email: a.email, password: a.password }), 429);
    expect(blocked.error.code).toBe('too_many_attempts');
  });

  it('text/plain body → 415 (login and leads)', async () => {
    const headers = { ...CSRF, 'Content-Type': 'text/plain', 'X-Forwarded-For': '10.250.0.1' };
    const r1 = await app.request('/api/auth/login', { method: 'POST', headers, body: JSON.stringify({ email: OWNER.email, password: OWNER.password }) });
    expect(r1.status).toBe(415);
    expect((await r1.json()).error.code).toBe('unsupported_media_type');
    const r2 = await app.request('/api/leads', { method: 'POST', headers, body: JSON.stringify({ name: 'x', phone: '+77010000000', topic: 't' }) });
    expect(r2.status).toBe(415);
    const r3 = await app.request('/api/auth/login', { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json; charset=utf-8' }, body: JSON.stringify({ email: OWNER.email, password: OWNER.password }) });
    expect(r3.status).toBe(200);
  });
});

describe('response headers and limits', () => {
  it('Cache-Control: no-store on /api/auth/* and /api/admin/* (including errors), not on public content', async () => {
    expect((await new Client().get('/auth/me')).headers.get('cache-control')).toBe('no-store');
    expect((await new Client().get('/admin/faqs')).headers.get('cache-control')).toBe('no-store');
    const owner = await asOwner();
    expect((await owner.get('/admin/faqs')).headers.get('cache-control')).toBe('no-store');
    expect((await owner.get('/admin/leads/export.csv')).headers.get('cache-control')).toBe('no-store');
    expect((await new Client().post('/auth/login', { email: OWNER.email, password: 'wrong' })).headers.get('cache-control')).toBe('no-store');
    expect((await new Client().get('/public/content')).headers.get('cache-control')).not.toBe('no-store');
  });

  it('body larger than 256 KB → 413 with the standard error JSON', async () => {
    const big = JSON.stringify({ name: 'x', phone: '+77010000000', topic: 't', message: 'a'.repeat(300 * 1024) });
    const res = await new Client().req('POST', '/leads', { raw: big, csrf: false });
    const data = await expectJson(res, 413);
    expect(data.error.code).toBe('payload_too_large');
    const owner = await asOwner();
    expect((await owner.req('POST', '/admin/faqs', { raw: JSON.stringify({ question: 'Q', answer: 'x'.repeat(270_000) }) })).status).toBe(413);
  });

  it('reorder with more than 500 ids → 422', async () => {
    const owner = await asOwner();
    const ids = Array.from({ length: 501 }, (_, i) => i + 1);
    const res = await expectJson(await owner.put('/admin/reorder/faqs', { ids }), 422);
    expect(res.error.fields).toHaveProperty('ids');
  });
});

describe('clientIp', () => {
  const saved = { VERCEL: process.env.VERCEL, TRUST_PROXY: process.env.TRUST_PROXY };
  afterEach(() => {
    for (const [k, v] of Object.entries(saved)) if (v === undefined) delete process.env[k]; else process.env[k] = v;
  });
  const probe = new Hono().get('/', c => c.text(clientIp(c)));
  const ip = async (headers: Record<string, string>) => (await probe.request('/', { headers })).text();

  it('ignores spoofable X-Forwarded-For unless TRUST_PROXY=1', async () => {
    delete process.env.VERCEL;
    process.env.TRUST_PROXY = '0';
    expect(await ip({ 'X-Forwarded-For': '1.2.3.4' })).toBe('unknown');
    process.env.TRUST_PROXY = '1';
    expect(await ip({ 'X-Forwarded-For': '1.2.3.4, 9.9.9.9' })).toBe('1.2.3.4');
  });

  it('on Vercel uses x-vercel-forwarded-for, then x-real-ip', async () => {
    process.env.VERCEL = '1';
    process.env.TRUST_PROXY = '0';
    expect(await ip({ 'X-Forwarded-For': '1.1.1.1', 'x-vercel-forwarded-for': '5.6.7.8', 'x-real-ip': '7.7.7.7' })).toBe('5.6.7.8');
    expect(await ip({ 'X-Forwarded-For': '1.1.1.1', 'x-real-ip': '7.7.7.7' })).toBe('7.7.7.7');
  });
});

describe('env validation', () => {
  const saved = { JWT_SECRET: process.env.JWT_SECRET, IP_SALT: process.env.IP_SALT, VERCEL_ENV: process.env.VERCEL_ENV, NODE_ENV: process.env.NODE_ENV };
  afterEach(() => {
    for (const [k, v] of Object.entries(saved)) if (v === undefined) delete process.env[k]; else process.env[k] = v;
  });

  it('JWT_SECRET must be ≥32 chars and not the example value', () => {
    process.env.JWT_SECRET = 'short-secret';
    expect(() => env.jwtSecret).toThrow(/32/);
    process.env.JWT_SECRET = 'change-me-to-a-long-random-string-of-32-chars';
    expect(() => env.jwtSecret).toThrow(/change-me/);
    process.env.JWT_SECRET = 'x'.repeat(32);
    expect(env.jwtSecret).toHaveLength(32);
  });

  it('IP_SALT is required in production, dev fallback otherwise', () => {
    delete process.env.IP_SALT;
    process.env.NODE_ENV = 'test';
    delete process.env.VERCEL_ENV;
    expect(env.ipSalt).toBe('dev-salt');
    process.env.VERCEL_ENV = 'production';
    expect(() => env.ipSalt).toThrow(/IP_SALT/);
  });
});
