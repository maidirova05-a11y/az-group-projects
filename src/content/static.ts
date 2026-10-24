/**
 * Статический контент сайта в формате ответа API (PublicContent), собранный из src/data/*.ts.
 * С ним сайт рисуется мгновенно и продолжает работать, если API недоступно.
 * Правила сопоставления повторяют server/db/seed.ts — живые данные и запасные совпадают.
 * Для kk/en поверх русского накладываются переводы src/i18n/content/{kk,en}.ts по тем же правилам,
 * что в публичном API (server/lib/i18n.ts): непустой перевод заменяет русский, иначе — русский.
 */
import type { ContentTranslationSource, Lang } from '@shared/i18n';
import type { EventDTO, PublicContent } from '@shared/schemas';
import { calendarPrograms } from '../data/calendar';
import { companyPrograms, projects as siteProjects } from '../data/projects';
import { about, achievements, contacts, faq, keyStats, links, news, newsUrl, partners } from '../data/site';
import kkContent from '../i18n/content/kk';
import enContent from '../i18n/content/en';

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const SOURCES: Partial<Record<Lang, ContentTranslationSource>> = { kk: kkContent, en: enContent };

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

/** Строковые поля перевода поверх русских: только непустые и только существующие строковые поля. */
function overlay<T extends object>(row: T, tr: object | undefined): T {
  if (!tr) return row;
  const out = { ...row } as Record<string, unknown>;
  for (const [k, v] of Object.entries(tr)) {
    if (typeof v === 'string' && v.trim() && typeof out[k] === 'string') out[k] = v.trim();
  }
  return out as T;
}

/** Глубокое слияние настроек: массив перевода — только той же длины, нестроковые значения — русские. */
function merge<T>(original: T, translated: unknown): T {
  if (typeof original === 'string') return (typeof translated === 'string' && translated.trim() ? translated.trim() : original) as T;
  if (Array.isArray(original)) {
    if (!Array.isArray(translated) || translated.length !== original.length) return original;
    return original.map((item, i) => merge(item, translated[i])) as T;
  }
  if (isObj(original)) {
    if (!isObj(translated)) return original;
    const out: Record<string, unknown> = { ...original };
    for (const k of Object.keys(original)) if (k in translated) out[k] = merge(original[k], translated[k]);
    return out as T;
  }
  return original;
}

const cache = new Map<Lang, PublicContent>();

export function buildStaticContent(lang: Lang = 'ru'): PublicContent {
  const hit = cache.get(lang);
  if (hit) return hit;
  const tr = SOURCES[lang];

  let eventId = 0;
  const programs = calendarPrograms.map((p, i) => {
    const id = i + 1;
    const events: EventDTO[] = p.events
      .map((e, j) => overlay({
        id: ++eventId, programId: id, label: e.label, place: e.place,
        startDate: e.start ?? null, endDate: e.end ?? null, monthOnly: e.monthOnly ?? false,
        registrationUrl: null, price: null, sort: j,
      }, tr?.events[`${p.id}#${j}`]))
      // Как в API: по дате начала, события без даты — в конце.
      .sort((a, b) => (a.startDate ?? '9999').localeCompare(b.startDate ?? '9999') || a.sort - b.sort);
    return overlay({
      id, slug: p.id, name: p.name, subtitle: p.subtitle, category: p.category, color: p.color,
      projectSlug: p.projectSlug ?? null, sort: i, published: true, events,
    }, tr?.programs[p.id]);
  });

  const projects = [
    ...siteProjects.map((p, i) => overlay({
      id: i + 1, slug: p.slug, kind: 'site' as const, name: p.name, tagline: p.tagline, description: p.description,
      category: p.category as string, url: p.url, domain: p.domain, logo: p.logo, logoScale: p.logoScale, sort: i, published: true,
    }, tr?.projects[p.slug])),
    ...companyPrograms.map((p, i) => {
      const slug = slugify(p.name);
      return overlay({
        id: siteProjects.length + i + 1, slug, kind: 'program' as const, name: p.name, tagline: p.tagline,
        description: p.description, category: p.category as string, url: null, domain: null, logo: null, logoScale: 1,
        sort: siteProjects.length + i, published: true,
      }, tr?.projects[slug]);
    }),
  ];

  const settings: PublicContent['settings'] = {
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

  const content: PublicContent = {
    lang,
    programs,
    projects,
    news: news.map(n => overlay({ id: n.id, title: n.title, date: n.date, image: n.image, body: '', externalUrl: newsUrl(n.id), published: true }, tr?.news[String(n.id)])),
    partners: partners.map((p, i) => overlay({ id: i + 1, name: p.name, group: p.group, image: p.image ?? null, sort: i, published: true }, tr?.partners[p.name])),
    faqs: faq.map((f, i) => {
      const t = tr?.faqs[i];
      return overlay({ id: i + 1, question: f.q, answer: f.a, sort: i, published: true }, t && { question: t.question, answer: t.answer });
    }),
    settings: tr
      ? {
        contacts: merge(settings.contacts, tr.settings.contacts),
        links: settings.links,
        stats: merge(settings.stats, tr.settings.stats),
        about: merge(settings.about, tr.settings.about),
      }
      : settings,
  };
  cache.set(lang, content);
  return content;
}
