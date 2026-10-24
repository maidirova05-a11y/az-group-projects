import { describe, expect, it } from 'vitest';
import { and, eq, sql } from 'drizzle-orm';
import { OWNER } from './fixtures';
import { Client, asOwner, createAdmin, db, expectJson, login, schema } from './helpers';

describe('POST /api/auth/login', () => {
  it('wrong password and unknown email → 401 invalid_credentials', async () => {
    const c = new Client();
    const a = await expectJson(await c.post('/auth/login', { email: OWNER.email, password: 'wrong-password' }), 401);
    expect(a.error.code).toBe('invalid_credentials');
    const b = await expectJson(await c.post('/auth/login', { email: 'nobody@test.local', password: 'whatever-123' }), 401);
    expect(b.error.code).toBe('invalid_credentials');
    expect(c.cookies.size).toBe(0);
  });

  it('invalid body → 422 with fields', async () => {
    const data = await expectJson(await new Client().post('/auth/login', { email: 'not-an-email', password: '' }), 422);
    expect(Object.keys(data.error.fields)).toEqual(expect.arrayContaining(['email', 'password']));
  });

  it('login requires the CSRF header (X-Requested-With: az-admin)', async () => {
    const c = new Client();
    const res = await c.post('/auth/login', { email: OWNER.email, password: OWNER.password }, { csrf: false });
    expect((await expectJson(res, 403)).error.code).toBe('csrf');
    expect(c.cookies.size).toBe(0);
    expect((await c.post('/auth/login', { email: OWNER.email, password: OWNER.password })).status).toBe(200);
  });

  it('good login sets httpOnly SameSite=Strict az_admin cookie and returns AdminDTO', async () => {
    const c = new Client();
    const res = await c.post('/auth/login', { email: OWNER.email.toUpperCase(), password: OWNER.password });
    const cookie = res.headers.getSetCookie().find(s => s.startsWith('az_admin='));
    const dto = await expectJson(res, 200);
    expect(cookie).toBeDefined();
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Strict/i);
    expect(cookie).toMatch(/Path=\/api/i);
    expect(cookie).toMatch(/Max-Age=86400/i);
    expect(cookie).not.toMatch(/;\s*Secure/i); // не прод
    expect(dto).toMatchObject({ id: expect.any(Number), email: OWNER.email, name: OWNER.name, role: 'owner', active: true });
    expect(typeof dto.lastLoginAt).toBe('string');
    expect(dto).not.toHaveProperty('passwordHash');
    const [audit] = await db().select().from(schema.auditLog)
      .where(and(eq(schema.auditLog.action, 'login'), eq(schema.auditLog.adminId, dto.id))).limit(1);
    expect(audit).toBeDefined();
  });
});

describe('GET /api/auth/me', () => {
  it('401 without cookie, 401 with tampered cookie, 200 with session', async () => {
    expect((await new Client().get('/auth/me')).status).toBe(401);
    const bad = new Client();
    bad.cookies.set('az_admin', 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.invalidsig');
    expect((await bad.get('/auth/me')).status).toBe(401);
    const c = await asOwner();
    const me = await expectJson(await c.get('/auth/me'), 200);
    expect(me).toMatchObject({ email: OWNER.email, role: 'owner' });
  });
});

describe('CSRF', () => {
  it('mutating admin/auth requests without X-Requested-With → 403; GET is fine', async () => {
    const c = await asOwner();
    const r1 = await expectJson(await c.post('/admin/faqs', { question: 'Q?', answer: 'A' }, { csrf: false }), 403);
    expect(r1.error.code).toBe('csrf');
    expect((await c.post('/auth/logout', undefined, { csrf: false })).status).toBe(403);
    expect((await c.post('/auth/password', { current: 'x', next: 'yyyyyyyyyyyy' }, { csrf: false })).status).toBe(403);
    expect((await c.req('DELETE', '/admin/faqs/999999', { csrf: false })).status).toBe(403);
    expect((await c.req('GET', '/admin/faqs', { csrf: false })).status).toBe(200);
    // сессия цела
    expect((await c.get('/auth/me')).status).toBe(200);
  });
});

describe('POST /api/auth/logout', () => {
  it('clears the cookie', async () => {
    const c = await asOwner();
    const res = await c.post('/auth/logout');
    expect(await expectJson(res, 200)).toEqual({ ok: true });
    const sc = res.headers.getSetCookie().find(s => s.startsWith('az_admin='));
    expect(sc).toBeDefined();
    expect(sc).toMatch(/Max-Age=0|Expires=Thu, 01 Jan 1970/i);
    expect(c.cookies.has('az_admin')).toBe(false);
    expect((await c.get('/auth/me')).status).toBe(401);
  });
});

describe('POST /api/auth/password', () => {
  it('validates and changes the password', async () => {
    const a = await createAdmin();
    const c = await login(a.email, a.password);
    const wrong = await expectJson(await c.post('/auth/password', { current: 'not-my-password', next: 'brand-new-password-1' }), 422);
    expect(wrong.error.fields).toHaveProperty('current');
    const short = await expectJson(await c.post('/auth/password', { current: a.password, next: 'short' }), 422);
    expect(short.error.fields).toHaveProperty('next');
    expect(await expectJson(await c.post('/auth/password', { current: a.password, next: 'brand-new-password-1' }), 200)).toEqual({ ok: true });
    expect((await new Client().post('/auth/login', { email: a.email, password: a.password })).status).toBe(401);
    await login(a.email, 'brand-new-password-1');
  });

  it('requires a session', async () => {
    expect((await new Client().post('/auth/password', { current: 'a', next: 'bbbbbbbbbbbb' })).status).toBe(401);
  });
});

describe('inactive admins', () => {
  it('inactive admin cannot log in', async () => {
    const a = await createAdmin({ active: false });
    const data = await expectJson(await new Client().post('/auth/login', { email: a.email, password: a.password }), 401);
    expect(data.error.code).toBe('invalid_credentials');
  });

  it('deactivating an admin invalidates the existing session', async () => {
    const a = await createAdmin();
    const c = await login(a.email, a.password);
    expect((await c.get('/auth/me')).status).toBe(200);
    await db().update(schema.admins).set({ active: false }).where(eq(schema.admins.id, a.id));
    expect((await c.get('/auth/me')).status).toBe(401);
    expect((await c.get('/admin/faqs')).status).toBe(401);
  });
});

describe('brute-force protection', () => {
  it('after 10 failures for email+IP, login is 429 (even with the right password); other IP unaffected', async () => {
    const a = await createAdmin();
    const c = new Client();
    for (let i = 0; i < 10; i++) {
      expect((await c.post('/auth/login', { email: a.email, password: `wrong-${i}` })).status).toBe(401);
    }
    const blocked = await expectJson(await c.post('/auth/login', { email: a.email, password: a.password }), 429);
    expect(blocked.error.code).toBe('too_many_attempts');
    const [{ n }] = await db().select({ n: sql<number>`count(*)::int` }).from(schema.auditLog)
      .where(and(eq(schema.auditLog.action, 'login_failed'), sql`${schema.auditLog.details}->>'email' = ${a.email}`));
    expect(n).toBe(10);
    expect((await new Client().post('/auth/login', { email: a.email, password: a.password })).status).toBe(200);
  });
});
