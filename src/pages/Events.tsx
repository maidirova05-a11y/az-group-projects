import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpRight, Download, Globe2, GraduationCap, Info, Wallet } from 'lucide-react';
import { useContent } from '../content/useContent';
import { eventStatus, nearestEvent, toISODate, type CalendarCategory } from '../content/calendar';
import { isExternal } from '../content/links';
import { safeHref } from '../content/safe-url';
import { participationPrice } from '../data/site';
import { EmptyState, PageTitle, Panel, Segmented } from '../components/ui';
import { navigate } from '../router';
import { CalendarView, SeasonBlock } from './events/CalendarView';
import { EventDialog } from './events/EventDialog';
import { Legend } from './events/Legend';
import { ListView } from './events/ListView';
import { DateBox } from './events/DateBox';
import { useI18n } from '../i18n';
import { initialMonth, occurrences, type Occ } from './events/model';
import './events/events.css';

/** Стоимость участия в олимпиаде Fibonacci — число из src/data/site.ts («25 000 ₸»), форматируется по языку. */
const PARTICIPATION_PRICE = Number(participationPrice.replace(/\D/g, ''));

type View = 'calendar' | 'list';
const VIEW_KEY = 'az:events:view';
const readView = (): View => { try { return localStorage.getItem(VIEW_KEY) === 'list' ? 'list' : 'calendar'; } catch { return 'calendar'; } };

/** «Сегодня» по Астане; обновляется после полуночи, если страница открыта долго. */
function useToday() {
  const [today, setToday] = useState(() => toISODate(new Date()));
  useEffect(() => {
    const id = window.setInterval(() => setToday(t => { const n = toISODate(new Date()); return n === t ? t : n; }), 60_000);
    return () => window.clearInterval(id);
  }, []);
  return today;
}

export default function Events({ query }: { query: URLSearchParams }) {
  const { programs, settings: { links } } = useContent();
  const { t, price } = useI18n();
  const T = t.events;
  const today = useToday();
  const q = query.get('q') ?? '';
  // ?programs=slug1,slug2 — показать только эти программы (например, плитка «Мировые финалы» на главной).
  const only = query.get('programs') ?? '';
  const [view, setViewState] = useState<View>(readView);
  const setView = (v: View) => { setViewState(v); try { localStorage.setItem(VIEW_KEY, v); } catch { /* приватный режим */ } };

  // Фильтр храним как набор скрытых слагов: слаги одинаковы у статических и живых данных.
  const hiddenFor = useCallback((name: string, slugs: string) => {
    const wanted = new Set(slugs.split(',').map(s => s.trim()).filter(Boolean));
    const keep = wanted.size
      ? programs.filter(p => wanted.has(p.slug))
      : programs.filter(p => name && p.name.toLowerCase() === name.toLowerCase());
    // Неизвестные слаги/название — фильтр не применяем (лучше весь календарь, чем пустой).
    if (!keep.length) return new Set<string>();
    const keepSlugs = new Set(keep.map(p => p.slug));
    return new Set(programs.filter(p => !keepSlugs.has(p.slug)).map(p => p.slug));
  }, [programs]);
  const filterKey = `${q}|${only}`;
  const [hidden, setHidden] = useState<Set<string>>(() => hiddenFor(q, only));
  const [prevKey, setPrevKey] = useState(filterKey);
  if (filterKey !== prevKey) { setPrevKey(filterKey); setHidden(hiddenFor(q, only)); }
  const linked = !!(q || only);

  const visible = useMemo(() => programs.filter(p => !hidden.has(p.slug)), [programs, hidden]);
  const occs = useMemo(() => occurrences(visible, today), [visible, today]);
  const nearest = useMemo(() => nearestEvent(programs, today), [programs, today]);
  const nearestNow = !!nearest && eventStatus(nearest.event, today) === 'current';
  const nearestReg = safeHref(nearest?.event.registrationUrl || links.registration);
  // Стартовый месяц пересчитываем только при смене ссылки ?q, а не на каждое переключение легенды.
  const start = useMemo(() => initialMonth(occs, today), [filterKey, today]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (slug: string) => setHidden(h => { const n = new Set(h); if (n.has(slug)) n.delete(slug); else n.add(slug); return n; });
  const toggleGroup = (cat: CalendarCategory) => setHidden(h => {
    const slugs = programs.filter(p => p.category === cat).map(p => p.slug);
    const anyOn = slugs.some(s => !h.has(s));
    const n = new Set(h);
    slugs.forEach(s => (anyOn ? n.add(s) : n.delete(s)));
    return n;
  });
  const showOnly = (slug: string) => setHidden(new Set(programs.filter(p => p.slug !== slug).map(p => p.slug)));
  const reset = () => { setHidden(new Set()); if (linked) navigate('/events'); };

  const [dialog, setDialog] = useState<Occ | null>(null);
  const returnRef = useRef<() => HTMLElement | null>(() => null);
  const open = useCallback((occ: Occ, returnTo: () => HTMLElement | null) => { returnRef.current = returnTo; setDialog(occ); }, []);
  const closeDialog = useCallback(() => setDialog(null), []);
  const returnTo = useCallback(() => returnRef.current(), []);

  return (
    <div className="ev-page">
      <PageTitle title={t.nav.events.label} lead={T.pageLead}>
        <div className="title-actions">
          <a className="btn btn-ghost" href={safeHref(links.posterPdf)} target="_blank" rel="noreferrer"><Download size={17} aria-hidden="true" />{T.posterPdf}</a>
          <a className="btn btn-primary" href={safeHref(links.registration)} target="_blank" rel="noreferrer">{T.registration}<ArrowUpRight size={17} aria-hidden="true" /></a>
        </div>
      </PageTitle>

      <div className="facts">
        <div className="fact"><span className="tile-icon"><Wallet size={20} aria-hidden="true" /></span><div><strong>{price(PARTICIPATION_PRICE)}</strong><span>{T.factPrice}</span></div></div>
        <div className="fact"><span className="tile-icon"><GraduationCap size={20} aria-hidden="true" /></span><div><strong>{T.factGrades}</strong><span>{T.factGradesNote}</span></div></div>
        <div className="fact"><span className="tile-icon"><Globe2 size={20} aria-hidden="true" /></span><div><strong>{T.factCities}</strong><span>{T.factCitiesNote}</span></div></div>
      </div>

      {nearest && !linked && (
        <Panel className="nearest">
          <span className="nearest-label"><span className="pulse" aria-hidden="true" />{nearestNow ? T.nearestNow : T.nearest}</span>
          <div className="nearest-body">
            <DateBox event={nearest.event} />
            <div>
              {/* Не заголовок: карточка стоит до «Программ» (h2), заголовок здесь сломал бы порядок h1 → h2. */}
              <p className="nearest-title"><strong>{nearest.program.name}</strong>{nearestNow && <span className="badge hot">{T.badgeCurrent}</span>}</p>
              <p>{nearest.program.subtitle} · {nearest.event.label} · {nearest.event.place}{nearest.event.price != null && ` · ${nearest.event.price === 0 ? T.freeLower : price(nearest.event.price)}`}</p>
            </div>
            <a className="btn btn-primary" href={nearestReg} target={isExternal(nearestReg) ? '_blank' : undefined} rel="noreferrer">{T.participate}<ArrowUpRight size={17} aria-hidden="true" /></a>
          </div>
        </Panel>
      )}

      <div className="ev-toolbar">
        <Segmented label={T.viewLabel} value={view} onChange={setView} options={[{ id: 'calendar', label: T.viewCalendar }, { id: 'list', label: T.viewList }]} />
      </div>

      <Legend programs={programs} hidden={hidden} onToggle={toggle} onToggleGroup={toggleGroup} onAll={() => setHidden(new Set())} onReset={reset} canReset={hidden.size > 0 || linked} />

      {!visible.length ? (
        <Panel className="empty">
          <EmptyState art="events" title={T.emptyTitle}>
            <button type="button" className="btn btn-primary" onClick={reset}>{T.emptyReset}</button>
          </EmptyState>
        </Panel>
      ) : view === 'calendar' ? (
        <>
          <CalendarView key={start} occs={occs} today={today} start={start} onOpen={open} />
          <SeasonBlock occs={occs} onOpen={open} />
        </>
      ) : (
        <ListView programs={visible} today={today} nearestId={nearest?.event.id} />
      )}

      <p className="note"><Info size={16} aria-hidden="true" />{T.note}</p>

      <EventDialog occ={dialog} nearestId={nearest?.event.id} returnTo={returnTo} onClose={closeDialog} onOnly={showOnly} />
    </div>
  );
}
