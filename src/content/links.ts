import type { EventDTO, NewsDTO, ProgramDTO } from '@shared/schemas';
import { linkProps } from '../router';
import { safeHref, safeHrefOrNull } from './safe-url';

/** Новость с текстом открывается на сайте (/news?id=N), без текста — по внешней ссылке. */
export function newsHref(n: Pick<NewsDTO, 'id' | 'body' | 'externalUrl'>): { to: string } | { href: string } | null {
  if (n.body.trim()) return { to: `/news?id=${n.id}` };
  const external = safeHrefOrNull(n.externalUrl);
  if (external) return { href: external };
  return null;
}

/** Внешняя ли ссылка (http/https), или внутренняя «/…». */
export const isExternal = (url: string) => /^https?:\/\//i.test(url);

/**
 * Атрибуты <a> для ссылки из контента/настроек: внутренняя «/…» — без перезагрузки и с префиксом языка,
 * внешняя — в новой вкладке, небезопасная — «#».
 */
export function anchorProps(url: string | null | undefined) {
  const safe = safeHref(url);
  if (safe.startsWith('/') && !safe.startsWith('//')) return linkProps(safe);
  return safe === '#' ? { href: safe } : { href: safe, target: '_blank', rel: 'noreferrer' };
}

/**
 * Куда ведёт «Регистрация» у даты: своя ссылка мероприятия (сайт партнёра), иначе — форма на этом сайте
 * с выбранной датой (/register?event=N) или программой (/register?program=slug).
 */
export function registerHref(event?: Pick<EventDTO, 'id' | 'registrationUrl'> | null, program?: Pick<ProgramDTO, 'slug'> | null): string {
  const own = safeHrefOrNull(event?.registrationUrl);
  if (own) return own;
  if (event) return `/register?event=${event.id}`;
  if (program) return `/register?program=${encodeURIComponent(program.slug)}`;
  return '/register';
}
