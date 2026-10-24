/**
 * Общий контракт фронтенда и бэкенда: схемы валидации (zod v4) и типы API.
 * Бэкенд валидирует ими входящие данные, админка — формы, сайт — ответ /api/public/content.
 */
import { z } from 'zod';
import type { Lang, Translations } from './i18n.js';
import { SAFE_HREF_MESSAGE, isSafeHref } from './url.js';

export { isSafeHref, SAFE_HREF_PROTOCOLS, SAFE_HREF_MESSAGE } from './url.js';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Дата в формате ГГГГ-ММ-ДД');
/** Ссылка: только http(s):, mailto:, tel: или путь сайта `/…` (не `//host`). См. shared/url.ts. */
const safeHref = (max = 2000) => z.string().trim().max(max, `Ссылка: не длиннее ${max} символов`).refine(isSafeHref, SAFE_HREF_MESSAGE);
/** То же, но пустая строка допустима (ссылка не задана). */
const safeHrefOrEmpty = (max = 2000) => z.string().trim().max(max, `Ссылка: не длиннее ${max} символов`).refine(s => s === '' || isSafeHref(s), SAFE_HREF_MESSAGE);
const optionalUrl = safeHref().nullable().optional();
const text = (max: number, label = 'Поле') => z.string().trim().max(max, `${label}: не длиннее ${max} символов`);
const required = (max: number, label = 'Поле') => text(max, label).min(1, `${label}: обязательно`);

export const CATEGORIES = ['science', 'robotics', 'international'] as const;
export const PARTNER_GROUPS = ['schools', 'org', 'gov'] as const;
export const LEAD_STATUSES = ['new', 'in_progress', 'done', 'spam'] as const;
export const ADMIN_ROLES = ['owner', 'editor'] as const;

// ---------- Переводы (kk/en) ----------
/** Переводимая строка: пустая строка = «перевода нет», показываем русский. */
const tr = (max: number) => z.string().trim().max(max, `Перевод: не длиннее ${max} символов`).optional();
/** { kk?: {...}, en?: {...} } — каждая часть необязательна. */
const translationsOf = <S extends z.ZodRawShape>(shape: S) => {
  const lang = z.object(shape).partial();
  return z.object({ kk: lang.optional(), en: lang.optional() });
};
export const programTranslations = translationsOf({ name: tr(120), subtitle: tr(200) });
export const eventTranslations = translationsOf({ label: tr(120), place: tr(160) });
export const projectTranslations = translationsOf({ name: tr(160), tagline: tr(200), description: tr(2000), category: tr(60) });
export const newsTranslations = translationsOf({ title: tr(300), body: tr(20000) });
export const partnerTranslations = translationsOf({ name: tr(300) });
export const faqTranslations = translationsOf({ question: tr(300), answer: tr(3000) });

// ---------- Контент ----------
export const programInput = z.object({
  slug: required(60, 'Слаг').regex(/^[a-z0-9-]+$/, 'Слаг: латиница, цифры и дефис'),
  name: required(120, 'Название'),
  subtitle: text(200, 'Подзаголовок').default(''),
  category: z.enum(CATEGORIES),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Цвет в формате #RRGGBB').default('#cd0929'),
  projectSlug: z.string().trim().max(60).nullable().optional(),
  sort: z.number().int().default(0),
  published: z.boolean().default(true),
  translations: programTranslations.optional(),
});

export const eventInput = z.object({
  label: required(120, 'Подпись даты'),
  place: required(160, 'Место'),
  startDate: isoDate.nullable().optional(),
  endDate: isoDate.nullable().optional(),
  monthOnly: z.boolean().default(false),
  registrationUrl: optionalUrl,
  price: z.number().int().min(0).nullable().optional(),
  sort: z.number().int().default(0),
  translations: eventTranslations.optional(),
}).refine(e => !e.endDate || (e.startDate && e.endDate >= e.startDate), { message: 'Дата окончания раньше начала', path: ['endDate'] });

export const projectInput = z.object({
  slug: required(60, 'Слаг').regex(/^[a-z0-9-]+$/, 'Слаг: латиница, цифры и дефис'),
  kind: z.enum(['site', 'program']).default('site'),
  name: required(160, 'Название'),
  tagline: text(200, 'Подзаголовок').default(''),
  description: text(2000, 'Описание').default(''),
  category: required(60, 'Категория'),
  url: optionalUrl,
  domain: z.string().trim().max(120).nullable().optional(),
  logo: optionalUrl,
  logoScale: z.number().min(0.3).max(3).default(1),
  sort: z.number().int().default(0),
  published: z.boolean().default(true),
  translations: projectTranslations.optional(),
});

export const newsInput = z.object({
  title: required(300, 'Заголовок'),
  date: isoDate,
  image: optionalUrl,
  body: text(20000, 'Текст').default(''),
  externalUrl: optionalUrl,
  published: z.boolean().default(true),
  translations: newsTranslations.optional(),
});

export const partnerInput = z.object({
  name: required(300, 'Название'),
  group: z.enum(PARTNER_GROUPS).default('schools'),
  image: optionalUrl,
  sort: z.number().int().default(0),
  published: z.boolean().default(true),
  translations: partnerTranslations.optional(),
});

export const faqInput = z.object({
  question: required(300, 'Вопрос'),
  answer: required(3000, 'Ответ'),
  sort: z.number().int().default(0),
  published: z.boolean().default(true),
  translations: faqTranslations.optional(),
});

export const reorderInput = z.object({ ids: z.array(z.number().int().positive()).min(1).max(500, 'Не больше 500 записей') });

// ---------- Настройки (таблица settings) ----------
export const contactsSetting = z.object({
  address: text(200), mapUrl: safeHrefOrEmpty(2000), phone: text(40),
  phoneHref: z.string().trim().max(40).refine(s => s === '' || (s.startsWith('tel:') && isSafeHref(s)), 'Ссылка на телефон должна начинаться с tel:'),
  email: z.email('Некорректный e-mail'),
  whatsapp: safeHrefOrEmpty(300), instagram: safeHrefOrEmpty(300), taplink: safeHrefOrEmpty(300), offer: safeHrefOrEmpty(300),
});
export const linksSetting = z.object({
  registration: safeHrefOrEmpty(500), cabinet: safeHrefOrEmpty(500), fibonacciResults: safeHrefOrEmpty(1000),
  posterPdf: safeHrefOrEmpty(500), ifo: safeHrefOrEmpty(500), ifoCertificate: safeHrefOrEmpty(1000),
});
export const statsSetting = z.array(z.object({ value: required(40, 'Значение'), label: required(160, 'Подпись') })).max(12);
export const aboutSetting = z.object({
  title: required(300, 'Заголовок'),
  pillars: z.array(z.object({ title: required(80), text: required(1000), image: safeHref(1000).nullable() })).max(6),
  directions: z.array(required(120)).max(12),
  achievements: z.array(z.object({ value: required(60), label: required(300) })).max(12),
});
export const SETTINGS = { contacts: contactsSetting, links: linksSetting, stats: statsSetting, about: aboutSetting } as const;
export type SettingKey = keyof typeof SETTINGS;

/** Переводы настроек: частичные формы (как ContentTranslationSource['settings']). links не переводится. */
const trs = (max: number) => z.string().trim().max(max, `Перевод: не длиннее ${max} символов`);
const settingLangShapes = {
  contacts: z.object({ address: tr(200) }),
  links: z.object({}),
  stats: z.array(z.object({ value: trs(40), label: trs(160) })).max(12),
  about: z.object({
    title: tr(300),
    pillars: z.array(z.object({ title: trs(80), text: trs(1000) })).max(6).optional(),
    directions: z.array(trs(120)).max(12).optional(),
    achievements: z.array(z.object({ value: trs(60), label: trs(300) })).max(12).optional(),
  }),
} as const;
const settingTranslationsOf = <S extends z.ZodType>(s: S) => z.object({ kk: s.optional(), en: s.optional() });
export const SETTING_TRANSLATIONS = {
  contacts: settingTranslationsOf(settingLangShapes.contacts),
  links: settingTranslationsOf(settingLangShapes.links),
  stats: settingTranslationsOf(settingLangShapes.stats),
  about: settingTranslationsOf(settingLangShapes.about),
} as const;
export type SettingTranslations<K extends SettingKey> = z.infer<(typeof SETTING_TRANSLATIONS)[K]>;
export type AllSettingTranslations = { [K in SettingKey]: SettingTranslations<K> };

// ---------- Заявки ----------
/** UTM-метки визита (utm_source, utm_medium, utm_campaign, utm_term, utm_content) — все необязательны. */
export const leadUtm = z.object({
  source: text(120), medium: text(120), campaign: text(200), term: text(200), content: text(200),
}).partial();
export type LeadUtm = z.infer<typeof leadUtm>;

export const leadInput = z.object({
  name: required(120, 'Имя'),
  phone: z.string().trim().regex(/^[\d\s()+-]{10,20}$/, 'Проверьте номер телефона'),
  topic: required(120, 'Тема'),
  message: text(2000, 'Сообщение').default(''),
  page: z.string().max(200).optional(),
  /** Язык страницы (ru|kk|en); неизвестное значение сервер отбрасывает. */
  lang: z.string().max(5).optional(),
  /** document.referrer посетителя (сервер оставляет только хост и путь). */
  referrer: z.string().max(2000).optional(),
  utm: leadUtm.optional(),
  /** Ловушка для ботов: настоящие люди оставляют поле пустым. */
  website: z.string().max(500).optional(),
});
export const leadUpdate = z.object({ status: z.enum(LEAD_STATUSES).optional(), note: text(2000, 'Заметка').optional() });

// ---------- Админы и вход ----------
export const loginInput = z.object({ email: z.email('Введите e-mail'), password: z.string().min(1, 'Введите пароль').max(200) });
export const adminInput = z.object({
  email: z.email('Некорректный e-mail'), name: required(120, 'Имя'), role: z.enum(ADMIN_ROLES).default('editor'),
  password: z.string().min(10, 'Пароль не короче 10 символов').max(200).optional(), active: z.boolean().default(true),
});
export const passwordChange = z.object({ current: z.string().min(1), next: z.string().min(10, 'Пароль не короче 10 символов').max(200) });

// ---------- Типы ответов API ----------
export type ProgramInput = z.infer<typeof programInput>;
export type EventInput = z.infer<typeof eventInput>;
export type ProjectInput = z.infer<typeof projectInput>;
export type NewsInput = z.infer<typeof newsInput>;
export type PartnerInput = z.infer<typeof partnerInput>;
export type FaqInput = z.infer<typeof faqInput>;
export type LeadInput = z.infer<typeof leadInput>;

/**
 * DTO контента. `translations` приходит только из админ-API; публичный /api/public/content
 * уже подставляет перевод в обычные поля и `translations` не отдаёт.
 */
export interface EventDTO extends Omit<EventInput, 'startDate' | 'endDate' | 'registrationUrl' | 'price'> { id: number; programId: number; startDate: string | null; endDate: string | null; registrationUrl: string | null; price: number | null }
export interface ProgramDTO extends ProgramInput { id: number; events: EventDTO[] }
export interface ProjectDTO extends ProjectInput { id: number }
export interface NewsDTO extends NewsInput { id: number }
export interface PartnerDTO extends PartnerInput { id: number }
export interface FaqDTO extends FaqInput { id: number }
export interface LeadDTO {
  id: number; name: string; phone: string; topic: string; message: string; page: string | null;
  status: (typeof LEAD_STATUSES)[number]; note: string;
  /** Язык страницы, источник перехода и UTM-метки — откуда пришла заявка (null, если неизвестно). */
  lang: Lang | null; referrer: string | null; utm: LeadUtm | null;
  createdAt: string; updatedAt: string;
}
export interface AdminDTO { id: number; email: string; name: string; role: (typeof ADMIN_ROLES)[number]; active: boolean; lastLoginAt: string | null }

/** Ответ GET /api/public/content?lang= — только опубликованное, отсортированное по sort, тексты на языке lang. */
export interface PublicContent {
  /** Язык ответа (есть в ответе API; статический запасной контент — русский, без поля). */
  lang?: Lang;
  programs: ProgramDTO[];
  projects: ProjectDTO[];
  news: NewsDTO[];
  partners: PartnerDTO[];
  faqs: FaqDTO[];
  settings: {
    contacts: z.infer<typeof contactsSetting>;
    links: z.infer<typeof linksSetting>;
    stats: z.infer<typeof statsSetting>;
    about: z.infer<typeof aboutSetting>;
  };
}

export type { Lang, Translations };

/** Единый формат ошибок API: { error: { code, message, fields? } }. */
export interface ApiError { error: { code: string; message: string; fields?: Record<string, string> } }
