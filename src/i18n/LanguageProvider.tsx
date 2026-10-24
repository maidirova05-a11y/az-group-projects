import { useEffect, useMemo, type ReactNode } from 'react';
import { useUrlLang } from '../router';
import { build, I18nContext } from './index';

/** Раздаёт словарь и форматтеры языка из адреса (/, /kk/…, /en/…). */
export function LanguageProvider({ children }: { children: ReactNode }) {
  const lang = useUrlLang();
  const value = useMemo(() => build(lang), [lang]);
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
