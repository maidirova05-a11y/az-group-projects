/**
 * Язык интерфейса сайта. Источник истины — адрес (/, /kk/…, /en/…, см. src/router.ts):
 * LanguageProvider только читает его и раздаёт словарь и форматтеры.
 *
 *   const t = useT();            // словарь текущего языка (src/i18n/ui/{ru,kk,en}.ts)
 *   const { lang, dates, price } = useI18n();
 *
 * Провайдер <LanguageProvider> — в ./LanguageProvider.tsx.
 */
import { createContext, useContext } from 'react';
import { DEFAULT_LANG, LANG_LOCALE, type Lang } from '@shared/i18n';
import { formatPrice, makeDates, type Dates } from './format';
import { ru, type Dict } from './ui/ru';
import { kk } from './ui/kk';
import { en } from './ui/en';

export type { Dict } from './ui/ru';
export const DICTS: Record<Lang, Dict> = { ru, kk, en };

/** Названия языков на самих этих языках — для переключателя (не переводятся). */
export const LANG_NAMES: Record<Lang, string> = { ru: 'Русский', kk: 'Қазақша', en: 'English' };

export interface I18n {
  lang: Lang;
  locale: string;
  t: Dict;
  dates: Dates;
  /** Цена в тенге: 25 000 ₸ / 25,000 ₸ */
  price: (n: number) => string;
}

export function build(lang: Lang): I18n {
  return { lang, locale: LANG_LOCALE[lang], t: DICTS[lang], dates: makeDates(lang), price: n => formatPrice(n, lang) };
}

/** Контекст языка; провайдер — src/i18n/LanguageProvider.tsx (отдельно, чтобы Fast Refresh работал у компонента). */
export const I18nContext = createContext<I18n | null>(null);

const fallback = build(DEFAULT_LANG);
export const useI18n = (): I18n => useContext(I18nContext) ?? fallback;
export const useLang = (): Lang => useI18n().lang;
export const useT = (): Dict => useI18n().t;
