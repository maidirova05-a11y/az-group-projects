/** POST /api/leads — заявка с формы сайта. */
import { Hono } from 'hono';
import { and, count, eq, gt, sql } from 'drizzle-orm';
import type { AppEnv } from '../types.js';
import { db, schema } from '../db/client.js';
import { ApiFail, assertJson, body } from '../lib/http.js';
import { clientIp, hashIp } from '../lib/ratelimit.js';
import { leadInput } from '../../shared/schemas.js';

const LIMIT = 5;
const WINDOW_MINUTES = 10;

/** Однострочное поле: все управляющие символы (включая переводы строк) → пробел. */
const line = (s: string) => s.replace(/[\p{Cc}\p{Zl}\p{Zp}]+/gu, ' ').replace(/\s{2,}/g, ' ').trim();
/** Многострочное поле: сохраняем переводы строк и табуляцию, остальные управляющие символы удаляем. */
const multiline = (s: string) => s.replace(/\r\n?/g, '\n').replace(/[^\P{Cc}\n\t]/gu, '').trim();

const r = new Hono<AppEnv>();

r.post('/', async c => {
  // Ловушка для ботов: делаем вид, что всё хорошо, но не сохраняем. Проверяем до валидации,
  // иначе схема (website: max 0) выдала бы боту 422 и подсказала, в чём дело.
  assertJson(c);
  const raw: unknown = await c.req.json().catch(() => null);
  if (raw && typeof raw === 'object' && 'website' in raw && typeof raw.website === 'string' && raw.website.trim() !== '') {
    return c.json({ ok: true }, 201);
  }
  const input = await body(c, leadInput); // Hono кэширует разобранное тело, повторное чтение безопасно

  const lead = {
    name: line(input.name),
    phone: line(input.phone),
    topic: line(input.topic),
    message: multiline(input.message ?? ''),
    page: input.page ? line(input.page) || null : null,
  };
  const fields: Record<string, string> = {};
  if (!lead.name) fields.name = 'Имя: обязательно';
  if (!lead.topic) fields.topic = 'Тема: обязательно';
  if (Object.keys(fields).length) throw new ApiFail(422, 'validation', 'Проверьте поля формы', fields);

  const ipHash = hashIp(clientIp(c));
  // Проверка лимита и вставка — атомарно: advisory-lock на хэш IP до конца транзакции,
  // иначе параллельные запросы с одного IP проскочили бы мимо счётчика.
  const limited = await db().transaction(async tx => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${ipHash}))`);
    const [{ n }] = await tx.select({ n: count() }).from(schema.leads).where(and(
      eq(schema.leads.ipHash, ipHash),
      gt(schema.leads.createdAt, sql`now() - make_interval(mins => ${WINDOW_MINUTES})`),
    ));
    if (n >= LIMIT) return true;
    await tx.insert(schema.leads).values({ ...lead, ipHash });
    return false;
  });
  if (limited) throw new ApiFail(429, 'rate_limited', 'Слишком много заявок, попробуйте позже');
  return c.json({ ok: true }, 201);
});

export default r;
