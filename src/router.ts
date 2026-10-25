import { useEffect, useState, useSyncExternalStore } from 'react';
import {
  CalendarDays, CircleHelp, Handshake, House, LayoutGrid, Building2, Newspaper, Phone, type LucideIcon,
} from 'lucide-react';
import { DEFAULT_LANG, LANGS, type Lang } from '@shared/i18n';
import { PROJECT_SLUG_RE, SITE_ROUTES, type Route } from '@shared/routes';

export type { Route };

/**
 * Маршруты сайта. Язык — префикс пути: русский без префикса (/events), казахский /kk/events,
 * английский /en/events. Внутри приложения пути «языконезависимые» ('/events', '/contacts#request'):
 * navigate() и linkProps() сами добавляют префикс текущего языка.
 */

/** Разделы сайта — как вкладки бокового меню egov.kz. Подписи — в словарях src/i18n/ui (nav.*). */
export type NavKey = 'home' | 'events' | 'projects' | 'about' | 'news' | 'partners' | 'faq' | 'contacts' | 'register' | 'offer';
/** Ключ раздела (словари nav.*, seo.pages.*) по адресу; /register и /offer — страницы вне бокового меню. */
export const routeKey = (path: Route): NavKey => (path === '/' ? 'home' : (path.slice(1) as NavKey));
export interface NavItem { path: Route; key: NavKey; Icon: LucideIcon }

export const NAV: NavItem[] = [
  { path: '/', key: 'home', Icon: House },
  { path: '/events', key: 'events', Icon: CalendarDays },
  { path: '/projects', key: 'projects', Icon: LayoutGrid },
  { path: '/about', key: 'about', Icon: Building2 },
  { path: '/news', key: 'news', Icon: Newspaper },
  { path: '/partners', key: 'partners', Icon: Handshake },
  { path: '/faq', key: 'faq', Icon: CircleHelp },
  { path: '/contacts', key: 'contacts', Icon: Phone },
];

export const LANG_KEY = 'az-lang';
const PREFIXED = LANGS.filter(l => l !== DEFAULT_LANG);
const known = new Set<string>(SITE_ROUTES);

/**
 * Путь браузера → язык, раздел и (для /projects/<slug>) слаг проекта. Неизвестный раздел → главная.
 * Страница проекта относится к разделу «Проекты» (подсветка меню, хлебные крошки).
 */
export function parsePath(pathname: string): { lang: Lang; path: Route; slug: string | null } {
  const m = /^\/([a-z]{2})(?=\/|$)/.exec(pathname);
  const lang = m && (PREFIXED as string[]).includes(m[1]) ? (m[1] as Lang) : DEFAULT_LANG;
  const rest = lang === DEFAULT_LANG ? pathname : pathname.slice(3);
  const clean = rest.replace(/\/+$/, '') || '/';
  const project = /^\/projects\/([^/]+)$/.exec(clean);
  if (project && PROJECT_SLUG_RE.test(project[1])) return { lang, path: '/projects', slug: project[1] };
  return { lang, path: (known.has(clean) ? clean : '/') as Route, slug: null };
}

export const currentLang = (): Lang => parsePath(window.location.pathname).lang;

/** Языконезависимая ссылка ('/events?q=x#y') → ссылка с префиксом языка ('/kk/events?q=x#y'). */
export function localizeHref(to: string, lang: Lang = currentLang()): string {
  if (!to.startsWith('/') || to.startsWith('//') || lang === DEFAULT_LANG) return to;
  const m = /^([^?#]*)(.*)$/.exec(to)!;
  const path = m[1] === '/' ? '' : m[1];
  return `/${lang}${path}${m[2]}`;
}

/** Тот же раздел, запрос и якорь — на другом языке (для переключателя языка). */
export function hrefForLang(lang: Lang, loc: { pathname: string; search: string; hash: string } = window.location): string {
  const { path, slug } = parsePath(loc.pathname);
  return localizeHref(`${slug ? `/projects/${slug}` : path}${loc.search}${loc.hash}`, lang);
}

function emit() { window.dispatchEvent(new Event('az:navigate')); }

export function navigate(to: string) {
  const [url, hash = ''] = localizeHref(to).split('#');
  if (url !== window.location.pathname + window.location.search || hash) window.history.pushState(null, '', hash ? `${url}#${hash}` : url);
  emit();
  // Якорь (например, форма заявки) — прокручиваем к нему после отрисовки раздела.
  if (hash) window.setTimeout(() => document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
  else window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
}

/** Сменить язык, оставшись на той же странице (без прокрутки), и запомнить выбор. */
export function switchLang(lang: Lang) {
  try { localStorage.setItem(LANG_KEY, lang); } catch { /* приватный режим */ }
  const to = hrefForLang(lang);
  if (to !== window.location.pathname + window.location.search + window.location.hash) window.history.pushState(null, '', to);
  emit();
}

/**
 * Один раз при загрузке (до первой отрисовки): если пользователь раньше выбрал kk/en,
 * а открыл адрес без префикса — переводим на ту же страницу на его языке.
 * Без сохранённого выбора ничего не делаем (русский остаётся по умолчанию).
 */
export function applyStoredLang() {
  let stored: string | null = null;
  try { stored = localStorage.getItem(LANG_KEY); } catch { /* нет доступа */ }
  if (!stored || stored === DEFAULT_LANG || !(LANGS as readonly string[]).includes(stored)) return;
  if (parsePath(window.location.pathname).lang !== DEFAULT_LANG) return;
  window.history.replaceState(null, '', hrefForLang(stored as Lang));
}

function subscribe(cb: () => void) {
  window.addEventListener('popstate', cb);
  window.addEventListener('az:navigate', cb);
  return () => {
    window.removeEventListener('popstate', cb);
    window.removeEventListener('az:navigate', cb);
  };
}

/** Язык из адреса; все подписчики обновляются синхронно при navigate()/switchLang()/«Назад». */
export function useUrlLang(): Lang {
  return useSyncExternalStore(subscribe, currentLang, () => DEFAULT_LANG);
}

function subscribeHash(cb: () => void) {
  const off = subscribe(cb);
  window.addEventListener('hashchange', cb);
  return () => { off(); window.removeEventListener('hashchange', cb); };
}
const readHash = () => { try { return decodeURIComponent(window.location.hash.slice(1)); } catch { return ''; } };

/** Текущий якорь адреса без «#» (например, id карточки); обновляется при navigate(), «Назад» и смене #. */
export function useHash(): string {
  return useSyncExternalStore(subscribeHash, readHash, () => '');
}

/**
 * Прокрутить к элементу с id = якорю после отрисовки страницы. navigate() сам прокручивает через 60 мс,
 * но лениво загружаемая страница может появиться позже — тогда прокрутку делает сама страница.
 */
export function useScrollToHash(hash: string, ready = true) {
  useEffect(() => {
    if (!hash || !ready) return;
    const id = window.setTimeout(() => document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
    return () => window.clearTimeout(id);
  }, [hash, ready]);
}

export function useRoute() {
  const read = () => ({ ...parsePath(window.location.pathname), query: new URLSearchParams(window.location.search) });
  const [state, setState] = useState(read);
  useEffect(() => subscribe(() => setState(read())), []);
  return state;
}

/** Внутренняя ссылка: обычный <a href> (с префиксом языка), но без перезагрузки страницы. */
export function linkProps(to: string) {
  return {
    href: localizeHref(to),
    onClick: (e: React.MouseEvent) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      e.preventDefault();
      navigate(to);
    },
  };
}
