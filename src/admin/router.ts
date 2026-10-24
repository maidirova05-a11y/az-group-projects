/**
 * Маленький pushState-роутер админки (по образцу src/router.ts), всё под /admin.
 *
 *   const { section, path, query, setQuery } = useAdminRoute();
 *   query.get('edit')           // ?edit=12
 *   setQuery({ edit: 12 })      // → /admin/news?edit=12 (replace по умолчанию)
 *   setQuery({ edit: null })    // убрать параметр
 *   navigate('/admin/news?new=1')
 */
import { useCallback, useEffect, useState, type MouseEvent } from 'react';
import {
  CalendarDays, CircleHelp, Handshake, Inbox, LayoutDashboard, LayoutGrid, Newspaper, Settings, UserRound, Users, type LucideIcon,
} from 'lucide-react';

export type AdminSection =
  | 'dashboard' | 'programs' | 'projects' | 'news' | 'partners' | 'faqs' | 'leads' | 'settings' | 'admins' | 'account' | 'not-found';

export interface AdminNavItem {
  section: Exclude<AdminSection, 'not-found'>;
  path: string;
  label: string;
  /** Короткая подпись для узкой колонки значков и нижней панели. */
  short: string;
  /** Заголовок страницы (document.title, h1 по умолчанию). */
  title: string;
  Icon: LucideIcon;
  /** Только для роли owner. */
  ownerOnly?: boolean;
  /** Не показывать в боковом меню. */
  hidden?: boolean;
}

export const ADMIN_BASE = '/admin';

export const ADMIN_NAV: AdminNavItem[] = [
  { section: 'dashboard', path: '/admin', label: 'Обзор', short: 'Обзор', title: 'Обзор', Icon: LayoutDashboard },
  { section: 'programs', path: '/admin/programs', label: 'Программы и мероприятия', short: 'Мероприятия', title: 'Программы и мероприятия', Icon: CalendarDays },
  { section: 'projects', path: '/admin/projects', label: 'Проекты', short: 'Проекты', title: 'Проекты', Icon: LayoutGrid },
  { section: 'news', path: '/admin/news', label: 'Новости', short: 'Новости', title: 'Новости', Icon: Newspaper },
  { section: 'partners', path: '/admin/partners', label: 'Партнёры', short: 'Партнёры', title: 'Партнёры', Icon: Handshake },
  { section: 'faqs', path: '/admin/faqs', label: 'Вопросы', short: 'Вопросы', title: 'Частые вопросы', Icon: CircleHelp },
  { section: 'leads', path: '/admin/leads', label: 'Заявки', short: 'Заявки', title: 'Заявки', Icon: Inbox },
  { section: 'settings', path: '/admin/settings', label: 'Настройки сайта', short: 'Настройки', title: 'Настройки сайта', Icon: Settings },
  { section: 'admins', path: '/admin/admins', label: 'Администраторы', short: 'Админы', title: 'Администраторы', Icon: Users, ownerOnly: true },
  { section: 'account', path: '/admin/account', label: 'Мой аккаунт', short: 'Аккаунт', title: 'Мой аккаунт', Icon: UserRound, hidden: true },
];

const bySection = new Map(ADMIN_NAV.map(n => [n.section, n]));
export const navItem = (s: AdminSection) => bySection.get(s as AdminNavItem['section']);

function sectionOf(pathname: string): AdminSection {
  const clean = pathname.replace(/\/+$/, '') || '/';
  if (clean === ADMIN_BASE || clean === '/admin.html') return 'dashboard';
  const found = ADMIN_NAV.find(n => n.path === clean);
  return found ? found.section : 'not-found';
}

const EVENT = 'az-admin:navigate';

/**
 * Перехват кнопок «Назад»/«Вперёд» браузера (popstate): страница с несохранёнными изменениями
 * ставит функцию, которая возвращает true, если переход надо задержать (адрес уже сменился —
 * она сама спрашивает подтверждение и затем вызывает navigate() или возвращает адрес через pushState).
 * Слушатель вешается при загрузке модуля — раньше слушателей useAdminRoute, поэтому успевает остановить событие.
 */
let popBlocker: (() => boolean) | null = null;
export function setPopstateBlocker(fn: (() => boolean) | null) { popBlocker = fn; }
if (typeof window !== 'undefined') {
  window.addEventListener('popstate', e => { if (popBlocker?.()) e.stopImmediatePropagation(); });
}

/** Перейти по адресу внутри админки без перезагрузки. */
export function navigate(to: string, opts: { replace?: boolean; scroll?: boolean } = {}) {
  const current = window.location.pathname + window.location.search + window.location.hash;
  if (to !== current) window.history[opts.replace ? 'replaceState' : 'pushState'](null, '', to);
  window.dispatchEvent(new Event(EVENT));
  if (opts.scroll !== false && !opts.replace) window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
}

export type QueryPatch = Record<string, string | number | boolean | null | undefined>;

/** Изменить query-параметры текущей страницы. null/undefined/'' — удалить параметр. */
export function setQuery(patch: QueryPatch, opts: { replace?: boolean } = { replace: true }) {
  const q = new URLSearchParams(window.location.search);
  for (const [k, v] of Object.entries(patch)) {
    if (v === null || v === undefined || v === '' || v === false) q.delete(k);
    else q.set(k, String(v));
  }
  const s = q.toString();
  navigate(window.location.pathname + (s ? `?${s}` : ''), { replace: opts.replace ?? true, scroll: false });
}

export interface AdminRoute {
  /** Текущий раздел. */
  section: AdminSection;
  /** Полный путь без query (например, `/admin/news`). */
  path: string;
  /** Query-параметры (`query.get('edit')`). */
  query: URLSearchParams;
  /** Query-параметры объектом — удобно для зависимостей useEffect. */
  params: Record<string, string>;
  /** Строка query с `?` или пустая — для ключей useResource. */
  search: string;
  navigate: typeof navigate;
  setQuery: typeof setQuery;
}

function read(): Omit<AdminRoute, 'navigate' | 'setQuery'> {
  const query = new URLSearchParams(window.location.search);
  return {
    section: sectionOf(window.location.pathname),
    path: window.location.pathname.replace(/\/+$/, '') || '/',
    query,
    params: Object.fromEntries(query.entries()),
    search: window.location.search,
  };
}

/** Текущий маршрут админки; перерисовывает компонент при любой навигации. */
export function useAdminRoute(): AdminRoute {
  const [state, setState] = useState(read);
  useEffect(() => {
    const update = () => setState(prev => {
      const next = read();
      return prev.path === next.path && prev.search === next.search ? prev : next;
    });
    window.addEventListener('popstate', update);
    window.addEventListener(EVENT, update);
    return () => {
      window.removeEventListener('popstate', update);
      window.removeEventListener(EVENT, update);
    };
  }, []);
  return { ...state, navigate, setQuery };
}

/** Один query-параметр как состояние: `const [edit, setEdit] = useQueryParam('edit')`. */
export function useQueryParam(name: string): [string | null, (v: string | number | null) => void] {
  const { query } = useAdminRoute();
  const set = useCallback((v: string | number | null) => setQuery({ [name]: v }), [name]);
  return [query.get(name), set];
}

/** Внутренняя ссылка: обычный <a href>, но без перезагрузки страницы. */
export function linkProps(to: string) {
  return {
    href: to,
    onClick: (e: MouseEvent) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      e.preventDefault();
      navigate(to);
    },
  };
}
