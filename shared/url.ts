/**
 * Безопасные ссылки (защита от stored XSS через href/src).
 * Разрешены только http:, https:, mailto:, tel: и пути сайта, начинающиеся с одного `/`.
 * Запрещены javascript:/data:/vbscript: и любые другие схемы, protocol-relative `//host`,
 * обратные слэши и управляющие символы (браузер их вырезает/нормализует — так обходят фильтры).
 *
 * Используется в zod-схемах (shared/schemas.ts) и пригодна для фронтенда: проверяйте значение
 * перед тем, как подставить его в href/src (`isSafeHref(x) ? x : undefined`).
 */
export const SAFE_HREF_PROTOCOLS = ['http:', 'https:', 'mailto:', 'tel:'] as const;

export const SAFE_HREF_MESSAGE = 'Ссылка должна начинаться с http(s)://, mailto:, tel: или /';

export function isSafeHref(s: string): boolean {
  if (typeof s !== 'string') return false;
  const v = s.trim();
  if (!v) return false;
  // Управляющие символы (вкл. таб/перевод строки), обратный слэш — запрещены везде.
  if (/[\u0000-\u001f\u007f\\]/.test(v)) return false;
  // Путь сайта: ровно один ведущий слэш (`//evil.com` — protocol-relative, чужой хост).
  if (v.startsWith('/')) return !v.startsWith('//');
  // Иначе нужна явная схема: «evil.com» или «foo/bar» — не ссылка, а относительный путь-сюрприз.
  if (!/^[a-z][a-z0-9+.-]*:/i.test(v)) return false;
  let url: URL;
  // Без base: иначе «https:» разрешился бы относительно базы в валидный https://x/.
  try { url = new URL(v); } catch { return false; }
  if (!(SAFE_HREF_PROTOCOLS as readonly string[]).includes(url.protocol)) return false;
  if ((url.protocol === 'http:' || url.protocol === 'https:') && !url.hostname) return false;
  return true;
}
