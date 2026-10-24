/**
 * Вкладки по шаблону WAI-ARIA Tabs: role=tablist/tab/tabpanel, aria-controls ↔ aria-labelledby,
 * «бегающий» tabIndex (в Tab-порядке только выбранная вкладка), стрелки ←/→, Home/End.
 *
 *   const tabs = useTabs({ keys: ['a', 'b'], value, onChange: setValue, label: 'Раздел' });
 *   <div className="segmented" {...tabs.listProps}>
 *     {keys.map(k => <button key={k} {...tabs.tabProps(k)}>…</button>)}
 *   </div>
 *   <div {...tabs.panelProps}>…содержимое выбранной вкладки…</div>
 *
 * activation: 'auto' — стрелка сразу выбирает вкладку (дешёвое переключение, языки формы);
 * 'manual' — стрелки только двигают фокус, выбор по Enter/Space/клику (переключение может спросить подтверждение).
 * Все вкладки управляют одной панелью (рендерится содержимое выбранной), поэтому aria-controls у всех один.
 */
import { useId, useRef, type KeyboardEvent } from 'react';

export interface UseTabsOptions<T extends string> {
  keys: readonly T[];
  value: T;
  onChange: (v: T) => void;
  label: string;
  activation?: 'auto' | 'manual';
  /** Префикс id (по умолчанию — useId). */
  idBase?: string;
}

const safe = (s: string) => s.replace(/[^a-zA-Z0-9_-]/g, '');

export function useTabs<T extends string>({ keys, value, onChange, label, activation = 'auto', idBase }: UseTabsOptions<T>) {
  const auto = safe(useId());
  const base = idBase ?? `tabs-${auto}`;
  const listRef = useRef<HTMLDivElement>(null);
  const tabId = (k: T) => `${base}-tab-${safe(k)}`;
  const panelId = `${base}-panel`;

  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    const tabs = Array.from(listRef.current?.querySelectorAll<HTMLElement>('[role="tab"]') ?? []);
    const cur = tabs.indexOf(document.activeElement as HTMLElement);
    if (cur < 0 || !tabs.length) return;
    let next = -1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (cur + 1) % tabs.length;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (cur - 1 + tabs.length) % tabs.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = tabs.length - 1;
    if (next < 0) return;
    e.preventDefault();
    tabs[next].focus();
    if (activation === 'auto') onChange(keys[next]);
  };

  return {
    tabId,
    panelId,
    listProps: { ref: listRef, role: 'tablist' as const, 'aria-label': label, 'aria-orientation': 'horizontal' as const, onKeyDown },
    tabProps: (k: T) => ({
      id: tabId(k),
      type: 'button' as const,
      role: 'tab' as const,
      'aria-selected': k === value,
      'aria-controls': panelId,
      tabIndex: k === value ? 0 : -1,
      onClick: () => onChange(k),
    }),
    panelProps: { id: panelId, role: 'tabpanel' as const, 'aria-labelledby': tabId(value) },
  };
}

/** Вкладки в стиле .segmented (без панели — её рендерит вызывающий с `panelProps`). */
export function TabList<T extends string>({ tabs, options, className = 'segmented' }: {
  tabs: ReturnType<typeof useTabs<T>>;
  options: readonly { value: T; label: string; count?: number }[];
  className?: string;
}) {
  return (
    <div className={className} {...tabs.listProps}>
      {options.map(o => {
        const p = tabs.tabProps(o.value);
        return (
          <button key={o.value} {...p} className={p['aria-selected'] ? 'active' : ''}>
            {o.label}{o.count !== undefined && <span className="segmented-count">{o.count}</span>}
          </button>
        );
      })}
    </div>
  );
}
