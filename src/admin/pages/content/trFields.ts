/** Переводимые поля сущностей (как TranslatableFields в shared/i18n.ts, лимиты — как в shared/schemas.ts). */
import type { TrFieldDef } from '../../ui';

export const PROGRAM_TR: readonly TrFieldDef[] = [
  { key: 'name', label: 'Название', max: 120, count: false },
  { key: 'subtitle', label: 'Подзаголовок', max: 200, count: false },
];
export const EVENT_TR: readonly TrFieldDef[] = [
  { key: 'label', label: 'Подпись даты на сайте', max: 120, count: false },
  { key: 'place', label: 'Место', max: 160, count: false },
];
export const PROJECT_TR: readonly TrFieldDef[] = [
  { key: 'name', label: 'Название', max: 160 },
  { key: 'category', label: 'Категория', max: 60, count: false, hint: 'Одинаковые категории объединяются в фильтр на сайте — переводите одну категорию одинаково во всех проектах.' },
  { key: 'tagline', label: 'Подзаголовок', max: 200 },
  { key: 'description', label: 'Описание', max: 2000, rows: 5 },
];
export const NEWS_TR: readonly TrFieldDef[] = [
  { key: 'title', label: 'Заголовок', max: 300 },
  { key: 'body', label: 'Текст новости', max: 20000, rows: 10, hint: 'Абзацы разделяйте пустой строкой, как в русском тексте.' },
];
export const PARTNER_TR: readonly TrFieldDef[] = [
  { key: 'name', label: 'Название', max: 300, rows: 2, singleLine: true },
];
export const FAQ_TR: readonly TrFieldDef[] = [
  { key: 'question', label: 'Вопрос', max: 300, rows: 2 },
  { key: 'answer', label: 'Ответ', max: 3000, rows: 8 },
];
