/**
 * Начальное наполнение БД из статических данных сайта (src/data/*.ts).
 * Скрипт: `npm run db:seed` — заполняет, только если таблица programs пуста;
 * `npm run db:seed -- --reset` — очищает контент (кроме admins и leads) и заполняет заново;
 * `npm run db:seed -- --translations-only` — только (пере)применяет переводы kk/en из
 * src/i18n/content/{kk,en}.ts к уже существующим строкам (русский контент и id не трогает).
 * После обычного сида переводы применяются автоматически, если эти файлы есть.
 */
import { pathToFileURL } from 'node:url';
import { eq, sql } from 'drizzle-orm';
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import type { ContentTranslationSource, Lang } from '../../shared/i18n.js';
import { SETTINGS, type SettingKey } from '../../shared/schemas.js';
import { calendarPrograms } from '../../src/data/calendar.js';
import { companyPrograms, projects as siteProjects } from '../../src/data/projects.js';
import { about, achievements, contacts, faq, keyStats, links, news as siteNews, newsUrl, partners as sitePartners } from '../../src/data/site.js';
import * as schema from './schema.js';

type SeedDb = PostgresJsDatabase<any>;

/** Таблицы контента, которые очищает --reset. admins, leads и audit_log не трогаем. */
const CONTENT_TABLES = ['events', 'programs', 'projects', 'news', 'partners', 'faqs', 'settings'];

/** «Global Edtech Festival» → «global-edtech-festival». */
const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

/** Значения настроек, проверенные схемами из shared/schemas.ts. */
function settingsRows() {
  const raw: Record<SettingKey, unknown> = {
    contacts,
    links,
    stats: keyStats,
    about: { ...about, achievements },
  };
  return (Object.keys(SETTINGS) as SettingKey[]).map(key => ({ key, value: SETTINGS[key].parse(raw[key]) }));
}

// ---------- Переводы ----------

type TrLang = Exclude<Lang, 'ru'>;
export type TranslationSources = Partial<Record<TrLang, ContentTranslationSource>>;
export interface TranslationsResult { langs: TrLang[]; rows: number; missing: string[] }

/**
 * Загружает src/i18n/content/{kk,en}.ts, если они есть. Импорт по вычисляемому URL —
 * сид, тесты и typecheck работают и без этих файлов.
 */
export async function loadTranslationSources(): Promise<TranslationSources> {
  const out: TranslationSources = {};
  for (const lang of ['kk', 'en'] as const) {
    try {
      const url = new URL(`../../src/i18n/content/${lang}.ts`, import.meta.url).href;
      const mod = (await import(/* @vite-ignore */ url)) as { default?: ContentTranslationSource };
      if (mod.default && typeof mod.default === 'object') out[lang] = mod.default;
    } catch (e) {
      const missing = (e as { code?: string }).code === 'ERR_MODULE_NOT_FOUND' || /Cannot find module|Failed to load url|does not exist/i.test(String(e));
      if (!missing) console.warn(`[seed] переводы ${lang} не загружены:`, e);
    }
  }
  return out;
}

type Tx = Parameters<Parameters<SeedDb['transaction']>[0]>[0];
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
/** jsonb `||` верхнего уровня: присланные языки заменяются целиком, остальные сохраняются. */
const mergeJson = (column: unknown, tr: Record<string, unknown>) =>
  sql`coalesce(${column}, '{}'::jsonb) || ${JSON.stringify(tr)}::jsonb`;

/**
 * Применяет переводы к существующим строкам по естественным ключам (см. ContentTranslationSource):
 * программа — slug; событие — `${slug}#${индекс в src/data/calendar.ts}` (строка этой программы
 * с теми же русскими label+place, при повторах — с sort = индекс); проект — slug; новость — id из
 * src/data/site.ts (строка с тем же legacyId, externalUrl или заголовком); партнёр — русское название;
 * FAQ — индекс в src/data/site.ts (строка с тем же русским вопросом).
 * Строки, которых нет (удалены или русский текст изменён в админке), пропускаются — см. missing.
 */
export async function applyTranslations(db: SeedDb | Tx, sources: TranslationSources): Promise<TranslationsResult> {
  const langs = (['kk', 'en'] as const).filter(l => sources[l]);
  const result: TranslationsResult = { langs: [...langs], rows: 0, missing: [] };
  if (!langs.length) return result;

  /** { kk: pick(src.kk), en: pick(src.en) } без отсутствующих языков; null — если переводов нет. */
  const collect = (pick: (s: ContentTranslationSource) => unknown) => {
    const tr: Record<string, unknown> = {};
    for (const l of langs) {
      const v = pick(sources[l]!);
      if (isObj(v) || Array.isArray(v)) tr[l] = v;
    }
    return Object.keys(tr).length ? tr : null;
  };
  const allKeys = (pick: (s: ContentTranslationSource) => object | undefined) =>
    [...new Set(langs.flatMap(l => Object.keys(pick(sources[l]!) ?? {})))];
  type AnyTable = typeof schema.faqs;
  const write = async (anyTable: unknown, id: number, tr: Record<string, unknown> | null) => {
    if (!tr) return;
    const table = anyTable as AnyTable;
    await db.update(table).set({ translations: mergeJson(table.translations, tr) } as never).where(eq(table.id, id));
    result.rows++;
  };

  // Программы и события
  const progRows = await db.select({ id: schema.programs.id, slug: schema.programs.slug }).from(schema.programs);
  const progBySlug = new Map(progRows.map(p => [p.slug, p.id]));
  for (const slug of allKeys(s => s.programs)) {
    const id = progBySlug.get(slug);
    if (!id) { result.missing.push(`program:${slug}`); continue; }
    await write(schema.programs, id, collect(s => s.programs?.[slug]));
  }
  const evRows = await db.select({
    id: schema.events.id, programId: schema.events.programId, label: schema.events.label, place: schema.events.place, sort: schema.events.sort,
  }).from(schema.events);
  for (const key of allKeys(s => s.events)) {
    const [slug, idx] = key.split('#');
    const j = Number(idx);
    const orig = calendarPrograms.find(p => p.id === slug)?.events[j];
    const programId = progBySlug.get(slug);
    const candidates = orig && programId
      ? evRows.filter(e => e.programId === programId && e.label === orig.label && e.place === orig.place) : [];
    const row = candidates.find(e => e.sort === j) ?? candidates[0];
    if (!row) { result.missing.push(`event:${key}`); continue; }
    await write(schema.events, row.id, collect(s => s.events?.[key]));
  }

  // Проекты
  const projRows = await db.select({ id: schema.projects.id, slug: schema.projects.slug }).from(schema.projects);
  const projBySlug = new Map(projRows.map(p => [p.slug, p.id]));
  for (const slug of allKeys(s => s.projects)) {
    const id = projBySlug.get(slug);
    if (!id) { result.missing.push(`project:${slug}`); continue; }
    await write(schema.projects, id, collect(s => s.projects?.[slug]));
  }

  // Новости
  const newsRows = await db.select({ id: schema.news.id, title: schema.news.title, externalUrl: schema.news.externalUrl, legacyId: schema.news.legacyId }).from(schema.news);
  for (const key of allKeys(s => s.news)) {
    const orig = siteNews.find(n => String(n.id) === key);
    const row = orig && (newsRows.find(n => n.legacyId === orig.id) ?? newsRows.find(n => n.externalUrl === newsUrl(orig.id)) ?? newsRows.find(n => n.title === orig.title));
    if (!row) { result.missing.push(`news:${key}`); continue; }
    await write(schema.news, row.id, collect(s => s.news?.[key]));
  }

  // Партнёры (по русскому названию; одноимённые строки получают один перевод)
  const partnerRows = await db.select({ id: schema.partners.id, name: schema.partners.name }).from(schema.partners);
  for (const name of allKeys(s => s.partners)) {
    const rows = partnerRows.filter(p => p.name === name);
    if (!rows.length) { result.missing.push(`partner:${name}`); continue; }
    for (const row of rows) await write(schema.partners, row.id, collect(s => s.partners?.[name]));
  }

  // FAQ
  const faqRows = await db.select({ id: schema.faqs.id, question: schema.faqs.question, sort: schema.faqs.sort }).from(schema.faqs);
  const faqCount = Math.max(0, ...langs.map(l => sources[l]!.faqs?.length ?? 0));
  for (let i = 0; i < faqCount; i++) {
    const orig = faq[i];
    const candidates = orig ? faqRows.filter(f => f.question === orig.q) : [];
    const row = candidates.find(f => f.sort === i) ?? candidates[0];
    if (!row) { result.missing.push(`faq:${i}`); continue; }
    await write(schema.faqs, row.id, collect(s => s.faqs?.[i]));
  }

  // Настройки
  const settingKeys = new Set((await db.select({ key: schema.settings.key }).from(schema.settings)).map(r => r.key));
  for (const key of allKeys(s => s.settings)) {
    if (!settingKeys.has(key)) { result.missing.push(`setting:${key}`); continue; }
    const tr = collect(s => (s.settings as Record<string, unknown> | undefined)?.[key]);
    if (!tr) continue;
    await db.update(schema.settings).set({ translations: mergeJson(schema.settings.translations, tr) } as never)
      .where(eq(schema.settings.key, key));
    result.rows++;
  }
  return result;
}

export interface SeedResult { skipped: boolean; translations?: TranslationsResult }

/**
 * Заполняет контент, если таблица programs пуста (иначе skipped: true — данные уже есть).
 * С reset: true сначала очищает таблицы контента (TRUNCATE … RESTART IDENTITY) и заполняет заново.
 * Затем применяет переводы: `translations` (если передан) или файлы src/i18n/content/{kk,en}.ts.
 */
export async function seed(
  db: SeedDb,
  { reset = false, translations }: { reset?: boolean; translations?: TranslationSources } = {},
): Promise<SeedResult> {
  const settings = settingsRows(); // валидируем до любых изменений в БД
  const sources = translations ?? await loadTranslationSources();

  return db.transaction(async tx => {
    if (reset) {
      await tx.execute(sql.raw(`TRUNCATE ${CONTENT_TABLES.join(', ')} RESTART IDENTITY CASCADE`));
    } else {
      const [{ n }] = await tx.select({ n: sql<number>`count(*)::int` }).from(schema.programs);
      if (n > 0) return { skipped: true };
    }

    for (const [i, p] of calendarPrograms.entries()) {
      const [row] = await tx.insert(schema.programs).values({
        slug: p.id, name: p.name, subtitle: p.subtitle, category: p.category, color: p.color,
        projectSlug: p.projectSlug ?? null, paymentUrl: p.paymentUrl ?? null, sort: i,
      }).returning({ id: schema.programs.id });
      if (p.events.length) {
        await tx.insert(schema.events).values(p.events.map((e, j) => ({
          programId: row.id, label: e.label, place: e.place,
          startDate: e.start ?? null, endDate: e.end ?? null, monthOnly: e.monthOnly ?? false, price: e.price ?? null, sort: j,
        })));
      }
    }

    await tx.insert(schema.projects).values([
      ...siteProjects.map((p, i) => ({
        slug: p.slug, kind: 'site' as const, name: p.name, tagline: p.tagline, description: p.description,
        category: p.category, url: p.url, domain: p.domain, logo: p.logo, logoScale: p.logoScale, sort: i,
      })),
      ...companyPrograms.map((p, i) => ({
        slug: slugify(p.name), kind: 'program' as const, name: p.name, tagline: p.tagline, description: p.description,
        category: p.category, sort: siteProjects.length + i,
      })),
    ]);

    await tx.insert(schema.news).values(siteNews.map(n => ({
      title: n.title, date: n.date, image: n.image, body: n.body, externalUrl: null, legacyId: n.id,
    })));

    await tx.insert(schema.partners).values(sitePartners.map((p, i) => ({
      name: p.name, group: p.group, image: p.image ?? null, sort: i,
    })));

    await tx.insert(schema.faqs).values(faq.map((f, i) => ({ question: f.q, answer: f.a, sort: i })));
    // Ключи, уже заданные в админке, не перезаписываем.
    await tx.insert(schema.settings).values(settings).onConflictDoNothing();
    return { skipped: false, translations: await applyTranslations(tx, sources) };
  });
}

/** Только переводы: к существующим строкам, без изменения русского контента и id. */
export async function seedTranslationsOnly(db: SeedDb, sources?: TranslationSources): Promise<TranslationsResult> {
  const src = sources ?? await loadTranslationSources();
  return db.transaction(tx => applyTranslations(tx, src));
}

function describeTr(t?: TranslationsResult): string {
  if (!t) return '';
  if (!t.langs.length) return '; файлов переводов нет (src/i18n/content/{kk,en}.ts)';
  const miss = t.missing.length ? `, не найдено ${t.missing.length}: ${t.missing.slice(0, 10).join(', ')}${t.missing.length > 10 ? '…' : ''}` : '';
  return `; переводы ${t.langs.join('+')}: обновлено строк ${t.rows}${miss}`;
}

/** Запуск как скрипта: `npm run db:seed [-- --reset | --translations-only]`. */
const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('Не задан DATABASE_URL');
    process.exit(1);
  }
  const reset = process.argv.includes('--reset');
  const trOnly = process.argv.includes('--translations-only');
  const client = postgres(url, { max: 1, onnotice: () => {} });
  const db = drizzle(client, { schema });
  const run = trOnly
    ? seedTranslationsOnly(db).then(t => console.log(`Сид --translations-only${describeTr(t)}`))
    : seed(db, { reset }).then(({ skipped, translations }) => console.log(skipped
      ? 'Сид: данные уже есть, ничего не добавлено (перезаполнить: -- --reset; только переводы: -- --translations-only)'
      : `Сид${reset ? ' (reset)' : ''}: контент заполнен${describeTr(translations)}`));
  run
    .catch(err => { console.error('Ошибка сида:', err); process.exitCode = 1; })
    .finally(() => client.end());
}
