/**
 * Контент сайта на текущем языке (useLang): сначала статический (из src/data + переводы
 * src/i18n/content — сайт рисуется мгновенно и не зависит от API), затем живой из
 * GET /api/public/content?lang=… При ошибке сети или кривом ответе остаётся то, что есть.
 *
 * Кэш — отдельно для каждого языка: в памяти (на время жизни страницы) и в sessionStorage
 * (на время жизни вкладки). При переключении языка сразу показываем кэш нового языка или его
 * статический вариант (всегда на нужном языке — без «мигания» текстом другого языка),
 * а свежий ответ подменяет его, когда придёт.
 */
import { useEffect, useState, type ReactNode } from 'react';
import type { Lang } from '@shared/i18n';
import type { PublicContent } from '@shared/schemas';
import { useLang } from '../i18n';
import { buildStaticContent } from './static';
import { ContentContext, type ContentState } from './useContent';

const cacheKey = (lang: Lang) => `az:content:v2:${lang}`;
const ENDPOINT = '/api/public/content';

/** Свежие ответы API за время жизни страницы: повторное переключение на язык не ходит в сеть. */
const live = new Map<Lang, PublicContent>();

/** Минимальная проверка формы ответа: без неё сломанный ответ уронил бы страницы. */
function isContent(x: unknown): x is PublicContent {
  if (!x || typeof x !== 'object') return false;
  const c = x as Record<string, unknown>;
  const s = c.settings as Record<string, unknown> | undefined;
  return ['programs', 'projects', 'news', 'partners', 'faqs'].every(k => Array.isArray(c[k]))
    && !!s && typeof s === 'object' && !!s.contacts && !!s.links && Array.isArray(s.stats) && !!s.about
    && (c.programs as { events?: unknown }[]).every(p => Array.isArray(p.events));
}

function stateFor(lang: Lang): ContentState {
  const fresh = live.get(lang);
  if (fresh) return { lang, content: fresh, source: 'live', settled: true };
  try {
    const raw = sessionStorage.getItem(cacheKey(lang));
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (isContent(parsed)) return { lang, content: parsed, source: 'cache', settled: false };
  } catch { /* приватный режим или повреждённый кэш — берём статику */ }
  return { lang, content: buildStaticContent(lang), source: 'static', settled: false };
}

export function ContentProvider({ children }: { children: ReactNode }) {
  const lang = useLang();
  const [state, setState] = useState(() => stateFor(lang));
  // Язык сменился — в том же рендере берём данные нового языка (кэш или статику), без кадра со старым языком.
  const current = state.lang === lang ? state : stateFor(lang);
  if (current !== state) setState(current);

  useEffect(() => {
    if (live.has(lang)) return;
    const ctrl = new AbortController();
    fetch(`${ENDPOINT}?lang=${lang}`, { signal: ctrl.signal, headers: { Accept: 'application/json' } })
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data: unknown) => {
        if (!isContent(data)) throw new Error('Неожиданный формат ответа');
        live.set(lang, data);
        try { sessionStorage.setItem(cacheKey(lang), JSON.stringify(data)); } catch { /* квота — не страшно */ }
        setState(s => (s.lang === lang ? { lang, content: data, source: 'live', settled: true } : s));
      })
      .catch(err => {
        if (ctrl.signal.aborted) return;
        setState(s => (s.lang === lang ? { ...s, settled: true } : s));
        // Сайт продолжает работать на статических (или закэшированных) данных.
        if (import.meta.env.DEV) console.info('[content] API недоступно, показываем запасные данные:', err instanceof Error ? err.message : err);
      });
    return () => ctrl.abort();
  }, [lang]);

  return <ContentContext.Provider value={current}>{children}</ContentContext.Provider>;
}
