/** Помощники страниц «Заявки», «Настройки», «Администраторы». */

import { safeHref } from '../../../content/safe-url';

const TZ = 'Asia/Almaty';

const exactFmt = new Intl.DateTimeFormat('ru-RU', {
  timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
});
const timeFmt = new Intl.DateTimeFormat('ru-RU', { timeZone: TZ, hour: '2-digit', minute: '2-digit' });
const dayKey = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });

/** «17.10.2026, 14:05» по времени Алматы. */
export function almatyExact(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : exactFmt.format(d);
}

/** «5 мин назад», «сегодня в 14:05», «вчера в 09:12», «3 дн назад» — по времени Алматы. */
export function almatyRelative(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const diff = (now - d.getTime()) / 1000;
  if (diff < 60) return 'только что';
  if (diff < 3600) return `${Math.floor(diff / 60)} мин назад`;
  const today = dayKey.format(new Date(now));
  const yesterday = dayKey.format(new Date(now - 86_400_000));
  const k = dayKey.format(d);
  if (k === today) return `сегодня в ${timeFmt.format(d)}`;
  if (k === yesterday) return `вчера в ${timeFmt.format(d)}`;
  if (diff < 7 * 86400) return `${Math.max(2, Math.round(diff / 86400))} дн назад`;
  return almatyExact(iso).split(',')[0];
}

/** Цифры номера в международном виде (8 7xx… → 7 7xx…). */
export function phoneDigits(phone: string): string {
  let d = phone.replace(/\D/g, '');
  if (d.length === 11 && d.startsWith('8')) d = `7${d.slice(1)}`;
  if (d.length === 10) d = `7${d}`;
  return d;
}

export const telHref = (phone: string) => {
  const d = phoneDigits(phone);
  return d ? safeHref(`tel:+${d}`, '') : '';
};
export const whatsappHref = (phone: string) => safeHref(`https://wa.me/${phoneDigits(phone)}`);

/** Скопировать текст в буфер обмена (с запасным вариантом для старых браузеров). */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

/** Случайный пароль без похожих символов (0/O, 1/l/I). */
export function generatePassword(length = 14): string {
  const sets = ['ABCDEFGHJKLMNPQRSTUVWXYZ', 'abcdefghijkmnopqrstuvwxyz', '23456789', '!@#$%*-_+?'];
  const all = sets.join('');
  const rnd = (n: number) => {
    const a = new Uint32Array(1);
    crypto.getRandomValues(a);
    return a[0] % n;
  };
  const chars = sets.map(s => s[rnd(s.length)]);
  while (chars.length < length) chars.push(all[rnd(all.length)]);
  for (let i = chars.length - 1; i > 0; i--) {
    const j = rnd(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

export interface Strength { level: 0 | 1 | 2 | 3; label: string }

/** Грубая оценка надёжности пароля для подсказки. */
export function passwordStrength(p: string): Strength {
  if (!p) return { level: 0, label: '' };
  if (p.length < 10) return { level: 0, label: `Слишком короткий: ${p.length} из 10 символов` };
  const classes = [/[a-zа-я]/, /[A-ZА-Я]/, /\d/, /[^\da-zA-Zа-яА-Я]/].filter(r => r.test(p)).length;
  const score = classes + (p.length >= 14 ? 1 : 0) + (p.length >= 18 ? 1 : 0);
  if (score <= 2) return { level: 1, label: 'Слабый: добавьте цифры, заглавные буквы или символы' };
  if (score <= 3) return { level: 2, label: 'Нормальный' };
  return { level: 3, label: 'Надёжный' };
}
