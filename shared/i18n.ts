/**
 * Контракт мультиязычности: русский — основной язык (поля строк в БД),
 * казахский и английский — в колонке `translations` jsonb: { kk?: {...}, en?: {...} }.
 * Отсутствующий перевод → показываем русский текст.
 */
export const LANGS = ['ru', 'kk', 'en'] as const;
export type Lang = (typeof LANGS)[number];
export const DEFAULT_LANG: Lang = 'ru';
/** Подписи переключателя — как на az-group.kz. */
export const LANG_LABELS: Record<Lang, string> = { ru: 'RU', kk: 'KZ', en: 'ENG' };
/** BCP-47 для Intl (даты, числа). */
export const LANG_LOCALE: Record<Lang, string> = { ru: 'ru-RU', kk: 'kk-KZ', en: 'en-GB' };

/** Переводимые поля каждой сущности. */
export interface TranslatableFields {
  programs: { name?: string; subtitle?: string };
  events: { label?: string; place?: string };
  projects: { name?: string; tagline?: string; description?: string; category?: string };
  news: { title?: string; body?: string };
  partners: { name?: string };
  faqs: { question?: string; answer?: string };
}
export type Translations<T> = Partial<Record<Exclude<Lang, 'ru'>, T>>;

/**
 * Исходные переводы контента для сида (src/i18n/content/{kk,en}.ts).
 * Ключи — естественные ключи из src/data/*.ts, чтобы не зависеть от id в БД.
 */
export interface ContentTranslationSource {
  /** по slug программы (id в src/data/calendar.ts) */
  programs: Record<string, TranslatableFields['programs']>;
  /** ключ `${programSlug}#${индекс события в массиве events этой программы}` */
  events: Record<string, TranslatableFields['events']>;
  /** по slug проекта (для companyPrograms — slug, сгенерированный сидом, см. server/db/seed.ts) */
  projects: Record<string, TranslatableFields['projects']>;
  /** по id новости из src/data/site.ts */
  news: Record<string, TranslatableFields['news']>;
  /** по русскому названию партнёра */
  partners: Record<string, TranslatableFields['partners']>;
  /** в том же порядке, что faq в src/data/site.ts */
  faqs: { question: string; answer: string }[];
  /** переводы настроек: частичные значения тех же форм, что SETTINGS в shared/schemas.ts */
  settings: {
    contacts?: { address?: string };
    stats?: { value: string; label: string }[];
    about?: {
      title?: string;
      pillars?: { title: string; text: string }[];
      directions?: string[];
      achievements?: { value: string; label: string }[];
    };
  };
}
