/**
 * Сводка для дашборда админки. Монтируется на /api/admin/stats.
 * Даты («сегодня», дни заявок) считаются по Asia/Almaty на стороне PostgreSQL.
 */
import { Hono } from 'hono';
import { count, desc, eq, sql } from 'drizzle-orm';
import type { AppEnv } from '../../types.js';
import { db, schema } from '../../db/client.js';

const { programs, events, projects, news, partners, faqs, leads, auditLog, admins } = schema;
const r = new Hono<AppEnv>();

const TZ = 'Asia/Almaty';
const todayAlmaty = sql`(now() at time zone ${sql.raw(`'${TZ}'`)})::date`;

r.get('/', async c => {
  const d = db();
  const n = (rows: { n: number }[]) => Number(rows[0]?.n ?? 0);
  const [p, e, up, pr, nw, pa, fq, ln, lt, byDay, recent] = await Promise.all([
    d.select({ n: count() }).from(programs),
    d.select({ n: count() }).from(events),
    d.select({ n: count() }).from(events).where(sql`coalesce(${events.endDate}, ${events.startDate}) >= ${todayAlmaty}`),
    d.select({ n: count() }).from(projects),
    d.select({ n: count() }).from(news),
    d.select({ n: count() }).from(partners),
    d.select({ n: count() }).from(faqs),
    d.select({ n: count() }).from(leads).where(eq(leads.status, 'new')),
    d.select({ n: count() }).from(leads),
    d.execute<{ date: string; count: number }>(sql`
      select to_char(g.day, 'YYYY-MM-DD') as date, count(l.id)::int as count
      from generate_series(${todayAlmaty} - 29, ${todayAlmaty}, interval '1 day') as g(day)
      left join ${leads} l
        on l.created_at >= (g.day::timestamp at time zone ${sql.raw(`'${TZ}'`)})
       and l.created_at <  ((g.day + interval '1 day')::timestamp at time zone ${sql.raw(`'${TZ}'`)})
      group by g.day
      order by g.day`),
    d.select({
      id: auditLog.id, action: auditLog.action, entity: auditLog.entity, entityId: auditLog.entityId,
      adminName: admins.name, createdAt: auditLog.createdAt,
    }).from(auditLog).leftJoin(admins, eq(auditLog.adminId, admins.id)).orderBy(desc(auditLog.createdAt), desc(auditLog.id)).limit(20),
  ]);

  return c.json({
    counts: {
      programs: n(p), events: n(e), upcomingEvents: n(up), projects: n(pr), news: n(nw),
      partners: n(pa), faqs: n(fq), leadsNew: n(ln), leadsTotal: n(lt),
    },
    leadsByDay: [...byDay].map(x => ({ date: x.date, count: Number(x.count) })),
    recentAudit: recent.map(a => ({ ...a, createdAt: a.createdAt.toISOString() })),
  });
});

export default r;
