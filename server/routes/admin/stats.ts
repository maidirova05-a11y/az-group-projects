/**
 * Сводка для дашборда админки. Монтируется на /api/admin/stats.
 * Даты («сегодня», дни заявок) считаются по Asia/Almaty на стороне PostgreSQL.
 */
import { Hono } from 'hono';
import { count, desc, eq, sql } from 'drizzle-orm';
import type { AppEnv } from '../../types.js';
import { db, schema } from '../../db/client.js';

const { programs, events, projects, news, partners, faqs, leads, registrations, auditLog, admins } = schema;
const r = new Hono<AppEnv>();

const TZ = 'Asia/Almaty';
const todayAlmaty = sql`(now() at time zone ${sql.raw(`'${TZ}'`)})::date`;

r.get('/', async c => {
  const d = db();
  const n = (rows: { n: number }[]) => Number(rows[0]?.n ?? 0);
  const [p, e, up, pr, nw, pa, fq, ln, lt, rn, rt, byDay, bySource, byLang, recent] = await Promise.all([
    d.select({ n: count() }).from(programs),
    d.select({ n: count() }).from(events),
    d.select({ n: count() }).from(events).where(sql`coalesce(${events.endDate}, ${events.startDate}) >= ${todayAlmaty}`),
    d.select({ n: count() }).from(projects),
    d.select({ n: count() }).from(news),
    d.select({ n: count() }).from(partners),
    d.select({ n: count() }).from(faqs),
    d.select({ n: count() }).from(leads).where(eq(leads.status, 'new')),
    d.select({ n: count() }).from(leads),
    d.select({ n: count() }).from(registrations).where(eq(registrations.status, 'new')),
    d.select({ n: count() }).from(registrations),
    d.execute<{ date: string; count: number }>(sql`
      select to_char(g.day, 'YYYY-MM-DD') as date, count(l.id)::int as count
      from generate_series(${todayAlmaty} - 29, ${todayAlmaty}, interval '1 day') as g(day)
      left join ${leads} l
        on l.created_at >= (g.day::timestamp at time zone ${sql.raw(`'${TZ}'`)})
       and l.created_at <  ((g.day + interval '1 day')::timestamp at time zone ${sql.raw(`'${TZ}'`)})
      group by g.day
      order by g.day`),
    // Откуда пришли заявки за 30 дней: utm_source, иначе хост перехода, иначе «direct» — видно, какие каналы и запросы работают.
    d.execute<{ source: string; count: number }>(sql`
      select coalesce(nullif(${leads.utm}->>'source', ''), split_part(${leads.referrer}, '/', 1), 'direct') as source, count(*)::int as count
      from ${leads}
      where ${leads.createdAt} >= (${todayAlmaty} - 29)::timestamp at time zone ${sql.raw(`'${TZ}'`)}
      group by 1
      order by count desc, source
      limit 10`),
    d.execute<{ lang: string; count: number }>(sql`
      select coalesce(${leads.lang}, 'ru') as lang, count(*)::int as count
      from ${leads}
      where ${leads.createdAt} >= (${todayAlmaty} - 29)::timestamp at time zone ${sql.raw(`'${TZ}'`)}
      group by 1
      order by count desc, lang`),
    d.select({
      id: auditLog.id, action: auditLog.action, entity: auditLog.entity, entityId: auditLog.entityId,
      adminName: admins.name, createdAt: auditLog.createdAt,
    }).from(auditLog).leftJoin(admins, eq(auditLog.adminId, admins.id)).orderBy(desc(auditLog.createdAt), desc(auditLog.id)).limit(20),
  ]);

  return c.json({
    counts: {
      programs: n(p), events: n(e), upcomingEvents: n(up), projects: n(pr), news: n(nw),
      partners: n(pa), faqs: n(fq), leadsNew: n(ln), leadsTotal: n(lt), registrationsNew: n(rn), registrationsTotal: n(rt),
    },
    leadsByDay: [...byDay].map(x => ({ date: x.date, count: Number(x.count) })),
    leadsBySource: [...bySource].map(x => ({ source: x.source, count: Number(x.count) })),
    leadsByLang: [...byLang].map(x => ({ lang: x.lang, count: Number(x.count) })),
    recentAudit: recent.map(a => ({ ...a, createdAt: a.createdAt.toISOString() })),
  });
});

export default r;
