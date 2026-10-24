/**
 * GET /api/public/content?lang=ru|kk|en — весь опубликованный контент сайта одним запросом.
 * Для kk/en переводы из колонок `translations` подставляются поверх русского (server/lib/i18n.ts),
 * само поле `translations` в ответ не попадает. Язык — в query, поэтому CDN кэширует по URL.
 */
import { Hono } from 'hono';
import { asc, desc, eq, inArray, sql } from 'drizzle-orm';
import type { AppEnv } from '../types.js';
import { db, schema } from '../db/client.js';
import { SETTINGS, type EventDTO, type ProgramDTO, type PublicContent, type SettingKey } from '../../shared/schemas.js';
import { localize, localizeSetting, parseLang } from '../lib/i18n.js';
import { about, achievements, contacts, keyStats, links } from '../../src/data/site.js';

const { programs, events, projects, news, partners, faqs, settings } = schema;

/** Значения по умолчанию — если ключа нет в БД или он повреждён, сайт не ломается. */
export const DEFAULT_SETTINGS: PublicContent['settings'] = {
  contacts: { ...contacts },
  links: { ...links },
  stats: keyStats.map(s => ({ ...s })),
  about: {
    title: about.title,
    pillars: about.pillars.map(p => ({ title: p.title, text: p.text, image: p.image ?? null })),
    directions: [...about.directions],
    achievements: achievements.map(a => ({ ...a })),
  },
};

const SETTING_KEYS = Object.keys(SETTINGS) as SettingKey[];

/** Убирает служебные поля createdAt/updatedAt. */
function strip<T extends { createdAt?: unknown; updatedAt?: unknown }>(row: T): Omit<T, 'createdAt' | 'updatedAt'> {
  const { createdAt: _c, updatedAt: _u, ...rest } = row;
  return rest;
}

const r = new Hono<AppEnv>();

r.get('/content', async c => {
  const lang = parseLang(c.req.query('lang'));
  const d = db();
  const publishedProgramIds = d.select({ id: programs.id }).from(programs).where(eq(programs.published, true));

  const [programRows, eventRows, projectRows, newsRows, partnerRows, faqRows, settingRows] = await Promise.all([
    d.select().from(programs).where(eq(programs.published, true)).orderBy(asc(programs.sort), asc(programs.id)),
    d.select().from(events).where(inArray(events.programId, publishedProgramIds))
      .orderBy(sql`${events.startDate} asc nulls last`, asc(events.sort), asc(events.id)),
    d.select().from(projects).where(eq(projects.published, true)).orderBy(asc(projects.sort), asc(projects.id)),
    d.select().from(news).where(eq(news.published, true)).orderBy(desc(news.date), desc(news.id)),
    d.select().from(partners).where(eq(partners.published, true)).orderBy(asc(partners.sort), asc(partners.id)),
    d.select().from(faqs).where(eq(faqs.published, true)).orderBy(asc(faqs.sort), asc(faqs.id)),
    d.select().from(settings).where(inArray(settings.key, SETTING_KEYS)),
  ]);

  const eventsByProgram = new Map<number, EventDTO[]>();
  for (const e of eventRows) {
    const list = eventsByProgram.get(e.programId) ?? [];
    list.push(localize(strip(e), lang));
    eventsByProgram.set(e.programId, list);
  }
  const programDTOs: ProgramDTO[] = programRows.map(p => ({ ...localize(strip(p), lang), events: eventsByProgram.get(p.id) ?? [] }));

  const stored = new Map(settingRows.map(s => [s.key, s.value]));
  const storedTr = new Map(settingRows.map(s => [s.key, s.translations]));
  const resolved = {} as Record<SettingKey, unknown>;
  for (const key of SETTING_KEYS) {
    const parsed = stored.has(key) ? SETTINGS[key].safeParse(stored.get(key)) : undefined;
    if (parsed && !parsed.success) console.warn(`[public] настройка "${key}" повреждена — используется значение по умолчанию`);
    // Переводы применяем и к значению по умолчанию: строка настройки могла остаться только с translations.
    resolved[key] = localizeSetting(parsed?.success ? parsed.data : DEFAULT_SETTINGS[key], storedTr.get(key), lang);
  }

  const loc = <T extends { translations?: unknown; createdAt?: unknown; updatedAt?: unknown }>(row: T) => localize(strip(row), lang);
  const payload: PublicContent & { lang: typeof lang } = {
    lang,
    programs: programDTOs,
    projects: projectRows.map(loc),
    news: newsRows.map(loc),
    partners: partnerRows.map(loc),
    faqs: faqRows.map(loc),
    settings: resolved as PublicContent['settings'],
  };

  c.header('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=600');
  return c.json(payload);
});

export default r;
