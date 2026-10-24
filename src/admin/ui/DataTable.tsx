import { isValidElement, useMemo, useState, type ReactNode } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, Inbox } from 'lucide-react';
import { EmptyState, ErrorState, Skeleton } from './Panel';

export interface Column<T> {
  /** Уникальный ключ колонки; если нет render — берётся row[key]. */
  key: string;
  /** Заголовок колонки. */
  header: ReactNode;
  /** Своя отрисовка ячейки. */
  render?: (row: T, index: number) => ReactNode;
  /** Ширина колонки (CSS), например 120 или '30%'. */
  width?: number | string;
  align?: 'left' | 'center' | 'right';
  /** Разрешить сортировку по клику на заголовок (на клиенте). */
  sortable?: boolean;
  /** Значение для сортировки (по умолчанию row[key]). */
  sortValue?: (row: T) => string | number | null | undefined;
  /** Скрыть колонку на телефоне (в карточном виде). */
  hideOnMobile?: boolean;
  /** Главная колонка — на телефоне выводится заголовком карточки без подписи. */
  primary?: boolean;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[] | null | undefined;
  /** Ключ строки (обычно row => row.id). */
  rowKey: (row: T) => string | number;
  /** Показать скелет вместо строк. */
  loading?: boolean;
  /** Текст ошибки загрузки. */
  error?: string | null;
  onRetry?: () => void;
  /** Кнопки в конце строки (IconButton «Изменить», «Удалить»…). */
  actions?: (row: T) => ReactNode;
  /** Клик по строке (например, открыть редактирование). Строка становится доступной с клавиатуры. */
  onRowClick?: (row: T) => void;
  /** Пустое состояние: свой узел или { title, text, action }. */
  empty?: ReactNode | { title: string; text?: ReactNode; action?: ReactNode };
  /** Подпись таблицы для экранных дикторов. */
  caption?: string;
  /** Подсветить строку (например, непрочитанную заявку). */
  rowClassName?: (row: T) => string | undefined;
  /** Количество строк скелета. По умолчанию 6. */
  skeletonRows?: number;
}

type Sort = { key: string; dir: 1 | -1 } | null;

/**
 * Таблица данных: колонки по конфигу, действия строки, сортировка, скелет
 * загрузки, пустое состояние и ошибка. На телефоне превращается в карточки.
 */
export function DataTable<T>({
  columns, rows, rowKey, loading, error, onRetry, actions, onRowClick, empty, caption, rowClassName, skeletonRows = 6,
}: DataTableProps<T>) {
  const [sort, setSort] = useState<Sort>(null);

  const sorted = useMemo(() => {
    if (!rows || !sort) return rows ?? [];
    const col = columns.find(c => c.key === sort.key);
    if (!col) return rows;
    const val = col.sortValue ?? ((r: T) => (r as Record<string, unknown>)[col.key] as string | number | null | undefined);
    return [...rows].sort((a, b) => {
      const x = val(a); const y = val(b);
      if (x == null && y == null) return 0;
      if (x == null) return 1;
      if (y == null) return -1;
      return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'ru')) * sort.dir;
    });
  }, [rows, sort, columns]);

  if (error && !loading) return <ErrorState message={error} onRetry={onRetry} />;

  const showSkeleton = loading && (!rows || rows.length === 0);
  if (!showSkeleton && sorted.length === 0) {
    if (empty && typeof empty === 'object' && !isValidElement(empty) && 'title' in empty) {
      const e = empty as { title: string; text?: ReactNode; action?: ReactNode };
      return <EmptyState icon={Inbox} title={e.title} text={e.text} action={e.action} />;
    }
    return <>{empty ?? <EmptyState icon={Inbox} title="Пока пусто" text="Записей не найдено" />}</>;
  }

  const toggleSort = (key: string) => setSort(s => (!s || s.key !== key ? { key, dir: 1 } : s.dir === 1 ? { key, dir: -1 } : null));

  return (
    <div className={`table-wrap${loading && !showSkeleton ? ' is-refreshing' : ''}`}>
      <table className="data-table">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr>
            {columns.map(c => {
              const active = sort?.key === c.key;
              return (
                <th
                  key={c.key}
                  scope="col"
                  style={{ width: c.width, textAlign: c.align }}
                  aria-sort={active ? (sort!.dir === 1 ? 'ascending' : 'descending') : c.sortable ? 'none' : undefined}
                  className={c.hideOnMobile ? 'hide-mobile' : undefined}
                >
                  {c.sortable ? (
                    <button type="button" className="th-sort" onClick={() => toggleSort(c.key)}>
                      {c.header}
                      {active ? (sort!.dir === 1 ? <ArrowUp size={14} aria-hidden="true" /> : <ArrowDown size={14} aria-hidden="true" />) : <ArrowUpDown size={14} aria-hidden="true" className="muted-icon" />}
                    </button>
                  ) : c.header}
                </th>
              );
            })}
            {actions && <th scope="col" className="th-actions"><span className="sr-only">Действия</span></th>}
          </tr>
        </thead>
        <tbody>
          {showSkeleton
            ? Array.from({ length: skeletonRows }, (_, i) => (
              <tr key={`sk${i}`} className="skeleton-row">
                {columns.map(c => <td key={c.key} className={c.hideOnMobile ? 'hide-mobile' : undefined}><Skeleton height={14} width={`${50 + ((i * 17 + c.key.length * 7) % 45)}%`} /></td>)}
                {actions && <td />}
              </tr>
            ))
            : sorted.map((row, i) => (
              <tr
                key={rowKey(row)}
                className={`${onRowClick ? 'clickable' : ''} ${rowClassName?.(row) ?? ''}`}
                onClick={onRowClick ? e => {
                  if ((e.target as HTMLElement).closest('button, a, input, select, label, textarea')) return;
                  onRowClick(row);
                } : undefined}
                onKeyDown={onRowClick ? e => { if ((e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget) { e.preventDefault(); onRowClick(row); } } : undefined}
                tabIndex={onRowClick ? 0 : undefined}
              >
                {columns.map(c => (
                  <td
                    key={c.key}
                    style={{ textAlign: c.align }}
                    data-label={typeof c.header === 'string' ? c.header : undefined}
                    className={`${c.hideOnMobile ? 'hide-mobile' : ''}${c.primary ? ' td-primary' : ''}`}
                  >
                    {c.render ? c.render(row, i) : String((row as Record<string, unknown>)[c.key] ?? '—')}
                  </td>
                ))}
                {actions && <td className="td-actions"><div className="row-actions">{actions(row)}</div></td>}
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}
