/**
 * Модальные окна: Modal (по центру), Drawer (панель справа) и ConfirmDialog
 * через хук useConfirm(). Ловушка фокуса, Esc закрывает верхнее окно,
 * фокус возвращается туда, где был; остальная страница становится inert.
 */
import {
  createContext, useCallback, useContext, useEffect, useId, useRef, useState, type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { TriangleAlert, X } from 'lucide-react';
import { Button } from './Button';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), [contenteditable="true"]';

/** Стек открытых окон: Esc и Tab обрабатывает только верхнее. */
const stack: symbol[] = [];

function setBackgroundInert(on: boolean) {
  const root = document.getElementById('root');
  if (!root) return;
  if (on) { root.setAttribute('inert', ''); root.setAttribute('aria-hidden', 'true'); document.body.classList.add('modal-open'); }
  else { root.removeAttribute('inert'); root.removeAttribute('aria-hidden'); document.body.classList.remove('modal-open'); }
}

export interface ModalProps {
  open: boolean;
  /** Вызывается по Esc, крестику и клику по фону. */
  onClose: () => void;
  /** Заголовок окна (обязателен для доступности). */
  title: ReactNode;
  /** Пояснение под заголовком. */
  description?: ReactNode;
  children?: ReactNode;
  /** Нижняя панель с кнопками. */
  footer?: ReactNode;
  /** Ширина: sm 420px, md 560px, lg 760px, xl 960px. По умолчанию md. */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** 'drawer' — выезжающая справа панель (на телефоне — снизу). */
  variant?: 'modal' | 'drawer';
  /** Закрывать по клику на фон (по умолчанию true; для форм можно выключить). */
  closeOnBackdrop?: boolean;
  /** Запретить закрытие (например, пока идёт сохранение). */
  busy?: boolean;
  /** Роль: alertdialog для подтверждений. */
  role?: 'dialog' | 'alertdialog';
  /** Обернуть содержимое в <form onSubmit> (footer внутри формы — кнопка type="submit" работает). */
  onSubmit?: (e: React.FormEvent<HTMLFormElement>) => void;
}

/** Модальное окно. Элемент с атрибутом `data-autofocus` получит фокус при открытии. */
export function Modal({
  open, onClose, title, description, children, footer, size = 'md', variant = 'modal', closeOnBackdrop = true, busy = false, role = 'dialog', onSubmit,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const busyRef = useRef(busy);
  busyRef.current = busy;
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    if (!open) return;
    const token = Symbol('modal');
    stack.push(token);
    const previouslyFocused = document.activeElement as HTMLElement | null;
    setBackgroundInert(true);

    const focusFirst = () => {
      const panel = panelRef.current;
      if (!panel) return;
      const target = panel.querySelector<HTMLElement>('[data-autofocus]')
        ?? panel.querySelector<HTMLElement>('.modal-body input:not([type="hidden"]):not([disabled]), .modal-body textarea, .modal-body select')
        ?? panel.querySelector<HTMLElement>(FOCUSABLE)
        ?? panel;
      target.focus();
    };
    const raf = requestAnimationFrame(focusFirst);

    const onKey = (e: KeyboardEvent) => {
      if (stack[stack.length - 1] !== token) return;
      if (e.key === 'Escape') {
        e.stopPropagation();
        if (!busyRef.current) onCloseRef.current();
        return;
      }
      if (e.key === 'Tab' && panelRef.current) {
        const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(el => el.offsetParent !== null || el === document.activeElement);
        if (items.length === 0) { e.preventDefault(); panelRef.current.focus(); return; }
        const first = items[0];
        const last = items[items.length - 1];
        const active = document.activeElement;
        if (e.shiftKey && (active === first || !panelRef.current.contains(active))) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && (active === last || !panelRef.current.contains(active))) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKey, true);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('keydown', onKey, true);
      const i = stack.indexOf(token);
      if (i >= 0) stack.splice(i, 1);
      if (stack.length === 0) setBackgroundInert(false);
      if (previouslyFocused && document.contains(previouslyFocused)) previouslyFocused.focus({ preventScroll: true });
    };
  }, [open]);

  if (!open) return null;

  const content = (
    <>
      <div className="modal-head">
        <div>
          <h2 id={titleId} className="modal-title">{title}</h2>
          {description && <p id={descId} className="modal-desc">{description}</p>}
        </div>
        <button type="button" className="icon-btn icon-btn-plain" onClick={onClose} disabled={busy} aria-label="Закрыть окно" title="Закрыть (Esc)">
          <X size={20} aria-hidden="true" />
        </button>
      </div>
      {children !== undefined && <div className="modal-body">{children}</div>}
      {footer && <div className="modal-foot">{footer}</div>}
    </>
  );

  return createPortal(
    <div
      className={`modal-root modal-${variant}`}
      onMouseDown={e => { if (e.target === e.currentTarget && closeOnBackdrop && !busy) onClose(); }}
    >
      <div
        ref={panelRef}
        className={`modal-panel modal-${size}`}
        role={role}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
      >
        {onSubmit ? <form className="modal-form" onSubmit={onSubmit} noValidate>{content}</form> : content}
      </div>
    </div>,
    document.body,
  );
}

/** Выезжающая справа панель для форм редактирования. Те же props, что у Modal. */
export function Drawer(props: Omit<ModalProps, 'variant'>) {
  return <Modal size="lg" closeOnBackdrop={false} {...props} variant="drawer" />;
}

// ---------- Подтверждение ----------

export interface ConfirmOptions {
  /** Заголовок, например «Удалить новость?». */
  title: string;
  /** Пояснение, например «Действие нельзя отменить». */
  message?: ReactNode;
  /** Текст кнопки подтверждения (по умолчанию «Удалить» для danger, иначе «Подтвердить»). */
  confirmLabel?: string;
  cancelLabel?: string;
  /** Красная кнопка и значок предупреждения. По умолчанию true. */
  danger?: boolean;
}

export interface ConfirmDialogProps extends ConfirmOptions {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Диалог подтверждения. Обычно не нужен напрямую — используйте useConfirm(). */
export function ConfirmDialog({ open, title, message, confirmLabel, cancelLabel = 'Отмена', danger = true, onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={<span className="confirm-title">{danger && <TriangleAlert size={20} aria-hidden="true" />}{title}</span>}
      description={message}
      size="sm"
      role="alertdialog"
      footer={(
        <>
          <Button variant="ghost" onClick={onCancel}>{cancelLabel}</Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} data-autofocus>{confirmLabel ?? (danger ? 'Удалить' : 'Подтвердить')}</Button>
        </>
      )}
    />
  );
}

type ConfirmFn = (opts: ConfirmOptions | string) => Promise<boolean>;
const ConfirmContext = createContext<ConfirmFn | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(null);
  const confirm = useCallback<ConfirmFn>(opts => new Promise<boolean>(resolve => {
    const o = typeof opts === 'string' ? { title: opts } : opts;
    setState({ ...o, resolve });
  }), []);
  const close = (v: boolean) => { state?.resolve(v); setState(null); };
  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state && <ConfirmDialog open {...state} onConfirm={() => close(true)} onCancel={() => close(false)} />}
    </ConfirmContext.Provider>
  );
}

/**
 * Подтверждение действия: `if (await confirm({ title: 'Удалить новость?' })) …`.
 * Можно передать просто строку-заголовок.
 */
export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm вне ConfirmProvider');
  return ctx;
}
