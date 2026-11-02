import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { z } from 'zod';
import { log } from './logger.js';
import type { ApiError } from '../../shared/schemas.js';

/** Ошибка API в едином формате { error: { code, message, fields? } }. */
export class ApiFail extends HTTPException {
  constructor(status: 400 | 401 | 403 | 404 | 409 | 413 | 415 | 422 | 429 | 500, public code: string, message: string, public fields?: Record<string, string>, public retryAfter?: number) {
    super(status, { message });
  }
}

export const notFound = (what = 'Запись') => new ApiFail(404, 'not_found', `${what} не найдена`);

/** Тело должно быть JSON: `Content-Type: application/json` (параметры вроде charset допустимы), иначе 415. */
export function assertJson(c: Context) {
  const type = (c.req.header('content-type') ?? '').split(';')[0]!.trim().toLowerCase();
  if (type !== 'application/json') throw new ApiFail(415, 'unsupported_media_type', 'Ожидается Content-Type: application/json');
}

/** Валидирует тело запроса zod-схемой; ошибки полей возвращает в fields. */
export async function body<T extends z.ZodType>(c: Context, schema: T): Promise<z.infer<T>> {
  assertJson(c);
  let raw: unknown;
  try { raw = await c.req.json(); } catch { throw new ApiFail(400, 'bad_json', 'Некорректный JSON'); }
  const r = schema.safeParse(raw);
  if (!r.success) {
    const fields: Record<string, string> = {};
    for (const issue of r.error.issues) fields[issue.path.join('.') || '_'] ??= issue.message;
    throw new ApiFail(422, 'validation', 'Проверьте поля формы', fields);
  }
  return r.data;
}

export const idParam = (c: Context, name = 'id') => {
  const n = Number(c.req.param(name));
  if (!Number.isInteger(n) || n <= 0) throw new ApiFail(400, 'bad_id', 'Некорректный идентификатор');
  return n;
};

export function errorResponse(err: Error, c: Context) {
  if (err instanceof ApiFail) {
    const payload: ApiError = { error: { code: err.code, message: err.message, ...(err.fields && { fields: err.fields }) } };
    if (err.status === 429) c.header('Retry-After', String(err.retryAfter ?? 600));
    return c.json(payload, err.status);
  }
  if (err instanceof HTTPException) {
    if (err.status === 413) return c.json({ error: { code: 'payload_too_large', message: 'Слишком большой запрос' } } satisfies ApiError, 413);
    return c.json({ error: { code: 'http', message: err.message } } satisfies ApiError, err.status);
  }
  log.error('unhandled error', err, { method: c.req.method, path: c.req.path, requestId: c.get('requestId') });
  return c.json({ error: { code: 'internal', message: 'Внутренняя ошибка сервера' } } satisfies ApiError, 500);
}
