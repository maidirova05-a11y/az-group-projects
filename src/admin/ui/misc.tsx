import { useEffect, useRef, useState, type AnchorHTMLAttributes, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight, Search, X } from 'lucide-react';
import type { LeadDTO } from '@shared/schemas';
import { isUnsafeHref, safeHrefOrNull, safeImgSrc } from '../../content/safe-url';

export type Tone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info';

export const UNSAFE_LINK_LABEL = 'Небезопасная ссылка';

/** Небольшая метка-плашка. */
export function Badge({ tone = 'neutral', children, dot, title }: { tone?: Tone; children: ReactNode; /** Точка-индикатор слева. */ dot?: boolean; title?: string }) {
  return <span className={`badge badge-${tone}`} title={title}>{dot && <span className="badge-dot" aria-hidden="true" />}{children}</span>;
}

export const LEAD_STATUS_LABELS: Record<LeadDTO['status'], string> = { new: 'Новая', in_progress: 'В работе', done: 'Обработана', spam: 'Спам' };
const LEAD_TONES: Record<LeadDTO['status'], Tone> = { new: 'brand', in_progress: 'warning', done: 'success', spam: 'neutral' };

export type StatusPillProps =
  | { /** Статус заявки. */ status: LeadDTO['status']; published?: never; label?: string }
  | { status?: never; /** Опубликовано/скрыто. */ published: boolean; label?: string };

/** Пилюля статуса: заявки (`status="new"`) или публикации (`published={true}`). `label` — свой текст. */
export function StatusPill(props: StatusPillProps) {
  if (props.status !== undefined) {
    return <Badge tone={LEAD_TONES[props.status]} dot>{props.label ?? LEAD_STATUS_LABELS[props.status]}</Badge>;
  }
  return <Badge tone={props.published ? 'success' : 'neutral'} dot>{props.label ?? (props.published ? 'Опубликовано' : 'Скрыто')}</Badge>;
}

export interface SearchInputProps {
  value: string;
  /** Вызывается с задержкой `debounce` мс после ввода (сразу — при очистке). */
  onChange: (value: string) => void;
  placeholder?: string;
  /** Задержка, мс. По умолчанию 300; 0 — без задержки. */
  debounce?: number;
  /** Подпись для экранных дикторов. */
  label?: string;
  className?: string;
}

/** Поле поиска со значком, очисткой и задержкой ввода. */
export function SearchInput({ value, onChange, placeholder = 'Поиск…', debounce = 300, label = 'Поиск', className = '' }: SearchInputProps) {
  const [draft, setDraft] = useState(value);
  const timer = useRef<number>();
  const cb = useRef(onChange);
  cb.current = onChange;
  useEffect(() => setDraft(value), [value]);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const emit = (v: string, now = false) => {
    window.clearTimeout(timer.current);
    if (now || debounce <= 0) cb.current(v);
    else timer.current = window.setTimeout(() => cb.current(v), debounce);
  };
  return (
    <div className={`search-input ${className}`} role="search">
      <Search size={18} aria-hidden="true" />
      <input
        type="search"
        className="input"
        value={draft}
        placeholder={placeholder}
        aria-label={label}
        onChange={e => { setDraft(e.target.value); emit(e.target.value); }}
        onKeyDown={e => { if (e.key === 'Enter') emit(draft, true); if (e.key === 'Escape' && draft) { e.stopPropagation(); setDraft(''); emit('', true); } }}
      />
      {draft && <button type="button" className="input-clear" onClick={() => { setDraft(''); emit('', true); }} aria-label="Очистить поиск"><X size={16} aria-hidden="true" /></button>}
    </div>
  );
}

/** Значение с задержкой — для поиска в своих компонентах. */
export function useDebounced<T>(value: T, ms = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = window.setTimeout(() => setV(value), ms);
    return () => window.clearTimeout(t);
  }, [value, ms]);
  return v;
}

export interface PaginationProps {
  /** Текущая страница, с 1. */
  page: number;
  /** Всего записей. */
  total: number;
  /** Записей на странице. */
  limit: number;
  onChange: (page: number) => void;
}

/** Постраничная навигация «‹ 1 2 … 9 ›» + счётчик записей. Скрыта, если страница одна. */
export function Pagination({ page, total, limit, onChange }: PaginationProps) {
  const pages = Math.max(1, Math.ceil(total / limit));
  if (total <= limit) return total > 0 ? <p className="pagination-info">Всего: {total}</p> : null;
  const nums: (number | '…')[] = [];
  for (let p = 1; p <= pages; p++) {
    if (p === 1 || p === pages || Math.abs(p - page) <= 1) nums.push(p);
    else if (nums[nums.length - 1] !== '…') nums.push('…');
  }
  const from = (page - 1) * limit + 1;
  const to = Math.min(total, page * limit);
  return (
    <nav className="pagination" aria-label="Страницы">
      <p className="pagination-info">{from}–{to} из {total}</p>
      <div className="pagination-pages">
        <button type="button" className="page-btn" onClick={() => onChange(page - 1)} disabled={page <= 1} aria-label="Предыдущая страница"><ChevronLeft size={16} aria-hidden="true" /></button>
        {nums.map((n, i) => n === '…'
          ? <span key={`e${i}`} className="page-gap" aria-hidden="true">…</span>
          : <button key={n} type="button" className={`page-btn${n === page ? ' active' : ''}`} onClick={() => onChange(n)} aria-current={n === page ? 'page' : undefined} aria-label={`Страница ${n}`}>{n}</button>)}
        <button type="button" className="page-btn" onClick={() => onChange(page + 1)} disabled={page >= pages} aria-label="Следующая страница"><ChevronRight size={16} aria-hidden="true" /></button>
      </div>
    </nav>
  );
}

/** Панель над таблицей: поиск, фильтры, кнопки. На телефоне переносится. */
export function Toolbar({ children }: { children: ReactNode }) {
  return <div className="toolbar">{children}</div>;
}

/** Переключатель-сегменты (например, фильтр статусов заявок). */
export function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: readonly { value: T; label: string; count?: number }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="segmented" role="radiogroup" aria-label={label}>
      {options.map(o => (
        <button key={o.value} type="button" role="radio" aria-checked={o.value === value} className={o.value === value ? 'active' : ''} onClick={() => onChange(o.value)}>
          {o.label}{o.count !== undefined && <span className="segmented-count">{o.count}</span>}
        </button>
      ))}
    </div>
  );
}

/** Форматирование дат по-русски. */
export const fmt = {
  /** 2026-10-17 → «17 окт. 2026». */
  date: (iso: string | null | undefined) => {
    if (!iso) return '—';
    const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
    return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
  },
  /** ISO → «17.10.2026, 14:05». */
  dateTime: (iso: string | null | undefined) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? iso : d.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  },
  /** ISO → «5 мин назад», «вчера», «3 дн назад». */
  relative: (iso: string | null | undefined) => {
    if (!iso) return '—';
    const diff = (Date.now() - new Date(iso).getTime()) / 1000;
    if (Number.isNaN(diff)) return iso;
    if (diff < 60) return 'только что';
    if (diff < 3600) return `${Math.floor(diff / 60)} мин назад`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} ч назад`;
    if (diff < 172800) return 'вчера';
    if (diff < 604800) return `${Math.floor(diff / 86400)} дн назад`;
    return fmt.date(iso);
  },
};

/** Бейдж «Небезопасная ссылка» — адрес из базы не прошёл проверку (javascript:, data:, //… и т. п.). */
export function UnsafeLinkBadge({ url }: { url?: string | null }) {
  return <Badge tone="danger" dot title={url ? `Адрес не будет открыт: ${url}. Разрешены https://, http://, mailto:, tel: и пути от «/».` : undefined}>{UNSAFE_LINK_LABEL}</Badge>;
}

/** true, если непустой адрес картинки небезопасен (не http(s) и не «/…»). */
export const isUnsafeImgSrc = (url: string | null | undefined) => typeof url === 'string' && url.trim() !== '' && !safeImgSrc(url);

/**
 * Ссылка на адрес из базы. Безопасный адрес — обычная <a>; небезопасный — неактивная ссылка
 * с бейджем «Небезопасная ссылка», чтобы менеджер заметил и исправил запись.
 */
export function SafeLink({ href, children, ...rest }: Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & { href: string | null | undefined }) {
  const safe = safeHrefOrNull(href);
  if (safe) return <a {...rest} href={safe}>{children}</a>;
  if (!isUnsafeHref(href)) return null;
  const { className, title, 'aria-label': ariaLabel } = rest;
  return (
    <span className="unsafe-link">
      <a className={`${className ?? ''} is-disabled`} aria-disabled="true" role="link" title={title} aria-label={ariaLabel}>{children}</a>
      <UnsafeLinkBadge url={href} />
    </span>
  );
}
