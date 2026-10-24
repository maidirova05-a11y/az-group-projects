/** Юнит-тесты помощников мультиязычности (server/lib/i18n.ts) — без БД. */
import { describe, expect, it } from 'vitest';
import { localize, localizeSetting, mergeTranslated, mergeTranslationPatch, parseLang } from '../server/lib/i18n';

describe('parseLang', () => {
  it('accepts ru/kk/en (case-insensitive), everything else → ru', () => {
    expect(parseLang('kk')).toBe('kk');
    expect(parseLang('EN')).toBe('en');
    expect(parseLang('ru')).toBe('ru');
    expect(parseLang(undefined)).toBe('ru');
    expect(parseLang('')).toBe('ru');
    expect(parseLang('de')).toBe('ru');
    expect(parseLang('kz')).toBe('ru');
  });
});

describe('localize', () => {
  const row = { id: 1, name: 'Название', subtitle: 'Подзаголовок', sort: 3, translations: { kk: { name: 'Атауы', subtitle: '  ' }, en: { name: 'Name' } } };

  it('ru returns Russian and strips translations', () => {
    expect(localize(row, 'ru')).toEqual({ id: 1, name: 'Название', subtitle: 'Подзаголовок', sort: 3 });
  });
  it('non-empty translation wins, empty/blank falls back to Russian', () => {
    expect(localize(row, 'kk')).toEqual({ id: 1, name: 'Атауы', subtitle: 'Подзаголовок', sort: 3 });
    expect(localize(row, 'en')).toEqual({ id: 1, name: 'Name', subtitle: 'Подзаголовок', sort: 3 });
  });
  it('ignores unknown keys, non-string values and missing translations', () => {
    const r2 = { id: 2, name: 'А', sort: 1, translations: { en: { name: 5, sort: 'x', extra: 'y' } } } as never;
    expect(localize(r2, 'en')).toEqual({ id: 2, name: 'А', sort: 1 });
    expect(localize({ id: 3, name: 'Б', translations: {} }, 'kk')).toEqual({ id: 3, name: 'Б' });
    expect(localize({ id: 4, name: 'В', translations: null }, 'kk')).toEqual({ id: 4, name: 'В' });
  });
});

describe('mergeTranslated / localizeSetting', () => {
  const about = {
    title: 'О нас',
    pillars: [{ title: 'Один', text: 'Текст 1', image: '/a.png' }, { title: 'Два', text: 'Текст 2', image: null }],
    directions: ['Наука', 'Роботы'],
    achievements: [{ value: '10', label: 'лет' }],
  };

  it('deep merges objects; arrays only with equal length; keeps non-translatable fields', () => {
    const merged = mergeTranslated(about, {
      title: 'About',
      pillars: [{ title: 'One', text: '' }, { title: 'Two', text: 'Text 2' }],
      directions: ['Science'], // длина не совпадает → русский массив
      achievements: [{ value: '', label: 'years' }],
    });
    expect(merged).toEqual({
      title: 'About',
      pillars: [{ title: 'One', text: 'Текст 1', image: '/a.png' }, { title: 'Two', text: 'Text 2', image: null }],
      directions: ['Наука', 'Роботы'],
      achievements: [{ value: '10', label: 'years' }],
    });
    expect(about.title).toBe('О нас'); // оригинал не мутирован
  });

  it('top-level arrays (stats) and wrong types', () => {
    const stats = [{ value: '1', label: 'а' }, { value: '2', label: 'б' }];
    expect(mergeTranslated(stats, [{ value: '1', label: 'a' }, { value: '2', label: 'b' }])).toEqual([{ value: '1', label: 'a' }, { value: '2', label: 'b' }]);
    expect(mergeTranslated(stats, [{ value: '1', label: 'a' }])).toEqual(stats);
    expect(mergeTranslated(stats, { 0: 'x' })).toEqual(stats);
    expect(mergeTranslated('строка', 42)).toBe('строка');
    expect(mergeTranslated(5, 'x')).toBe(5);
  });

  it('localizeSetting picks the language and ignores ru', () => {
    const tr = { kk: { address: 'Мекенжай' }, en: { address: '' } };
    const contacts = { address: 'Адрес', phone: '+7' };
    expect(localizeSetting(contacts, tr, 'kk')).toEqual({ address: 'Мекенжай', phone: '+7' });
    expect(localizeSetting(contacts, tr, 'en')).toEqual(contacts);
    expect(localizeSetting(contacts, tr, 'ru')).toEqual(contacts);
    expect(localizeSetting(contacts, undefined, 'kk')).toEqual(contacts);
  });
});

describe('mergeTranslationPatch', () => {
  it('replaces provided languages, keeps the others', () => {
    const cur = { kk: { name: 'К' }, en: { name: 'E', subtitle: 'S' } };
    expect(mergeTranslationPatch(cur, { kk: { name: 'К2' } })).toEqual({ kk: { name: 'К2' }, en: { name: 'E', subtitle: 'S' } });
    expect(mergeTranslationPatch(cur, { en: { name: 'E2' } })).toEqual({ kk: { name: 'К' }, en: { name: 'E2' } });
    expect(mergeTranslationPatch(null, { en: { name: 'E' } })).toEqual({ en: { name: 'E' } });
    expect(mergeTranslationPatch(cur, undefined)).toEqual(cur);
  });
});
