import { forwardRef, type AnchorHTMLAttributes, type ButtonHTMLAttributes, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { linkProps } from '../router';

export type ButtonVariant = 'primary' | 'ghost' | 'danger' | 'outline' | 'link';

/** Крутилка загрузки. `label` — текст для экранных дикторов. */
export function Spinner({ size = 18, label }: { size?: number; label?: string }) {
  return (
    <span className="spinner" style={{ width: size, height: size }} role={label ? 'status' : undefined} aria-label={label} aria-hidden={label ? undefined : true} />
  );
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** primary — красная, ghost — серая, danger — удаление, outline — с рамкой, link — как ссылка. По умолчанию primary. */
  variant?: ButtonVariant;
  /** Компактная высота (36px). */
  size?: 'md' | 'sm';
  /** Показывает крутилку и блокирует кнопку. */
  loading?: boolean;
  /** Значок слева (компонент lucide-react). */
  icon?: LucideIcon;
  /** Растянуть на всю ширину. */
  block?: boolean;
}

/** Кнопка. По умолчанию type="button" — для отправки формы укажите type="submit". */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading = false, icon: Icon, block, className = '', children, disabled, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={`btn btn-${variant}${size === 'sm' ? ' btn-sm' : ''}${block ? ' btn-block' : ''} ${className}`}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <Spinner size={16} /> : Icon ? <Icon size={size === 'sm' ? 16 : 18} aria-hidden="true" /> : null}
      {children}
    </button>
  );
});

export interface LinkButtonProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  /** Адрес. Внутренние адреса /admin/... открываются без перезагрузки. */
  to: string;
  variant?: ButtonVariant;
  size?: 'md' | 'sm';
  icon?: LucideIcon;
  children?: ReactNode;
}

/** Ссылка, оформленная как кнопка. Внешние ссылки (http…) открываются в новой вкладке. */
export function LinkButton({ to, variant = 'ghost', size = 'md', icon: Icon, className = '', children, ...rest }: LinkButtonProps) {
  const external = /^https?:\/\//.test(to) || !to.startsWith('/admin');
  const props = external ? { href: to, target: '_blank', rel: 'noreferrer' } : linkProps(to);
  return (
    <a className={`btn btn-${variant}${size === 'sm' ? ' btn-sm' : ''} ${className}`} {...props} {...rest}>
      {Icon && <Icon size={size === 'sm' ? 16 : 18} aria-hidden="true" />}
      {children}
    </a>
  );
}

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  /** Значок lucide-react. */
  icon: LucideIcon;
  /** Обязательная подпись: aria-label и всплывающая подсказка. */
  label: string;
  variant?: 'plain' | 'ghost' | 'danger';
  size?: 'md' | 'sm';
  loading?: boolean;
}

/** Квадратная кнопка-значок с обязательной текстовой подписью для доступности. */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icon: Icon, label, variant = 'plain', size = 'md', loading, className = '', type = 'button', disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={`icon-btn icon-btn-${variant}${size === 'sm' ? ' icon-btn-sm' : ''} ${className}`}
      aria-label={label}
      title={label}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? <Spinner size={16} /> : <Icon size={size === 'sm' ? 16 : 18} aria-hidden="true" />}
    </button>
  );
});
