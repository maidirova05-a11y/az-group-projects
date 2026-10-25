import { describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { LANGS } from '../shared/i18n';
import { SITE_ROUTES } from '../shared/routes';
import { Client, db, schema } from './helpers';
import { invalidatePublicCache } from '../server/lib/cache';

describe('GET /api/sitemap.xml', () => {
  it('lists every section in every language with hreflang alternates and caches', async () => {
    const res = await new Client().get('/sitemap.xml');
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toMatch(/application\/xml/);
    expect(res.headers.get('cache-control')).toBe('public, s-maxage=3600, stale-while-revalidate=86400');
    const xml = await res.text();
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml).toContain('<loc>https://www.azgroup.kz/</loc>');
    expect(xml).toContain('<loc>https://www.azgroup.kz/kk</loc>');
    expect(xml).toContain('<loc>https://www.azgroup.kz/en/events</loc>');
    expect(xml).toContain('<xhtml:link rel="alternate" hreflang="x-default" href="https://www.azgroup.kz/events"/>');
    const locs = xml.match(/<loc>/g)?.length ?? 0;
    expect(locs).toBeGreaterThanOrEqual(SITE_ROUTES.length * LANGS.length);
    expect(xml).not.toContain('/admin');
    // Страницы проектов на всех языках.
    expect(xml).toContain('<loc>https://www.azgroup.kz/projects/fibonacci</loc>');
    expect(xml).toContain('<loc>https://www.azgroup.kz/kk/projects/itecx</loc>');
    expect(xml).toContain('<loc>https://www.azgroup.kz/en/projects/astanatechcup</loc>');
  });

  it('includes published news with body (all languages, lastmod) and skips unpublished', async () => {
    const [shown] = await db().insert(schema.news).values({ title: 'Sitemap news', date: '2026-01-15', body: 'Текст новости', published: true }).returning();
    const [hidden] = await db().insert(schema.news).values({ title: 'Hidden news', date: '2026-01-16', body: 'Текст', published: false }).returning();
    const [linkOnly] = await db().insert(schema.news).values({ title: 'Link news', date: '2026-01-17', body: '', externalUrl: 'https://example.com', published: true }).returning();
    try {
      invalidatePublicCache(); // прямые записи в БД минуют audit()
      const xml = await (await new Client().get('/sitemap.xml')).text();
      expect(xml).toContain(`<loc>https://www.azgroup.kz/news?id=${shown.id}</loc>`);
      expect(xml).toContain(`<loc>https://www.azgroup.kz/kk/news?id=${shown.id}</loc>`);
      expect(xml).toContain(`<loc>https://www.azgroup.kz/en/news?id=${shown.id}</loc>`);
      expect(xml).toMatch(new RegExp(`news\\?id=${shown.id}</loc>[\\s\\S]*?<lastmod>\\d{4}-\\d{2}-\\d{2}</lastmod>`));
      expect(xml).not.toContain(`news?id=${hidden.id}<`);
      expect(xml).not.toContain(`news?id=${linkOnly.id}<`);
    } finally {
      for (const n of [shown, hidden, linkOnly]) await db().delete(schema.news).where(eq(schema.news.id, n.id));
    }
  });
});
