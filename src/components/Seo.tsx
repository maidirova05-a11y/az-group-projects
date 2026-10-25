/**
 * SEO в рантайме (SPA): <html lang>, document.title, meta description/keywords/robots, Open Graph,
 * canonical на текущий язык, <link rel="alternate" hreflang="ru|kk|en|x-default"> и JSON-LD (schema.org).
 * Адреса языков: https://www.azgroup.kz/<путь> (ru, x-default), /kk/<путь>, /en/<путь>.
 * Страница проекта /projects/<slug>: search = '/<slug>' (canonical и hreflang ведут на неё).
 * Тексты страниц — t.seo.pages[раздел] (src/i18n/ui/*): заголовок, описание и ключевые слова под запросы,
 * по которым ищут олимпиады, конкурсы и лагеря (см. docs/SEO.md).
 */
import { useEffect } from 'react';
import { LANGS } from '@shared/i18n';
import { useI18n } from '../i18n';
import { localizeHref, routeKey, type Route } from '../router';

export const SITE_ORIGIN = 'https://www.azgroup.kz';
export const DEFAULT_OG_IMAGE = `${SITE_ORIGIN}/images/og-cover.jpg`;

function meta(attr: 'name' | 'property', key: string, content: string | null) {
  const selector = `meta[${attr}="${key}"]`;
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (content == null) { el?.remove(); return; }
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.content = content;
}

function link(rel: string, href: string, hreflang?: string) {
  const selector = hreflang ? `link[rel="${rel}"][hreflang="${hreflang}"]` : `link[rel="${rel}"]:not([hreflang])`;
  let el = document.head.querySelector<HTMLLinkElement>(selector);
  if (!el) {
    el = document.createElement('link');
    el.rel = rel;
    if (hreflang) el.hreflang = hreflang;
    document.head.appendChild(el);
  }
  el.href = href;
}

/** Абсолютный адрес картинки для og:image: относительные пути сайта — от SITE_ORIGIN, чужие http(s) — как есть. */
export function absoluteImage(src: string | null | undefined): string | null {
  if (!src) return null;
  if (/^https?:\/\//i.test(src)) return src;
  if (src.startsWith('/') && !src.startsWith('//')) return `${SITE_ORIGIN}${src}`;
  return null;
}

const JSONLD_ID = 'seo-jsonld';

/** Один <script type="application/ld+json"> со всеми объектами страницы (@graph). CSP его не касается: такой скрипт не исполняется. */
function setJsonLd(graph: object[]) {
  let el = document.getElementById(JSONLD_ID) as HTMLScriptElement | null;
  if (!graph.length) { el?.remove(); return; }
  if (!el) {
    el = document.createElement('script');
    el.id = JSONLD_ID;
    el.type = 'application/ld+json';
    document.head.appendChild(el);
  }
  // «</script» внутри строк экранируем — иначе разметка оборвёт скрипт.
  el.textContent = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/<\//g, '<\\/');
}

export interface SeoProps {
  path: Route;
  /** Заголовок страницы без суффикса (для новости — её заголовок); по умолчанию — t.seo.pages[раздел].title (уже с суффиксом). */
  title?: string;
  description?: string;
  /** Ключевые слова через запятую; по умолчанию — t.seo.pages[раздел].keywords. */
  keywords?: string;
  /** Значимая часть запроса для canonical (например, «?id=5» у новости), иначе пусто. */
  search?: string;
  /** Картинка для соцсетей (новость); иначе общая обложка. */
  image?: string | null;
  /** Статья (новость): og:type=article и даты публикации/изменения (ISO). */
  article?: { published: string; modified?: string } | null;
  /** Объекты schema.org для этой страницы (без @context). */
  jsonLd?: object[];
  /** Страница «не найдено» и т.п. — robots noindex. */
  noindex?: boolean;
}

export function useSeo({ path, title, description, keywords, search = '', image, article, jsonLd = [], noindex = false }: SeoProps) {
  const { lang, t } = useI18n();
  useEffect(() => {
    const page = t.seo.pages[routeKey(path)];
    const fullTitle = title ? `${title}${t.seo.titleSuffix}` : page.title;
    const desc = description || page.description;
    const words = keywords || page.keywords;
    const url = (l: typeof lang) => `${SITE_ORIGIN}${localizeHref(`${path}${search}`, l)}`;
    const og = absoluteImage(image) ?? DEFAULT_OG_IMAGE;

    document.documentElement.lang = lang;
    document.title = fullTitle;
    meta('name', 'description', desc);
    meta('name', 'keywords', words);
    meta('name', 'robots', noindex ? 'noindex, follow' : 'index, follow, max-image-preview:large, max-snippet:-1');
    meta('property', 'og:type', article ? 'article' : 'website');
    meta('property', 'og:title', fullTitle);
    meta('property', 'og:description', desc);
    meta('property', 'og:url', url(lang));
    meta('property', 'og:locale', t.seo.ogLocale);
    meta('property', 'og:image', og);
    meta('name', 'twitter:image', og);
    meta('name', 'twitter:title', fullTitle);
    meta('name', 'twitter:description', desc);
    meta('property', 'article:published_time', article?.published ?? null);
    meta('property', 'article:modified_time', article?.modified ?? null);
    LANGS.filter(l => l !== lang).forEach((l, i) => meta('property', i === 0 ? 'og:locale:alternate' : `og:locale:alternate:${l}`, t.seo.ogLocales[l]));
    link('canonical', url(lang));
    LANGS.forEach(l => link('alternate', url(l), l));
    link('alternate', url('ru'), 'x-default');
    setJsonLd(jsonLd);
  }, [lang, t, path, title, description, keywords, search, image, article, jsonLd, noindex]);
}
