/**
 * Кэш публичных ответов в памяти процесса (контент сайта, sitemap): один и тот же ответ не собирается
 * из базы на каждый запрос. Любое изменение в админке (audit()) сбрасывает кэш, плюс короткий TTL
 * на случай нескольких процессов (на Vercel у каждой функции своя память — там выручает CDN-кэш).
 * ETag даёт браузеру и CDN ответ 304 без тела.
 */
import { createHash } from 'node:crypto';
import type { Context } from 'hono';

export const PUBLIC_CACHE_TTL_MS = 30_000;

interface Entry { body: string; etag: string; at: number }
const entries = new Map<string, Entry>();
const pending = new Map<string, Promise<Entry>>();

/** Сбросить все закэшированные публичные ответы (вызывается после каждого изменения в админке). */
export function invalidatePublicCache() {
  entries.clear();
}

/** Текст ответа по ключу: из кэша, если он свежее TTL, иначе собирается один раз даже при параллельных запросах. */
export async function cached(key: string, build: () => Promise<string>, ttl = PUBLIC_CACHE_TTL_MS): Promise<Entry> {
  const hit = entries.get(key);
  if (hit && Date.now() - hit.at < ttl) return hit;
  let job = pending.get(key);
  if (!job) {
    job = build().then(body => {
      const entry = { body, etag: `"${createHash('sha1').update(body).digest('base64url').slice(0, 27)}"`, at: Date.now() };
      entries.set(key, entry);
      return entry;
    }).finally(() => pending.delete(key));
    pending.set(key, job);
  }
  return job;
}

/** Ответ с ETag: при совпадении If-None-Match — 304 без тела. */
export function respondCached(c: Context, entry: Entry, contentType: string, cacheControl: string): Response {
  c.header('ETag', entry.etag);
  c.header('Cache-Control', cacheControl);
  const inm = c.req.header('if-none-match');
  if (inm && inm.split(',').some(t => t.trim() === entry.etag)) return c.body(null, 304);
  return c.body(entry.body, 200, { 'Content-Type': contentType });
}
