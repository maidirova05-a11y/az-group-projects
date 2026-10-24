/**
 * SEO в рантайме (SPA): <html lang>, document.title, meta description, Open Graph,
 * canonical на текущий язык и <link rel="alternate" hreflang="ru|kk|en|x-default">.
 * Адреса языков: https://www.azgroup.kz/<путь> (ru, x-default), /kk/<путь>, /en/<путь>.
 */
import { useEffect } from 'react';
import { LANGS } from '@shared/i18n';
import { useI18n } from '../i18n';
import { localizeHref, NAV, type Route } from '../router';

export const SITE_ORIGIN = 'https://www.azgroup.kz';

function meta(selector: string, attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
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

/**
 * title — заголовок страницы без суффикса (для новости — её заголовок); description — описание страницы.
 * search — значимая часть запроса для canonical (например, «?id=5» у новости), иначе пусто.
 */
export function useSeo({ path, title, description, search = '' }: { path: Route; title?: string; description?: string; search?: string }) {
  const { lang, t } = useI18n();
  useEffect(() => {
    const nav = NAV.find(n => n.path === path)!;
    const pageTitle = title ?? t.nav[nav.key].title;
    const fullTitle = path === '/' && !title ? t.seo.homeTitle : `${pageTitle}${t.seo.titleSuffix}`;
    const desc = description || t.seo.description;
    const url = (l: typeof lang) => `${SITE_ORIGIN}${localizeHref(`${path}${search}`, l)}`;

    document.documentElement.lang = lang;
    document.title = fullTitle;
    meta('meta[name="description"]', 'name', 'description', desc);
    meta('meta[property="og:title"]', 'property', 'og:title', fullTitle);
    meta('meta[property="og:description"]', 'property', 'og:description', desc);
    meta('meta[property="og:url"]', 'property', 'og:url', url(lang));
    meta('meta[property="og:locale"]', 'property', 'og:locale', t.seo.ogLocale);
    link('canonical', url(lang));
    LANGS.forEach(l => link('alternate', url(l), l));
    link('alternate', url('ru'), 'x-default');
  }, [lang, t, path, title, description, search]);
}
