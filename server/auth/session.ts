/** Сессия администратора: JWT HS256 (jose) в httpOnly-cookie az_admin. */
import type { Context } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { SignJWT, jwtVerify } from 'jose';
import { env } from '../env.js';
import type { AdminDTO } from '../../shared/schemas.js';

export const SESSION_COOKIE = 'az_admin';
export const SESSION_TTL = 60 * 60 * 24; // 24 часа, секунды (= Max-Age cookie)

const key = () => new TextEncoder().encode(env.jwtSecret);

/** ver — admins.session_version на момент входа; requireAdmin отклоняет токен, если версия в БД уже другая. */
export interface SessionClaims { sub: number; role: AdminDTO['role']; ver: number }

export async function signSession(admin: { id: number; role: AdminDTO['role']; sessionVersion: number }): Promise<string> {
  return new SignJWT({ role: admin.role, ver: admin.sessionVersion })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(String(admin.id))
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + SESSION_TTL)
    .sign(key());
}

/** Возвращает claims или null, если токен неверный/просрочен. */
export async function verifySession(token: string): Promise<SessionClaims | null> {
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ['HS256'] });
    const id = Number(payload.sub);
    if (!Number.isInteger(id) || id <= 0) return null;
    // Токены без ver (выданные до появления session_version) недействительны.
    if (typeof payload.ver !== 'number' || !Number.isInteger(payload.ver)) return null;
    return { sub: id, role: payload.role as AdminDTO['role'], ver: payload.ver };
  } catch {
    return null;
  }
}

const cookieOpts = () => ({ httpOnly: true, sameSite: 'Strict' as const, path: '/api', secure: !!process.env.VERCEL || env.isProd });

export function setSessionCookie(c: Context, token: string) {
  setCookie(c, SESSION_COOKIE, token, { ...cookieOpts(), maxAge: SESSION_TTL });
}

export function clearSessionCookie(c: Context) {
  deleteCookie(c, SESSION_COOKIE, cookieOpts());
}

export const readSessionCookie = (c: Context) => getCookie(c, SESSION_COOKIE);
