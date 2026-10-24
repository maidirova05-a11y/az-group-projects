/**
 * Форматирование чисел, цен и дат по языку сайта. Все Intl-вызовы — с LANG_LOCALE[lang].
 * Для казахского есть ручные таблицы месяцев и дней недели: не во всех браузерах есть данные kk-KZ
 * (тогда Intl молча отдаёт английские названия).
 */
import { LANG_LOCALE, type Lang } from '@shared/i18n';

/** ГГГГ-ММ-ДД или ГГГГ-ММ → полдень UTC этого дня (не зависит от часового пояса). */
const utc = (iso: string) => new Date(`${iso.length === 7 ? `${iso}-01` : iso}T12:00:00Z`);
const cap = (s: string) => s.charAt(0).toLocaleUpperCase() + s.slice(1);

/* ---------- Плюрализация ---------- */

/** ru: одна / несколько / много (1 программа, 2 программы, 5 программ). */
export function pluralRu(n: number, [one, few, many]: readonly [string, string, string]): string {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}

const enRules = new Intl.PluralRules(LANG_LOCALE.en);
/** en: one / other через Intl.PluralRules (1 event, 2 events). */
export const pluralEn = (n: number, one: string, other: string) => (enRules.select(n) === 'one' ? one : other);
/* kk: существительное после числительного не согласуется по числу (5 бағдарлама) — одна форма, хелпер не нужен. */

/* ---------- Числа и цены ---------- */

const numberFormats = new Map<Lang, Intl.NumberFormat>();
function numberFormat(lang: Lang) {
  let f = numberFormats.get(lang);
  if (!f) {
    f = new Intl.NumberFormat(LANG_LOCALE[lang]);
    // Без данных kk-KZ браузер форматирует по-английски («25,000») — для ru/kk нужен пробел-разделитель.
    if (lang !== 'en' && /[,.]/.test(f.format(25000))) f = new Intl.NumberFormat(LANG_LOCALE.ru);
    numberFormats.set(lang, f);
  }
  return f;
}

/** 25 000 ₸ (ru, kk) · 25,000 ₸ (en). Пробелы неразрывные, чтобы цена не переносилась. */
export const formatPrice = (price: number, lang: Lang = 'ru') => `${numberFormat(lang).format(price).replace(/\s/g, ' ')} ₸`;

/* ---------- Даты ---------- */

const KK_MONTHS = ['қаңтар', 'ақпан', 'наурыз', 'сәуір', 'мамыр', 'маусым', 'шілде', 'тамыз', 'қыркүйек', 'қазан', 'қараша', 'желтоқсан'];
const KK_MONTHS_SHORT = ['қаң', 'ақп', 'нау', 'сәу', 'мам', 'мау', 'шіл', 'там', 'қыр', 'қаз', 'қар', 'жел'];
const KK_WEEKDAYS = ['дүйсенбі', 'сейсенбі', 'сәрсенбі', 'бейсенбі', 'жұма', 'сенбі', 'жексенбі'];
const KK_WEEKDAYS_SHORT = ['Дс', 'Сс', 'Ср', 'Бс', 'Жм', 'Сб', 'Жс'];

export interface Dates {
  /** «Октябрь 2026» / «Қазан 2026» / «October 2026» */
  monthYear: (ym: string) => string;
  month: (ym: string) => string;
  /** «17 октября» / «17 қазан» / «17 October» */
  dayMonth: (iso: string) => string;
  dayMonthShort: (iso: string) => string;
  /** «Суббота, 17 октября» */
  weekdayDayMonth: (iso: string) => string;
  /** «окт» / «қаз» / «Oct» */
  monthShort: (iso: string) => string;
  /** Пн…Вс (неделя с понедельника) */
  weekdaysShort: string[];
  weekdaysLong: string[];
  /** Полная дата новости: «17 октября 2026» / «2026 жылғы 17 қазан» / «17 October 2026» */
  full: (iso: string) => string;
}

/** Есть ли в браузере настоящие казахские названия месяцев. */
function intlHasKazakh(): boolean {
  try {
    return new Intl.DateTimeFormat(LANG_LOCALE.kk, { month: 'long', timeZone: 'UTC' }).format(utc('2024-01-15')).toLowerCase() === 'қаңтар';
  } catch {
    return false;
  }
}

/** 2024-01-01 — понедельник: из него получаем подписи дней недели Пн…Вс. */
const WEEK = Array.from({ length: 7 }, (_, i) => utc(`2024-01-0${i + 1}`));

function intlDates(locale: string): Dates {
  const f = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(locale, { timeZone: 'UTC', ...o });
  const monthYearF = f({ month: 'long', year: 'numeric' });
  const monthF = f({ month: 'long' });
  const dayMonthF = f({ day: 'numeric', month: 'long' });
  const dayMonthShortF = f({ day: 'numeric', month: 'short' });
  const weekdayLongF = f({ weekday: 'long' });
  const weekdayShortF = f({ weekday: 'short' });
  const monthShortF = f({ month: 'short' });
  const fullF = f({ day: 'numeric', month: 'long', year: 'numeric' });
  return {
    monthYear: ym => cap(monthYearF.format(utc(ym)).replace(/\s?г\.?$/, '')),
    month: ym => cap(monthF.format(utc(ym))),
    dayMonth: iso => dayMonthF.format(utc(iso)),
    dayMonthShort: iso => dayMonthShortF.format(utc(iso)).replace('.', ''),
    weekdayDayMonth: iso => `${cap(weekdayLongF.format(utc(iso)))}, ${dayMonthF.format(utc(iso))}`,
    monthShort: iso => monthShortF.format(utc(iso)).replace('.', ''),
    weekdaysShort: WEEK.map(d => cap(weekdayShortF.format(d)).replace('.', '')),
    weekdaysLong: WEEK.map(d => cap(weekdayLongF.format(d))),
    full: iso => fullF.format(utc(iso)).replace(/\s?г\.?$/, ''),
  };
}

/** Казахский: названия из Intl, если они есть, иначе из таблиц; порядок слов — по казахской норме. */
function kazakhDates(): Dates {
  const native = intlHasKazakh();
  const monthF = native ? new Intl.DateTimeFormat(LANG_LOCALE.kk, { month: 'long', timeZone: 'UTC' }) : null;
  const weekdayF = native ? new Intl.DateTimeFormat(LANG_LOCALE.kk, { weekday: 'long', timeZone: 'UTC' }) : null;
  const monthName = (d: Date) => (monthF ? monthF.format(d).toLowerCase() : KK_MONTHS[d.getUTCMonth()]);
  const weekdayName = (d: Date) => (weekdayF ? weekdayF.format(d).toLowerCase() : KK_WEEKDAYS[(d.getUTCDay() + 6) % 7]);
  const day = (d: Date) => d.getUTCDate();
  return {
    monthYear: ym => { const d = utc(ym); return `${cap(monthName(d))} ${d.getUTCFullYear()}`; },
    month: ym => cap(monthName(utc(ym))),
    dayMonth: iso => { const d = utc(iso); return `${day(d)} ${monthName(d)}`; },
    dayMonthShort: iso => { const d = utc(iso); return `${day(d)} ${KK_MONTHS_SHORT[d.getUTCMonth()]}`; },
    weekdayDayMonth: iso => { const d = utc(iso); return `${cap(weekdayName(d))}, ${day(d)} ${monthName(d)}`; },
    monthShort: iso => KK_MONTHS_SHORT[utc(iso).getUTCMonth()],
    weekdaysShort: KK_WEEKDAYS_SHORT,
    weekdaysLong: WEEK.map(d => cap(weekdayName(d))),
    full: iso => { const d = utc(iso); return `${d.getUTCFullYear()} жылғы ${day(d)} ${monthName(d)}`; },
  };
}

const datesCache = new Map<Lang, Dates>();
/** Единственная точка форматирования дат для языка (кэшируется). */
export function makeDates(lang: Lang): Dates {
  let d = datesCache.get(lang);
  if (!d) {
    d = lang === 'kk' ? kazakhDates() : intlDates(LANG_LOCALE[lang]);
    datesCache.set(lang, d);
  }
  return d;
}
