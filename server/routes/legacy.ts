/**
 * Старые адреса сайта az-group.kz → основной сайт (301). Нужны, когда домен az-group.kz подключат к этому проекту
 * (vercel.json: redirects по host) или когда ссылки старого формата попадают на www.azgroup.kz.
 *   GET /api/legacy/news/:id?lang=kk — новость со старым номером → /news?id=<новый id> (на языке lang), нет такой → /news
 */
import { Hono } from 'hono';
import { and, eq } from 'drizzle-orm';
import type { AppEnv } from '../types.js';
import { db, schema } from '../db/client.js';
import { parseLang } from '../lib/i18n.js';
import { routePath } from '../../shared/routes.js';
import { SITE_ORIGIN } from './sitemap.js';

const r = new Hono<AppEnv>();

r.get('/news/:id', async c => {
  const lang = parseLang(c.req.query('lang'));
  const legacyId = Number(c.req.param('id'));
  let target = routePath('/news', lang);
  if (Number.isInteger(legacyId) && legacyId > 0) {
    const [row] = await db().select({ id: schema.news.id }).from(schema.news)
      .where(and(eq(schema.news.legacyId, legacyId), eq(schema.news.published, true))).limit(1);
    if (row) target = `${routePath('/news', lang)}?id=${row.id}`;
  }
  c.header('Cache-Control', 'public, s-maxage=86400');
  return c.redirect(`${SITE_ORIGIN}${target}`, 301);
});

export default r;
