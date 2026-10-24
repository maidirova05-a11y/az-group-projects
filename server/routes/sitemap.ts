/**
 * GET /api/sitemap.xml — карта сайта из базы: разделы × языки (с hreflang-альтернативами) и
 * опубликованные новости с текстом (адрес /news?id=N на каждом языке, lastmod по updated_at).
 * На Vercel /sitemap.xml переписывается сюда (vercel.json), поэтому поисковики всегда видят свежий список.
 */
import { Hono } from 'hono';
import { and, desc, eq, sql } from 'drizzle-orm';
import type { AppEnv } from '../types.js';
import { db, schema } from '../db/client.js';
import { DEFAULT_LANG, LANGS } from '../../shared/i18n.js';
import { SITE_ROUTES, routePath } from '../../shared/routes.js';

export const SITE_ORIGIN = (process.env.SITE_ORIGIN || 'https://www.azgroup.kz').replace(/\/+$/, '');

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const url = (path: string, lang: (typeof LANGS)[number]) => `${SITE_ORIGIN}${routePath(path, lang)}`;
const day = (d: Date | string) => (typeof d === 'string' ? d : d.toISOString().slice(0, 10));

/** Приоритет и частота обновления раздела. */
const PRIORITY: Record<string, string> = { '/': '1.0', '/events': '0.9', '/projects': '0.8', '/faq': '0.7', '/news': '0.7' };
const WEEKLY = new Set(['/', '/events', '/news']);

function entry(path: string, lastmod: string | null, priority: string, changefreq: string): string {
  return LANGS.map(lang => [
    '  <url>',
    `    <loc>${esc(url(path, lang))}</loc>`,
    ...LANGS.map(l => `    <xhtml:link rel="alternate" hreflang="${l}" href="${esc(url(path, l))}"/>`),
    `    <xhtml:link rel="alternate" hreflang="x-default" href="${esc(url(path, DEFAULT_LANG))}"/>`,
    ...(lastmod ? [`    <lastmod>${lastmod}</lastmod>`] : []),
    `    <changefreq>${changefreq}</changefreq>`,
    `    <priority>${priority}</priority>`,
    '  </url>',
  ].join('\n')).join('\n');
}

export async function buildSitemap(): Promise<string> {
  const d = db();
  const { news, events, programs } = schema;
  const [articles, [content]] = await Promise.all([
    d.select({ id: news.id, date: news.date, updatedAt: news.updatedAt }).from(news)
      .where(and(eq(news.published, true), sql`${news.body} <> ''`)).orderBy(desc(news.date), desc(news.id)).limit(1000),
    // Последнее изменение контента календаря — lastmod главной и раздела «Мероприятия».
    d.select({ at: sql<string | null>`to_char(greatest(max(${events.updatedAt}), max(${programs.updatedAt})) at time zone 'UTC', 'YYYY-MM-DD')` })
      .from(events).fullJoin(programs, sql`true`),
  ]);
  const contentDay = content?.at ?? null;
  const newsDay = articles[0] ? day(articles[0].updatedAt) : null;

  const parts = SITE_ROUTES.map(path => {
    const lastmod = path === '/' || path === '/events' ? contentDay : path === '/news' ? newsDay : null;
    return entry(path, lastmod, PRIORITY[path] ?? '0.6', WEEKLY.has(path) ? 'weekly' : 'monthly');
  });
  for (const a of articles) parts.push(entry(`/news?id=${a.id}`, day(a.updatedAt > new Date(a.date) ? a.updatedAt : a.date), '0.5', 'yearly'));

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${parts.join('\n')}
</urlset>
`;
}

const r = new Hono<AppEnv>();

r.get('/sitemap.xml', async c => {
  const xml = await buildSitemap();
  c.header('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  return c.body(xml, 200, { 'Content-Type': 'application/xml; charset=utf-8' });
});

export default r;
