/**
 * Цвета программ. Менеджер может задать любой цвет в админке, поэтому цвет текста на заливке
 * и «чернильный» вариант для текста на карточке вычисляем, а не храним:
 *  --acc        заливка (полосы, точки, чипы)
 *  --on-acc     текст на заливке: белый или почти чёрный — что контрастнее (цель ≥ 4.5:1)
 *  --acc-ink-l  цвет-текст на светлой плитке (≥ 4.5:1 к #eceef2, светлая --tile-hover)
 *  --acc-ink-d  цвет-текст на тёмной плитке (≥ 4.5:1 к #2a2f36)
 * CSS (events.css, класс .acc) выбирает --acc-ink по теме.
 */
import type { CSSProperties } from 'react';

const FALLBACK = '#cd0929';
const DARK_TEXT = '#111317';

const valid = (hex: string) => (/^#[0-9a-f]{6}$/i.test(hex) ? hex : FALLBACK);
const rgb = (hex: string) => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
const toHex = (c: number[]) => `#${c.map(v => Math.round(v).toString(16).padStart(2, '0')).join('')}`;

function luminance(hex: string) {
  const [r, g, b] = rgb(hex).map(v => v / 255).map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string) {
  const [x, y] = [luminance(a), luminance(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

const mix = (a: string, b: string, t: number) => { const [x, y] = [rgb(a), rgb(b)]; return toHex(x.map((v, i) => v + (y[i] - v) * t)); };

/** Белый или тёмный текст на заливке цветом программы. */
export const onColor = (hex: string) => (contrast(hex, '#ffffff') >= contrast(hex, DARK_TEXT) ? '#ffffff' : DARK_TEXT);

/** Ближайший к цвету программы оттенок, читаемый как текст на заданной поверхности. */
function inkOn(hex: string, surface: string, toward: string) {
  for (let t = 0; t <= 1; t += 0.05) {
    const c = mix(hex, toward, t);
    if (contrast(c, surface) >= 4.6) return c;
  }
  return toward;
}

const cache = new Map<string, CSSProperties>();

/** CSS-переменные цвета программы для style={...}; используйте вместе с классом "acc". */
export function programVars(color: string): CSSProperties {
  const hex = valid(color).toLowerCase();
  let v = cache.get(hex);
  if (!v) {
    v = {
      '--acc': hex,
      '--accent': hex,
      '--on-acc': onColor(hex),
      '--acc-ink-l': inkOn(hex, '#eceef2', '#000000'),
      '--acc-ink-d': inkOn(hex, '#2a2f36', '#ffffff'),
    } as CSSProperties;
    cache.set(hex, v);
  }
  return v;
}
