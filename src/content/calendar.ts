/**
 * Календарные помощники для DTO из API (ProgramDTO / EventDTO).
 * Семантика та же, что у src/data/calendar.ts: startDate/endDate — ГГГГ-ММ-ДД,
 * monthOnly — известен только месяц, без даты — «сроки уточняются».
 */
import type { EventDTO, ProgramDTO } from '@shared/schemas';
export { calendarCategories, plural, toISODate, type CalendarCategory, type EventStatus } from '../data/calendar';
import type { EventStatus } from '../data/calendar';

export function eventStatus(e: EventDTO, today: string): EventStatus {
  if (!e.startDate) return 'flexible';
  if ((e.endDate ?? e.startDate) < today) return 'past';
  if (e.startDate <= today && !e.monthOnly) return 'current';
  return 'upcoming';
}

export interface ProgramEvent { program: ProgramDTO; event: EventDTO }

/** Будущие (и идущие) события с точной датой, по возрастанию. */
export function upcomingEvents(programs: ProgramDTO[], today: string, { exactOnly = false } = {}): ProgramEvent[] {
  return programs
    .flatMap(program => program.events.map(event => ({ program, event })))
    .filter(({ event }) => event.startDate && (!exactOnly || !event.monthOnly) && eventStatus(event, today) !== 'past')
    .sort((a, b) => a.event.startDate!.localeCompare(b.event.startDate!));
}

/** Ближайшее событие с известным днём. */
export function nearestEvent(programs: ProgramDTO[], today: string): ProgramEvent | null {
  return upcomingEvents(programs, today, { exactOnly: true })[0] ?? null;
}

/** Цена в тенге по языку: 25 000 ₸ (ru, kk) · 25,000 ₸ (en). */
export { formatPrice } from '../i18n/format';
