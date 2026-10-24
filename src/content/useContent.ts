/**
 * Хуки контента сайта. Провайдер — <ContentProvider> в ./ContentProvider.tsx
 * (контекст и хуки отдельно от компонента, чтобы Fast Refresh работал у провайдера).
 */
import { createContext, useContext } from 'react';
import type { Lang } from '@shared/i18n';
import type { PublicContent } from '@shared/schemas';

export type ContentSource = 'static' | 'cache' | 'live';
/** settled — запрос к API завершился (успешно или нет): дальше данные уже не поменяются. */
export interface ContentState { lang: Lang; content: PublicContent; source: ContentSource; settled: boolean }

export const ContentContext = createContext<ContentState | null>(null);

/** Весь публичный контент сайта на текущем языке. */
export function useContent(): PublicContent {
  const ctx = useContext(ContentContext);
  if (!ctx) throw new Error('useContent() вне <ContentProvider>');
  return ctx.content;
}

/** Откуда сейчас данные (static — встроенные, cache — из прошлого ответа, live — свежие из API) и завершён ли запрос. */
export function useContentStatus(): { source: ContentSource; settled: boolean } {
  const ctx = useContext(ContentContext);
  return { source: ctx?.source ?? 'static', settled: ctx?.settled ?? true };
}
