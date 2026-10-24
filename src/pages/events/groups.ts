/** Направления календаря: цвет и значок (не компонент — отдельный модуль, чтобы Fast Refresh работал у страниц). */
import type { CSSProperties } from 'react';
import { Atom, Bot, Globe2, type LucideIcon } from 'lucide-react';
import type { CalendarCategory } from '../../content/calendar';

/** Названия направлений — в словаре (events.groups.*). */
export const GROUPS: Record<CalendarCategory, { color: string; Icon: LucideIcon }> = {
  science: { color: '#cd0929', Icon: Atom },
  robotics: { color: '#4f47b7', Icon: Bot },
  international: { color: '#187d77', Icon: Globe2 },
};

/** Цвет передаём CSS-переменной --accent: стили сами решают, как его показать в светлой и тёмной теме. */
export const accentStyle = (color: string) => ({ '--accent': color }) as CSSProperties;
