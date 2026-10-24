/**
 * Общие чистые помощники календаря программ (без React и DOM): палитра программ и статусы дат.
 * Используются админкой (src/admin/pages/programs); сайт (src/data/calendar.ts) пока держит свои копии
 * той же логики и может перейти на этот модуль.
 */

/** Палитра программ календаря (те же цвета, что у программ сайта в src/data/calendar.ts). */
export const PROGRAM_COLORS = [
  '#e10926', '#ef4080', '#8557d5', '#bf58e1', '#037f7a', '#5a738d', '#2b6ae7', '#208239', '#599415', '#0a8ec6', '#c9440b', '#bf7405', '#c723b1',
] as const;

/** Запасные цвета, когда основная палитра уже занята (тот же уровень яркости, хорошо отличимы). */
export const PROGRAM_COLORS_EXTRA = [
  '#b0123f', '#3949ab', '#00796b', '#6d4c41', '#ad1457', '#2e7d32', '#455a64', '#0277bd', '#6a1b9a', '#827717', '#d84315', '#00838f',
] as const;

function hslHex(h: number, s: number, l: number): string {
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(c * 255).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

/**
 * Цвет для новой программы: первый цвет палитры, которого нет у существующих программ;
 * если заняты все — запасные, затем сгенерированный (шаг «золотого угла» по тону).
 */
export function pickProgramColor(usedColors: Iterable<string>): string {
  const used = new Set(Array.from(usedColors, c => c.toLowerCase()));
  const free = [...PROGRAM_COLORS, ...PROGRAM_COLORS_EXTRA].find(c => !used.has(c));
  if (free) return free;
  for (let i = 0; i < 360; i++) {
    const c = hslHex((i * 137.508) % 360, 0.7, 0.4);
    if (!used.has(c)) return c;
  }
  return PROGRAM_COLORS[0];
}

/** Дата в часовом поясе Астаны, 'YYYY-MM-DD'. */
export const toISODate = (d: Date): string => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Almaty', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(d);

/** Сегодня в часовом поясе Астаны, 'YYYY-MM-DD'. */
export const todayISO = (): string => toISODate(new Date());

export type EventStatus = 'past' | 'current' | 'upcoming' | 'flexible';

/** Даты мероприятия: начало и конец 'YYYY-MM-DD' (конец необязателен), monthOnly — указан только месяц. */
export interface DateRange {
  start?: string | null;
  end?: string | null;
  monthOnly?: boolean | null;
}

/** Без даты → flexible; закончилось → past; идёт (и дата точная) → current; иначе upcoming. */
export function eventStatus(e: DateRange, today: string = todayISO()): EventStatus {
  if (!e.start) return 'flexible';
  if ((e.end ?? e.start) < today) return 'past';
  if (e.start <= today && !e.monthOnly) return 'current';
  return 'upcoming';
}

/** Мероприятие с датой ещё не закончилось. */
export const isNotPast = (e: DateRange, today: string = todayISO()): boolean =>
  !!e.start && (e.end ?? e.start) >= today;

/** Ближайшее не прошедшее (с датой) из списка; `range` достаёт даты из элемента. */
export function nearestBy<T>(items: readonly T[], range: (item: T) => DateRange, today: string = todayISO()): T | null {
  let best: T | null = null;
  let bestStart = '';
  for (const it of items) {
    const r = range(it);
    if (!isNotPast(r, today)) continue;
    if (best === null || r.start! < bestStart) { best = it; bestStart = r.start!; }
  }
  return best;
}
