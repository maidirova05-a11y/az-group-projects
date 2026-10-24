import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type TouchEvent } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, MapPin } from 'lucide-react';
import { Panel } from '../../components/ui';
import { programVars } from './color';
import { useDates, useEventsText } from './i18n';
import { addDays, addMonths, exactInMonth, exactOn, layoutWeek, monthOf, monthOnlyIn, monthRange, monthWeeks, weekday, type Occ } from './model';

/** Сколько дорожек-полос помещается в ячейке на компьютере; остальное — «+N ещё». */
const MAX_LANES = 3;

/** Тот же день в другом месяце; в коротком месяце — его последний день. */
const sameDayIn = (ym: string, day: string) => { const last = addDays(`${addMonths(ym, 1)}-01`, -1); const d = `${ym}-${day.slice(8)}`; return d > last ? last : d; };

type Open = (occ: Occ, returnTo: () => HTMLElement | null) => void;

function OccButton({ occ, onOpen, showDate, returnTo }: { occ: Occ; onOpen: Open; showDate?: boolean; returnTo?: () => HTMLElement | null }) {
  const T = useEventsText();
  const D = useDates();
  const multi = occ.kind === 'exact' && occ.end !== occ.start;
  return (
    <button
      type="button"
      className={`ev-agenda-item acc ${occ.status === 'past' ? 'past' : ''}`}
      style={programVars(occ.program.color)}
      onClick={e => { const el = e.currentTarget; onOpen(occ, returnTo ?? (() => el)); }}
    >
      <span className="ev-agenda-bar" aria-hidden="true" />
      {showDate && occ.kind === 'exact' && (
        <span className="ev-agenda-date" aria-hidden="true">
          <strong>{Number(occ.start.slice(8))}{multi && occ.end.slice(0, 7) === occ.start.slice(0, 7) ? `–${Number(occ.end.slice(8))}` : ''}</strong>
          <small>{D.monthShort(occ.start)}</small>
        </span>
      )}
      <span className="ev-agenda-text">
        <strong>{occ.program.name}</strong>
        <span>{occ.event.label} · <MapPin size={12} aria-hidden="true" />{occ.event.place}</span>
      </span>
      {occ.status === 'past' && <span className="badge muted">{T.badgePast}</span>}
      {occ.status === 'current' && <span className="badge hot">{T.badgeCurrent}</span>}
    </button>
  );
}

export function CalendarView({ occs, today, start, onOpen }: { occs: Occ[]; today: string; start: string; onOpen: Open }) {
  const T = useEventsText();
  const D = useDates();
  const [view, setView] = useState(start);
  const [focusDay, setFocusDay] = useState(() => (monthOf(today) === start ? today : `${start}-01`));
  const [selected, setSelected] = useState<string | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const agendaRef = useRef<HTMLHeadingElement>(null);
  const moveFocus = useRef(false);
  const touch = useRef<{ x: number; y: number } | null>(null);

  const exact = useMemo(() => occs.filter(o => o.kind === 'exact'), [occs]);
  const weeks = useMemo(() => monthWeeks(view), [view]);
  const layouts = useMemo(() => weeks.map(w => layoutWeek(w, exact)), [weeks, exact]);
  const strip = useMemo(() => monthOnlyIn(occs, view), [occs, view]);
  const months = useMemo(() => monthRange(occs, today, view), [occs, today, view]);
  const agenda = selected ? exactOn(exact, selected) : exactInMonth(exact, view);
  const monthTitle = D.monthYear(view);

  const goMonth = (m: string, day?: string) => {
    setView(m);
    setSelected(null);
    setFocusDay(day ?? (monthOf(today) === m ? today : `${m}-01`));
  };

  const cellFor = (day: string) => gridRef.current?.querySelector<HTMLElement>(`[data-date="${day}"]`) ?? null;

  useEffect(() => {
    if (!moveFocus.current) return;
    moveFocus.current = false;
    cellFor(focusDay)?.focus();
  }, [focusDay, view]);

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const day = (e.target as HTMLElement).dataset.date;
    if (!day) return;
    let next: string | null = null;
    switch (e.key) {
      case 'ArrowLeft': next = addDays(day, -1); break;
      case 'ArrowRight': next = addDays(day, 1); break;
      case 'ArrowUp': next = addDays(day, -7); break;
      case 'ArrowDown': next = addDays(day, 7); break;
      case 'Home': next = addDays(day, -weekday(day)); break;
      case 'End': next = addDays(day, 6 - weekday(day)); break;
      case 'PageUp': next = sameDayIn(addMonths(monthOf(day), -1), day); break;
      case 'PageDown': next = sameDayIn(addMonths(monthOf(day), 1), day); break;
      case 'Enter': case ' ': {
        e.preventDefault();
        const list = exactOn(exact, day);
        if (list.length === 1) { onOpen(list[0], () => cellFor(day)); return; }
        setSelected(day);
        if (list.length) window.setTimeout(() => agendaRef.current?.focus(), 0);
        return;
      }
      default: return;
    }
    e.preventDefault();
    moveFocus.current = true;
    if (monthOf(next) !== view) { setView(monthOf(next)); setSelected(null); }
    setFocusDay(next);
  };

  const onTouchStart = (e: TouchEvent) => { const t = e.touches[0]; touch.current = { x: t.clientX, y: t.clientY }; };
  const onTouchEnd = (e: TouchEvent) => {
    const s = touch.current; touch.current = null;
    if (!s) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - s.x, dy = t.clientY - s.y;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) goMonth(addMonths(view, dx < 0 ? 1 : -1));
  };

  const selectDay = (day: string) => {
    if (monthOf(day) !== view) { goMonth(monthOf(day), day); setSelected(day); return; }
    setFocusDay(day);
    setSelected(s => (s === day ? null : day));
  };

  return (
    <Panel className="ev-cal">
      <div className="ev-cal-head">
        <h2 className="ev-cal-title" aria-live="polite">{monthTitle}</h2>
        <div className="ev-cal-nav">
          <button type="button" className="ev-icon-btn" onClick={() => goMonth(addMonths(view, -1))} aria-label={T.prevMonth}><ChevronLeft size={20} aria-hidden="true" /></button>
          <button type="button" className="ev-pill" onClick={() => goMonth(monthOf(today), today)} disabled={view === monthOf(today) && !selected}>{T.today}</button>
          <button type="button" className="ev-icon-btn" onClick={() => goMonth(addMonths(view, 1))} aria-label={T.nextMonth}><ChevronRight size={20} aria-hidden="true" /></button>
          <label className="ev-select">
            <span className="sr-only">{T.jumpMonth}</span>
            <select value={view} onChange={e => goMonth(e.target.value)}>
              {months.map(m => <option key={m} value={m}>{D.monthYear(m)}</option>)}
            </select>
          </label>
        </div>
      </div>

      {strip.length > 0 && (
        <section className="ev-strip" aria-label={`${T.monthStrip}: ${monthTitle}`}>
          <h3><CalendarDays size={15} aria-hidden="true" />{T.monthStrip}</h3>
          <ul>
            {strip.map(o => (
              <li key={o.key}>
                <button type="button" className={`ev-tag acc ${o.status === 'past' ? 'past' : ''}`} style={programVars(o.program.color)} onClick={e => { const el = e.currentTarget; onOpen(o, () => el); }}>
                  <span className="ev-dot" aria-hidden="true" /><strong>{o.program.name}</strong><span>{o.event.place}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div
        className="ev-grid"
        role="grid"
        aria-label={T.calendarLabel(monthTitle)}
        ref={gridRef}
        onKeyDown={onKey}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div className="ev-row ev-head-row" role="row">
          {D.weekdaysShort.map((w, i) => (
            <div key={w} role="columnheader" className={i > 4 ? 'weekend' : ''}><abbr title={D.weekdaysLong[i]}>{w}</abbr></div>
          ))}
        </div>
        {weeks.map((week, wi) => {
          const { segments, perDay } = layouts[wi];
          const lanes = Math.min(MAX_LANES, segments.reduce((n, s) => Math.max(n, s.lane + 1), 0));
          return (
            <div className="ev-week" key={week[0]} role="presentation">
              <div className="ev-row" role="row">
                {week.map((day, di) => {
                  const list = perDay[di];
                  const out = monthOf(day) !== view;
                  const isToday = day === today;
                  const label = `${D.dayMonth(day)}${isToday ? `, ${T.todaySuffix}` : ''}, ${T.eventsCount(list.length)}`;
                  return (
                    <div
                      key={day}
                      role="gridcell"
                      data-date={day}
                      tabIndex={day === focusDay ? 0 : -1}
                      aria-label={label}
                      aria-selected={selected === day}
                      aria-current={isToday ? 'date' : undefined}
                      className={['ev-day', di > 4 && 'weekend', out && 'out', day < today && 'past', isToday && 'today', selected === day && 'selected', list.length > 0 && 'has'].filter(Boolean).join(' ')}
                      onClick={() => selectDay(day)}
                      onFocus={() => setFocusDay(day)}
                    >
                      <span className="ev-num" aria-hidden="true">{Number(day.slice(8))}</span>
                      {list.length > 0 && (
                        <span className="ev-dots" aria-hidden="true">
                          {list.slice(0, 3).map(o => <span key={o.key} className={`ev-dot acc ${o.status === 'past' ? 'past' : ''}`} style={programVars(o.program.color)} />)}
                          {list.length > 3 && <span className="ev-dots-more">+</span>}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
              {/* Полосы — визуальный слой для мыши; клавиатура и скринридеры получают те же события через ячейки и список ниже. */}
              <div className="ev-bars" aria-hidden="true" style={{ gridTemplateRows: `repeat(${MAX_LANES + 1}, var(--bar-h))` }}>
                {segments.filter(s => s.lane < lanes).map(s => (
                  <button
                    key={`${s.occ.key}:${week[0]}`}
                    type="button"
                    tabIndex={-1}
                    className={['ev-bar', 'acc', s.occ.status === 'past' && 'past', monthOf(s.firstDay) !== view && 'out', s.contLeft && 'cont-l', s.contRight && 'cont-r'].filter(Boolean).join(' ')}
                    style={{ ...programVars(s.occ.program.color), gridColumn: `${s.col + 1} / span ${s.span}`, gridRow: s.lane + 1 }}
                    title={`${s.occ.program.name} · ${s.occ.event.label} · ${s.occ.event.place}`}
                    onClick={e => { e.stopPropagation(); const d = s.firstDay; setFocusDay(d); onOpen(s.occ, () => cellFor(d)); }}
                  >
                    {s.occ.program.name}
                  </button>
                ))}
                {perDay.map((list, di) => {
                  const hiddenN = list.filter(o => (segments.find(s => s.occ === o)?.lane ?? 0) >= MAX_LANES).length;
                  if (!hiddenN) return null;
                  const day = week[di];
                  return (
                    <button key={`more-${day}`} type="button" tabIndex={-1} className="ev-more" style={{ gridColumn: di + 1, gridRow: MAX_LANES + 1 }}
                      onClick={e => { e.stopPropagation(); selectDay(day); setSelected(day); window.setTimeout(() => agendaRef.current?.focus(), 0); }}>
                      {T.more(hiddenN)}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <p className="ev-swipe-hint">{T.swipeHint}</p>

      <section className="ev-agenda" aria-labelledby="ev-agenda-title">
        <div className="ev-agenda-head">
          <h3 id="ev-agenda-title" ref={agendaRef} tabIndex={-1} aria-live="polite">{selected ? D.weekdayDayMonth(selected) : T.agendaMonth(monthTitle)}</h3>
          {selected && <button type="button" className="ev-pill ghost" onClick={() => setSelected(null)}>{T.agendaShowMonth}</button>}
        </div>
        {agenda.length
          ? <ul className="ev-agenda-list">{agenda.map(o => <li key={o.key}><OccButton occ={o} onOpen={onOpen} showDate={!selected} /></li>)}</ul>
          : <p className="ev-agenda-empty">{selected ? T.agendaEmptyDay : T.agendaEmptyMonth}</p>}
      </section>
    </Panel>
  );
}

/** «В течение сезона» — программы без конкретных дат. */
export function SeasonBlock({ occs, onOpen }: { occs: Occ[]; onOpen: Open }) {
  const T = useEventsText();
  const list = occs.filter(o => o.kind === 'season');
  if (!list.length) return null;
  return (
    <Panel className="ev-season" title={T.season}>
      <p className="ev-season-note">{T.seasonNote}</p>
      <ul className="ev-agenda-list ev-season-list">{list.map(o => <li key={o.key}><OccButton occ={o} onOpen={onOpen} /></li>)}</ul>
    </Panel>
  );
}
