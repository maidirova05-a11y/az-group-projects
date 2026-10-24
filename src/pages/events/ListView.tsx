import { useMemo, useState, type ReactNode } from 'react';
import { ArrowUpRight, MapPin, Wallet } from 'lucide-react';
import type { EventDTO, ProgramDTO } from '@shared/schemas';
import { useContent } from '../../content/useContent';
import { calendarCategories, eventStatus } from '../../content/calendar';
import { isExternal } from '../../content/links';
import { safeHref } from '../../content/safe-url';
import { Panel } from '../../components/ui';
import { linkProps } from '../../router';
import { programVars } from './color';
import { useDates, useEventsText, usePriceText } from './i18n';
import { DateBox } from './DateBox';
import { GROUPS, accentStyle } from './groups';

const MARKS: Record<string, string> = { fibonacci: '/logos/fibonacci-icon.png', atlantia: '/logos/atlantia-emblem.png', itecx: '/logos/itecx-mark.svg' };

/** Ссылка на регистрацию: внешняя открывается в новой вкладке, внутренняя — без перезагрузки. */
export function RegLink({ url, programName, className = 'event-reg', children }: { url: string; programName: string; className?: string; children?: ReactNode }) {
  const T = useEventsText();
  const safe = safeHref(url);
  const props = isExternal(safe) ? { href: safe, target: '_blank', rel: 'noreferrer' } : safe === '#' ? { href: safe } : linkProps(safe);
  return <a className={className} {...props} aria-label={T.registrationFor(programName)}>{children ?? <>{T.registration}<ArrowUpRight size={13} aria-hidden="true" /></>}</a>;
}

function EventRow({ event, program, today, featured }: { event: EventDTO; program: ProgramDTO; today: string; featured: boolean }) {
  const T = useEventsText();
  const priceText = usePriceText();
  const status = eventStatus(event, today);
  const badge = featured ? [T.badgeNearest, 'hot'] : status === 'current' ? [T.badgeCurrent, 'hot'] : status === 'past' ? [T.badgePast, 'muted'] : event.monthOnly ? [T.badgeMonthOnly, ''] : !event.startDate ? [T.badgeFlexible, ''] : null;
  const showReg = !!event.registrationUrl && status !== 'past';
  return (
    <li className={`event-row ${status === 'past' ? 'past' : ''}`}>
      <DateBox event={event} />
      <div>
        {event.startDate ? <time dateTime={event.monthOnly ? event.startDate.slice(0, 7) : event.startDate}>{event.label}</time> : <strong>{event.label}</strong>}
        <span className="event-place"><MapPin size={12} aria-hidden="true" />{event.place}</span>
        {(event.price != null || showReg) && (
          <span className="event-extra">
            {event.price != null && <span className="event-price"><Wallet size={12} aria-hidden="true" />{priceText(event.price)}</span>}
            {showReg && <RegLink url={event.registrationUrl!} programName={program.name} />}
          </span>
        )}
      </div>
      {badge && <span className={`badge ${badge[1]}`}>{badge[0]}</span>}
    </li>
  );
}

function ProgramCard({ program, today, nearestId, month }: { program: ProgramDTO; today: string; nearestId?: number; month: string }) {
  const T = useEventsText();
  const { projects } = useContent();
  const project = program.projectSlug ? projects.find(p => p.slug === program.projectSlug) : undefined;
  const { Icon } = GROUPS[program.category];
  const mark = program.category === 'science' && project ? MARKS[project.slug] : undefined;
  const events = program.events
    .filter(e => !month || e.startDate?.slice(0, 7) === month)
    .slice()
    .sort((a, b) => (a.startDate ?? '9999').localeCompare(b.startDate ?? '9999'));
  return (
    <article className="program acc ev-program" style={programVars(program.color)}>
      <header>
        <span className="program-mark">{mark ? <img src={mark} alt="" loading="lazy" /> : <Icon size={22} strokeWidth={1.7} aria-hidden="true" />}</span>
        <div><h3>{program.name}</h3><p>{program.subtitle}</p></div>
      </header>
      <ul className="event-list">{events.map(e => <EventRow key={e.id} event={e} program={program} today={today} featured={nearestId === e.id} />)}</ul>
      <footer>
        {project?.url
          ? <a href={safeHref(project.url)} target="_blank" rel="noreferrer">{T.projectSite}<ArrowUpRight size={15} aria-hidden="true" /></a>
          : <a {...linkProps('/contacts#request')}>{T.askAbout}<ArrowUpRight size={15} aria-hidden="true" /></a>}
        <span>{T.datesCount(events.length)}</span>
      </footer>
    </article>
  );
}

/** Вид «Список»: карточки программ по направлениям с фильтром по месяцу. */
export function ListView({ programs, today, nearestId }: { programs: ProgramDTO[]; today: string; nearestId?: number }) {
  const T = useEventsText();
  const D = useDates();
  const [month, setMonth] = useState('');
  const months = useMemo(() => [...new Set(programs.flatMap(p => p.events.flatMap(e => (e.startDate ? [e.startDate.slice(0, 7)] : []))))].sort(), [programs]);
  const visible = programs.filter(p => !month || p.events.some(e => e.startDate?.slice(0, 7) === month));
  return (
    <>
      {months.length > 1 && (
        <Panel className="filters ev-list-filters">
          <div className="month-row" role="group" aria-label={T.monthGroup}>
            <button type="button" className={!month ? 'on' : ''} aria-pressed={!month} onClick={() => setMonth('')}>{T.allSeason}</button>
            {months.map(m => (
              <button key={m} type="button" className={month === m ? 'on' : ''} aria-pressed={month === m} onClick={() => setMonth(m)} aria-label={D.monthYear(m)}>
                {D.monthShort(`${m}-01`)} <small>{m.slice(2, 4)}</small>
              </button>
            ))}
          </div>
        </Panel>
      )}
      {calendarCategories.map(c => {
        const list = visible.filter(p => p.category === c.id);
        if (!list.length) return null;
        const g = GROUPS[c.id];
        return (
          <Panel key={c.id} title={<><g.Icon size={20} aria-hidden="true" className="cat-icon" style={accentStyle(g.color)} />{T.groups[c.id]}</>}>
            <div className="program-grid">{list.map(p => <ProgramCard key={p.id} program={p} today={today} nearestId={nearestId} month={month} />)}</div>
          </Panel>
        );
      })}
    </>
  );
}
