/**
 * Строки страницы «Мероприятия» и форматирование дат — через общий i18n сайта.
 * Тексты: src/i18n/ui/{ru,kk,en}.ts → events; даты: src/i18n/format.ts → makeDates(lang).
 * В компонентах: const T = useEventsText(); const D = useDates();
 */
import { useI18n, useT } from '../../i18n';

export { makeDates, type Dates } from '../../i18n/format';

/** Строки календаря на текущем языке. */
export const useEventsText = () => useT().events;
/** Названия месяцев и дней недели, форматтеры дат на текущем языке (LANG_LOCALE). */
export const useDates = () => useI18n().dates;

/** Цена события на текущем языке: «Бесплатно» или 25 000 ₸ / 25,000 ₸. */
export function usePriceText() {
  const { t, price } = useI18n();
  return (n: number) => (n === 0 ? t.events.free : price(n));
}
