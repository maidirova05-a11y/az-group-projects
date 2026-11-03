/**
 * Разделы публичного сайта — единый список для фронтенда (src/router.ts) и бэкенда (sitemap).
 * Язык — префикс пути: русский без префикса (/events), казахский /kk/events, английский /en/events.
 */
import { DEFAULT_LANG, type Lang } from './i18n.js';

export const SITE_ROUTES = ['/', '/events', '/projects', '/about', '/news', '/partners', '/faq', '/contacts', '/register', '/offer', '/privacy'] as const;
export type Route = (typeof SITE_ROUTES)[number];

/** Слаг страницы проекта: латиница, цифры, дефис (как projects.slug в базе). */
export const PROJECT_SLUG_RE = /^[a-z0-9-]{1,60}$/;
/** Путь страницы проекта без языка: /projects/<slug>. */
export const projectPath = (slug: string) => `/projects/${slug}`;

/** Адрес раздела на языке: ru — без префикса, иначе /kk/…, /en/… (главная — /kk, /en). */
export function routePath(path: string, lang: Lang): string {
  if (lang === DEFAULT_LANG) return path;
  return `/${lang}${path === '/' ? '' : path}`;
}
