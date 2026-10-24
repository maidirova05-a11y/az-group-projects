/**
 * Откуда пришёл посетитель: UTM-метки адреса и document.referrer первого визита за время вкладки.
 * Запоминаются в sessionStorage при загрузке (main.tsx) и уходят вместе с заявкой (POST /api/leads),
 * чтобы в админке было видно, какие запросы, кампании и сайты приводят заявки. Персональных данных здесь нет.
 */
import type { LeadUtm } from '@shared/schemas';
import { currentLang } from '../router';

const KEY = 'az-visit';
const UTM_KEYS: (keyof LeadUtm)[] = ['source', 'medium', 'campaign', 'term', 'content'];

interface Visit { utm?: LeadUtm; referrer?: string }

function read(): Visit {
  try {
    const raw = sessionStorage.getItem(KEY);
    const v: unknown = raw ? JSON.parse(raw) : null;
    return v && typeof v === 'object' ? (v as Visit) : {};
  } catch { return {}; }
}

/** Один раз при загрузке: первые UTM-метки и внешний referrer за время вкладки (повторные переходы их не затирают). */
export function rememberVisitSource() {
  const have = read();
  const params = new URLSearchParams(window.location.search);
  const utm: LeadUtm = {};
  for (const k of UTM_KEYS) {
    const v = params.get(`utm_${k}`)?.trim();
    if (v) utm[k] = v.slice(0, 200);
  }
  const ref = document.referrer;
  const external = ref && !ref.startsWith(window.location.origin) ? ref.slice(0, 2000) : undefined;
  const next: Visit = { utm: have.utm ?? (Object.keys(utm).length ? utm : undefined), referrer: have.referrer ?? external };
  if (!next.utm && !next.referrer) return;
  try { sessionStorage.setItem(KEY, JSON.stringify(next)); } catch { /* приватный режим */ }
}

/** Поля для заявки: язык страницы, источник перехода и UTM-метки (только те, что есть). */
export function visitSource(): { lang: string; referrer?: string; utm?: LeadUtm } {
  const v = read();
  return { lang: currentLang(), ...(v.referrer && { referrer: v.referrer }), ...(v.utm && { utm: v.utm }) };
}
