import { CalendarDays } from 'lucide-react';
import type { EventDTO } from '@shared/schemas';
import { useDates, useEventsText } from './i18n';

/** Плашка даты события (декоративная: дата есть и в тексте рядом). Используется календарём и главной. */
export function DateBox({ event }: { event: EventDTO }) {
  const T = useEventsText();
  const D = useDates();
  if (!event.startDate) return <span className="datebox flexible" aria-hidden="true"><CalendarDays size={20} /><small>{T.season1}</small></span>;
  const startIso = event.startDate;
  const start = Number(startIso.slice(8));
  const end = event.endDate && event.endDate.slice(0, 7) === startIso.slice(0, 7) ? Number(event.endDate.slice(8)) : start;
  const big = event.monthOnly ? D.monthShort(startIso) : end !== start ? `${start}–${end}` : String(start);
  return <span className={`datebox ${big.length > 3 ? 'wide' : ''}`} aria-hidden="true"><strong>{big}</strong><small>{event.monthOnly ? startIso.slice(0, 4) : D.monthShort(startIso)}</small></span>;
}
