/**
 * Общие помощники для страниц контента (проекты, новости, партнёры, вопросы):
 * открытие формы по ?edit=ID / ?new=1, тосты «сайт обновится через минуту»,
 * транслитерация слага, счётчик символов, превью картинок, переключатель публикации.
 */
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ImageOff, Trash2 } from 'lucide-react';
import { ApiError } from '../../api';
import { useAdminRoute } from '../../router';
import { Badge, Button, Drawer, Spinner, useConfirm, useToast } from '../../ui';
import { safeImgSrc } from '../../../content/safe-url';
import './content.css';

/** Публичный контент кешируется на 60 секунд — напоминаем об этом после каждого изменения. */
export const SITE_DELAY = 'Сайт обновится примерно через минуту.';

/** Тосты для изменений контента. */
export function useContentToast() {
  const toast = useToast();
  return {
    ...toast,
    saved: (what = 'Сохранено') => toast.success(`${what}. ${SITE_DELAY}`),
    /** Ошибка отправки формы: ошибки по полям уже видны в форме — тост только для остальных. */
    formError: (e: unknown) => {
      if (e instanceof ApiError && Object.keys(e.fields).length > 0) return;
      toast.error(e);
    },
  };
}

// ---------- Маршрут формы: ?edit=ID и ?new=1 ----------

export interface EditorRoute<T> {
  /** Редактируемая запись (по ?edit=ID). */
  editing: T | undefined;
  /** Открыта форма создания (?new=1). */
  isNew: boolean;
  /** Форма открыта. */
  open: boolean;
  openEdit: (id: number) => void;
  openNew: () => void;
  close: () => void;
}

/** Форма в Drawer, привязанная к адресу: ?edit=12 открывает запись 12, ?new=1 — создание. */
export function useEditorRoute<T extends { id: number }>(items: T[] | null, loading: boolean, notFoundText = 'Запись не найдена — возможно, её уже удалили'): EditorRoute<T> {
  const { query, setQuery } = useAdminRoute();
  const toast = useToast();
  const editId = query.get('edit');
  const isNew = query.get('new') === '1';
  const editing = editId && items ? items.find(i => i.id === Number(editId)) : undefined;

  // Запись, которую уже показывали (например, только что удалили из формы), закрываем молча.
  const seen = useRef<string | null>(null);
  if (editing) seen.current = editId;
  useEffect(() => {
    if (editId && items && !loading && !editing) {
      if (seen.current !== editId) toast.error(notFoundText);
      setQuery({ edit: null });
    }
  }, [editId, items, loading, editing, toast, setQuery, notFoundText]);

  return {
    editing,
    isNew,
    open: isNew || !!editing,
    openEdit: useCallback((id: number) => setQuery({ edit: id, new: null }), [setQuery]),
    openNew: useCallback(() => setQuery({ new: 1, edit: null }), [setQuery]),
    close: useCallback(() => setQuery({ edit: null, new: null }), [setQuery]),
  };
}

// ---------- Drawer формы ----------

export interface EditorDrawerProps {
  title: string;
  description?: ReactNode;
  /** Есть несохранённые изменения — спросить перед закрытием. */
  dirty: boolean;
  submitting: boolean;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
  /** Кнопка «Удалить» слева (только для существующей записи). */
  onDelete?: () => Promise<void> | void;
  /** Общая ошибка формы (form.errors._). */
  error?: string;
  children: ReactNode;
}

/** Drawer с формой: «Сохранить», «Отмена», «Удалить», вопрос о несохранённых изменениях. */
export function EditorDrawer({ title, description, dirty, submitting, onSubmit, onClose, onDelete, error, children }: EditorDrawerProps) {
  const confirm = useConfirm();
  const [deleting, setDeleting] = useState(false);
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;

  const tryClose = useCallback(async () => {
    if (dirtyRef.current && !(await confirm({ title: 'Закрыть без сохранения?', message: 'Изменения в форме будут потеряны.', confirmLabel: 'Закрыть', danger: false }))) return;
    onClose();
  }, [confirm, onClose]);

  const remove = async () => {
    if (!onDelete) return;
    setDeleting(true);
    try { await onDelete(); } finally { setDeleting(false); }
  };

  const busy = submitting || deleting;
  return (
    <Drawer
      open
      onClose={() => void tryClose()}
      busy={busy}
      title={title}
      description={description}
      onSubmit={onSubmit}
      footer={(
        <>
          {onDelete && <Button variant="ghost" icon={Trash2} className="ct-foot-delete" onClick={() => void remove()} loading={deleting} disabled={submitting}>Удалить</Button>}
          <Button variant="ghost" onClick={() => void tryClose()} disabled={busy}>Отмена</Button>
          <Button type="submit" loading={submitting} disabled={deleting}>Сохранить</Button>
        </>
      )}
    >
      {error && <p className="notice notice-error" role="alert">{error}</p>}
      {children}
    </Drawer>
  );
}

/** 409 «такой слаг уже есть» → ошибка поля slug (useForm разложит её по полю). */
export function slugConflict(e: unknown): never {
  if (e instanceof ApiError && e.status === 409 && Object.keys(e.fields).length === 0) {
    throw new ApiError(409, e.code, e.message, { slug: 'Такой слаг уже занят — придумайте другой' });
  }
  throw e;
}

// ---------- Мелкие компоненты ----------

/** «12 / 200» под полем; краснеет при превышении. */
export function CharCount({ value, max }: { value: string | null | undefined; max: number }) {
  const n = (value ?? '').length;
  const state = n > max ? ' over' : n > max * 0.9 ? ' near' : '';
  return <span className={`ct-count${state}`} aria-live={n > max * 0.9 ? 'polite' : 'off'}>{n.toLocaleString('ru-RU')} / {max.toLocaleString('ru-RU')}</span>;
}

/** Подсказка с счётчиком символов справа. */
export function HintWithCount({ hint, value, max }: { hint?: ReactNode; value: string | null | undefined; max: number }) {
  return <span className="ct-hint-row"><span>{hint}</span><CharCount value={value} max={max} /></span>;
}

/** Метка «Скрыто» для неопубликованных записей. */
export function HiddenBadge({ published }: { published: boolean }) {
  return published ? null : <Badge tone="neutral" dot title="Не показывается на сайте">Скрыто</Badge>;
}

/** Инициалы организации (как на сайте). */
export function initials(name: string): string {
  return name.replace(/[«»"№]/g, '').split(/\s+/).filter(w => /^[A-ZА-ЯӘҒҚҢӨҰҮҺІ0-9]/.test(w)).slice(0, 2).map(w => w[0]).join('') || 'AZ';
}

/** Миниатюра картинки: при отсутствии или ошибке — инициалы или значок. */
export function Thumb({ src, fit = 'contain', fallback, size = 'md', scale }: { src: string | null | undefined; fit?: 'cover' | 'contain'; fallback?: string; size?: 'md' | 'lg'; scale?: number }) {
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [src]);
  const safe = safeImgSrc(src);
  const show = safe && !broken;
  return (
    <span className={`ct-thumb ct-thumb-${size} fit-${fit}${!show && fallback ? ' is-initials' : ''}`} aria-hidden="true">
      {show
        ? <img src={safe} alt="" loading="lazy" onError={() => setBroken(true)} style={scale ? { transform: `scale(${Math.min(1.4, Math.max(0.5, scale))})` } : undefined} />
        : fallback ?? <ImageOff size={18} />}
    </span>
  );
}

/** Компактный переключатель «на сайте / скрыто» прямо в списке. */
export function PublishToggle({ published, onChange, name }: { published: boolean; onChange: (next: boolean) => Promise<void>; name: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <span className="ct-publish">
      {busy && <Spinner size={14} />}
      <button
        type="button"
        role="switch"
        aria-checked={published}
        aria-label={`Показывать на сайте: «${name}»`}
        title={published ? 'Опубликовано — нажмите, чтобы скрыть' : 'Скрыто — нажмите, чтобы опубликовать'}
        className={`switch${published ? ' on' : ''}`}
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try { await onChange(!published); } finally { setBusy(false); }
        }}
      >
        <span className="switch-thumb" aria-hidden="true" />
      </button>
    </span>
  );
}

// ---------- Слаги и адреса ----------

const TRANSLIT: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o',
  п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu',
  я: 'ya', ә: 'a', ғ: 'g', қ: 'k', ң: 'n', ө: 'o', ұ: 'u', ү: 'u', һ: 'h', і: 'i',
};

/** «Олимпиада Фибоначчи 2026» → «olimpiada-fibonachchi-2026». */
export function slugify(text: string, max = 60): string {
  return text
    .toLowerCase()
    .split('')
    .map(ch => TRANSLIT[ch] ?? ch)
    .join('')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, max)
    .replace(/-+$/g, '');
}

/** Домен для подписи карточки: «https://www.fibonacci.kz/ru» → «fibonacci.kz». */
export function domainFromUrl(url: string | null | undefined): string {
  if (!url) return '';
  try {
    const u = new URL(url.trim());
    return u.hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

/** Пустую строку отправляем как null. */
export const orNull = (v: string | null | undefined) => (v && v.trim() ? v : null);

/** Поиск без учёта регистра и ё. */
export function matches(q: string, ...fields: (string | null | undefined)[]): boolean {
  const norm = (s: string) => s.toLowerCase().replace(/ё/g, 'е');
  const needle = norm(q.trim());
  if (!needle) return true;
  return fields.some(f => f && norm(f).includes(needle));
}

/** Склонение: plural(5, ['запись', 'записи', 'записей']). */
export function plural(n: number, forms: [string, string, string]): string {
  const a = Math.abs(n) % 100; const b = a % 10;
  return forms[a > 10 && a < 20 ? 2 : b > 1 && b < 5 ? 1 : b === 1 ? 0 : 2];
}

// ---------- Порядок ----------

/**
 * Новый порядок части списка (одна вкладка/группа) встраивается в общий порядок:
 * места, занятые элементами этой части, заполняются в новой последовательности,
 * остальные записи не двигаются. Результат — полный список id для PUT /reorder.
 */
export function spliceOrder(allIds: number[], subsetNew: number[]): number[] {
  const set = new Set(subsetNew);
  let k = 0;
  return allIds.map(id => (set.has(id) ? subsetNew[k++] : id));
}

/** Отсортировать записи по списку id (после перестановки — локально, без перезагрузки). */
export function applyOrder<T extends { id: number; sort?: number }>(items: T[], ids: number[]): T[] {
  const pos = new Map(ids.map((id, i) => [id, i]));
  return [...items].sort((a, b) => (pos.get(a.id) ?? 0) - (pos.get(b.id) ?? 0)).map((it, i) => ({ ...it, sort: i }));
}

/** Скелет списка карточек. */
export function ListSkeleton({ rows = 5, height = 64 }: { rows?: number; height?: number }) {
  return (
    <div className="ct-skel" role="status" aria-label="Загрузка списка">
      {Array.from({ length: rows }, (_, i) => <span key={i} className="skeleton" style={{ height, borderRadius: 14 }} aria-hidden="true" />)}
    </div>
  );
}
