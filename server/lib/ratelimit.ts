/** Определение IP клиента (единственная реализация в проекте) и хэши IP для ограничения частоты (не для слежки). */
import { createHash } from 'node:crypto';
import type { Context } from 'hono';
import { getConnInfo } from '@hono/node-server/conninfo';
import { env } from '../env.js';

/** sha256(ip + соль) в hex — для заявок (leads.ip_hash). */
export function hashIp(ip: string): string {
  return createHash('sha256').update(ip + env.ipSalt).digest('hex');
}

/** Короткий хэш IP для журнала входа (audit_log.details.ipHash). */
export const ipHash = (ip: string) => createHash('sha256').update(`${env.ipSalt}:${ip}`).digest('hex').slice(0, 32);

const first = (v: string | undefined) => v?.split(',')[0]?.trim() || undefined;

/**
 * IP клиента. Заголовки, которые клиент может подделать, используем только там, где их выставляет доверенный прокси:
 * - на Vercel (process.env.VERCEL) — x-vercel-forwarded-for, затем x-real-ip (их перезаписывает edge Vercel);
 * - X-Forwarded-For — только при TRUST_PROXY=1 (свой reverse-proxy перед Node);
 * - иначе — адрес сокета (@hono/node-server), а если его нет — 'unknown'.
 */
export function clientIp(c: Context): string {
  if (process.env.VERCEL) {
    const ip = first(c.req.header('x-vercel-forwarded-for')) ?? first(c.req.header('x-real-ip'));
    if (ip) return ip;
  }
  if (env.trustProxy) {
    const ip = first(c.req.header('x-forwarded-for')) ?? first(c.req.header('x-real-ip'));
    if (ip) return ip;
  }
  try {
    const addr = getConnInfo(c).remote.address;
    if (addr) return addr;
  } catch { /* не Node-сервер (app.request в тестах, другой рантайм) */ }
  return 'unknown';
}
