/**
 * Обёртка над fetch для админки.
 * - базовый путь `/api` (можно писать `api.get('/admin/news')` или `api.get('/api/admin/news')`);
 * - cookie-сессия (`credentials: 'same-origin'`), JSON в обе стороны;
 * - заголовок `X-Requested-With: az-admin` на каждом запросе (CSRF-защита API);
 * - ошибки `{ error: { code, message, fields } }` превращаются в `ApiError`;
 * - на 401 оповещает контекст авторизации (сессия истекла → экран входа).
 */

export class ApiError extends Error {
  /** HTTP-статус; 0 — нет связи с сервером. */
  readonly status: number;
  /** Машинный код ошибки из API (`validation`, `not_found`, `too_many_attempts`, …). */
  readonly code: string;
  /** Ошибки по полям формы (для 422). Ключ — путь поля через точку. */
  readonly fields: Record<string, string>;

  constructor(status: number, code: string, message: string, fields: Record<string, string> = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

/** Понятное сообщение для любой ошибки (для тостов). */
export function errorMessage(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  if (e instanceof Error && e.message) return e.message;
  return 'Что-то пошло не так';
}

type Listener = () => void;
const unauthorizedListeners = new Set<Listener>();

/** Подписка на 401 от API. Возвращает функцию отписки. */
export function onUnauthorized(fn: Listener): () => void {
  unauthorizedListeners.add(fn);
  return () => { unauthorizedListeners.delete(fn); };
}

const FALLBACK: Record<number, string> = {
  400: 'Некорректный запрос',
  401: 'Требуется вход',
  403: 'Недостаточно прав',
  404: 'Не найдено',
  409: 'Конфликт данных',
  413: 'Слишком большой запрос',
  422: 'Проверьте поля формы',
  429: 'Слишком много запросов. Попробуйте позже',
  500: 'Внутренняя ошибка сервера',
  502: 'Сервер недоступен',
  503: 'Сервер временно недоступен',
  504: 'Сервер не ответил вовремя',
};

export function apiUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  const p = path.startsWith('/') ? path : `/${path}`;
  return p.startsWith('/api/') || p === '/api' ? p : `/api${p}`;
}

export interface RequestOptions {
  signal?: AbortSignal;
  /** Не оповещать о 401 (например, для проверки сессии и входа). */
  silent401?: boolean;
  headers?: Record<string, string>;
}

export async function request<T = unknown>(method: string, path: string, body?: unknown, opts: RequestOptions = {}): Promise<T> {
  const url = apiUrl(path);
  const headers: Record<string, string> = { Accept: 'application/json', 'X-Requested-With': 'az-admin', ...opts.headers };
  const init: RequestInit = { method, credentials: 'same-origin', headers, signal: opts.signal };
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(body);
  }

  let res: Response;
  try {
    res = await fetch(url, init);
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') throw e;
    throw new ApiError(0, 'network', 'Нет связи с сервером. Проверьте интернет и попробуйте снова');
  }

  const text = await res.text();
  let data: unknown = undefined;
  if (text) {
    try { data = JSON.parse(text); } catch { data = text; }
  }

  if (!res.ok) {
    const err = (data && typeof data === 'object' && 'error' in data ? (data as { error: unknown }).error : null) as
      | { code?: string; message?: string; fields?: Record<string, string> }
      | null;
    const apiErr = new ApiError(
      res.status,
      err?.code ?? `http_${res.status}`,
      err?.message || FALLBACK[res.status] || `Ошибка ${res.status}`,
      err?.fields ?? {},
    );
    if (res.status === 401 && !opts.silent401) unauthorizedListeners.forEach(fn => fn());
    throw apiErr;
  }
  return data as T;
}

/** Короткие помощники. Все возвращают распарсенный JSON-ответ. */
export const api = {
  get: <T = unknown>(path: string, opts?: RequestOptions) => request<T>('GET', path, undefined, opts),
  post: <T = unknown>(path: string, body?: unknown, opts?: RequestOptions) => request<T>('POST', path, body ?? {}, opts),
  patch: <T = unknown>(path: string, body: unknown, opts?: RequestOptions) => request<T>('PATCH', path, body, opts),
  put: <T = unknown>(path: string, body: unknown, opts?: RequestOptions) => request<T>('PUT', path, body, opts),
  del: <T = unknown>(path: string, opts?: RequestOptions) => request<T>('DELETE', path, undefined, opts),
};

export const { get, post, patch, put, del } = api;
export default api;
