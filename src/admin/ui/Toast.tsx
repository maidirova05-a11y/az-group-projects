/** Всплывающие уведомления: `const toast = useToast(); toast.success('Сохранено')`. */
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { CircleAlert, CircleCheck, Info, X } from 'lucide-react';
import { ApiError, errorMessage } from '../api';

type Tone = 'success' | 'error' | 'info';
interface ToastItem { id: number; tone: Tone; text: string }

export interface ToastApi {
  /** Зелёное уведомление (исчезает через 4 с). */
  success: (text: string) => void;
  /** Красное уведомление (8 с). Можно передать саму ошибку — возьмётся её сообщение (401 не показывается). */
  error: (textOrError: unknown) => void;
  /** Нейтральное уведомление. */
  info: (text: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const seq = useRef(0);
  const timers = useRef(new Map<number, number>());

  const dismiss = useCallback((id: number) => {
    setItems(list => list.filter(t => t.id !== id));
    const t = timers.current.get(id);
    if (t) { window.clearTimeout(t); timers.current.delete(id); }
  }, []);

  const push = useCallback((tone: Tone, text: string) => {
    const id = ++seq.current;
    setItems(list => [...list.slice(-3), { id, tone, text }]);
    timers.current.set(id, window.setTimeout(() => dismiss(id), tone === 'error' ? 8000 : 4000));
  }, [dismiss]);

  const api = useMemo<ToastApi>(() => ({
    success: text => push('success', text),
    error: e => {
      // 401 уже обработан: показывается экран входа с пояснением.
      if (e instanceof ApiError && e.status === 401) return;
      push('error', typeof e === 'string' ? e : errorMessage(e));
    },
    info: text => push('info', text),
  }), [push]);

  const Icon = { success: CircleCheck, error: CircleAlert, info: Info };

  return (
    <ToastContext.Provider value={api}>
      {children}
      {createPortal(
        <div className="toasts" aria-live="polite" aria-relevant="additions">
          {items.map(t => {
            const I = Icon[t.tone];
            return (
              <div key={t.id} className={`toast toast-${t.tone}`} role={t.tone === 'error' ? 'alert' : 'status'}>
                <I size={18} aria-hidden="true" />
                <span>{t.text}</span>
                <button type="button" onClick={() => dismiss(t.id)} aria-label="Закрыть уведомление"><X size={16} aria-hidden="true" /></button>
              </div>
            );
          })}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  );
}

/** Доступ к уведомлениям. */
export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast вне ToastProvider');
  return ctx;
}
