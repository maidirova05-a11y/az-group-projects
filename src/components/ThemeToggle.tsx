/**
 * Переключатель темы: «Как в системе» / «Светлая» / «Тёмная».
 * variant="menu" — иконка-кнопка с выпадающим меню (шапка сайта и админки);
 * variant="segmented" — три кнопки в ряд (лист «Ещё» на телефоне).
 * Стили: .theme-toggle / .theme-menu / .theme-seg — в src/index.css и src/admin/admin.css.
 * text — строки на языке страницы (сайт передаёт t.theme); по умолчанию русские THEME_TEXT (админка).
 */
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { Check, Moon, Sun, SunMoon, type LucideIcon } from 'lucide-react';
import { THEME_PREFS, THEME_TEXT, useTheme, type ThemePref, type ThemeText } from '../content/theme';

const ICONS: Record<ThemePref, LucideIcon> = { system: SunMoon, light: Sun, dark: Moon };

export default function ThemeToggle({ variant = 'menu', className = '', text = THEME_TEXT }: { variant?: 'menu' | 'segmented'; className?: string; text?: ThemeText }) {
  return variant === 'segmented' ? <ThemeSegmented className={className} text={text} /> : <ThemeMenu className={className} text={text} />;
}

function ThemeSegmented({ className, text }: { className: string; text: ThemeText }) {
  const { pref, setPref } = useTheme();
  return (
    <div className={`theme-seg ${className}`} role="group" aria-label={text.menuLabel}>
      {THEME_PREFS.map(p => {
        const Icon = ICONS[p];
        return (
          <button key={p} type="button" aria-pressed={pref === p} className={pref === p ? 'on' : ''} onClick={() => setPref(p)}>
            <Icon size={16} aria-hidden="true" /><span>{text.options[p]}</span>
          </button>
        );
      })}
    </div>
  );
}

function ThemeMenu({ className, text }: { className: string; text: ThemeText }) {
  const { pref, setPref } = useTheme();
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const items = useRef<(HTMLButtonElement | null)[]>([]);
  const menuId = useId();
  const Icon = ICONS[pref];

  // Фокус на выбранный пункт при открытии.
  useEffect(() => {
    if (open) items.current[Math.max(0, THEME_PREFS.indexOf(pref))]?.focus();
  }, [open, pref]);

  // Клик вне меню закрывает его.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open]);

  const close = (focusButton = true) => { setOpen(false); if (focusButton) btn.current?.focus(); };
  const choose = (p: ThemePref) => { setPref(p); close(); };

  const onMenuKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = items.current.findIndex(el => el === document.activeElement);
    const n = THEME_PREFS.length;
    const go = (j: number) => { e.preventDefault(); items.current[(j + n) % n]?.focus(); };
    switch (e.key) {
      case 'ArrowDown': go(i + 1); break;
      case 'ArrowUp': go(i - 1); break;
      case 'Home': go(0); break;
      case 'End': go(n - 1); break;
      case 'Escape': e.preventDefault(); e.stopPropagation(); close(); break;
      case 'Tab': close(false); break;
    }
  };

  const onButtonKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); setOpen(true); }
  };

  return (
    <div className={`theme-toggle ${className}`} ref={wrap}>
      <button
        ref={btn}
        type="button"
        className="icon-btn theme-toggle-btn"
        aria-label={text.button[pref]}
        title={text.button[pref]}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen(o => !o)}
        onKeyDown={onButtonKey}
      >
        <Icon size={20} aria-hidden="true" />
      </button>
      {open && (
        <div className="theme-menu" id={menuId} role="menu" aria-label={text.menuLabel} onKeyDown={onMenuKey}>
          {THEME_PREFS.map((p, idx) => {
            const ItemIcon = ICONS[p];
            return (
              <button
                key={p}
                ref={el => { items.current[idx] = el; }}
                type="button"
                role="menuitemradio"
                aria-checked={pref === p}
                tabIndex={-1}
                className={pref === p ? 'on' : ''}
                onClick={() => choose(p)}
              >
                <ItemIcon size={18} aria-hidden="true" />
                <span>{text.options[p]}</span>
                {pref === p && <Check size={16} className="theme-menu-check" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
