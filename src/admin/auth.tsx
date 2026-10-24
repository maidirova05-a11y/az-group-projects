/** Контекст авторизации админки: текущий админ, вход, выход. */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { AdminDTO } from '@shared/schemas';
import { api, ApiError, onUnauthorized } from './api';

export type AuthStatus = 'loading' | 'authed' | 'guest' | 'offline';

export interface AuthContextValue {
  status: AuthStatus;
  admin: AdminDTO | null;
  /** true, если сессия закончилась во время работы (показать пояснение на экране входа). */
  expired: boolean;
  /** Ошибка проверки сессии (нет связи с API). */
  bootError: string | null;
  login: (email: string, password: string) => Promise<AdminDTO>;
  logout: () => Promise<void>;
  /** Перечитать /api/auth/me. */
  refresh: () => Promise<void>;
  isOwner: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminDTO | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [expired, setExpired] = useState(false);
  const [bootError, setBootError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const me = await api.get<AdminDTO>('/auth/me', { silent401: true });
      setAdmin(me);
      setStatus('authed');
      setBootError(null);
    } catch (e) {
      setAdmin(null);
      if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
        setStatus('guest');
        setBootError(null);
      } else {
        // API недоступен — всё равно показываем вход, но с предупреждением.
        setStatus('guest');
        setBootError(e instanceof ApiError ? e.message : 'Не удалось проверить сессию');
      }
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  useEffect(() => onUnauthorized(() => {
    setAdmin(prev => {
      if (prev) setExpired(true);
      return null;
    });
    setStatus('guest');
  }), []);

  const login = useCallback(async (email: string, password: string) => {
    const me = await api.post<AdminDTO>('/auth/login', { email, password }, { silent401: true });
    setAdmin(me);
    setStatus('authed');
    setExpired(false);
    setBootError(null);
    return me;
  }, []);

  const logout = useCallback(async () => {
    try { await api.post('/auth/logout', {}, { silent401: true }); } catch { /* сессия всё равно сбрасывается локально */ }
    setAdmin(null);
    setExpired(false);
    setStatus('guest');
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    status, admin, expired, bootError, login, logout, refresh, isOwner: admin?.role === 'owner',
  }), [status, admin, expired, bootError, login, logout, refresh]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Текущий админ и действия входа/выхода. */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth вне AuthProvider');
  return ctx;
}

export const ROLE_LABELS: Record<AdminDTO['role'], string> = { owner: 'Владелец', editor: 'Редактор' };
