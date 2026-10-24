import { useId, useState } from 'react';
import { ChevronDown, RotateCcw } from 'lucide-react';
import type { ProgramDTO } from '@shared/schemas';
import { calendarCategories, type CalendarCategory } from '../../content/calendar';
import { Panel } from '../../components/ui';
import { programVars } from './color';
import { GROUPS } from './groups';
import { useEventsText } from './i18n';

/** Легенда цветов = фильтр: каждая программа — кнопка-переключатель видимости. */
export function Legend({ programs, hidden, onToggle, onToggleGroup, onAll, onReset, canReset }: {
  programs: ProgramDTO[];
  hidden: Set<string>;
  onToggle: (slug: string) => void;
  onToggleGroup: (cat: CalendarCategory) => void;
  onAll: () => void;
  onReset: () => void;
  canReset: boolean;
}) {
  const T = useEventsText();
  const shown = programs.filter(p => !hidden.has(p.slug)).length;
  const all = shown === programs.length;
  // Телефон: чипы свёрнуты под кнопку «Фильтр: N из 13», чтобы календарь был виден сразу (CSS скрывает кнопку на ≥768px).
  const [open, setOpen] = useState(false);
  const bodyId = useId();
  return (
    <Panel className="ev-legend">
      <div className="ev-legend-head">
        <h2 className="ev-legend-title" id="ev-legend-title">{T.legendTitle}</h2>
        <div className="ev-legend-actions">
          <button type="button" className={`ev-pill ${all ? 'on' : ''}`} aria-pressed={all} onClick={onAll}>{T.legendAll}</button>
          {canReset && <button type="button" className="ev-pill ghost" onClick={onReset}><RotateCcw size={14} aria-hidden="true" />{T.legendReset}</button>}
        </div>
      </div>
      <button type="button" className="ev-legend-toggle" aria-expanded={open} aria-controls={bodyId} onClick={() => setOpen(o => !o)}>
        {T.legendToggle(shown, programs.length)}<ChevronDown size={16} aria-hidden="true" />
      </button>
      <div className={`ev-legend-body ${open ? 'open' : ''}`} id={bodyId}>
      <p className="ev-legend-hint">{T.legendHint}</p>
      <div className="ev-legend-groups">
        {calendarCategories.map(c => {
          const list = programs.filter(p => p.category === c.id);
          if (!list.length) return null;
          const g = GROUPS[c.id];
          const title = T.groups[c.id];
          const groupOn = list.some(p => !hidden.has(p.slug));
          return (
            <div key={c.id} className="ev-legend-group" role="group" aria-label={title}>
              <button type="button" className="ev-group-btn" aria-pressed={groupOn} onClick={() => onToggleGroup(c.id)} title={T.legendGroupToggle(title)}>
                <g.Icon size={16} aria-hidden="true" />{title}
              </button>
              <ul className="ev-chips">
                {list.map(p => {
                  const on = !hidden.has(p.slug);
                  return (
                    <li key={p.slug}>
                      <button type="button" className={`ev-chip acc ${on ? 'on' : 'off'}`} style={programVars(p.color)} aria-pressed={on} onClick={() => onToggle(p.slug)}>
                        <span className="ev-dot" aria-hidden="true" />{p.name}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
      <p className="ev-legend-count" role="status">{T.shown(shown, programs.length)}</p>
      </div>
    </Panel>
  );
}
