/**
 * POST /api/registrations — регистрация на мероприятие с сайта (/register).
 * Регистрация привязана к программе календаря и (необязательно) к её дате/месту. Стоимость берётся из мероприятия,
 * ссылка на оплату — из программы (Kaspi Pay): после регистрации сайт показывает кнопку «Оплатить».
 * Защита: ловушка website, не больше 20 регистраций с одного IP за 10 минут (школа может записать класс),
 * повтор той же регистрации за 10 минут не создаёт дубль (отвечаем тем же номером).
 */
import { Hono } from 'hono';
import { and, count, eq, gt, isNull, sql } from 'drizzle-orm';
import type { AppEnv } from '../types.js';
import { db, schema } from '../db/client.js';
import { ApiFail, assertJson, body } from '../lib/http.js';
import { clientIp, hashIp } from '../lib/ratelimit.js';
import { registrationInput, type RegistrationCreated } from '../../shared/schemas.js';
import { cleanReferrer, cleanUtm, line, multiline, parseLeadLang } from './leads.js';

export const REG_LIMIT = 20;
const WINDOW_MINUTES = 10;
const DEDUPE_MINUTES = 10;

/** Сегодня по Астане (YYYY-MM-DD) — с этой даты событие считается прошедшим. */
const todayAlmaty = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Almaty', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

const r = new Hono<AppEnv>();

r.post('/', async c => {
  assertJson(c);
  const raw: unknown = await c.req.json().catch(() => null);
  if (raw && typeof raw === 'object' && 'website' in raw && typeof raw.website === 'string' && raw.website.trim() !== '') {
    return c.json({ ok: true, id: 0, amount: null, paymentUrl: null } satisfies RegistrationCreated, 201);
  }
  const input = await body(c, registrationInput);

  const [program] = await db().select().from(schema.programs)
    .where(and(eq(schema.programs.id, input.programId), eq(schema.programs.published, true))).limit(1);
  if (!program) throw new ApiFail(422, 'validation', 'Проверьте поля формы', { programId: 'Мероприятие не найдено' });

  let event: typeof schema.events.$inferSelect | undefined;
  if (input.eventId) {
    [event] = await db().select().from(schema.events)
      .where(and(eq(schema.events.id, input.eventId), eq(schema.events.programId, program.id))).limit(1);
    if (!event) throw new ApiFail(422, 'validation', 'Проверьте поля формы', { eventId: 'Дата не найдена' });
    const last = event.endDate ?? event.startDate;
    if (last && last < todayAlmaty()) throw new ApiFail(422, 'validation', 'Проверьте поля формы', { eventId: 'Регистрация на эту дату закрыта' });
  }

  const reg = {
    programId: program.id,
    eventId: event?.id ?? null,
    programName: [program.name, program.subtitle].filter(Boolean).join(' — '),
    eventLabel: event?.label ?? '',
    place: event?.place ?? '',
    eventDate: event?.startDate ?? null,
    participantName: line(input.participantName),
    grade: input.grade,
    school: line(input.school ?? ''),
    city: line(input.city),
    subjects: line(input.subjects ?? ''),
    contactName: line(input.contactName ?? ''),
    phone: line(input.phone),
    email: input.email ? line(input.email).toLowerCase() || null : null,
    comment: multiline(input.comment ?? ''),
    amount: event?.price ?? null,
    lang: parseLeadLang(input.lang),
    referrer: cleanReferrer(input.referrer, c.req.header('host')),
    utm: cleanUtm(input.utm),
  };
  const fields: Record<string, string> = {};
  if (!reg.participantName) fields.participantName = 'ФИО участника: обязательно';
  if (!reg.city) fields.city = 'Город: обязательно';
  if (Object.keys(fields).length) throw new ApiFail(422, 'validation', 'Проверьте поля формы', fields);

  const ipHash = hashIp(clientIp(c));
  const result = await db().transaction(async tx => {
    // Замок по IP (лимит) и по телефону (дубли с разных адресов) — порядок всегда IP → телефон.
    await tx.execute(sql`select pg_advisory_xact_lock(2, hashtext(${ipHash}))`);
    const [{ n }] = await tx.select({ n: count() }).from(schema.registrations).where(and(
      eq(schema.registrations.ipHash, ipHash),
      gt(schema.registrations.createdAt, sql`now() - make_interval(mins => ${WINDOW_MINUTES})`),
    ));
    if (n >= REG_LIMIT) return null;
    await tx.execute(sql`select pg_advisory_xact_lock(3, hashtext(${reg.phone}))`);
    const [dup] = await tx.select({ id: schema.registrations.id }).from(schema.registrations).where(and(
      eq(schema.registrations.phone, reg.phone),
      eq(schema.registrations.participantName, reg.participantName),
      eq(schema.registrations.programId, reg.programId),
      reg.eventId == null ? isNull(schema.registrations.eventId) : eq(schema.registrations.eventId, reg.eventId),
      gt(schema.registrations.createdAt, sql`now() - make_interval(mins => ${DEDUPE_MINUTES})`),
    )).limit(1);
    if (dup) return dup.id;
    const [row] = await tx.insert(schema.registrations).values({ ...reg, ipHash }).returning({ id: schema.registrations.id });
    return row.id;
  });
  if (result == null) throw new ApiFail(429, 'rate_limited', 'Слишком много регистраций, попробуйте позже');

  // Оплата нужна, если мероприятие платное или цена не указана, а у программы есть ссылка на оплату.
  const paymentUrl = program.paymentUrl && reg.amount !== 0 ? program.paymentUrl : null;
  return c.json({ ok: true, id: result, amount: reg.amount, paymentUrl } satisfies RegistrationCreated, 201);
});

export default r;
