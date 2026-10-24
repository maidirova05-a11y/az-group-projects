import type { NewsDTO } from '@shared/schemas';
import { safeHrefOrNull } from './safe-url';

/** Новость с текстом открывается на сайте (/news?id=N), без текста — по внешней ссылке. */
export function newsHref(n: Pick<NewsDTO, 'id' | 'body' | 'externalUrl'>): { to: string } | { href: string } | null {
  if (n.body.trim()) return { to: `/news?id=${n.id}` };
  const external = safeHrefOrNull(n.externalUrl);
  if (external) return { href: external };
  return null;
}

/** Внешняя ли ссылка (http/https), или внутренняя «/…». */
export const isExternal = (url: string) => /^https?:\/\//i.test(url);
