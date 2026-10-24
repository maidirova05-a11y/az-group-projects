/** Переводы (KZ / ENG) разделов настроек: вкладки «RU · KZ · ENG» поверх русской формы. */
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { RotateCcw, Save } from 'lucide-react';
import { LANG_LABELS } from '@shared/i18n';
import { SETTING_TRANSLATIONS } from '@shared/schemas';
import { api, ApiError, errorMessage } from '../../../api';
import {
  Button, FormGrid, LangTabs, Panel, TR_LANGS, TranslationInput, useErrorTab, useLangTabs, useToast,
  type EditLang, type LangTabItem, type TrLang,
} from '../../../ui';
import type { About, Contacts, Stats } from './shared';

// ---------- Переводы (KZ / ENG) ----------

export type TranslatedKey = 'contacts' | 'stats' | 'about';
type Pair = { value: string; label: string };
type LangContacts = { address: string };
type LangStats = Pair[];
type LangAbout = { title: string; pillars: { title: string; text: string }[]; directions: string[]; achievements: Pair[] };
type LangValue = LangContacts | LangStats | LangAbout;
type TrState = Record<TrLang, LangValue>;
type RuValue = Contacts | Stats | About;
/** Сырые переводы ключа из GET /admin/settings/translations. */
export type RawTr = { kk?: unknown; en?: unknown };

const str = (v: unknown) => (typeof v === 'string' ? v : '');
const obj = (v: unknown) => (v && typeof v === 'object' ? v as Record<string, unknown> : {});
const align = <T,>(raw: unknown, n: number, make: (src: unknown) => T): T[] =>
  Array.from({ length: n }, (_, i) => make(Array.isArray(raw) ? raw[i] : undefined));
const pair = (src: unknown): Pair => ({ value: str(obj(src).value), label: str(obj(src).label) });

/** Перевод одного языка, выровненный по русскому списку (элемент i ↔ русский элемент i). */
function normalizeLang(key: TranslatedKey, ru: RuValue, raw: unknown): LangValue {
  const o = obj(raw);
  if (key === 'contacts') return { address: str(o.address) };
  if (key === 'stats') return align(raw, (ru as Stats).length, pair);
  const a = ru as About;
  return {
    title: str(o.title),
    pillars: align(o.pillars, a.pillars.length, src => ({ title: str(obj(src).title), text: str(obj(src).text) })),
    directions: align(o.directions, a.directions.length, str),
    achievements: align(o.achievements, a.achievements.length, pair),
  };
}
const normalizeTr = (key: TranslatedKey, ru: RuValue, raw: RawTr | undefined): TrState =>
  ({ kk: normalizeLang(key, ru, raw?.kk), en: normalizeLang(key, ru, raw?.en) });

/** Пары [русский текст, перевод] — для подсчёта заполненности. */
function leaves(key: TranslatedKey, ru: RuValue, tr: LangValue): [string, string][] {
  if (key === 'contacts') return [[(ru as Contacts).address, (tr as LangContacts).address]];
  if (key === 'stats') {
    const t = tr as LangStats;
    return (ru as Stats).flatMap((r, i): [string, string][] => [[r.value, t[i]?.value ?? ''], [r.label, t[i]?.label ?? '']]);
  }
  const r = ru as About; const t = tr as LangAbout;
  return [
    [r.title, t.title],
    ...r.pillars.flatMap((p, i): [string, string][] => [[p.title, t.pillars[i]?.title ?? ''], [p.text, t.pillars[i]?.text ?? '']]),
    ...r.directions.map((d, i): [string, string] => [d, t.directions[i] ?? '']),
    ...r.achievements.flatMap((x, i): [string, string][] => [[x.value, t.achievements[i]?.value ?? ''], [x.label, t.achievements[i]?.label ?? '']]),
  ];
}
function progress(key: TranslatedKey, ru: RuValue, tr: LangValue) {
  const need = leaves(key, ru, tr).filter(([r]) => r.trim());
  return { done: need.filter(([, t]) => t.trim()).length, total: need.length };
}

/** Списки, у которых сохранённый перевод не совпадает по длине с русским (сайт тогда показывает русский список). */
function mismatches(key: TranslatedKey, ru: RuValue, raw: unknown): string[] {
  const len = (v: unknown) => (Array.isArray(v) ? v.length : 0);
  const out: string[] = [];
  const check = (name: string, rawArr: unknown, n: number) => {
    if (len(rawArr) > 0 && len(rawArr) !== n) out.push(`${name}: в переводе ${len(rawArr)}, в русском ${n}`);
  };
  if (key === 'stats') check('Цифры', raw, (ru as Stats).length);
  if (key === 'about') {
    const o = obj(raw); const a = ru as About;
    check('Карточки', o.pillars, a.pillars.length);
    check('Направления', o.directions, a.directions.length);
    check('Достижения', o.achievements, a.achievements.length);
  }
  return out;
}

export interface TranslatedSectionProps {
  settingKey: TranslatedKey;
  /** Сохранённое русское значение (оригинал для подсказок). */
  ru: RuValue;
  /** Сохранённые переводы ключа. */
  translations: RawTr | undefined;
  onTranslationsSaved: (tr: RawTr) => void;
  onDirty: (dirty: boolean) => void;
  /** Русская форма раздела (как раньше); получает свой onDirty. */
  renderRu: (onDirty: (d: boolean) => void) => ReactNode;
}

const SECTION_TITLES: Record<TranslatedKey, string> = { contacts: 'Контакты', stats: 'Цифры', about: 'О компании' };

/** Раздел настроек с вкладками «RU · KZ · ENG»: RU — прежняя форма, KZ/ENG — переводы с оригиналом. */
export function TranslatedSection({ settingKey: key, ru, translations, onTranslationsSaved, onDirty, renderRu }: TranslatedSectionProps) {
  const toast = useToast();
  const [lang, setLang] = useState<EditLang>('ru');
  const [ruDirty, setRuDirty] = useState(false);
  const [vals, setVals] = useState<TrState>(() => normalizeTr(key, ru, translations));
  const [base, setBase] = useState<TrState>(vals);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const trDirty = JSON.stringify(vals) !== JSON.stringify(base);

  // Русский список поменялся (сохранили RU) — выравниваем переводы по новой длине.
  const ruJson = JSON.stringify(ru);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    setVals(v => ({ kk: normalizeLang(key, ru, v.kk), en: normalizeLang(key, ru, v.en) }));
    setBase(normalizeTr(key, ru, translations));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ruJson]);

  useEffect(() => { onDirty(ruDirty || trDirty); }, [ruDirty, trDirty, onDirty]);
  const onRuDirty = useCallback((d: boolean) => setRuDirty(d), []);

  // Пути ошибок: 'kk.0.label', 'en.pillars.1.title' (префикса нет).
  const errLangs = useErrorTab(errors, lang, setLang, '');
  const setLangValue = (l: TrLang, next: LangValue) => {
    setVals(v => ({ ...v, [l]: next }));
    if (Object.keys(errors).length) setErrors({});
  };

  const save = async (e?: { preventDefault?: () => void }) => {
    e?.preventDefault?.();
    const body = { kk: vals.kk, en: vals.en };
    const parsed = SETTING_TRANSLATIONS[key].safeParse(body);
    if (!parsed.success) {
      const out: Record<string, string> = {};
      for (const i of parsed.error.issues) out[i.path.map(String).join('.') || '_'] ??= i.message;
      setErrors(out);
      return;
    }
    setSaving(true);
    try {
      const saved = await api.put<RawTr>(`/admin/settings/${key}/translations`, body);
      const norm = normalizeTr(key, ru, saved);
      setVals(norm); setBase(norm); setErrors({});
      onTranslationsSaved(saved);
      toast.success('Переводы сохранены. Изменения уже на сайте');
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.fields).length) setErrors({ ...err.fields, ...(err.fields._ ? {} : { _: err.message }) });
      else { setErrors({ _: errorMessage(err) }); toast.error(err); }
    } finally { setSaving(false); }
  };

  const items: LangTabItem[] = [
    { lang: 'ru', error: false },
    ...TR_LANGS.map(l => ({ lang: l, error: errLangs.has(l), progress: progress(key, ru, vals[l]) })),
  ];
  const errorCount = Object.keys(errors).filter(k => k !== '_').length;
  const langTabs = useLangTabs(lang, setLang, 'Язык текстов раздела');

  return (
    <>
      <div className="ops-tabs"><LangTabs value={lang} onChange={setLang} items={items} label="Язык текстов раздела" tabs={langTabs} /></div>
      <div {...langTabs.panelProps}>
      <div hidden={lang !== 'ru'}>{renderRu(onRuDirty)}</div>
      {lang !== 'ru' && (
        <Panel title={`${SECTION_TITLES[key]} · перевод ${LANG_LABELS[lang]}`} description="Серым — русский оригинал. Пустое поле — на сайте покажется русский текст.">
          <form onSubmit={save} noValidate>
            {errors._ && <p className="notice notice-error" role="alert" style={{ marginBottom: 16 }}>{errors._}</p>}
            <TrLangEditor settingKey={key} lang={lang} ru={ru} value={vals[lang]} onChange={next => setLangValue(lang, next)} errors={errors} mismatch={mismatches(key, ru, translations?.[lang])} />
            <div className="ops-form-foot">
              <span className={`ops-foot-note${trDirty ? ' warn' : ''}`} aria-live="polite">
                {errorCount > 0 ? `Исправьте ошибки: ${errorCount}` : trDirty ? 'Есть несохранённые изменения (KZ и ENG сохраняются вместе)' : 'Изменений нет'}
              </span>
              <Button variant="ghost" icon={RotateCcw} onClick={() => { setVals(base); setErrors({}); }} disabled={!trDirty || saving}>Отменить</Button>
              <Button type="submit" icon={Save} loading={saving} disabled={!trDirty}>Сохранить переводы</Button>
            </div>
          </form>
        </Panel>
      )}
      </div>
    </>
  );
}

function TrLangEditor({ settingKey: key, lang, ru, value, onChange, errors, mismatch }: {
  settingKey: TranslatedKey; lang: TrLang; ru: RuValue; value: LangValue; onChange: (v: LangValue) => void; errors: Record<string, string>; mismatch: string[];
}) {
  const err = (path: string) => errors[`${lang}.${path}`];
  const listNote = (
    <p className="notice notice-info" style={{ marginBottom: 12 }}>
      Списки переводятся построчно, по порядку русского списка. Перевод списка показывается на сайте, только если в нём столько же элементов, сколько в русском.
    </p>
  );
  const warn = mismatch.length > 0 && (
    <p className="notice notice-warn" role="status" style={{ marginBottom: 12 }}>
      Русский список изменился, и сохранённый перевод ему не соответствует ({mismatch.join('; ')}) — сейчас на сайте показывается русский список.
      Проверьте строки ниже (они выровнены по русскому списку по порядку) и сохраните переводы.
    </p>
  );

  if (key === 'contacts') {
    const v = value as LangContacts;
    return (
      <TranslationInput label="Адрес" lang={lang} value={v.address} original={(ru as Contacts).address} max={200} count={false} error={err('address')} onChange={address => onChange({ address })} />
    );
  }

  if (key === 'stats') {
    const v = value as LangStats; const r = ru as Stats;
    const upd = (i: number, patch: Partial<Pair>) => onChange(v.map((p, k) => (k === i ? { ...p, ...patch } : p)));
    return (
      <>
        {listNote}{warn}
        {r.length === 0 ? <p className="muted">В русском разделе нет цифр — переводить нечего.</p> : (
          <div className="tr-list">
            {r.map((it, i) => (
              <div key={i} className="tr-item">
                <span className="tr-item-num">Цифра {i + 1}</span>
                <FormGrid>
                  <TranslationInput label="Значение" lang={lang} value={v[i]?.value ?? ''} original={it.value} max={40} count={false} error={err(`${i}.value`)} onChange={x => upd(i, { value: x })} />
                  <TranslationInput label="Подпись" lang={lang} value={v[i]?.label ?? ''} original={it.label} max={160} count={false} error={err(`${i}.label`)} onChange={x => upd(i, { label: x })} />
                </FormGrid>
              </div>
            ))}
          </div>
        )}
      </>
    );
  }

  const v = value as LangAbout; const r = ru as About;
  const set = (patch: Partial<LangAbout>) => onChange({ ...v, ...patch });
  const sub = (t: string, n: number) => <div className="ops-subhead"><h3>{t}</h3><span>{n} в русском списке</span></div>;
  return (
    <>
      <TranslationInput label="Заголовок" lang={lang} value={v.title} original={r.title} rows={2} max={300} error={err('title')} onChange={title => set({ title })} />
      <div style={{ marginTop: 16 }}>{listNote}{warn}</div>

      {sub('Карточки', r.pillars.length)}
      <div className="tr-list">
        {r.pillars.map((p, i) => (
          <div key={i} className="tr-item">
            <span className="tr-item-num">Карточка {i + 1}</span>
            <TranslationInput label="Заголовок" lang={lang} value={v.pillars[i]?.title ?? ''} original={p.title} max={80} error={err(`pillars.${i}.title`)}
              onChange={x => set({ pillars: v.pillars.map((q, k) => (k === i ? { ...q, title: x } : q)) })} />
            <TranslationInput label="Текст" lang={lang} value={v.pillars[i]?.text ?? ''} original={p.text} rows={3} max={1000} error={err(`pillars.${i}.text`)}
              onChange={x => set({ pillars: v.pillars.map((q, k) => (k === i ? { ...q, text: x } : q)) })} />
          </div>
        ))}
      </div>

      {sub('Направления', r.directions.length)}
      <div className="tr-list">
        {r.directions.map((d, i) => (
          <TranslationInput key={i} label={`Направление ${i + 1}`} lang={lang} value={v.directions[i] ?? ''} original={d} max={120} count={false} error={err(`directions.${i}`)}
            onChange={x => set({ directions: v.directions.map((q, k) => (k === i ? x : q)) })} />
        ))}
      </div>

      {sub('Достижения', r.achievements.length)}
      <div className="tr-list">
        {r.achievements.map((a, i) => (
          <div key={i} className="tr-item">
            <span className="tr-item-num">Достижение {i + 1}</span>
            <FormGrid>
              <TranslationInput label="Значение" lang={lang} value={v.achievements[i]?.value ?? ''} original={a.value} max={60} count={false} error={err(`achievements.${i}.value`)}
                onChange={x => set({ achievements: v.achievements.map((q, k) => (k === i ? { ...q, value: x } : q)) })} />
              <TranslationInput label="Подпись" lang={lang} value={v.achievements[i]?.label ?? ''} original={a.label} max={300} count={false} error={err(`achievements.${i}.label`)}
                onChange={x => set({ achievements: v.achievements.map((q, k) => (k === i ? { ...q, label: x } : q)) })} />
            </FormGrid>
          </div>
        ))}
      </div>
    </>
  );
}
