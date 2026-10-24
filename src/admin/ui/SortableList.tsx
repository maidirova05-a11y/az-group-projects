import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ChevronDown, ChevronUp, GripVertical } from 'lucide-react';

export interface SortableListProps<T> {
  items: T[];
  /** id элемента (число из БД). */
  getId: (item: T) => number;
  /** Содержимое строки (справа от ручки перетаскивания). */
  renderItem: (item: T, index: number) => ReactNode;
  /**
   * Новый порядок id после перетаскивания или кнопок ↑/↓.
   * Если вернёт отклонённый Promise — порядок откатится.
   * Обычно: `ids => api.put('/admin/reorder/faqs', { ids })`.
   */
  onReorder: (ids: number[]) => void | Promise<unknown>;
  /** Название элемента для объявлений экранного диктора («Вопрос „…“ перемещён на 3 место»). */
  itemLabel?: (item: T) => string;
  /** Отключить перестановку (например, пока активен поиск). */
  disabled?: boolean;
  /** Подпись списка. */
  label?: string;
}

interface DragState { id: number; from: number; to: number; dy: number; slot: number; startY: number; rects: DOMRect[] }

/**
 * Список с перестановкой: перетаскивание за ручку (мышь, касание, перо — pointer events)
 * и кнопки ↑/↓ (а также стрелки на клавиатуре, когда ручка в фокусе).
 */
export function SortableList<T>({ items, getId, renderItem, onReorder, itemLabel, disabled, label = 'Порядок элементов' }: SortableListProps<T>) {
  const [order, setOrder] = useState<number[]>(() => items.map(getId));
  const [drag, setDrag] = useState<DragState | null>(null);
  const [announce, setAnnounce] = useState('');
  const refs = useRef(new Map<number, HTMLLIElement>());
  const handleRefs = useRef(new Map<number, HTMLButtonElement>());
  const idsKey = items.map(getId).join(',');

  useEffect(() => { setOrder(items.map(getId)); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [idsKey]);

  const byId = useMemo(() => new Map(items.map(it => [getId(it), it])), [items, getId]);
  const list = order.map(id => byId.get(id)).filter((x): x is T => x !== undefined);

  const commit = async (next: number[], movedId: number) => {
    const prev = order;
    if (next.join(',') === prev.join(',')) return;
    setOrder(next);
    const item = byId.get(movedId);
    const name = item && itemLabel ? `«${itemLabel(item)}»` : 'Элемент';
    setAnnounce(`${name} перемещён на позицию ${next.indexOf(movedId) + 1} из ${next.length}`);
    try {
      await onReorder(next);
    } catch {
      setOrder(prev);
      setAnnounce('Не удалось сохранить порядок');
    }
  };

  const move = (id: number, delta: number) => {
    const i = order.indexOf(id);
    const j = i + delta;
    if (i < 0 || j < 0 || j >= order.length) return;
    const next = [...order];
    [next[i], next[j]] = [next[j], next[i]];
    void commit(next, id);
    requestAnimationFrame(() => handleRefs.current.get(id)?.focus());
  };

  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>, id: number) => {
    if (disabled || (e.pointerType === 'mouse' && e.button !== 0)) return;
    e.preventDefault();
    const rects = order.map(oid => refs.current.get(oid)!.getBoundingClientRect());
    const from = order.indexOf(id);
    const gap = rects.length > 1 ? Math.max(0, rects[1].top - rects[0].bottom) : 0;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDrag({ id, from, to: from, dy: 0, slot: rects[from].height + gap, startY: e.clientY, rects });
  };

  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!drag) return;
    const dy = e.clientY - drag.startY;
    const r = drag.rects[drag.from];
    const center = r.top + r.height / 2 + dy;
    let to = 0;
    drag.rects.forEach((rect, i) => { if (i !== drag.from && rect.top + rect.height / 2 < center) to++; });
    setDrag({ ...drag, dy, to });
  };

  const onPointerUp = () => {
    if (!drag) return;
    const { id, from, to } = drag;
    setDrag(null);
    if (from === to) return;
    const next = [...order];
    next.splice(from, 1);
    next.splice(to, 0, id);
    void commit(next, id);
  };

  const transformFor = (index: number, id: number): string | undefined => {
    if (!drag) return undefined;
    if (id === drag.id) return `translateY(${drag.dy}px)`;
    if (drag.from < drag.to && index > drag.from && index <= drag.to) return `translateY(${-drag.slot}px)`;
    if (drag.to < drag.from && index >= drag.to && index < drag.from) return `translateY(${drag.slot}px)`;
    return undefined;
  };

  return (
    <>
      <ul className={`sortable${drag ? ' is-dragging' : ''}${disabled ? ' is-disabled' : ''}`} aria-label={label}>
        {list.map((item, index) => {
          const id = getId(item);
          const name = itemLabel?.(item) ?? `Элемент ${index + 1}`;
          return (
            <li
              key={id}
              ref={el => { if (el) refs.current.set(id, el); else refs.current.delete(id); }}
              className={`sortable-item${drag?.id === id ? ' dragging' : ''}`}
              style={{ transform: transformFor(index, id) }}
            >
              <button
                ref={el => { if (el) handleRefs.current.set(id, el); else handleRefs.current.delete(id); }}
                type="button"
                className="drag-handle"
                aria-label={`Переместить «${name}». Позиция ${index + 1} из ${list.length}. Стрелки вверх и вниз меняют порядок`}
                title="Перетащите, чтобы изменить порядок"
                disabled={disabled}
                onPointerDown={e => onPointerDown(e, id)}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={() => setDrag(null)}
                onKeyDown={e => {
                  if (e.key === 'ArrowUp') { e.preventDefault(); move(id, -1); }
                  if (e.key === 'ArrowDown') { e.preventDefault(); move(id, 1); }
                }}
              >
                <GripVertical size={18} aria-hidden="true" />
              </button>
              <div className="sortable-body">{renderItem(item, index)}</div>
              <div className="sortable-arrows">
                <button type="button" className="icon-btn icon-btn-plain icon-btn-sm" onClick={() => move(id, -1)} disabled={disabled || index === 0} aria-label={`Поднять «${name}» выше`} title="Выше"><ChevronUp size={16} aria-hidden="true" /></button>
                <button type="button" className="icon-btn icon-btn-plain icon-btn-sm" onClick={() => move(id, 1)} disabled={disabled || index === list.length - 1} aria-label={`Опустить «${name}» ниже`} title="Ниже"><ChevronDown size={16} aria-hidden="true" /></button>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="sr-only" aria-live="polite">{announce}</p>
    </>
  );
}
