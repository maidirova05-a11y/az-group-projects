/** Даты из «календарь (11).pdf», русская страница. Неизвестные дни не предполагаются. */
export type CalendarCategory = 'science' | 'robotics' | 'international';
export interface CalendarEvent { label: string; place: string; start?: string; end?: string; monthOnly?: boolean }
export interface CalendarProgram { id: string; name: string; subtitle: string; category: CalendarCategory; color: string; projectSlug?: string; events: CalendarEvent[] }
export const calendarCategories = [
  { id: 'science', label: 'Олимпиады и наука' },
  { id: 'robotics', label: 'Робототехника' },
  { id: 'international', label: 'Международные программы' },
] as const;
const date = (label: string, start: string, place = 'Астана', end?: string): CalendarEvent => ({ label, start, place, end });
const month = (label: string, ym: string, place: string): CalendarEvent => {
  const [year, m] = ym.split('-').map(Number);
  return { label, place, start: `${ym}-01`, end: `${ym}-${new Date(year, m, 0).getDate()}`, monthOnly: true };
};
export const calendarPrograms: CalendarProgram[] = [
  { id: 'fibonacci-math', name: 'Fibonacci', subtitle: 'International Math Olympiad', category: 'science', color: '#e10926', projectSlug: 'fibonacci',
    events: [date('17 октября 2026', '2026-10-17'), date('14 ноября 2026', '2026-11-14'), date('19 декабря 2026', '2026-12-19'), date('13 февраля 2027', '2027-02-13'), month('Апрель 2027', '2027-04', 'Анталья'), month('Май 2027', '2027-05', 'Рим')] },
  { id: 'atlantia-science', name: 'Atlantia', subtitle: 'Science Olympiads', category: 'science', color: '#8557d5', projectSlug: 'atlantia',
    events: [date('24 октября 2026', '2026-10-24'), date('21 ноября 2026', '2026-11-21'), date('12 декабря 2026', '2026-12-12'), date('20 февраля 2027', '2027-02-20'), month('Январь 2027', '2027-01', 'Анталья'), month('Май 2027', '2027-05', 'Барселона')] },
  { id: 'itecx', name: 'ITECX', subtitle: 'Научный конгресс', category: 'science', color: '#037f7a', projectSlug: 'itecx',
    events: [date('18 сентября 2026', '2026-09-18'), date('13 марта 2027', '2027-03-13'), date('5 мая 2027', '2027-05-05'), month('Ноябрь 2026', '2026-11', 'Рим'), month('Апрель 2027', '2027-04', 'Анталья'), month('Ноябрь 2027', '2027-11', 'Рим')] },
  { id: 'eurika', name: 'Eurika', subtitle: 'Online Olympiad', category: 'science', color: '#5a738d',
    events: [{ label: 'В течение учебного года', place: 'Онлайн' }] },
  { id: 'atlantia-stem', name: 'Atlantia STEM', subtitle: 'Олимпиады по робототехнике', category: 'robotics', color: '#bf58e1', projectSlug: 'atlantia',
    events: [date('12 декабря 2026', '2026-12-12'), month('Январь 2027', '2027-01', 'Анталья'), month('Май 2027', '2027-05', 'Барселона')] },
  { id: 'astana-tech-cup', name: 'Astana Tech Cup', subtitle: 'Чемпионат по робототехнике и дронам', category: 'robotics', color: '#2b6ae7', projectSlug: 'astanatechcup',
    events: [date('15–16 мая 2027', '2027-05-15', 'Астана', '2027-05-16')] },
  { id: 'fibonacci-robot', name: 'Fibonacci Robot', subtitle: 'International Robot Olympiad', category: 'robotics', color: '#ef4080',
    events: [date('20–25 ноября 2026', '2026-11-20', 'Рим', '2026-11-25'), date('27–28 февраля 2027', '2027-02-27', 'Астана', '2027-02-28'), month('Апрель 2027', '2027-04', 'Анталья'), month('Ноябрь 2027', '2027-11', 'Рим')] },
  { id: 'robocoach-academy', name: 'RoboCoach Academy', subtitle: 'Обучение учителей робототехнике', category: 'robotics', color: '#208239',
    events: [date('17–18 октября 2026', '2026-10-17', 'Астана', '2026-10-18'), date('30–31 января 2027', '2027-01-30', 'Астана', '2027-01-31')] },
  { id: 'smart-robot-games', name: 'Smart Robot Games', subtitle: 'Турнир по робототехнике', category: 'robotics', color: '#0a8ec6',
    events: [{ label: 'В каникулы', place: 'Астана' }] },
  { id: 'robocoach-cup', name: 'RoboCoach Cup', subtitle: 'Турнир для учителей', category: 'robotics', color: '#599415',
    events: [date('9 января 2027', '2027-01-09'), date('27 мая 2027', '2027-05-27')] },
  { id: 'ascora-fest', name: 'Ascora Fest', subtitle: 'Образовательная выставка', category: 'international', color: '#c9440b', projectSlug: 'ascora',
    events: [month('Октябрь 2026', '2026-10', 'Астана'), month('Декабрь 2026', '2026-12', 'Астана'), month('Январь 2027', '2027-01', 'Астана'), month('Апрель 2027', '2027-04', 'Астана'), month('Ноябрь 2026', '2026-11', 'Алматы'), month('Март 2027', '2027-03', 'Алматы')] },
  { id: 'ascora-camp', name: 'Ascora Camp', subtitle: 'Зарубежные лагеря', category: 'international', color: '#bf7405', projectSlug: 'ascora',
    events: [{ label: 'В каникулы', place: 'Европа, Азия, США и другие страны' }] },
  { id: 'ascora-international', name: 'Ascora International', subtitle: 'Образовательные поездки', category: 'international', color: '#c723b1', projectSlug: 'ascora',
    events: [date('26–30 октября 2026', '2026-10-26', 'Европа, Азия, США и другие страны', '2026-10-30'), date('21–25 июня 2027', '2027-06-21', 'Европа, Азия, США и другие страны', '2027-06-25')] },
];
/** Склонение по числу: plural(5, ['программа', 'программы', 'программ']) → «программ». */
export const plural = (n: number, [one, few, many]: [string, string, string]): string => {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
};
/** Итоги для Hero и фильтров: считаются из `calendarPrograms`, чтобы не расходиться с данными. */
export const calendarStats = {
  programs: calendarPrograms.length,
  events: calendarPrograms.reduce((n, p) => n + p.events.length, 0),
};
export type EventStatus = 'past' | 'current' | 'upcoming' | 'flexible';
export const toISODate = (d: Date): string => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Almaty', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(d);
export function eventStatus(e: CalendarEvent, today: string): EventStatus {
  if (!e.start) return 'flexible';
  if ((e.end ?? e.start) < today) return 'past';
  if (e.start <= today && !e.monthOnly) return 'current';
  return 'upcoming';
}
export function nearestEvent(today: string) {
  return calendarPrograms.flatMap(program => program.events.map(event => ({ program, event })))
    .filter(({ event }) => event.start && !event.monthOnly && (event.end ?? event.start) >= today)
    .sort((a, b) => a.event.start!.localeCompare(b.event.start!))[0] ?? null;
}
