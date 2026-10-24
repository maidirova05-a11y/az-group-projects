/** Помощники запросов к приложению в процессе: JSON, cookie-jar на пользователя, CSRF-заголовок, вход. */
import bcrypt from 'bcryptjs';
import { app } from '../server/app';
import { db, schema } from '../server/db/client';
import { CSRF, EDITOR, OWNER } from './fixtures';

let ipCounter = 0;
/** Уникальный IP на клиента — лимиты заявок и входа не мешают друг другу между тестами. */
export const freshIp = () => { const n = ++ipCounter; return `10.${Math.floor(Math.random() * 250)}.${(n >> 8) & 255}.${n & 255}`; };

export interface ReqOpts { json?: unknown; headers?: Record<string, string>; csrf?: boolean; raw?: string }

export class Client {
  cookies = new Map<string, string>();
  ip: string;
  constructor(ip = freshIp()) { this.ip = ip; }

  async req(method: string, path: string, opts: ReqOpts = {}): Promise<Response> {
    const headers: Record<string, string> = { 'X-Forwarded-For': this.ip, ...(opts.csrf === false ? {} : CSRF), ...opts.headers };
    let body: string | undefined;
    if (opts.json !== undefined) { body = JSON.stringify(opts.json); headers['Content-Type'] = 'application/json'; }
    if (opts.raw !== undefined) { body = opts.raw; headers['Content-Type'] = 'application/json'; }
    if (this.cookies.size) headers.Cookie = [...this.cookies].map(([k, v]) => `${k}=${v}`).join('; ');
    const res = await app.request(path.startsWith('/api') ? path : `/api${path}`, { method, headers, body });
    for (const sc of res.headers.getSetCookie()) {
      const [pair, ...attrs] = sc.split(';');
      const i = pair.indexOf('=');
      const name = pair.slice(0, i).trim();
      const value = pair.slice(i + 1).trim();
      const expired = !value || attrs.some(a => /^\s*max-age=0\s*$/i.test(a) || (/^\s*expires=/i.test(a) && new Date(a.split('=')[1]).getTime() < Date.now()));
      if (expired) this.cookies.delete(name); else this.cookies.set(name, value);
    }
    return res;
  }
  get = (p: string, o?: ReqOpts) => this.req('GET', p, o);
  post = (p: string, json?: unknown, o?: ReqOpts) => this.req('POST', p, { ...o, json });
  patch = (p: string, json?: unknown, o?: ReqOpts) => this.req('PATCH', p, { ...o, json });
  put = (p: string, json?: unknown, o?: ReqOpts) => this.req('PUT', p, { ...o, json });
  del = (p: string, o?: ReqOpts) => this.req('DELETE', p, o);
}

/** Ответ → JSON с проверкой статуса (понятная ошибка, если статус не тот). */
export async function expectJson<T = any>(res: Response, status: number): Promise<T> {
  const text = await res.text();
  if (res.status !== status) throw new Error(`Ожидался статус ${status}, получен ${res.status}: ${text.slice(0, 500)}`);
  return (text ? JSON.parse(text) : undefined) as T;
}

export async function login(email: string, password: string): Promise<Client> {
  const c = new Client();
  const res = await c.post('/auth/login', { email, password });
  await expectJson(res, 200);
  return c;
}
export const asOwner = () => login(OWNER.email, OWNER.password);
export const asEditor = () => login(EDITOR.email, EDITOR.password);

/** Создаёт администратора напрямую в БД (быстрый bcrypt). */
export async function createAdmin(over: Partial<{ email: string; name: string; role: 'owner' | 'editor'; active: boolean; password: string }> = {}) {
  const password = over.password ?? 'temp-admin-password-1';
  const email = over.email ?? `adm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.local`;
  const [row] = await db().insert(schema.admins).values({
    email, name: over.name ?? 'Temp Admin', role: over.role ?? 'editor', active: over.active ?? true,
    passwordHash: await bcrypt.hash(password, 4),
  }).returning();
  return { ...row, password };
}

export const uniq = (p = 'x') => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
export { db, schema };
