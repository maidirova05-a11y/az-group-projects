/**
 * Схема PostgreSQL сайта AZ Group (Drizzle ORM).
 * Это контракт для всего бэкенда и админки: менять только через владельца схемы.
 * Миграции генерируются командой `npm run db:generate` в server/db/migrations.
 */
import type { TranslatableFields, Translations } from '../../shared/i18n.js';
import type { LeadUtm } from '../../shared/schemas.js';
import { sql } from 'drizzle-orm';
import {
  boolean, date, index, integer, jsonb, pgEnum, pgTable, real, serial, text, timestamp, uniqueIndex,
} from 'drizzle-orm/pg-core';

export const adminRole = pgEnum('admin_role', ['owner', 'editor']);
export const programCategory = pgEnum('program_category', ['science', 'robotics', 'international']);
export const partnerGroup = pgEnum('partner_group', ['schools', 'org', 'gov']);
export const projectKind = pgEnum('project_kind', ['site', 'program']);
export const leadStatus = pgEnum('lead_status', ['new', 'in_progress', 'done', 'spam']);

/** Переводы kk/en переводимых полей (русский — в обычных колонках). См. shared/i18n.ts. */
const translations = <T>() => jsonb('translations').$type<Translations<T>>().notNull().default({});

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
};

/** Администраторы. owner управляет пользователями, editor — только контентом и заявками. */
export const admins = pgTable('admins', {
  id: serial('id').primaryKey(),
  email: text('email').notNull(),
  name: text('name').notNull(),
  passwordHash: text('password_hash').notNull(),
  role: adminRole('role').notNull().default('editor'),
  active: boolean('active').notNull().default(true),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  /**
   * Версия сессий: попадает в JWT (claim ver). Увеличивается при смене/сбросе пароля, деактивации и выходе —
   * все ранее выданные cookie сразу перестают действовать («выйти везде»).
   */
  sessionVersion: integer('session_version').notNull().default(0),
  ...timestamps,
}, t => [uniqueIndex('admins_email_uq').on(t.email)]);

/** Программы календаря (Fibonacci, Atlantia, ITECX…). */
export const programs = pgTable('programs', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull(),
  name: text('name').notNull(),
  subtitle: text('subtitle').notNull().default(''),
  category: programCategory('category').notNull(),
  color: text('color').notNull().default('#cd0929'),
  /** slug проекта из таблицы projects — для логотипа и ссылки «Сайт проекта». */
  projectSlug: text('project_slug'),
  sort: integer('sort').notNull().default(0),
  published: boolean('published').notNull().default(true),
  translations: translations<TranslatableFields['programs']>(),
  ...timestamps,
}, t => [uniqueIndex('programs_slug_uq').on(t.slug)]);

/** Сроки программы. Даты без дня — monthOnly; без даты вообще — «в течение сезона». */
export const events = pgTable('events', {
  id: serial('id').primaryKey(),
  programId: integer('program_id').notNull().references(() => programs.id, { onDelete: 'cascade' }),
  label: text('label').notNull(),
  place: text('place').notNull(),
  startDate: date('start_date'),
  endDate: date('end_date'),
  monthOnly: boolean('month_only').notNull().default(false),
  registrationUrl: text('registration_url'),
  /** Цена в тенге, null — не указана. */
  price: integer('price'),
  sort: integer('sort').notNull().default(0),
  translations: translations<TranslatableFields['events']>(),
  ...timestamps,
}, t => [index('events_program_idx').on(t.programId), index('events_start_idx').on(t.startDate)]);

/** Проекты с сайтами (kind=site) и программы компании без сайта (kind=program). */
export const projects = pgTable('projects', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull(),
  kind: projectKind('kind').notNull().default('site'),
  name: text('name').notNull(),
  tagline: text('tagline').notNull().default(''),
  description: text('description').notNull().default(''),
  category: text('category').notNull(),
  url: text('url'),
  domain: text('domain'),
  logo: text('logo'),
  logoScale: real('logo_scale').notNull().default(1),
  sort: integer('sort').notNull().default(0),
  published: boolean('published').notNull().default(true),
  translations: translations<TranslatableFields['projects']>(),
  ...timestamps,
}, t => [uniqueIndex('projects_slug_uq').on(t.slug)]);

export const news = pgTable('news', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  date: date('date').notNull(),
  image: text('image'),
  /** Текст новости (Markdown-подобный простой текст). Пусто — ведём на externalUrl. */
  body: text('body').notNull().default(''),
  externalUrl: text('external_url'),
  published: boolean('published').notNull().default(true),
  translations: translations<TranslatableFields['news']>(),
  ...timestamps,
}, t => [index('news_date_idx').on(t.date)]);

export const partners = pgTable('partners', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  group: partnerGroup('group').notNull().default('schools'),
  image: text('image'),
  sort: integer('sort').notNull().default(0),
  published: boolean('published').notNull().default(true),
  translations: translations<TranslatableFields['partners']>(),
  ...timestamps,
});

export const faqs = pgTable('faqs', {
  id: serial('id').primaryKey(),
  question: text('question').notNull(),
  answer: text('answer').notNull(),
  sort: integer('sort').notNull().default(0),
  published: boolean('published').notNull().default(true),
  translations: translations<TranslatableFields['faqs']>(),
  ...timestamps,
});

/** Настройки-словарь: contacts, links, stats, about. Формат значений — shared/schemas.ts. */
export const settings = pgTable('settings', {
  key: text('key').primaryKey(),
  value: jsonb('value').notNull(),
  /** Частичные переводы значения: { kk?: {...}, en?: {...} } (формы — ContentTranslationSource['settings'][key]). */
  translations: jsonb('translations').$type<Record<string, unknown>>().notNull().default({}),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/** Заявки с формы сайта. ipHash — sha256(ip + секрет), для ограничения частоты, не для слежки. */
export const leads = pgTable('leads', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  phone: text('phone').notNull(),
  topic: text('topic').notNull(),
  message: text('message').notNull().default(''),
  page: text('page'),
  status: leadStatus('status').notNull().default('new'),
  note: text('note').notNull().default(''),
  ipHash: text('ip_hash'),
  /** Язык страницы, с которой отправлена заявка (ru|kk|en). */
  lang: text('lang'),
  /** Откуда пришёл посетитель: хост и путь источника (document.referrer без query), null — прямой заход. */
  referrer: text('referrer'),
  /** UTM-метки первого визита: { source?, medium?, campaign?, term?, content? } — чтобы видеть, какие запросы и кампании приводят заявки. */
  utm: jsonb('utm').$type<LeadUtm>(),
  ...timestamps,
}, t => [
  index('leads_status_idx').on(t.status),
  index('leads_created_idx').on(t.createdAt),
  // Поиск дублей (тот же телефон за последние минуты) и фильтр по IP для лимита частоты.
  index('leads_phone_created_idx').on(t.phone, t.createdAt),
  index('leads_ip_created_idx').on(t.ipHash, t.createdAt),
]);

/** Журнал действий администраторов. */
export const auditLog = pgTable('audit_log', {
  id: serial('id').primaryKey(),
  adminId: integer('admin_id').references(() => admins.id, { onDelete: 'set null' }),
  action: text('action').notNull(),
  entity: text('entity').notNull(),
  entityId: text('entity_id'),
  details: jsonb('details'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, t => [
  index('audit_created_idx').on(t.createdAt),
  index('audit_action_created_idx').on(t.action, t.createdAt),
  // Частичные индексы для лимитов входа (server/routes/auth.ts): поиск неудачных попыток по времени и e-mail.
  index('audit_login_failed_created_idx').on(t.createdAt).where(sql`${t.action} = 'login_failed'`),
  index('audit_login_failed_email_idx').on(sql`(${t.details}->>'email')`, t.createdAt).where(sql`${t.action} = 'login_failed'`),
]);
