/**
 * Светлая / тёмная тема — общая логика сайта и админки.
 *
 * Предпочтение: 'system' (по умолчанию) | 'light' | 'dark', хранится в localStorage['az-theme'].
 * На <html> всегда ставится итоговое значение: data-theme="light|dark" и style.color-scheme.
 * Первую отрисовку без вспышки делает инлайн-скрипт в <head> index.html и admin.html —
 * он повторяет resolve()/applyTheme() ниже; при изменении ключа или цветов правьте оба места.
 */
import { useSyncExternalStore } from 'react';

export type ThemePref = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

export const THEME_KEY = 'az-theme';
export const THEME_PREFS: ThemePref[] = ['system', 'light', 'dark'];

/** Строки переключателя темы. На сайте их даёт словарь языка (src/i18n/ui/*.ts → theme), в админке — THEME_TEXT. */
export interface ThemeText {
  menuLabel: string;
  options: Record<ThemePref, string>;
  /** Доступное имя кнопки: текущее предпочтение. */
  button: Record<ThemePref, string>;
}

/** Русские строки по умолчанию (админка и всё, что не передаёт text в ThemeToggle). */
export const THEME_TEXT: ThemeText = {
  menuLabel: 'Тема оформления',
  options: { system: 'Как в системе', light: 'Светлая', dark: 'Тёмная' },
  button: { system: 'Тема: как в системе', light: 'Тема: светлая', dark: 'Тема: тёмная' },
};

/** Цвет полосы браузера (meta theme-color) — совпадает с --bg каждой темы. */
const THEME_COLOR: Record<ResolvedTheme, string> = { light: '#f0f2f4', dark: '#111317' };
const DARK_QUERY = '(prefers-color-scheme: dark)';

function isPref(v: unknown): v is ThemePref {
  return v === 'system' || v === 'light' || v === 'dark';
}

function readPref(): ThemePref {
  try {
    const v = localStorage.getItem(THEME_KEY);
    return isPref(v) ? v : 'system';
  } catch {
    return 'system';
  }
}

function systemDark(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia(DARK_QUERY).matches;
}

export function resolveTheme(pref: ThemePref): ResolvedTheme {
  return pref === 'system' ? (systemDark() ? 'dark' : 'light') : pref;
}

/** Обе meta theme-color: при явном выборе — один цвет, при «как в системе» — свои цвета по media. */
function syncThemeColor(pref: ThemePref, resolved: ResolvedTheme) {
  document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach(m => {
    const own: ResolvedTheme = (m.media || '').includes('dark') ? 'dark' : 'light';
    m.content = THEME_COLOR[pref === 'system' ? own : resolved];
  });
}

function applyTheme(pref: ThemePref, animate: boolean) {
  const root = document.documentElement;
  const resolved = resolveTheme(pref);
  const changed = root.getAttribute('data-theme') !== resolved;
  // Плавная смена цветов только при переключении (не при первой отрисовке) и без prefers-reduced-motion.
  if (animate && changed && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    root.classList.add('theme-switching');
    window.clearTimeout(switchTimer);
    switchTimer = window.setTimeout(() => root.classList.remove('theme-switching'), 260);
  }
  root.setAttribute('data-theme', resolved);
  root.style.colorScheme = resolved;
  syncThemeColor(pref, resolved);
  state = { pref, resolved };
  listeners.forEach(l => l());
}

let switchTimer = 0;
let state: { pref: ThemePref; resolved: ResolvedTheme } = { pref: 'system', resolved: 'light' };
const listeners = new Set<() => void>();
let started = false;

function start() {
  if (started || typeof window === 'undefined') return;
  started = true;
  applyTheme(readPref(), false);
  // «Как в системе» следует за ОС на лету.
  const mq = window.matchMedia?.(DARK_QUERY);
  const onSystem = () => { if (state.pref === 'system') applyTheme('system', true); };
  if (mq) {
    if (mq.addEventListener) mq.addEventListener('change', onSystem);
    else mq.addListener(onSystem);
  }
  // Выбор в другой вкладке (сайт ↔ админка).
  window.addEventListener('storage', e => { if (e.key === THEME_KEY || e.key === null) applyTheme(readPref(), true); });
}

export function setThemePref(pref: ThemePref) {
  start();
  try {
    if (pref === 'system') localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, pref);
  } catch { /* приватный режим — выбор действует до перезагрузки */ }
  applyTheme(pref, true);
}

function subscribe(cb: () => void) {
  start();
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}
const getSnapshot = () => state;

/** Текущее предпочтение и итоговая тема; все экземпляры переключателя синхронны. */
export function useTheme() {
  start();
  const s = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return { pref: s.pref, resolved: s.resolved, setPref: setThemePref };
}
