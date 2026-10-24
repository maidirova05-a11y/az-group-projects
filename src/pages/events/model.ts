/**
 * Модель календаря: события программ → «вхождения» и раскладка многодневных полос по неделям.
 * Даты — строки ГГГГ-ММ-ДД, вся арифметика в UTC, чтобы не зависеть от часового пояса браузера.
 */
import type { EventDTO, ProgramDTO } from '@shared/schemas';
import { eventStatus, type EventStatus } from '../../content/calendar';

export type OccKind = 'exact' | 'month' | 'season';
export interface Occ {
  key: string;
  program: ProgramDTO;
  event: EventDTO;
  kind: OccKind;
  start: string; // для season — ''
  end: string;
  status: EventStatus;
}

const utc = (iso: string) => new Date(`${iso}T00:00:00Z`);
const iso = (d: Date) => d.toISOString().slice(0, 10);
export const addDays = (d: string, n: number) => { const x = utc(d); x.setUTCDate(x.getUTCDate() + n); return iso(x); };
/** День недели, понедельник = 0. */
export const weekday = (d: string) => (utc(d).getUTCDay() + 6) % 7;
export const monthOf = (d: string) => d.slice(0, 7);
export const addMonths = (ym: string, n: number) => {
  const [y, m] = ym.split('-').map(Number);
  const t = y * 12 + (m - 1) + n;
  return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, '0')}`;
};
export const daysBetween = (a: string, b: string) => Math.round((utc(b).getTime() - utc(a).getTime()) / 86400000);

export function occurrences(programs: ProgramDTO[], today: string): Occ[] {
  return programs.flatMap(program => program.events.map(event => {
    const kind: OccKind = !event.startDate ? 'season' : event.monthOnly ? 'month' : 'exact';
    const start = event.startDate ?? '';
    const end = event.endDate && event.endDate >= start ? event.endDate : start;
    return { key: `${program.slug}:${event.id}`, program, event, kind, start, end, status: eventStatus(event, today) };
  }));
}

const byStart = (a: Occ, b: Occ) => a.start.localeCompare(b.start) || a.program.sort - b.program.sort || a.event.id - b.event.id;

/** Недели месяца (Пн–Вс), включая хвосты соседних месяцев. */
export function monthWeeks(ym: string): string[][] {
  const first = `${ym}-01`;
  const last = addDays(`${addMonths(ym, 1)}-01`, -1);
  let d = addDays(first, -weekday(first));
  const end = addDays(last, 6 - weekday(last));
  const weeks: string[][] = [];
  while (d <= end) {
    weeks.push(Array.from({ length: 7 }, (_, i) => addDays(d, i)));
    d = addDays(d, 7);
  }
  return weeks;
}

export interface Segment { occ: Occ; col: number; span: number; lane: number; contLeft: boolean; contRight: boolean; firstDay: string }

/** Раскладка точных событий недели по дорожкам: многодневные — сплошной полосой, с переносом на следующую неделю. */
export function layoutWeek(week: string[], exact: Occ[]): { segments: Segment[]; perDay: Occ[][] } {
  const ws = week[0], we = week[6];
  const items = exact
    .filter(o => o.start <= we && o.end >= ws)
    .sort((a, b) => a.start.localeCompare(b.start) || daysBetween(b.start, b.end) - daysBetween(a.start, a.end) || byStart(a, b));
  const laneEnds: number[] = [];
  const segments: Segment[] = items.map(occ => {
    const from = occ.start < ws ? ws : occ.start;
    const to = occ.end > we ? we : occ.end;
    const col = weekday(from);
    const span = daysBetween(from, to) + 1;
    let lane = laneEnds.findIndex(e => e < col);
    if (lane === -1) { lane = laneEnds.length; laneEnds.push(-1); }
    laneEnds[lane] = col + span - 1;
    return { occ, col, span, lane, contLeft: occ.start < ws, contRight: occ.end > we, firstDay: from };
  });
  const perDay = week.map(d => items.filter(o => o.start <= d && o.end >= d));
  return { segments, perDay };
}

export const exactOn = (exact: Occ[], day: string) => exact.filter(o => o.start <= day && o.end >= day).sort(byStart);
export const exactInMonth = (exact: Occ[], ym: string) => {
  const first = `${ym}-01`, last = addDays(`${addMonths(ym, 1)}-01`, -1);
  return exact.filter(o => o.start <= last && o.end >= first).sort(byStart);
};
export const monthOnlyIn = (occs: Occ[], ym: string) => occs.filter(o => o.kind === 'month' && monthOf(o.start) === ym).sort(byStart);

/** Стартовый месяц: текущий, если в нём есть события; иначе месяц ближайшего предстоящего; иначе последнего. */
export function initialMonth(occs: Occ[], today: string): string {
  const cur = monthOf(today);
  const dated = occs.filter(o => o.kind !== 'season');
  if (dated.some(o => monthOf(o.start) <= cur && monthOf(o.end) >= cur)) return cur;
  const next = dated.filter(o => o.end >= today).sort(byStart)[0];
  if (next) return monthOf(next.start);
  const last = dated.sort(byStart).at(-1);
  return last ? monthOf(last.start) : cur;
}

/** Месяцы для быстрого перехода: от первого до последнего события (и текущий). */
export function monthRange(occs: Occ[], today: string, extra?: string): string[] {
  const keys = occs.filter(o => o.kind !== 'season').flatMap(o => [monthOf(o.start), monthOf(o.end)]);
  keys.push(monthOf(today));
  if (extra) keys.push(extra);
  keys.sort();
  const out: string[] = [];
  for (let m = keys[0]; m <= keys[keys.length - 1]; m = addMonths(m, 1)) out.push(m);
  return out;
}
