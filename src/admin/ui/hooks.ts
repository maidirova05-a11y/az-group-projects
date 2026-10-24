/** Хуки данных и форм для страниц админки. */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { z } from 'zod';
import { api, ApiError, errorMessage } from '../api';

export interface Resource<T> {
  /** Данные (null, пока не загрузились или при ошибке первой загрузки). */
  data: T | null;
  /** Идёт загрузка (в том числе повторная). */
  loading: boolean;
  /** Текст ошибки последней загрузки. */
  error: string | null;
  /** Перезагрузить. Возвращает свежие данные (или null при ошибке). */
  reload: () => Promise<T | null>;
  /** Локально поменять данные (оптимистичное обновление). */
  setData: React.Dispatch<React.SetStateAction<T | null>>;
}

/**
 * Загрузка данных по GET. При смене `url` загружает заново; `null` — не загружать.
 *
 *   const news = useResource<NewsDTO[]>('/admin/news');
 *   const leads = useResource<{ items: LeadDTO[]; total: number }>(`/admin/leads?page=${page}&q=${encodeURIComponent(q)}`);
 */
export function useResource<T>(url: string | null): Resource<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(url !== null);
  const [error, setError] = useState<string | null>(null);
  const ctrl = useRef<AbortController | null>(null);
  const urlRef = useRef(url);
  urlRef.current = url;

  const load = useCallback(async (): Promise<T | null> => {
    const u = urlRef.current;
    if (u === null) return null;
    ctrl.current?.abort();
    const c = new AbortController();
    ctrl.current = c;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<T>(u, { signal: c.signal });
      if (c.signal.aborted) return null;
      setData(res);
      return res;
    } catch (e) {
      if (c.signal.aborted || (e instanceof DOMException && e.name === 'AbortError')) return null;
      setError(errorMessage(e));
      return null;
    } finally {
      if (ctrl.current === c) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (url === null) { setLoading(false); return; }
    void load();
    return () => ctrl.current?.abort();
  }, [url, load]);

  return { data, loading, error, reload: load, setData };
}

export type FormErrors = Record<string, string>;

export interface UseForm<S extends z.ZodType> {
  /** Текущие значения формы. */
  values: z.input<S>;
  /** Изменить одно поле (ошибка этого поля стирается). */
  set: <K extends keyof z.input<S>>(key: K, value: z.input<S>[K]) => void;
  /** Изменить несколько полей / заменить значения. */
  setValues: (patch: Partial<z.input<S>> | ((v: z.input<S>) => z.input<S>)) => void;
  /** Ошибки по путям полей ('title', 'events.0.place', '_' — общая). */
  errors: FormErrors;
  setErrors: (e: FormErrors) => void;
  /** Ошибка поля по имени — удобно для <Field error={form.error('title')}>. */
  error: (key: string) => string | undefined;
  /** Проверить схемой: вернёт данные или null (и заполнит errors). */
  validate: () => z.output<S> | null;
  /**
   * Обработчик onSubmit: проверяет, вызывает `fn(data)`, ловит ApiError 422
   * и раскладывает `fields` по полям. Другие ошибки попадают в `errors._`
   * и пробрасываются в onError (например, toast.error).
   */
  handleSubmit: (fn: (data: z.output<S>) => Promise<unknown> | unknown, onError?: (e: unknown) => void) => (e?: { preventDefault?: () => void }) => Promise<void>;
  /** Идёт отправка. */
  submitting: boolean;
  /** Значения отличаются от начальных. */
  dirty: boolean;
  /** Сбросить к новым (или исходным) значениям и очистить ошибки. */
  reset: (values?: z.input<S>) => void;
}

function issuesToErrors(issues: readonly { path: readonly PropertyKey[]; message: string }[]): FormErrors {
  const out: FormErrors = {};
  for (const i of issues) {
    const k = i.path.map(String).join('.') || '_';
    out[k] ??= i.message;
  }
  return out;
}

/**
 * Состояние формы с проверкой zod-схемой (из '@shared/schemas').
 *
 *   const form = useForm(newsInput, { title: '', date: today, body: '', published: true });
 *   <form onSubmit={form.handleSubmit(data => api.post('/admin/news', data), toast.error)}>
 */
export function useForm<S extends z.ZodType>(schema: S, initial: z.input<S>): UseForm<S> {
  const [values, setVals] = useState<z.input<S>>(initial);
  const [base, setBase] = useState<z.input<S>>(initial);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const valuesRef = useRef(values);
  valuesRef.current = values;

  const set = useCallback(<K extends keyof z.input<S>>(key: K, value: z.input<S>[K]) => {
    setVals(v => ({ ...(v as object), [key]: value }) as z.input<S>);
    setErrors(e => {
      if (!(key as string in e) && !e._) return e;
      const { [key as string]: _drop, _: _general, ...rest } = e;
      return rest;
    });
  }, []);

  const setValues = useCallback((patch: Partial<z.input<S>> | ((v: z.input<S>) => z.input<S>)) => {
    setVals(v => (typeof patch === 'function' ? patch(v) : ({ ...(v as object), ...(patch as object) }) as z.input<S>));
  }, []);

  const validate = useCallback((): z.output<S> | null => {
    const r = schema.safeParse(valuesRef.current);
    if (r.success) { setErrors({}); return r.data; }
    setErrors(issuesToErrors(r.error.issues));
    return null;
  }, [schema]);

  const handleSubmit = useCallback<UseForm<S>['handleSubmit']>((fn, onError) => async e => {
    e?.preventDefault?.();
    const data = validate();
    if (!data) {
      requestAnimationFrame(() => document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      return;
    }
    setSubmitting(true);
    try {
      await fn(data);
      setBase(valuesRef.current);
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.fields).length > 0) {
        setErrors({ ...err.fields, ...(err.fields._ ? {} : { _: err.message }) });
        requestAnimationFrame(() => document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      } else {
        setErrors({ _: errorMessage(err) });
      }
      onError?.(err);
    } finally {
      setSubmitting(false);
    }
  }, [validate]);

  const reset = useCallback((next?: z.input<S>) => {
    const v = next ?? base;
    setVals(v);
    setBase(v);
    setErrors({});
  }, [base]);

  const dirty = JSON.stringify(values) !== JSON.stringify(base);
  const error = useCallback((key: string) => errors[key], [errors]);

  return { values, set, setValues, errors, setErrors, error, validate, handleSubmit, submitting, dirty, reset };
}
