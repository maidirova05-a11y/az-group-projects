import { useEffect, useRef } from 'react';
import { ArrowUpRight, CalendarDays, Filter, MapPin, Wallet, X } from 'lucide-react';
import { useContent } from '../../content/useContent';
import { safeHref } from '../../content/safe-url';
import { linkProps } from '../../router';
import { programVars } from './color';
import { useEventsText, usePriceText } from './i18n';
import { RegLink } from './ListView';
import type { Occ } from './model';

/**
 * Карточка события в нативном <dialog>: Esc закрывает, фокус заперт внутри окна,
 * после закрытия возвращается туда, откуда окно открыли (returnTo).
 */
export function EventDialog({ occ, nearestId, returnTo, onClose, onOnly }: {
  occ: Occ | null;
  nearestId?: number;
  returnTo: () => HTMLElement | null;
  onClose: () => void;
  onOnly: (slug: string) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const { projects } = useContent();
  const T = useEventsText();
  const priceText = usePriceText();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (occ && !d.open) d.showModal();
    if (!occ && d.open) d.close();
  }, [occ]);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    const handle = () => {
      onClose();
      const el = returnTo();
      if (el?.isConnected) window.setTimeout(() => el.focus(), 0);
    };
    d.addEventListener('close', handle);
    return () => d.removeEventListener('close', handle);
  }, [onClose, returnTo]);

  const close = () => ref.current?.close();
  const p = occ?.program;
  const e = occ?.event;
  const project = p?.projectSlug ? projects.find(x => x.slug === p.projectSlug) : undefined;
  const badge = !occ ? null
    : nearestId === e!.id ? [T.badgeNearest, 'hot']
    : occ.status === 'current' ? [T.badgeCurrent, 'hot']
    : occ.status === 'past' ? [T.badgePast, 'muted']
    : occ.kind === 'month' ? [T.badgeMonthOnly, '']
    : occ.kind === 'season' ? [T.badgeFlexible, ''] : null;

  return (
    <dialog
      ref={ref}
      className={`ev-dialog acc ${occ?.status === 'past' ? 'is-past' : ''}`}
      style={p ? programVars(p.color) : undefined}
      aria-labelledby="ev-dialog-title"
      onClick={ev => { if (ev.target === ref.current) close(); }}
    >
      {occ && p && e && (
        <div className="ev-dialog-body">
          <div className="ev-dialog-band" aria-hidden="true" />
          <header className="ev-dialog-head">
            <div>
              <h2 id="ev-dialog-title">{p.name}</h2>
              {p.subtitle && <p>{p.subtitle}</p>}
            </div>
            <button type="button" className="ev-icon-btn" onClick={close} aria-label={T.close} autoFocus><X size={20} aria-hidden="true" /></button>
          </header>
          <dl className="ev-facts">
            <div>
              <dt><CalendarDays size={16} aria-hidden="true" /><span className="sr-only">{T.date}</span></dt>
              <dd>
                {e.startDate ? <time dateTime={e.monthOnly ? e.startDate.slice(0, 7) : e.startDate}>{e.label}</time> : e.label}
                {badge && <span className={`badge ${badge[1]}`}>{badge[0]}</span>}
              </dd>
            </div>
            <div><dt><MapPin size={16} aria-hidden="true" /><span className="sr-only">{T.place}</span></dt><dd>{e.place}</dd></div>
            {e.price != null && <div><dt><Wallet size={16} aria-hidden="true" /><span className="sr-only">{T.price}</span></dt><dd>{priceText(e.price)}</dd></div>}
          </dl>
          <div className="ev-dialog-actions">
            {e.registrationUrl && occ.status !== 'past' && (
              <RegLink url={e.registrationUrl} programName={p.name} className="btn btn-primary">{T.registration}<ArrowUpRight size={17} aria-hidden="true" /></RegLink>
            )}
            {project?.url
              ? <a className="btn btn-ghost" href={safeHref(project.url)} target="_blank" rel="noreferrer">{T.projectSite}<ArrowUpRight size={17} aria-hidden="true" /></a>
              : <a className="btn btn-ghost" {...linkProps('/contacts#request')} onClick={ev => { close(); linkProps('/contacts#request').onClick(ev); }}>{T.askAbout}<ArrowUpRight size={17} aria-hidden="true" /></a>}
            <button type="button" className="ev-link-btn" onClick={() => { onOnly(p.slug); close(); }}><Filter size={15} aria-hidden="true" />{T.onlyThis}</button>
          </div>
        </div>
      )}
    </dialog>
  );
}
