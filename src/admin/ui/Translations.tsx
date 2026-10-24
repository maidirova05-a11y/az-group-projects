/**
 * Переводы контента (KZ = kk, ENG = en) в формах админки.
 *
 * Русский — основной язык (обычные поля), переводы лежат в `translations: { kk?: {...}, en?: {...} }`.
 * Пустой перевод = на сайте показывается русский текст.
 *
 *   const TR = [{ key: 'name', label: 'Название', max: 160 }, { key: 'tagline', label: 'Подзаголовок', max: 200 }] as const;
 *   const form = useForm(projectInput, { ...item, translations: withAllFields(item.translations, TR) });
 *   <TranslatableForm fields={TR} original={form.values} value={form.values.translations}
 *     onChange={t => form.set('translations', t)} errors={form.errors}>
 *     …русские поля как раньше…
 *   </TranslatableForm>
 *
 * В списках: <TranslationBadges status={translationStatus(row.translations, TR, row)} />.
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Copy } from 'lucide-react';
import { LANG_LABELS } from '@shared/i18n';
import { Field, Input, Textarea } from './Form';
import { Badge } from './misc';
import { useTabs } from './Tabs';
import './translations.css';

export type TrLang = 'kk' | 'en';
export type EditLang = 'ru' | TrLang;
export const TR_LANGS: readonly TrLang[] = ['kk', 'en'];

/** Описание переводимого поля. */
export interface TrFieldDef {
  key: string;
  /** Подпись (как у русского поля). */
  label: string;
  /** Лимит символов (maxLength и счётчик). */
  max?: number;
  /** Показывать счётчик «12 / 200» (по умолчанию — если задан max). */
  count?: boolean;
  /** Многострочное поле: число строк. */
  rows?: number;
  /** Подсказка под полем. */
  hint?: ReactNode;
  /** Убирать переводы строк (однострочный текст в textarea). */
  singleLine?: boolean;
  /** Доп. блок под полем (например, предпросмотр абзацев). */
  extra?: (value: string, original: string) => ReactNode;
}

type LangValues = Record<string, string | undefined>;
/** Значение `translations` формы. */
export type TrValue = Partial<Record<TrLang, LangValues | undefined>> | undefined | null;
type Originals = object;
const get = (o: Originals, k: string): unknown => (o as Record<string, unknown>)[k];

const str = (v: unknown) => (typeof v === 'string' ? v : '');
const filled = (v: unknown) => str(v).trim().length > 0;

/**
 * Переводы со всеми полями обоих языков (пустая строка — нет перевода).
 * PATCH заменяет язык целиком, поэтому отправляем полный объект; заодно форма не «грязная» при открытии.
 */
export function withAllFields<T extends TrValue>(value: T, fields: readonly TrFieldDef[]): { kk: Record<string, string>; en: Record<string, string> } {
  const out = { kk: {} as Record<string, string>, en: {} as Record<string, string> };
  for (const l of TR_LANGS) for (const f of fields) out[l][f.key] = str(value?.[l]?.[f.key]);
  return out;
}

export type TrState = 'full' | 'partial' | 'none';
export interface TrProgress { done: number; total: number; state: TrState }

/** Сколько полей языка переведено (считаются только поля с непустым русским текстом). */
export function translationProgress(lang: LangValues | undefined | null, fields: readonly TrFieldDef[], original: Originals): TrProgress {
  const need = fields.filter(f => filled(get(original, f.key)));
  const done = need.filter(f => filled(lang?.[f.key])).length;
  const total = need.length;
  return { done, total, state: done === total ? 'full' : done === 0 ? 'none' : 'partial' };
}

export type TrStatus = Record<TrLang, TrProgress>;

/** Состояние переводов строки списка по обоим языкам. */
export function translationStatus(value: TrValue, fields: readonly TrFieldDef[], original: Originals): TrStatus {
  return { kk: translationProgress(value?.kk, fields, original), en: translationProgress(value?.en, fields, original) };
}

/** Не хватает хотя бы одного перевода (для фильтра «Без перевода»). */
export const isIncomplete = (s: TrStatus) => s.kk.state !== 'full' || s.en.state !== 'full';

// ---------- Вкладки языков ----------

export interface LangTabItem {
  lang: EditLang;
  /** Прогресс перевода (для kk/en). */
  progress?: { done: number; total: number };
  /** На вкладке есть ошибки. */
  error?: boolean;
}

/** Результат useTabs для вкладок языков (панель рендерит вызывающий: `<div {...tabs.panelProps}>`). */
export type LangTabsState = ReturnType<typeof useTabs<EditLang>>;
const LANG_KEYS: readonly EditLang[] = ['ru', 'kk', 'en'];

/** Состояние вкладок языков для LangTabs + панели. */
export const useLangTabs = (value: EditLang, onChange: (l: EditLang) => void, label = 'Язык') =>
  useTabs<EditLang>({ keys: LANG_KEYS, value, onChange, label });

/**
 * Вкладки «RU · KZ · ENG» с заполненностью переводов (WAI-ARIA tabs, стрелки/Home/End).
 * Передайте `tabs` из useLangTabs и оберните содержимое в `<div {...tabs.panelProps}>`.
 */
export function LangTabs({ value, onChange, items, label = 'Язык', tabs }: { value: EditLang; onChange: (l: EditLang) => void; items: readonly LangTabItem[]; label?: string; tabs?: LangTabsState }) {
  const own = useTabs<EditLang>({ keys: items.map(i => i.lang), value, onChange, label });
  const t = tabs ?? own;
  return (
    <div className="tr-tabs" {...t.listProps}>
      {items.map(it => {
        const p = it.progress;
        const state = it.error ? 'error' : p ? (p.done === p.total ? 'full' : p.done === 0 ? '' : 'partial') : '';
        const title = it.error ? 'Есть ошибки'
          : !p ? 'Основной язык'
            : p.total === 0 ? 'Нечего переводить' : p.done === p.total ? 'Переведено всё' : p.done === 0 ? 'Перевода нет — на сайте русский текст' : `Переведено ${p.done} из ${p.total}`;
        return (
          <button
            key={it.lang}
            {...t.tabProps(it.lang)}
            className="tr-tab"
            title={title}
            aria-label={`${LANG_LABELS[it.lang]}${p && p.total > 0 ? ` ${p.done}/${p.total}` : ''}: ${title}`}
          >
            {(p || it.error) && <span className={`tr-dot ${state}`} aria-hidden="true" />}
            {LANG_LABELS[it.lang]}
            {p && p.total > 0 && <span className="tr-tab-count">{p.done}/{p.total}</span>}
          </button>
        );
      })}
    </div>
  );
}

// ---------- Поля перевода одного языка ----------

/** Русский оригинал серым над полем перевода. */
export function OriginalHint({ text }: { text: string }) {
  return (
    <span className="tr-orig">
      <span className="tr-orig-tag">RU</span>
      {text.trim() ? text : <span className="tr-orig-empty">пусто</span>}
    </span>
  );
}

function Count({ value, max }: { value: string; max: number }) {
  const n = value.length;
  const s = n > max ? ' over' : n > max * 0.9 ? ' near' : '';
  return <span className={`tr-count${s}`}>{n.toLocaleString('ru-RU')} / {max.toLocaleString('ru-RU')}</span>;
}

export interface TranslationInputProps {
  /** Подпись поля (язык добавится сам). */
  label: string;
  lang: TrLang;
  value: string;
  original: string;
  onChange: (v: string) => void;
  error?: string;
  max?: number;
  count?: boolean;
  rows?: number;
  hint?: ReactNode;
  singleLine?: boolean;
  wide?: boolean;
  children?: ReactNode;
}

/** Одно поле перевода: оригинал, ввод, «Скопировать из RU», счётчик. */
export function TranslationInput({ label, lang, value, original, onChange, error, max, count, rows, hint, singleLine, wide, children }: TranslationInputProps) {
  const showCount = max !== undefined && count !== false;
  const set = (v: string) => onChange(singleLine ? v.replace(/\n/g, ' ') : v);
  return (
    <Field label={`${label} · ${LANG_LABELS[lang]}`} error={error} wide={wide} hint={hint}>
      <OriginalHint text={original} />
      {rows
        ? <Textarea rows={rows} value={value} maxLength={max ? max + 500 : undefined} onChange={e => set(e.target.value)} />
        : <Input value={value} maxLength={max} onChange={e => set(e.target.value)} />}
      <span className="tr-tools">
        <button
          type="button"
          className="tr-copy"
          disabled={!original.trim() || value === original}
          onClick={() => set(original)}
          title="Вставить русский текст, чтобы перевести его по месту"
        >
          <Copy size={13} aria-hidden="true" />Скопировать из RU
        </button>
        {showCount && <Count value={value} max={max!} />}
      </span>
      {children}
    </Field>
  );
}

export interface TranslationFieldsProps {
  lang: TrLang;
  fields: readonly TrFieldDef[];
  /** Русские значения (текущие значения формы). */
  original: Originals;
  value: TrValue;
  onChange: (next: { kk?: LangValues; en?: LangValues }) => void;
  errors?: Record<string, string>;
  /** Префикс путей ошибок: 'translations' → 'translations.kk.name'. */
  errorPrefix?: string;
}

/** Все переводимые поля одного языка. */
export function TranslationFields({ lang, fields, original, value, onChange, errors = {}, errorPrefix = 'translations' }: TranslationFieldsProps) {
  const cur = value?.[lang] ?? {};
  const setField = (key: string, v: string) => {
    const full = withAllFields(value, fields);
    onChange({ ...full, [lang]: { ...full[lang], [key]: v } });
  };
  return (
    <>
      <p className="notice notice-info">
        Перевод на {lang === 'kk' ? 'казахский' : 'английский'}. Пустое поле — на сайте покажется русский текст.
      </p>
      {fields.map(f => {
        const val = str(cur[f.key]);
        const orig = str(get(original, f.key));
        return (
          <TranslationInput
            key={f.key}
            label={f.label}
            lang={lang}
            value={val}
            original={orig}
            onChange={v => setField(f.key, v)}
            error={errors[`${errorPrefix}.${lang}.${f.key}`]}
            max={f.max}
            count={f.count}
            rows={f.rows}
            hint={f.hint}
            singleLine={f.singleLine}
          >
            {f.extra?.(val, orig)}
          </TranslationInput>
        );
      })}
    </>
  );
}

/** Языки, на вкладках которых есть ошибки (по путям ошибок формы). */
export function errorLangs(errors: Record<string, string>, prefix = 'translations'): Set<EditLang> {
  const out = new Set<EditLang>();
  for (const k of Object.keys(errors)) {
    if (k === '_') continue;
    const m = !prefix ? k.split(".")[0] : k.startsWith(`${prefix}.`) ? k.slice(prefix.length + 1).split(".")[0] : null;
    if (m === 'kk' || m === 'en') out.add(m);
    else if (prefix && k === prefix) out.add('kk');
    else out.add('ru');
  }
  return out;
}

/**
 * Переключает вкладку на ту, где появились ошибки (если на текущей их нет), и ставит фокус на первое ошибочное поле.
 */
export function useErrorTab(errors: Record<string, string>, tab: EditLang, setTab: (l: EditLang) => void, prefix = 'translations') {
  const errLangs = useMemo(() => errorLangs(errors, prefix), [errors, prefix]);
  const prev = useRef(errors);
  useEffect(() => {
    if (prev.current === errors) return;
    prev.current = errors;
    if (errLangs.size === 0 || errLangs.has(tab)) return;
    const next = (['ru', 'kk', 'en'] as const).find(l => errLangs.has(l));
    if (!next) return;
    setTab(next);
    requestAnimationFrame(() => requestAnimationFrame(() => document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()));
  }, [errors, errLangs, tab, setTab]);
  return errLangs;
}

export interface TranslatableFormProps extends Omit<TranslationFieldsProps, 'lang'> {
  /** Русские поля (вкладка RU) — как были. */
  children: ReactNode;
}

/**
 * Вкладки «RU · KZ · ENG» внутри формы. RU — переданные поля без изменений,
 * KZ/ENG — переводимые поля с русским оригиналом. Ошибки 422 (`translations.kk.name`)
 * показываются на своей вкладке, и она открывается сама.
 */
export function TranslatableForm({ children, fields, original, value, onChange, errors = {}, errorPrefix = 'translations' }: TranslatableFormProps) {
  const [tab, setTab] = useState<EditLang>('ru');
  const errLangs = useErrorTab(errors, tab, setTab, errorPrefix);
  const items: LangTabItem[] = [
    { lang: 'ru', error: errLangs.has('ru') },
    ...TR_LANGS.map(l => {
      const p = translationProgress(value?.[l], fields, original);
      return { lang: l, error: errLangs.has(l), progress: { done: p.done, total: p.total } };
    }),
  ];
  const tabs = useLangTabs(tab, setTab, 'Язык текста');
  return (
    <>
      <LangTabs value={tab} onChange={setTab} items={items} label="Язык текста" tabs={tabs} />
      <div {...tabs.panelProps} className="tr-panel">
        {tab === 'ru'
          ? children
          : <TranslationFields lang={tab} fields={fields} original={original} value={value} onChange={onChange} errors={errors} errorPrefix={errorPrefix} />}
      </div>
    </>
  );
}

// ---------- Индикатор в списках ----------

/** «KZ ✓ ENG 1/2» или «нет перевода». */
export function TranslationBadges({ status }: { status: TrStatus }) {
  if (status.kk.state === 'none' && status.en.state === 'none' && status.kk.total > 0) {
    return <span className="tr-badges"><Badge tone="warning" title="Нет перевода на казахский и английский — на сайте русский текст">нет перевода</Badge></span>;
  }
  return (
    <span className="tr-badges">
      {TR_LANGS.map(l => {
        const p = status[l];
        const tone = p.state === 'full' ? 'success' : p.state === 'partial' ? 'warning' : 'neutral';
        const text = p.state === 'full' ? '✓' : p.state === 'partial' ? `${p.done}/${p.total}` : '—';
        const title = p.state === 'full' ? `${LANG_LABELS[l]}: переведено` : p.state === 'partial' ? `${LANG_LABELS[l]}: переведено ${p.done} из ${p.total}` : `${LANG_LABELS[l]}: нет перевода`;
        return <Badge key={l} tone={tone} title={title}>{LANG_LABELS[l]} {text}</Badge>;
      })}
    </span>
  );
}
