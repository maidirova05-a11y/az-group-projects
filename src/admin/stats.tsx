/**
 * Сводка GET /api/admin/stats — общая для дашборда и счётчика новых заявок в меню.
 * Страницы, меняющие данные (например, статус заявки), вызывают `reload()`
 * из `useAdminStats()`, чтобы обновить счётчик.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { api, errorMessage } from './api';

export interface AdminStats {
  counts: {
    programs: number; events: number; upcomingEvents: number; projects: number; news: number;
    partners: number; faqs: number; leadsNew: number; leadsTotal: number;
  };
  leadsByDay: { date: string; count: number }[];
  /** Источники заявок за 30 дней: utm_source, иначе хост перехода, иначе «direct». */
  leadsBySource: { source: string; count: number }[];
  /** Язык страницы, с которой отправлены заявки за 30 дней. */
  leadsByLang: { lang: string; count: number }[];
  recentAudit: { id: number; action: string; entity: string; entityId: string | number | null; adminName: string | null; createdAt: string }[];
}

interface StatsCtx { stats: AdminStats | null; loading: boolean; error: string | null; reload: () => Promise<void> }
const Ctx = createContext<StatsCtx | null>(null);

export function StatsProvider({ children }: { children: ReactNode }) {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);

  const reload = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    setLoading(true);
    try {
      setStats(await api.get<AdminStats>('/admin/stats'));
      setError(null);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
    const t = window.setInterval(() => { if (document.visibilityState === 'visible') void reload(); }, 60_000);
    const onFocus = () => void reload();
    window.addEventListener('focus', onFocus);
    return () => { window.clearInterval(t); window.removeEventListener('focus', onFocus); };
  }, [reload]);

  const value = useMemo(() => ({ stats, loading, error, reload }), [stats, loading, error, reload]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Сводка админки и её перезагрузка (`reload()` после изменения заявок). */
export function useAdminStats(): StatsCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAdminStats вне StatsProvider');
  return c;
}
