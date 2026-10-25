import { beforeAll, describe, expect, it } from 'vitest';
import { eq, inArray } from 'drizzle-orm';
import { OWNER } from './fixtures';
import { Client, asEditor, asOwner, createAdmin, db, expectJson, login, schema, uniq } from './helpers';

let owner: Client;
let editor: Client;
beforeAll(async () => { owner = await asOwner(); editor = await asEditor(); });

describe('admin leads', () => {
  const marker = uniq('ZQX').replace(/-/g, '');
  let ids: number[] = [];

  beforeAll(async () => {
    const rows = await db().insert(schema.leads).values([
      { name: `${marker} Alpha`, phone: '+77010000001', topic: 'Fibonacci', status: 'new', ipHash: 'h' },
      { name: `${marker} Beta`, phone: '+77010000002', topic: 'Atlantia', status: 'done' },
      { name: `${marker} Gamma`, phone: '+77010000003', topic: 'ITECX', status: 'new' },
      { name: 'Other person', phone: '+77010000004', topic: 'x', message: `mentions ${marker}`, status: 'spam' },
      { name: `${marker} =HYPERLINK("http://evil")`, phone: '+77010000005', topic: 'a;b "quoted"', message: 'line1\nline2', note: '@SUM(A1)', status: 'in_progress' },
    ]).returning({ id: schema.leads.id });
    ids = rows.map(r => r.id);
  });

  it('list: shape, newest first, no ipHash', async () => {
    const data = await expectJson(await editor.get(`/admin/leads?q=${marker}`), 200);
    expect(data.total).toBe(5);
    expect(data.items).toHaveLength(5);
    const item = data.items[0];
    expect(item).toMatchObject({ id: expect.any(Number), name: expect.any(String), phone: expect.any(String), status: expect.any(String), note: expect.any(String), createdAt: expect.any(String), updatedAt: expect.any(String) });
    expect(new Date(item.createdAt).toISOString()).toBe(item.createdAt);
    expect(item).not.toHaveProperty('ipHash');
    const ts = data.items.map((l: { createdAt: string; id: number }) => [l.createdAt, l.id]);
    expect([...ts].sort((a, b) => (b[0] as string).localeCompare(a[0] as string) || (b[1] as number) - (a[1] as number))).toEqual(ts);
  });

  it('filters by status and q (name, phone, message), combined', async () => {
    expect((await expectJson(await owner.get(`/admin/leads?q=${marker}&status=new`), 200)).total).toBe(2);
    expect((await expectJson(await owner.get(`/admin/leads?q=${marker}&status=spam`), 200)).total).toBe(1);
    expect((await expectJson(await owner.get(`/admin/leads?q=${marker.toLowerCase()} beta`), 200)).total).toBe(1);
    expect((await expectJson(await owner.get('/admin/leads?q=%2B77010000003'), 200)).total).toBe(1);
    expect((await expectJson(await owner.get('/admin/leads?q=%25%25%25'), 200)).total).toBe(0); // % экранируется
    expect((await owner.get('/admin/leads?status=bogus')).status).toBe(400);
  });

  it('pagination: page/limit', async () => {
    const p1 = await expectJson(await owner.get(`/admin/leads?q=${marker}&limit=2&page=1`), 200);
    const p2 = await expectJson(await owner.get(`/admin/leads?q=${marker}&limit=2&page=2`), 200);
    const p3 = await expectJson(await owner.get(`/admin/leads?q=${marker}&limit=2&page=3`), 200);
    expect(p1.total).toBe(5);
    expect([p1.items.length, p2.items.length, p3.items.length]).toEqual([2, 2, 1]);
    const all = [...p1.items, ...p2.items, ...p3.items].map((l: { id: number }) => l.id);
    expect(new Set(all).size).toBe(5);
    expect(all.sort()).toEqual([...ids].sort());
  });

  it('PATCH status/note, validation, 404, audit', async () => {
    const id = ids[0];
    const upd = await expectJson(await editor.patch(`/admin/leads/${id}`, { status: 'in_progress', note: 'Позвонить' }), 200);
    expect(upd).toMatchObject({ id, status: 'in_progress', note: 'Позвонить' });
    expect(upd).not.toHaveProperty('ipHash');
    const bad = await expectJson(await editor.patch(`/admin/leads/${id}`, { status: 'archived' }), 422);
    expect(bad.error.fields).toHaveProperty('status');
    expect((await editor.patch('/admin/leads/999999', { status: 'done' })).status).toBe(404);
    const audit = await db().select().from(schema.auditLog).where(eq(schema.auditLog.entity, 'lead'));
    expect(audit.some(a => a.entityId === String(id) && a.action === 'update')).toBe(true);
  });

  it('CSV export: BOM, content-type, escaping and formula guard', async () => {
    const res = await owner.get(`/admin/leads/export.csv?q=${marker}`);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toMatch(/text\/csv/);
    expect(res.headers.get('content-disposition')).toMatch(/attachment; filename=".+\.csv"/);
    const buf = new Uint8Array(await res.arrayBuffer());
    expect([...buf.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    const text = new TextDecoder('utf-8', { ignoreBOM: true }).decode(buf).slice(1);
    const lines = text.split('\r\n');
    expect(lines[0].split(';').length).toBe(12);
    expect(text).toContain(`"${marker} =HYPERLINK(""http://evil"")"`); // кавычки удвоены, ячейка в кавычках
    expect(text).toContain("'+77010000001"); // телефон с + защищён от формулы
    expect(text).toContain('"a;b ""quoted"""');
    expect(text).toContain('"line1\nline2"');
    expect(text).toContain("'@SUM(A1)");
    expect(text).not.toMatch(/(^|;)[=+@]/m); // ни одна ячейка не начинается с формулы
    expect(text).toContain('Other person');
    // Выгрузка заявок — только владелец
    expect((await editor.get('/admin/leads/export.csv')).status).toBe(403);
  });

  it('formula guard applies to cells starting with = (not just prefixed with name)', async () => {
    const [row] = await db().insert(schema.leads).values({ name: '=1+1', phone: '-77010000009', topic: '+cmd', status: 'new' }).returning();
    try {
      const text = await (await owner.get('/admin/leads/export.csv?q=77010000009')).text();
      expect(text).toContain("'=1+1");
      expect(text).toContain("'-77010000009");
      expect(text).toContain("'+cmd");
    } finally {
      await db().delete(schema.leads).where(eq(schema.leads.id, row.id));
    }
  });

  it('DELETE lead', async () => {
    const id = ids[1];
    // Удалять заявки может только владелец
    expect((await editor.del(`/admin/leads/${id}`)).status).toBe(403);
    expect(await expectJson(await owner.del(`/admin/leads/${id}`), 200)).toEqual({ ok: true });
    expect((await owner.del(`/admin/leads/${id}`)).status).toBe(404);
    await db().delete(schema.leads).where(inArray(schema.leads.id, ids));
  });
});

describe('GET /api/admin/stats', () => {
  it('returns counts, 30 leadsByDay entries ending today (Almaty), recent audit', async () => {
    await db().insert(schema.leads).values({ name: 'Stats lead', phone: '+77010000010', topic: 't' });
    const s = await expectJson(await editor.get('/admin/stats'), 200);
    expect(Object.keys(s.counts).sort()).toEqual(['events', 'faqs', 'leadsNew', 'leadsTotal', 'news', 'partners', 'programs', 'projects', 'registrationsNew', 'registrationsTotal', 'upcomingEvents'].sort());
    for (const v of Object.values(s.counts)) expect(typeof v).toBe('number');
    expect(s.counts.programs).toBeGreaterThan(0);
    expect(s.counts.leadsTotal).toBeGreaterThanOrEqual(s.counts.leadsNew);
    expect(s.counts.upcomingEvents).toBeLessThanOrEqual(s.counts.events);

    expect(s.leadsByDay).toHaveLength(30);
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Almaty', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    expect(s.leadsByDay[29].date).toBe(today);
    for (let i = 1; i < 30; i++) {
      const prev = new Date(s.leadsByDay[i - 1].date + 'T00:00:00Z');
      const cur = new Date(s.leadsByDay[i].date + 'T00:00:00Z');
      expect(cur.getTime() - prev.getTime()).toBe(86_400_000);
    }
    expect(s.leadsByDay.every((d: { count: unknown }) => typeof d.count === 'number')).toBe(true);
    expect(s.leadsByDay[29].count).toBeGreaterThanOrEqual(1);

    expect(s.recentAudit.length).toBeGreaterThan(0);
    expect(s.recentAudit.length).toBeLessThanOrEqual(20);
    expect(s.recentAudit[0]).toMatchObject({ id: expect.any(Number), action: expect.any(String), entity: expect.any(String), createdAt: expect.any(String) });
    expect(s.recentAudit[0]).toHaveProperty('adminName');
    expect(s.recentAudit[0]).toHaveProperty('entityId');
  });

  it('requires a session', async () => {
    expect((await new Client().get('/admin/stats')).status).toBe(401);
  });
});

describe('admins management', () => {
  it('editor gets 403 on every admins endpoint', async () => {
    expect((await editor.get('/admin/admins')).status).toBe(403);
    expect((await editor.post('/admin/admins', { email: 'x@test.local', name: 'X', password: 'xxxxxxxxxxxx' })).status).toBe(403);
    expect((await editor.patch('/admin/admins/1', { name: 'X' })).status).toBe(403);
    expect((await editor.del('/admin/admins/1')).status).toBe(403);
  });

  it('owner: list, create, patch, delete, audit', async () => {
    const list = await expectJson<any[]>(await owner.get('/admin/admins'), 200);
    expect(list.some(a => a.email === OWNER.email)).toBe(true);
    expect(JSON.stringify(list)).not.toMatch(/passwordHash|password_hash/);

    const email = `${uniq('new')}@test.local`;
    const noPw = await expectJson(await owner.post('/admin/admins', { email, name: 'New' }), 422);
    expect(noPw.error.fields).toHaveProperty('password');
    expect((await owner.post('/admin/admins', { email: 'bad', name: '', password: 'short' })).status).toBe(422);

    const created = await expectJson(await owner.post('/admin/admins', { email, name: 'New Admin', password: 'new-admin-password-1' }), 201);
    expect(created).toMatchObject({ id: expect.any(Number), email, name: 'New Admin', role: 'editor', active: true, lastLoginAt: null });
    expect(created).not.toHaveProperty('passwordHash');
    const dupe = await expectJson(await owner.post('/admin/admins', { email: email.toUpperCase(), name: 'Dup', password: 'new-admin-password-1' }), 409);
    expect(dupe.error.code).toBeTruthy();

    // новый админ может войти
    const c = await login(email, 'new-admin-password-1');
    expect((await expectJson(await c.get('/auth/me'), 200)).role).toBe('editor');

    const patched = await expectJson(await owner.patch(`/admin/admins/${created.id}`, { name: 'Renamed', role: 'owner' }), 200);
    expect(patched).toMatchObject({ name: 'Renamed', role: 'owner', active: true });
    // сброс пароля
    await expectJson(await owner.patch(`/admin/admins/${created.id}`, { password: 'reset-password-123' }), 200);
    await login(email, 'reset-password-123');
    // деактивация закрывает сессию
    await expectJson(await owner.patch(`/admin/admins/${created.id}`, { active: false }), 200);
    expect((await c.get('/auth/me')).status).toBe(401);
    expect((await owner.patch('/admin/admins/999999', { name: 'x' })).status).toBe(404);

    expect(await expectJson(await owner.del(`/admin/admins/${created.id}`), 200)).toEqual({ ok: true });
    expect((await owner.del(`/admin/admins/${created.id}`)).status).toBe(404);
    const audit = await db().select().from(schema.auditLog).where(eq(schema.auditLog.entity, 'admin'));
    for (const action of ['create', 'update', 'delete']) {
      expect(audit.some(a => a.action === action && a.entityId === String(created.id))).toBe(true);
    }
  });

  it('cannot delete, deactivate or demote self', async () => {
    const me = await expectJson(await owner.get('/auth/me'), 200);
    const del = await owner.del(`/admin/admins/${me.id}`);
    expect([403, 409, 422]).toContain(del.status);
    const demote = await owner.patch(`/admin/admins/${me.id}`, { role: 'editor' });
    expect([403, 409, 422]).toContain(demote.status);
    const deact = await owner.patch(`/admin/admins/${me.id}`, { active: false });
    expect([403, 409, 422]).toContain(deact.status);
    const still = await expectJson(await owner.get('/auth/me'), 200);
    expect(still).toMatchObject({ role: 'owner', active: true });
  });

  it('PATCH is partial: changing only name keeps role and active (incl. for self)', async () => {
    const me = await expectJson(await owner.get('/auth/me'), 200);
    const self = await expectJson(await owner.patch(`/admin/admins/${me.id}`, { name: OWNER.name }), 200);
    expect(self).toMatchObject({ role: 'owner', active: true });
    const other = await createAdmin({ role: 'owner', active: false });
    try {
      const res = await expectJson(await owner.patch(`/admin/admins/${other.id}`, { name: 'Only name' }), 200);
      expect(res).toMatchObject({ name: 'Only name', role: 'owner', active: false });
    } finally {
      await db().delete(schema.admins).where(eq(schema.admins.id, other.id));
    }
  });

  it('last owner cannot be demoted; with a second owner, demotion works', async () => {
    // единственный активный owner — OWNER: понизить его некому, кроме него самого (см. выше).
    // Второй owner понижает OWNER — допустимо; затем OWNER (уже editor) не может ничего; возвращаем назад.
    const second = await createAdmin({ role: 'owner' });
    const s = await login(second.email, second.password);
    const me = await expectJson(await owner.get('/auth/me'), 200);
    // second пытается понизить себя → нельзя
    expect([403, 409, 422]).toContain((await s.patch(`/admin/admins/${second.id}`, { role: 'editor' })).status);
    // OWNER понижает second → можно (остаётся OWNER)
    await expectJson(await owner.patch(`/admin/admins/${second.id}`, { role: 'editor' }), 200);
    // теперь second — editor, его сессия теряет права owner
    expect((await s.get('/admin/admins')).status).toBe(403);
    // вернуть second в owner, удалить его; OWNER остаётся последним owner
    await expectJson(await owner.patch(`/admin/admins/${second.id}`, { role: 'owner' }), 200);
    await expectJson(await owner.del(`/admin/admins/${second.id}`), 200);
    const owners = (await expectJson<any[]>(await owner.get('/admin/admins'), 200)).filter(a => a.role === 'owner' && a.active);
    expect(owners.map(a => a.id)).toEqual([me.id]);
    expect((await owner.patch(`/admin/admins/${me.id}`, { role: 'editor' })).status).toBe(409);
  });
});
