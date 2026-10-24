import { useState, type ReactNode } from 'react';
import { ArrowUpRight, ChevronRight, type LucideIcon } from 'lucide-react';
import { useT } from '../i18n';
import { linkProps } from '../router';
import { safeHref, safeImgSrc } from '../content/safe-url';

/** Белая карточка-раздел на сером фоне, как блоки egov.kz. */
export function Panel({ title, action, children, className = '', id }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string; id?: string }) {
  return (
    <section className={`panel ${className}`} id={id} aria-labelledby={id && title ? `${id}-title` : undefined}>
      {(title || action) && (
        <header className="panel-head">
          {title && <h2 id={id ? `${id}-title` : undefined}>{title}</h2>}
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

/** Заголовок страницы-раздела с хлебной крошкой. */
export function PageTitle({ title, lead, children }: { title: string; lead?: ReactNode; children?: ReactNode }) {
  const t = useT().layout;
  return (
    <div className="page-title">
      <nav aria-label={t.crumbs} className="crumbs">
        <a {...linkProps('/')}>{t.home}</a>
        <ChevronRight size={14} aria-hidden="true" />
        <span aria-current="page">{title}</span>
      </nav>
      <div className="page-title-row">
        <div>
          <h1>{title}</h1>
          {lead && <p>{lead}</p>}
        </div>
        {children}
      </div>
    </div>
  );
}

/** Плитка услуги: круглый значок, подпись, метка в углу. Внутренняя или внешняя ссылка. */
export function Tile({ to, href, Icon, label, note, Corner }: { to?: string; href?: string; Icon: LucideIcon; label: string; note?: string; Corner?: LucideIcon }) {
  const props = to ? linkProps(to) : { href: safeHref(href), target: '_blank', rel: 'noreferrer' };
  return (
    <a className="tile" {...props}>
      <span className="tile-icon"><Icon size={22} strokeWidth={1.8} aria-hidden="true" /></span>
      <span className="tile-label">{label}</span>
      {note && <span className="tile-note">{note}</span>}
      <span className="tile-corner" aria-hidden="true">{Corner ? <Corner size={14} /> : href ? <ArrowUpRight size={14} /> : null}</span>
    </a>
  );
}

/** Переключатель-сегменты (как «Гражданам / Бизнесу»): группа кнопок-переключателей с aria-pressed. */
export function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: { id: T; label: string; count?: number }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      {options.map(o => (
        <button key={o.id} type="button" aria-pressed={value === o.id} className={value === o.id ? 'on' : ''} onClick={() => onChange(o.id)}>
          {o.label}
          {o.count !== undefined && <span>{o.count}</span>}
        </button>
      ))}
    </div>
  );
}

/** Пустое состояние: спокойная иллюстрация, заголовок и действие. Иллюстрация декоративная — смысл несёт заголовок. */
export function EmptyState({ art = 'generic', title, children, compact }: { art?: 'events' | 'search' | 'generic'; title: ReactNode; children?: ReactNode; compact?: boolean }) {
  return (
    <div className={`empty-state ${compact ? 'compact' : ''}`}>
      <img className="illus" src={`/illustrations/empty-${art}.svg`} alt="" width="200" height="160" loading="lazy" />
      {compact ? <p className="empty-state-title">{title}</p> : <h2 className="empty-state-title">{title}</h2>}
      {children}
    </div>
  );
}

/** Картинка с «скелетоном» на время загрузки и запасной иллюстрацией при ошибке. */
export function LoadingImage({ src: rawSrc, alt = '', fallback = '/illustrations/empty-generic.svg', className = '' }: { src: string | null | undefined; alt?: string; fallback?: string; className?: string }) {
  const src = safeImgSrc(rawSrc);
  const [state, setState] = useState<'loading' | 'ok' | 'error'>(src ? 'loading' : 'error');
  const [prevSrc, setPrevSrc] = useState(src);
  if (src !== prevSrc) { setPrevSrc(src); setState(src ? 'loading' : 'error'); }
  return (
    <span className={`img-frame ${className} ${state === 'loading' ? 'skeleton' : ''} ${state === 'error' ? 'is-fallback' : ''}`} aria-busy={state === 'loading' || undefined}>
      {state === 'error'
        ? <img src={fallback} alt={alt} loading="lazy" />
        : <img src={src!} alt={alt} loading="lazy" onLoad={() => setState('ok')} onError={() => setState('error')} />}
    </span>
  );
}

export function MoreLink({ to, children }: { to: string; children: ReactNode }) {
  return <a className="more-link" {...linkProps(to)}>{children}<ChevronRight size={16} aria-hidden="true" /></a>;
}
