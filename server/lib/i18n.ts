/**
 * Мультиязычность контента: русский текст — в обычных колонках, kk/en — в jsonb `translations`.
 * Правила подстановки (публичный API):
 *  - строковое поле: непустой (после trim) перевод заменяет русский, иначе остаётся русский;
 *  - настройки: глубокое слияние; массив перевода используется, только если его длина
 *    совпадает с русским (поэлементно, тем же правилом), иначе — русский массив целиком;
 *  - нестроковые значения (числа, null, ссылки на картинки, которых нет в переводе) — всегда русские.
 */
import { DEFAULT_LANG, LANGS, type Lang } from '../../shared/i18n.js';

export type TranslatedLang = Exclude<Lang, 'ru'>;
export const TRANSLATED_LANGS = LANGS.filter((l): l is TranslatedLang => l !== 'ru');

/** ?lang=… → Lang; пусто или неизвестно → ru. */
export function parseLang(v: string | undefined | null): Lang {
  const l = (v ?? '').trim().toLowerCase();
  return (LANGS as readonly string[]).includes(l) ? (l as Lang) : DEFAULT_LANG;
}

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

/**
 * Строка контента → DTO на языке lang: поля из translations[lang] подставляются поверх русских
 * (только строковые поля, которые есть в строке, и только непустые). Поле `translations` удаляется.
 */
export function localize<T extends { translations?: unknown }>(row: T, lang: Lang): Omit<T, 'translations'> {
  const { translations, ...rest } = row;
  if (lang === 'ru' || !isObj(translations)) return rest;
  const tr = translations[lang];
  if (!isObj(tr)) return rest;
  const out: Record<string, unknown> = { ...rest };
  for (const [k, v] of Object.entries(tr)) {
    if (typeof v === 'string' && v.trim() && typeof out[k] === 'string') out[k] = v.trim();
  }
  return out as Omit<T, 'translations'>;
}

/** Глубокое слияние значения настройки с его частичным переводом (см. правила в шапке файла). */
export function mergeTranslated<T>(original: T, translated: unknown): T {
  if (typeof original === 'string') {
    return (typeof translated === 'string' && translated.trim() ? translated.trim() : original) as T;
  }
  if (Array.isArray(original)) {
    if (!Array.isArray(translated) || translated.length !== original.length) return original;
    return original.map((item, i) => mergeTranslated(item, translated[i])) as T;
  }
  if (isObj(original)) {
    if (!isObj(translated)) return original;
    const out: Record<string, unknown> = { ...original };
    for (const k of Object.keys(original)) if (k in translated) out[k] = mergeTranslated(original[k], translated[k]);
    return out as T;
  }
  return original;
}

/** Настройка на языке lang: translations = { kk?: partial, en?: partial }. */
export function localizeSetting<T>(value: T, translations: unknown, lang: Lang): T {
  if (lang === 'ru' || !isObj(translations)) return value;
  return mergeTranslated(value, translations[lang]);
}

/**
 * PATCH translations: присланные языки заменяются целиком, неприсланные сохраняются
 * ({ kk } не стирает en). Возвращает новый объект без undefined-ключей.
 */
export function mergeTranslationPatch<T extends Partial<Record<TranslatedLang, unknown>>>(current: unknown, patch: T | undefined): T {
  const base = (isObj(current) ? current : {}) as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const l of TRANSLATED_LANGS) {
    const v = patch && l in patch && patch[l] !== undefined ? patch[l] : base[l];
    if (v !== undefined) out[l] = v;
  }
  return out as T;
}
