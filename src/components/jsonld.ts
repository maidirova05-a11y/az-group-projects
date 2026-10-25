/**
 * Структурированные данные schema.org (JSON-LD) для разделов сайта. Собираются в App.tsx и
 * вставляются одним <script type="application/ld+json"> через useSeo (src/components/Seo.tsx).
 * Конкуренты в нише почти не размечают события и вопросы — расширенные сниппеты (даты, цена, FAQ) выделяют нас в выдаче.
 */
import type { Lang } from '@shared/i18n';
import type { FaqDTO, NewsDTO, ProgramDTO, ProjectDTO, PublicContent } from '@shared/schemas';
import type { Dict } from '../i18n';
import { localizeHref, type Route } from '../router';
import { SITE_ORIGIN, absoluteImage, DEFAULT_OG_IMAGE } from './Seo';

const LOCALE: Record<Lang, string> = { ru: 'ru-RU', kk: 'kk-KZ', en: 'en-GB' };
const ORG_ID = `${SITE_ORIGIN}/#organization`;
const SITE_ID = `${SITE_ORIGIN}/#website`;

const pageUrl = (path: string, lang: Lang) => `${SITE_ORIGIN}${localizeHref(path, lang)}`;
const plain = (s: string) => s.replace(/\s+/g, ' ').trim();

/** Организация: контакты, адрес, соцсети — для карточки бренда в поиске. */
export function organization(settings: PublicContent['settings'], t: Dict, lang: Lang): object {
  const { contacts } = settings;
  const sameAs = [contacts.instagram, contacts.taplink, 'https://az-group.kz'].filter(Boolean);
  return {
    '@type': ['Organization', 'EducationalOrganization'],
    '@id': ORG_ID,
    name: 'AZ Group',
    alternateName: ['AZ Group Kazakhstan', 'АЗ Групп'],
    url: pageUrl('/', lang),
    // Google принимает логотип только растровым (не SVG), не меньше 112×112.
    logo: `${SITE_ORIGIN}/icon-512.png`,
    image: DEFAULT_OG_IMAGE,
    description: t.seo.pages.about.description,
    email: contacts.email || undefined,
    telephone: contacts.phone || undefined,
    address: { '@type': 'PostalAddress', streetAddress: contacts.address.replace(/ /g, ' '), addressLocality: 'Astana', addressCountry: 'KZ' },
    areaServed: ['KZ', 'Central Asia', 'CIS'],
    sameAs,
    contactPoint: contacts.phone ? [{
      '@type': 'ContactPoint', telephone: contacts.phone, contactType: 'customer service',
      availableLanguage: ['Russian', 'Kazakh', 'English'], areaServed: 'KZ',
    }] : undefined,
  };
}

/** Сайт с поиском по мероприятиям: /events?q=… */
export function website(lang: Lang, t: Dict): object {
  return {
    '@type': 'WebSite',
    '@id': SITE_ID,
    url: pageUrl('/', lang),
    name: 'AZ Group',
    description: t.seo.pages.home.description,
    inLanguage: LOCALE[lang],
    publisher: { '@id': ORG_ID },
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: `${pageUrl('/events', lang)}?q={search_term_string}` },
      'query-input': 'required name=search_term_string',
    },
  };
}

/** Хлебные крошки: Главная → Раздел (→ Новость). */
export function breadcrumbs(path: Route, lang: Lang, t: Dict, extra?: { name: string; url: string }): object | null {
  if (path === '/' && !extra) return null;
  const items = [{ name: t.layout.home, item: pageUrl('/', lang) }];
  if (path !== '/') items.push({ name: t.nav[nameKey(path)].label, item: pageUrl(path, lang) });
  if (extra) items.push({ name: extra.name, item: extra.url });
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((x, i) => ({ '@type': 'ListItem', position: i + 1, name: x.name, item: x.item })),
  };
}
const nameKey = (path: Route): keyof Dict['nav'] => (path === '/' ? 'home' : (path.slice(1) as keyof Dict['nav']));

/** Веб-страница раздела: язык, принадлежность сайту, описание. */
export function webPage(path: Route, lang: Lang, t: Dict, over: { name?: string; description?: string; url?: string } = {}): object {
  const page = t.seo.pages[nameKey(path)];
  return {
    '@type': 'WebPage',
    url: over.url ?? pageUrl(path, lang),
    name: over.name ?? page.title,
    description: over.description ?? page.description,
    inLanguage: LOCALE[lang],
    isPartOf: { '@id': SITE_ID },
    about: { '@id': ORG_ID },
  };
}

/** Мероприятия с известной датой начала — schema.org/Event (цена, место, регистрация). Прошедшие пропускаем. */
export function events(programs: ProgramDTO[], today: string, lang: Lang, projects: ProjectDTO[], limit = 40): object[] {
  const out: object[] = [];
  for (const p of programs) {
    const project = projects.find(x => x.slug === p.projectSlug);
    for (const e of p.events) {
      if (!e.startDate || (e.endDate ?? e.startDate) < today) continue;
      const place = plain(e.place);
      const online = /онлайн|online|желі/i.test(place);
      out.push({
        '@type': 'EducationEvent',
        name: `${plain(p.name)}: ${plain(e.label)}`,
        description: plain(p.subtitle) || undefined,
        startDate: e.startDate,
        endDate: e.endDate ?? undefined,
        eventStatus: 'https://schema.org/EventScheduled',
        eventAttendanceMode: online ? 'https://schema.org/OnlineEventAttendanceMode' : 'https://schema.org/OfflineEventAttendanceMode',
        location: online
          ? { '@type': 'VirtualLocation', url: pageUrl('/events', lang) }
          : { '@type': 'Place', name: place, address: place },
        organizer: { '@id': ORG_ID },
        image: absoluteImage(project?.logo) ?? DEFAULT_OG_IMAGE,
        url: `${pageUrl('/events', lang)}?q=${encodeURIComponent(p.name)}`,
        inLanguage: LOCALE[lang],
        audience: { '@type': 'EducationalAudience', educationalRole: 'student' },
        offers: e.price != null ? {
          '@type': 'Offer', price: e.price, priceCurrency: 'KZT', availability: 'https://schema.org/InStock',
          url: e.registrationUrl ?? pageUrl('/contacts', lang), validFrom: today,
        } : undefined,
      });
      if (out.length >= limit) return out;
    }
  }
  return out;
}

/** Страница вопросов — schema.org/FAQPage (вопросы раскрываются прямо в выдаче). */
export function faqPage(faqs: FaqDTO[]): object | null {
  if (!faqs.length) return null;
  return {
    '@type': 'FAQPage',
    mainEntity: faqs.map(f => ({
      '@type': 'Question', name: plain(f.question),
      acceptedAnswer: { '@type': 'Answer', text: plain(f.answer) },
    })),
  };
}

/** Новость с текстом — schema.org/NewsArticle. */
export function newsArticle(n: NewsDTO, lang: Lang, modified?: string): object {
  return {
    '@type': 'NewsArticle',
    headline: plain(n.title).slice(0, 110),
    datePublished: n.date,
    dateModified: modified ?? n.date,
    image: absoluteImage(n.image) ? [absoluteImage(n.image)] : [DEFAULT_OG_IMAGE],
    author: { '@id': ORG_ID },
    publisher: { '@id': ORG_ID },
    inLanguage: LOCALE[lang],
    mainEntityOfPage: `${pageUrl('/news', lang)}?id=${n.id}`,
    articleBody: plain(n.body).slice(0, 5000),
  };
}

/** Список новостей / проектов — ItemList со ссылками на карточки. */
export function itemList(name: string, items: { name: string; url: string; description?: string }[]): object | null {
  if (!items.length) return null;
  return {
    '@type': 'ItemList',
    name,
    numberOfItems: items.length,
    itemListElement: items.map((x, i) => ({ '@type': 'ListItem', position: i + 1, name: x.name, url: x.url, description: x.description })),
  };
}

/** Проекты компании — бренды/программы (Fibonacci, ITECX, Astana Tech Cup…) с сайтами. */
export function projectBrands(projects: ProjectDTO[], lang: Lang): object[] {
  return projects.filter(p => p.url).slice(0, 30).map(p => ({
    '@type': 'Brand',
    name: plain(p.name),
    description: plain(p.tagline || p.description) || undefined,
    url: p.url,
    logo: absoluteImage(p.logo) ?? undefined,
    sameAs: `${pageUrl('/projects', lang)}#${p.slug}`,
    brand: { '@id': ORG_ID },
  }));
}
