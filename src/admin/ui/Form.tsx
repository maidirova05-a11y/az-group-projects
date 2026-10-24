/**
 * Поля форм. `Field` даёт подпись, подсказку и ошибку и связывает их с вложенным
 * контролом (id, aria-describedby, aria-invalid) через контекст — контрол можно
 * не настраивать вручную:
 *
 *   <Field label="Заголовок" error={errors.title} required>
 *     <Input value={values.title} onChange={e => set('title', e.target.value)} />
 *   </Field>
 */
import {
  createContext, forwardRef, useContext, useEffect, useId, useState,
  type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes,
} from 'react';
import { ImageOff, X } from 'lucide-react';
import { safeImgSrc } from '../../content/safe-url';
import { UnsafeLinkBadge } from './misc';

interface FieldCtx { id: string; describedBy?: string; invalid: boolean; required?: boolean }
const FieldContext = createContext<FieldCtx | null>(null);

/** Атрибуты доступности для контрола внутри Field (можно использовать в своих контролах). */
export function useFieldProps(own: { id?: string; 'aria-describedby'?: string; required?: boolean; invalid?: boolean }) {
  const ctx = useContext(FieldContext);
  const invalid = own.invalid ?? ctx?.invalid ?? false;
  return {
    id: own.id ?? ctx?.id,
    'aria-describedby': [own['aria-describedby'], ctx?.describedBy].filter(Boolean).join(' ') || undefined,
    'aria-invalid': invalid || undefined,
    required: own.required ?? ctx?.required,
  };
}

export interface FieldProps {
  /** Подпись поля. */
  label: ReactNode;
  /** Подсказка серым под полем. */
  hint?: ReactNode;
  /** Текст ошибки (красным); делает контрол aria-invalid. */
  error?: string | null;
  /** Звёздочка у подписи и required у контрола. */
  required?: boolean;
  /** Свой id контрола (иначе генерируется). */
  id?: string;
  /** Занять всю строку в сетке `FormGrid`. */
  wide?: boolean;
  className?: string;
  children: ReactNode;
}

/** Обёртка поля формы: подпись + контрол + подсказка/ошибка. */
export function Field({ label, hint, error, required, id, wide, className = '', children }: FieldProps) {
  const auto = useId();
  const controlId = id ?? `f${auto.replace(/:/g, '')}`;
  const hintId = hint ? `${controlId}-hint` : undefined;
  const errId = error ? `${controlId}-err` : undefined;
  return (
    <FieldContext.Provider value={{ id: controlId, describedBy: [errId, hintId].filter(Boolean).join(' ') || undefined, invalid: !!error, required }}>
      <div className={`field${error ? ' has-error' : ''}${wide ? ' field-wide' : ''} ${className}`}>
        <label className="field-label" htmlFor={controlId}>
          {label}{required && <span className="req" aria-hidden="true"> *</span>}
        </label>
        {children}
        {error && <p className="field-error" id={errId}>{error}</p>}
        {hint && !error && <p className="field-hint" id={hintId}>{hint}</p>}
        {hint && error && <p className="sr-only" id={hintId}>{hint}</p>}
      </div>
    </FieldContext.Provider>
  );
}

/** Двухколоночная сетка полей (на телефоне — одна колонка). */
export function FormGrid({ children, cols = 2 }: { children: ReactNode; cols?: 1 | 2 | 3 }) {
  return <div className={`form-grid form-grid-${cols}`}>{children}</div>;
}

/** Нижняя панель формы с кнопками (прилипает к низу в Drawer). */
export function FormActions({ children }: { children: ReactNode }) {
  return <div className="form-actions">{children}</div>;
}

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Принудительно пометить ошибочным (вне Field). */
  invalid?: boolean;
}

/** Текстовое поле. Внутри Field получает id и aria-атрибуты автоматически. */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ invalid, className = '', ...rest }, ref) {
  const a11y = useFieldProps({ ...rest, invalid });
  return <input ref={ref} className={`input ${className}`} {...rest} {...a11y} />;
});

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> { invalid?: boolean }

/** Многострочное поле. По умолчанию 4 строки, растягивается по вертикали. */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea({ invalid, className = '', rows = 4, ...rest }, ref) {
  const a11y = useFieldProps({ ...rest, invalid });
  return <textarea ref={ref} rows={rows} className={`input textarea ${className}`} {...rest} {...a11y} />;
});

export interface SelectOption { value: string; label: string; disabled?: boolean }
export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  /** Варианты; вместо них можно передать <option> детьми. */
  options?: readonly SelectOption[];
  /** Пустой первый вариант с этим текстом. */
  placeholder?: string;
  invalid?: boolean;
}

/** Выпадающий список (нативный select). */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select({ options, placeholder, invalid, className = '', children, ...rest }, ref) {
  const a11y = useFieldProps({ ...rest, invalid });
  return (
    <span className="select-wrap">
      <select ref={ref} className={`input select ${className}`} {...rest} {...a11y}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options?.map(o => <option key={o.value} value={o.value} disabled={o.disabled}>{o.label}</option>)}
        {children}
      </select>
    </span>
  );
});

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
  /** Подпись справа от флажка. */
  label: ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  hint?: ReactNode;
}

/** Флажок с подписью. */
export function Checkbox({ label, checked, onChange, hint, className = '', id, ...rest }: CheckboxProps) {
  const auto = useId();
  const cid = id ?? `c${auto.replace(/:/g, '')}`;
  return (
    <label className={`check ${className}`} htmlFor={cid}>
      <input id={cid} type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} {...rest} />
      <span className="check-box" aria-hidden="true" />
      <span className="check-text">{label}{hint && <small>{hint}</small>}</span>
    </label>
  );
}

export interface SwitchProps {
  /** Подпись справа от переключателя. */
  label: ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  hint?: ReactNode;
  id?: string;
}

/** Переключатель вкл/выкл (role="switch"), например «Опубликовано». */
export function Switch({ label, checked, onChange, disabled, hint, id }: SwitchProps) {
  const auto = useId();
  const sid = id ?? `s${auto.replace(/:/g, '')}`;
  return (
    <div className="switch-row">
      <button
        id={sid}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        className={`switch${checked ? ' on' : ''}`}
        onClick={() => onChange(!checked)}
      >
        <span className="switch-thumb" aria-hidden="true" />
      </button>
      <label htmlFor={sid} className="switch-label">{label}{hint && <small>{hint}</small>}</label>
    </div>
  );
}

const HEX = /^#[0-9a-fA-F]{6}$/;

export interface ColorInputProps {
  /** Цвет #RRGGBB. */
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  /** Быстрые варианты под полем. */
  swatches?: string[];
}

/** Цвет: палитра браузера + поле #RRGGBB + быстрые образцы. */
export function ColorInput({ value, onChange, disabled, swatches = ['#cd0929', '#1d4ed8', '#0f766e', '#7c3aed', '#ea580c', '#1d1f23'] }: ColorInputProps) {
  const a11y = useFieldProps({});
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  return (
    <div className="color-input">
      <input type="color" value={HEX.test(value) ? value : '#000000'} onChange={e => onChange(e.target.value)} disabled={disabled} aria-label="Выбрать цвет на палитре" />
      <input
        className="input mono"
        {...a11y}
        value={draft}
        maxLength={7}
        disabled={disabled}
        placeholder="#RRGGBB"
        onChange={e => {
          let v = e.target.value.trim();
          if (v && !v.startsWith('#')) v = `#${v}`;
          setDraft(v);
          if (HEX.test(v)) onChange(v.toLowerCase());
        }}
        onBlur={() => { if (!HEX.test(draft)) setDraft(value); }}
      />
      {swatches.length > 0 && (
        <div className="swatches" role="group" aria-label="Готовые цвета">
          {swatches.map(s => (
            <button key={s} type="button" className={`swatch${s.toLowerCase() === value.toLowerCase() ? ' active' : ''}`} style={{ background: s }} onClick={() => onChange(s)} aria-label={`Цвет ${s}`} aria-pressed={s.toLowerCase() === value.toLowerCase()} disabled={disabled} />
          ))}
        </div>
      )}
    </div>
  );
}

export interface DateInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
  /** Дата 'YYYY-MM-DD' или null. */
  value: string | null | undefined;
  /** Пустое поле → null. */
  onChange: (value: string | null) => void;
  /** Показать кнопку очистки. */
  clearable?: boolean;
  /** 'month' — выбор только месяца (значение 'YYYY-MM-01'). */
  mode?: 'date' | 'month';
}

/** Поле даты (нативный календарь). Возвращает 'YYYY-MM-DD' или null. */
export function DateInput({ value, onChange, clearable = true, mode = 'date', className = '', ...rest }: DateInputProps) {
  const a11y = useFieldProps(rest);
  const shown = value ? (mode === 'month' ? value.slice(0, 7) : value) : '';
  return (
    <span className="date-input">
      <input
        type={mode}
        className={`input ${className}`}
        value={shown}
        onChange={e => {
          const v = e.target.value;
          onChange(v ? (mode === 'month' ? `${v}-01` : v) : null);
        }}
        {...rest}
        {...a11y}
      />
      {clearable && value && !rest.disabled && (
        <button type="button" className="input-clear" onClick={() => onChange(null)} aria-label="Очистить дату"><X size={16} aria-hidden="true" /></button>
      )}
    </span>
  );
}

export interface ImageUrlInputProps {
  /** Адрес картинки: /images/..., /logos/... или https://... */
  value: string | null | undefined;
  /** Пустая строка → null. */
  onChange: (value: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  /** Форма превью: 'cover' для фото, 'contain' для логотипов. */
  fit?: 'cover' | 'contain';
}

/** Поле адреса картинки с живым превью; при ошибке загрузки показывает заглушку. */
export function ImageUrlInput({ value, onChange, placeholder = '/images/... или https://...', disabled, fit = 'contain' }: ImageUrlInputProps) {
  const a11y = useFieldProps({});
  const [broken, setBroken] = useState(false);
  const url = value?.trim() ?? '';
  const safe = safeImgSrc(url);
  useEffect(() => setBroken(false), [url]);
  return (
    <div className="image-input">
      <div className={`image-preview fit-${fit}`} aria-hidden="true">
        {safe && !broken ? <img src={safe} alt="" onError={() => setBroken(true)} /> : <ImageOff size={22} />}
      </div>
      <div className="image-input-body">
        <input
          className="input"
          {...a11y}
          type="text"
          inputMode="url"
          value={value ?? ''}
          placeholder={placeholder}
          disabled={disabled}
          onChange={e => onChange(e.target.value.trim() ? e.target.value : null)}
        />
        {url && !safe && <p className="field-hint warn"><UnsafeLinkBadge url={url} /> Разрешены адреса https://… или /…</p>}
        {safe && broken && <p className="field-hint warn">Картинка не загрузилась — проверьте адрес</p>}
      </div>
    </div>
  );
}
