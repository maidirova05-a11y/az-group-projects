/** POST /api/leads — заявка с формы сайта. */
import { Hono } from 'hono';
import { and, count, eq, gt, sql } from 'drizzle-orm';
import type { AppEnv } from '../types.js';
import { db, schema } from '../db/client.js';
import { ApiFail, assertJson, body } from '../lib/http.js';
import { clientIp, hashIp } from '../lib/ratelimit.js';
import { leadInput, type LeadUtm } from '../../shared/schemas.js';
import { LANGS, type Lang } from '../../shared/i18n.js';

const LIMIT = 5;
const WINDOW_MINUTES = 10;
/** Повтор той же заявки (имя + телефон + тема + сообщение) за это время не создаёт дубль — двойной клик, повторная отправка. */
const DEDUPE_MINUTES = 10;

/** Однострочное поле: все управляющие символы (включая переводы строк) → пробел. */
export const line = (s: string) => s.replace(/[\p{Cc}\p{Zl}\p{Zp}]+/gu, ' ').replace(/\s{2,}/g, ' ').trim();
/** Многострочное поле: сохраняем переводы строк и табуляцию, остальные управляющие символы удаляем. */
export const multiline = (s: string) => s.replace(/\r\n?/g, '\n').replace(/[^\P{Cc}\n\t]/gu, '').trim();

/** Язык страницы: только известные коды. */
export const parseLeadLang = (v: string | undefined): Lang | null => ((LANGS as readonly string[]).includes(v ?? '') ? (v as Lang) : null);

/**
 * Источник перехода: только хост и путь (без query/hash — там могут быть чужие токены), только http(s).
 * Переходы внутри самого сайта источником не считаются.
 */
export function cleanReferrer(raw: string | undefined, ownHost: string | undefined): string | null {
  if (!raw) return null;
  let u: URL;
  try { u = new URL(raw.trim()); } catch { return null; }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
  const host = u.hostname.toLowerCase().replace(/^www\./, '');
  const own = ownHost?.toLowerCase().replace(/:\d+$/, '').replace(/^www\./, '');
  if (own && host === own) return null;
  return `${host}${u.pathname === '/' ? '' : u.pathname}`.slice(0, 300);
}

/** UTM-метки: только непустые строки, без управляющих символов. */
export function cleanUtm(utm: LeadUtm | undefined): LeadUtm | null {
  if (!utm) return null;
  const out: LeadUtm = {};
  for (const k of ['source', 'medium', 'campaign', 'term', 'content'] as const) {
    const v = utm[k];
    if (typeof v === 'string' && line(v)) out[k] = line(v);
  }
  return Object.keys(out).length ? out : null;
}

/** Ошибка PostgreSQL «колонка не существует» (42703) — в том числе обёрнутая Drizzle (cause). */
export function isUndefinedColumn(e: unknown): boolean {
  for (let x: unknown = e, i = 0; x && i < 4; x = (x as { cause?: unknown }).cause, i++) {
    if ((x as { code?: unknown }).code === '42703') return true;
  }
  return false;
}

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
    lang: parseLeadLang(input.lang),
    referrer: cleanReferrer(input.referrer, c.req.header('host')),
    utm: cleanUtm(input.utm),
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
    // Второй замок — по телефону (отдельное пространство ключей: два int): параллельные отправки той же заявки
    // с разных адресов (IPv4/IPv6, мобильная сеть) не проскочат мимо проверки дублей. Порядок замков всегда IP → телефон.
    await tx.execute(sql`select pg_advisory_xact_lock(1, hashtext(${lead.phone}))`);
    // Та же заявка уже есть (повторная отправка формы) — отвечаем «принято», дубль не создаём.
    const [dup] = await tx.select({ id: schema.leads.id }).from(schema.leads).where(and(
      eq(schema.leads.phone, lead.phone),
      eq(schema.leads.name, lead.name),
      eq(schema.leads.topic, lead.topic),
      eq(schema.leads.message, lead.message),
      gt(schema.leads.createdAt, sql`now() - make_interval(mins => ${DEDUPE_MINUTES})`),
    )).limit(1);
    if (dup) return false;
    try {
      // Вложенная транзакция (savepoint): ошибка вставки не обрывает внешнюю транзакцию.
      await tx.transaction(async sp => { await sp.insert(schema.leads).values({ ...lead, ipHash }); });
    } catch (e) {
      // База ещё без колонок lang/referrer/utm (миграция 0004 не применена) — заявку всё равно сохраняем.
      if (!isUndefinedColumn(e)) throw e;
      console.warn('[leads] миграция 0004 не применена — заявка сохранена без источника (npm run db:migrate)');
      // Явный список колонок: Drizzle перечисляет все колонки схемы (в т.ч. отсутствующие в базе).
      await tx.execute(sql`insert into leads (name, phone, topic, message, page, ip_hash)
        values (${lead.name}, ${lead.phone}, ${lead.topic}, ${lead.message}, ${lead.page}, ${ipHash})`);
    }
    return false;
  });
  if (limited) throw new ApiFail(429, 'rate_limited', 'Слишком много заявок, попробуйте позже');
  return c.json({ ok: true }, 201);
});

export default r;
