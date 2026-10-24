/**
 * Разделы публичного сайта — единый список для фронтенда (src/router.ts) и бэкенда (sitemap).
 * Язык — префикс пути: русский без префикса (/events), казахский /kk/events, английский /en/events.
 */
import { DEFAULT_LANG, type Lang } from './i18n.js';

export const SITE_ROUTES = ['/', '/events', '/projects', '/about', '/news', '/partners', '/faq', '/contacts'] as const;
export type Route = (typeof SITE_ROUTES)[number];

/** Адрес раздела на языке: ru — без префикса, иначе /kk/…, /en/… (главная — /kk, /en). */
export function routePath(path: string, lang: Lang): string {
  if (lang === DEFAULT_LANG) return path;
  return `/${lang}${path === '/' ? '' : path}`;
}
