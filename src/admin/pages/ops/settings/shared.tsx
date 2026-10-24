/** Общее для разделов «Настроек сайта»: типы, пустые значения, обёртка раздела, список с перестановкой. */
import { useEffect, type ReactNode } from 'react';
import { ChevronDown, ChevronUp, Plus, RotateCcw, Save, Trash2 } from 'lucide-react';
import { z } from 'zod';
import { aboutSetting, contactsSetting, linksSetting, statsSetting, type SettingKey } from '@shared/schemas';
import { api } from '../../../api';
import { Button, IconButton, Panel, useToast, type UseForm } from '../../../ui';

export type Contacts = z.infer<typeof contactsSetting>;
export type Links = z.infer<typeof linksSetting>;
export type Stats = z.infer<typeof statsSetting>;
export type About = z.infer<typeof aboutSetting>;

export const EMPTY: { contacts: Contacts; links: Links; stats: Stats; about: About } = {
  contacts: { address: '', mapUrl: '', phone: '', phoneHref: '', email: '', whatsapp: '', instagram: '', taplink: '', offer: '' },
  links: { registration: '', cabinet: '', fibonacciResults: '', posterPdf: '', ifo: '', ifoCertificate: '' },
  stats: [],
  about: { title: '', pillars: [], directions: [], achievements: [] },
};

/** Значение из БД поверх пустого шаблона (на случай отсутствующих ключей). */
export function normalize<K extends SettingKey>(key: K, raw: unknown): (typeof EMPTY)[K] {
  const base = EMPTY[key];
  if (Array.isArray(base)) return (Array.isArray(raw) ? raw : base) as (typeof EMPTY)[K];
  if (!raw || typeof raw !== 'object') return structuredClone(base);
  return { ...base, ...(raw as object) } as (typeof EMPTY)[K];
}

export interface SectionProps<T> {
  initial: T;
  onSaved: (value: T) => void;
  onDirty: (dirty: boolean) => void;
}

/** Общая обёртка раздела: панель, форма, нижняя строка с кнопками. */
export function SectionShell<S extends z.ZodType>({ title, description, form, onSubmit, onDirty, children }: {
  title: string; description: ReactNode; form: UseForm<S>; onSubmit: (e?: { preventDefault?: () => void }) => Promise<void>;
  onDirty: (d: boolean) => void; children: ReactNode;
}) {
  useEffect(() => { onDirty(form.dirty); }, [form.dirty, onDirty]);
  const errorCount = Object.keys(form.errors).filter(k => k !== '_').length;
  return (
    <Panel title={title} description={description}>
      <form onSubmit={onSubmit} noValidate>
        {form.errors._ && <p className="notice notice-error" role="alert" style={{ marginBottom: 16 }}>{form.errors._}</p>}
        {children}
        <div className="ops-form-foot">
          <span className={`ops-foot-note${form.dirty ? ' warn' : ''}`} aria-live="polite">
            {errorCount > 0 ? `Исправьте ошибки: ${errorCount}` : form.dirty ? 'Есть несохранённые изменения' : 'Изменений нет'}
          </span>
          <Button variant="ghost" icon={RotateCcw} onClick={() => form.reset()} disabled={!form.dirty || form.submitting}>Отменить</Button>
          <Button type="submit" icon={Save} loading={form.submitting} disabled={!form.dirty}>Сохранить</Button>
        </div>
      </form>
    </Panel>
  );
}

export function useSave<T>(key: SettingKey, onSaved: (v: T) => void) {
  const toast = useToast();
  return { toast, save: async (value: T) => {
    const saved = await api.put<T>(`/admin/settings/${key}`, value);
    onSaved(saved);
    toast.success('Сохранено. Изменения уже на сайте');
  } };
}

/** Убрать ошибки вложенных полей списка после его изменения. */
export function clearErr<S extends z.ZodType>(form: UseForm<S>, prefix: string) {
  const left = Object.fromEntries(Object.entries(form.errors).filter(([k]) => k !== prefix && !k.startsWith(`${prefix}.`) && k !== '_'));
  if (Object.keys(left).length !== Object.keys(form.errors).length) form.setErrors(left);
}

// ---------- Список с добавлением, удалением и перестановкой ----------

interface ListEditorProps<T> {
  items: T[];
  onChange: (items: T[]) => void;
  max: number;
  /** Новый пустой элемент. */
  create: () => T;
  /** Подпись элемента для кнопок («цифру 2»). */
  noun: string;
  addLabel: string;
  render: (item: T, index: number, update: (next: T) => void) => ReactNode;
  error?: string;
}

export function ListEditor<T>({ items, onChange, max, create, noun, addLabel, render, error }: ListEditorProps<T>) {
  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  return (
    <>
      {error && <p className="field-error" role="alert" style={{ marginBottom: 8 }}>{error}</p>}
      {items.length === 0 ? <p className="muted" style={{ fontSize: 13.5 }}>Пока пусто.</p> : (
        <ol className="ops-list">
          {items.map((item, i) => (
            <li key={i} className="ops-list-item">
              <span className="ops-list-num" aria-hidden="true">{i + 1}</span>
              <div className="ops-list-body">{render(item, i, next => onChange(items.map((x, k) => (k === i ? next : x))))}</div>
              <div className="ops-list-tools">
                <IconButton icon={ChevronUp} size="sm" label={`Поднять ${noun} ${i + 1} выше`} onClick={() => move(i, -1)} disabled={i === 0} />
                <IconButton icon={ChevronDown} size="sm" label={`Опустить ${noun} ${i + 1} ниже`} onClick={() => move(i, 1)} disabled={i === items.length - 1} />
                <IconButton icon={Trash2} size="sm" variant="danger" label={`Удалить ${noun} ${i + 1}`} onClick={() => onChange(items.filter((_, k) => k !== i))} />
              </div>
            </li>
          ))}
        </ol>
      )}
      <div className="ops-list-add">
        <Button size="sm" variant="outline" icon={Plus} onClick={() => onChange([...items, create()])} disabled={items.length >= max}>
          {items.length >= max ? `Не больше ${max}` : addLabel}
        </Button>
      </div>
    </>
  );
}
