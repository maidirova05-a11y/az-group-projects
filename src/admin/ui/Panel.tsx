import { useEffect, useId, type ReactNode } from 'react';
import { ChevronRight, type LucideIcon } from 'lucide-react';
import { linkProps } from '../router';

export interface PanelProps {
  /** Заголовок карточки (h2). */
  title?: ReactNode;
  /** Пояснение под заголовком. */
  description?: ReactNode;
  /** Кнопки справа от заголовка. */
  actions?: ReactNode;
  /** Убрать внутренние отступы (например, для таблицы во всю ширину). */
  flush?: boolean;
  className?: string;
  id?: string;
  children?: ReactNode;
}

/** Белая скруглённая карточка на сером фоне — основной блок страницы. */
export function Panel({ title, description, actions, flush, className = '', id, children }: PanelProps) {
  const autoId = useId();
  const titleId = `${id ?? autoId}-title`;
  return (
    <section className={`panel${flush ? ' panel-flush' : ''} ${className}`} id={id} aria-labelledby={title ? titleId : undefined}>
      {(title || actions) && (
        <header className="panel-head">
          <div className="panel-head-text">
            {title && <h2 id={titleId}>{title}</h2>}
            {description && <p className="panel-desc">{description}</p>}
          </div>
          {actions && <div className="panel-actions">{actions}</div>}
        </header>
      )}
      {children}
    </section>
  );
}

export interface Crumb { label: string; to?: string }

export interface PageHeaderProps {
  /** Заголовок страницы (h1). Также ставится в document.title. */
  title: string;
  /** Короткое пояснение под заголовком. */
  description?: ReactNode;
  /** Кнопки действий справа (например, «Добавить»). */
  actions?: ReactNode;
  /**
   * Промежуточные крошки между «Админка» и заголовком.
   * Пример для формы: `[{ label: 'Новости', to: '/admin/news' }]`.
   */
  crumbs?: Crumb[];
}

/** Заголовок страницы: хлебные крошки, h1, описание и действия. Обновляет document.title. */
export function PageHeader({ title, description, actions, crumbs = [] }: PageHeaderProps) {
  useEffect(() => { document.title = `${title} — Админка AZ Group`; }, [title]);
  return (
    <div className="page-header">
      <nav aria-label="Хлебные крошки" className="crumbs">
        <a {...linkProps('/admin')}>Админка</a>
        {crumbs.map(c => (
          <span key={c.label} className="crumb">
            <ChevronRight size={14} aria-hidden="true" />
            {c.to ? <a {...linkProps(c.to)}>{c.label}</a> : <span>{c.label}</span>}
          </span>
        ))}
        <span className="crumb">
          <ChevronRight size={14} aria-hidden="true" />
          <span aria-current="page">{title}</span>
        </span>
      </nav>
      <div className="page-header-row">
        <div className="page-header-text">
          <h1>{title}</h1>
          {description && <p>{description}</p>}
        </div>
        {actions && <div className="page-header-actions">{actions}</div>}
      </div>
    </div>
  );
}

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  text?: ReactNode;
  /** Кнопка действия, например «Добавить первую запись». */
  action?: ReactNode;
  /** Компактный вариант (меньше отступов). */
  compact?: boolean;
}

/** Пустое состояние списка или раздела. */
export function EmptyState({ icon: Icon, title, text, action, compact }: EmptyStateProps) {
  return (
    <div className={`empty${compact ? ' empty-compact' : ''}`}>
      {Icon && <span className="empty-icon"><Icon size={26} aria-hidden="true" /></span>}
      <p className="empty-title">{title}</p>
      {text && <p className="empty-text">{text}</p>}
      {action && <div className="empty-action">{action}</div>}
    </div>
  );
}

/** Серая «болванка» на время загрузки. */
export function Skeleton({ width = '100%', height = 16, radius = 8, className = '' }: { width?: number | string; height?: number | string; radius?: number; className?: string }) {
  return <span className={`skeleton ${className}`} style={{ width, height, borderRadius: radius }} aria-hidden="true" />;
}

/** Скелет страницы — запасной вид, пока грузится раздел. */
export function PageSkeleton() {
  return (
    <div className="page-skeleton" role="status" aria-label="Загрузка раздела">
      <Skeleton width={180} height={14} />
      <Skeleton width="45%" height={34} radius={10} />
      <div className="panel">
        <Skeleton height={20} width="30%" />
        <div style={{ height: 18 }} />
        {Array.from({ length: 5 }, (_, i) => <div key={i} style={{ marginBottom: 12 }}><Skeleton height={44} radius={12} /></div>)}
      </div>
    </div>
  );
}

export interface ErrorStateProps { message: string; onRetry?: () => void }

/** Ошибка загрузки с кнопкой «Повторить». */
export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="error-state" role="alert">
      <p>{message}</p>
      {onRetry && <button type="button" className="btn btn-ghost btn-sm" onClick={onRetry}>Повторить</button>}
    </div>
  );
}
