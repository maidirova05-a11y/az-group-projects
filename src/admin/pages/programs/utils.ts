/** Помощники раздела «Программы и мероприятия»: категории, слаги, подписи дат, статусы. */
import type { CATEGORIES, EventDTO, ProgramDTO } from '@shared/schemas';
import { eventStatus as rangeStatus, nearestBy, todayISO, type DateRange, type EventStatus } from '@shared/calendar-utils';

export { PROGRAM_COLORS, pickProgramColor, todayISO, type EventStatus } from '@shared/calendar-utils';

export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<Category, string> = {
  science: 'Олимпиады и наука',
  robotics: 'Робототехника',
  international: 'Международные программы',
};

export const CATEGORY_OPTIONS = (Object.keys(CATEGORY_LABELS) as Category[]).map(value => ({ value, label: CATEGORY_LABELS[value] }));

// ---------- Слаг ----------

const TRANSLIT: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n',
  о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '',
  э: 'e', ю: 'yu', я: 'ya',
  // казахские буквы
  ә: 'a', ғ: 'g', қ: 'k', ң: 'n', ө: 'o', ұ: 'u', ү: 'u', һ: 'h', і: 'i',
};

/** «Астана Tech Cup 2027» → «astana-tech-cup-2027». Только латиница, цифры и дефис, не длиннее 60. */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .split('')
    .map(ch => TRANSLIT[ch] ?? ch)
    .join('')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/, '');
}

/** Очистка слага при ручном вводе: дефис в конце оставляем, чтобы можно было печатать дальше. */
export function cleanSlugInput(text: string): string {
  return text
    .toLowerCase()
    .split('')
    .map(ch => TRANSLIT[ch] ?? ch)
    .join('')
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-+/, '')
    .slice(0, 60);
}

// ---------- Даты ----------

/** '2027-04-xx' → '2027-04-30'. */
export function lastDayOfMonth(iso: string): string {
  const [y, m] = iso.split('-').map(Number);
  const d = new Date(y, m, 0).getDate();
  return `${iso.slice(0, 7)}-${String(d).padStart(2, '0')}`;
}

export const firstDayOfMonth = (iso: string) => `${iso.slice(0, 7)}-01`;

const MONTHS_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
const MONTHS_NOM = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

function parts(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return { y, m: m - 1, d };
}

/**
 * Подпись даты по-русски, как на сайте:
 * «17 октября 2026», «15–16 мая 2027», «30 ноября – 2 декабря 2026», «Апрель 2027», «Апрель–май 2027».
 * Без даты начала — пустая строка (менеджер пишет сам: «В каникулы»).
 */
export function suggestLabel(start: string | null | undefined, end: string | null | undefined, monthOnly: boolean): string {
  if (!start || !/^\d{4}-\d{2}-\d{2}$/.test(start)) return '';
  const s = parts(start);
  const e = end && /^\d{4}-\d{2}-\d{2}$/.test(end) && end >= start ? parts(end) : null;
  if (monthOnly) {
    if (!e || (e.y === s.y && e.m === s.m)) return `${MONTHS_NOM[s.m]} ${s.y}`;
    if (e.y === s.y) return `${MONTHS_NOM[s.m]}–${MONTHS_NOM[e.m].toLowerCase()} ${s.y}`;
    return `${MONTHS_NOM[s.m]} ${s.y} – ${MONTHS_NOM[e.m].toLowerCase()} ${e.y}`;
  }
  if (!e || end === start) return `${s.d} ${MONTHS_GEN[s.m]} ${s.y}`;
  if (e.y === s.y && e.m === s.m) return `${s.d}–${e.d} ${MONTHS_GEN[s.m]} ${s.y}`;
  if (e.y === s.y) return `${s.d} ${MONTHS_GEN[s.m]} – ${e.d} ${MONTHS_GEN[e.m]} ${s.y}`;
  return `${s.d} ${MONTHS_GEN[s.m]} ${s.y} – ${e.d} ${MONTHS_GEN[e.m]} ${e.y}`;
}

/** Коротко для таблицы: «17.10.2026», «17–18.10.2026», «окт. 2026». */
export function shortDates(e: Pick<EventDTO, 'startDate' | 'endDate' | 'monthOnly'>): string {
  if (!e.startDate) return 'Без даты';
  const s = parts(e.startDate);
  const dd = (n: number) => String(n).padStart(2, '0');
  if (e.monthOnly) {
    const label = (p: { y: number; m: number }) => `${MONTHS_NOM[p.m].slice(0, 3).toLowerCase()}. ${p.y}`;
    if (!e.endDate || e.endDate.slice(0, 7) === e.startDate.slice(0, 7)) return label(s);
    return `${label(s)} – ${label(parts(e.endDate))}`;
  }
  const one = (p: { y: number; m: number; d: number }) => `${dd(p.d)}.${dd(p.m + 1)}.${p.y}`;
  if (!e.endDate || e.endDate === e.startDate) return one(s);
  const en = parts(e.endDate);
  if (en.y === s.y && en.m === s.m) return `${dd(s.d)}–${one(en)}`;
  return `${one(s)} – ${one(en)}`;
}

export const EVENT_STATUS: Record<EventStatus, { label: string; tone: 'neutral' | 'success' | 'info' | 'warning' }> = {
  past: { label: 'Прошло', tone: 'neutral' },
  current: { label: 'Идёт сейчас', tone: 'success' },
  upcoming: { label: 'Предстоит', tone: 'info' },
  flexible: { label: 'Без даты', tone: 'warning' },
};

const range = (e: Pick<EventDTO, 'startDate' | 'endDate' | 'monthOnly'>): DateRange => ({ start: e.startDate, end: e.endDate, monthOnly: e.monthOnly });

/** Статус мероприятия (общая логика с сайтом — shared/calendar-utils.ts). */
export function eventStatus(e: Pick<EventDTO, 'startDate' | 'endDate' | 'monthOnly'>, today = todayISO()): EventStatus {
  return rangeStatus(range(e), today);
}

/** Ближайшее не прошедшее мероприятие программы (с датой). */
export function nearestEvent(p: ProgramDTO, today = todayISO()): EventDTO | null {
  return nearestBy(p.events, range, today);
}

/** 15000 → «15 000 ₸», 0 → «Бесплатно», null → «—». */
export function formatPrice(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—';
  if (n === 0) return 'Бесплатно';
  return `${n.toLocaleString('ru-RU')} ₸`;
}

export const plural = (n: number, [one, few, many]: [string, string, string]): string => {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
};
