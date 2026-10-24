# UI-кит админки

Всё импортируется из `../ui` (из файла в `src/admin/pages/`):

```tsx
import { PageHeader, Panel, Button, DataTable, Drawer, Field, Input, useForm, useResource, useToast, useConfirm } from '../ui';
import { api, ApiError } from '../api';
import { useAdminRoute, navigate, setQuery } from '../router';
import { useAuth } from '../auth';
```

Стили уже есть в `src/admin/admin.css` — собственный CSS страницам обычно не нужен. Для мелочей используйте `style={{…}}`.
Тексты интерфейса — по-русски. Каждая страница — `export default function XxxPage()`, начинается с `<PageHeader>`.

## Данные

| Что | Зачем |
|---|---|
| `api.get/post/patch/put/del(path, body?)` | fetch-обёртка: `/api` подставляется сама (`api.get('/admin/news')`), CSRF-заголовок, ошибки → `ApiError { status, code, message, fields }` |
| `useResource<T>(url \| null)` | `{ data, loading, error, reload, setData }`; перезагружает при смене url |
| `useForm(schema, initial)` | значения + проверка zod-схемой из `@shared/schemas`; ошибки 422 `fields` раскладываются по полям |
| `useAdminStats()` | сводка `/api/admin/stats`; после изменения заявок вызовите `reload()` — обновится счётчик в меню |
| `useAdminRoute()` | `{ section, path, query, params, setQuery, navigate }` — query-параметры вида `?edit=12`, `?new=1` |
| `useQueryParam('edit')` | `[value, setValue]` для одного параметра |
| `useAuth()` | `{ admin, isOwner, logout }` |
| `fmt.date / fmt.dateTime / fmt.relative` | форматирование дат по-русски |
| `useDebounced(value, ms)` | значение с задержкой |

## Компоненты

| Компонент | Кратко |
|---|---|
| `PageHeader` `title, description?, actions?, crumbs?` | крошки «Админка › …», h1, кнопки; ставит `document.title` |
| `Panel` `title?, description?, actions?, flush?` | белая карточка |
| `Button` `variant: primary\|ghost\|outline\|danger\|link, size?: sm, loading?, icon?, block?` | по умолчанию `type="button"` |
| `LinkButton` `to, variant?, icon?` | ссылка-кнопка (внутренние `/admin/...` без перезагрузки) |
| `IconButton` `icon, label, variant?: plain\|ghost\|danger, size?` | кнопка-значок, `label` обязателен (aria-label + подсказка) |
| `Field` `label, hint?, error?, required?, wide?` | обёртка поля; сама связывает id/aria с вложенным контролом |
| `FormGrid` `cols?: 1\|2\|3`, `FormActions` | сетка полей / ряд кнопок формы |
| `Input`, `Textarea`, `Select` `options?, placeholder?` | нативные контролы в стиле сайта |
| `Checkbox` `label, checked, onChange(bool)` / `Switch` `label, checked, onChange(bool)` | флажок / переключатель |
| `ColorInput` `value, onChange` | #RRGGBB + палитра + образцы |
| `DateInput` `value: 'YYYY-MM-DD'\|null, onChange, mode?: 'date'\|'month', clearable?` | пустое → `null` |
| `ImageUrlInput` `value, onChange, fit?: cover\|contain` | адрес картинки с превью |
| `DataTable` `columns, rows, rowKey, loading?, error?, onRetry?, actions?, onRowClick?, empty?` | таблица со скелетом/пустым состоянием; на телефоне — карточки |
| `Modal` / `Drawer` `open, onClose, title, footer?, onSubmit?, busy?, size?` | окно / панель справа; ловушка фокуса, Esc, `data-autofocus` |
| `useConfirm()` → `confirm({ title, message?, confirmLabel?, danger? })` | `Promise<boolean>` |
| `useToast()` → `toast.success(text)`, `toast.error(errOrText)`, `toast.info(text)` | уведомления |
| `Badge` `tone: neutral\|brand\|success\|warning\|danger\|info, dot?` | метка |
| `StatusPill` `status="new"` или `published={bool}` | статус заявки / публикации; `LEAD_STATUS_LABELS` |
| `SearchInput` `value, onChange, debounce?=300` | поиск с очисткой |
| `Segmented` `value, options, onChange, label` | переключатель-фильтр (статусы заявок) |
| `Toolbar` | ряд над таблицей (поиск + фильтры + кнопки) |
| `Pagination` `page, total, limit, onChange` | страницы |
| `EmptyState` `icon?, title, text?, action?, compact?` | пустой раздел |
| `ErrorState` `message, onRetry?`, `Skeleton`, `PageSkeleton`, `Spinner` | ошибки и загрузка |
| `SortableList` `items, getId, renderItem, onReorder(ids), itemLabel?, disabled?` | перетаскивание + кнопки ↑/↓ + стрелки клавиатуры |

## Пример: список + форма в Drawer

```tsx
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { newsInput, type NewsDTO, type NewsInput } from '@shared/schemas';
import { api } from '../api';
import { useAdminRoute } from '../router';
import {
  Button, DataTable, DateInput, Drawer, Field, FormGrid, IconButton, ImageUrlInput, Input, PageHeader, Panel,
  StatusPill, Switch, Textarea, fmt, useConfirm, useForm, useResource, useToast,
} from '../ui';

const empty = (): NewsInput => ({ title: '', date: new Date().toISOString().slice(0, 10), image: null, body: '', externalUrl: null, published: true });

export default function NewsPage() {
  const list = useResource<NewsDTO[]>('/admin/news');
  const { query, setQuery } = useAdminRoute();
  const editId = query.get('edit');
  const isNew = query.get('new') === '1';
  const editing = editId ? list.data?.find(n => n.id === Number(editId)) : undefined;
  const confirm = useConfirm();
  const toast = useToast();

  const remove = async (n: NewsDTO) => {
    if (!(await confirm({ title: 'Удалить новость?', message: n.title }))) return;
    try { await api.del(`/admin/news/${n.id}`); toast.success('Удалено'); void list.reload(); } catch (e) { toast.error(e); }
  };

  return (
    <>
      <PageHeader title="Новости" actions={<Button icon={Plus} onClick={() => setQuery({ new: 1 })}>Добавить</Button>} />
      <Panel>
        <DataTable
          rows={list.data} loading={list.loading} error={list.error} onRetry={list.reload} rowKey={n => n.id}
          onRowClick={n => setQuery({ edit: n.id })}
          columns={[
            { key: 'title', header: 'Заголовок', primary: true },
            { key: 'date', header: 'Дата', render: n => fmt.date(n.date), sortable: true },
            { key: 'published', header: 'Статус', render: n => <StatusPill published={n.published} /> },
          ]}
          actions={n => <>
            <IconButton icon={Pencil} label="Изменить" onClick={() => setQuery({ edit: n.id })} />
            <IconButton icon={Trash2} label="Удалить" variant="danger" onClick={() => remove(n)} />
          </>}
          empty={{ title: 'Новостей пока нет', action: <Button icon={Plus} onClick={() => setQuery({ new: 1 })}>Добавить</Button> }}
        />
      </Panel>
      {(isNew || editing) && (
        <NewsForm key={editing?.id ?? 'new'} item={editing} onClose={() => setQuery({ edit: null, new: null })} onSaved={() => list.reload()} />
      )}
    </>
  );
}

function NewsForm({ item, onClose, onSaved }: { item?: NewsDTO; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const form = useForm(newsInput, item ?? empty());
  const submit = form.handleSubmit(async data => {
    if (item) await api.patch(`/admin/news/${item.id}`, data); else await api.post('/admin/news', data);
    toast.success('Сохранено'); onSaved(); onClose();
  }, toast.error);
  return (
    <Drawer open onClose={onClose} busy={form.submitting} title={item ? 'Редактирование новости' : 'Новая новость'} onSubmit={submit}
      footer={<><Button variant="ghost" onClick={onClose}>Отмена</Button><Button type="submit" loading={form.submitting}>Сохранить</Button></>}>
      <FormGrid>
        <Field label="Заголовок" error={form.error('title')} required wide>
          <Input value={form.values.title} onChange={e => form.set('title', e.target.value)} data-autofocus />
        </Field>
        <Field label="Дата" error={form.error('date')} required>
          <DateInput value={form.values.date} onChange={v => form.set('date', v ?? '')} clearable={false} />
        </Field>
        <Field label="Картинка" error={form.error('image')} wide>
          <ImageUrlInput value={form.values.image} onChange={v => form.set('image', v)} fit="cover" />
        </Field>
        <Field label="Текст" error={form.error('body')} wide>
          <Textarea rows={8} value={form.values.body} onChange={e => form.set('body', e.target.value)} />
        </Field>
      </FormGrid>
      <Switch label="Опубликовано" checked={!!form.values.published} onChange={v => form.set('published', v)} />
    </Drawer>
  );
}
```

## Перестановка

```tsx
<SortableList
  items={faqs} getId={f => f.id} itemLabel={f => f.question}
  renderItem={f => <strong>{f.question}</strong>}
  onReorder={ids => api.put('/admin/reorder/faqs', { ids }).then(() => toast.success('Порядок сохранён'), e => { toast.error(e); throw e; })}
/>
```
Если `onReorder` вернёт отклонённый Promise, порядок откатится.

## Полезное
- Ошибка формы общего характера лежит в `form.errors._` — покажите её, например, `{form.errors._ && <p className="notice notice-error">{form.errors._}</p>}`.
- `form.dirty` — есть несохранённые изменения (можно спросить `confirm` перед закрытием).
- Выгрузка CSV — обычной ссылкой: `<LinkButton to="/api/admin/leads/export.csv" icon={Download}>Excel</LinkButton>` (GET без CSRF-заголовка).
- Классы из admin.css, которые можно брать: `notice notice-error|warn|info`, `muted`, `mono`, `more-link`, `tile-icon`.

## Переводы (KZ / ENG) — `Translations.tsx`

Русский — основной язык (обычные поля). Переводы — в `translations: { kk?: {...}, en?: {...} }`; пустая строка = на сайте русский текст.
PATCH заменяет язык целиком, поэтому форма всегда держит и отправляет полные объекты обоих языков (`withAllFields`).

| Что | Зачем |
|---|---|
| `TranslatableForm` `fields, original, value, onChange, errors, errorPrefix?='translations'` | вкладки «RU · KZ · ENG» внутри формы: RU — `children` (прежние поля), KZ/ENG — переводимые поля с русским оригиналом серым, «Скопировать из RU», счётчиком; ошибки `translations.kk.name` открывают свою вкладку |
| `TrFieldDef` `{ key, label, max?, count?, rows?, hint?, singleLine?, extra?(value, original) }` | описание переводимого поля (готовые наборы — `pages/content/trFields.ts`) |
| `withAllFields(value, fields)` | `{ kk: {...все поля}, en: {...} }` — для начальных значений формы |
| `translationStatus(value, fields, row)` → `{ kk, en }` с `{ done, total, state }`; `isIncomplete(status)` | заполненность (считаются поля с непустым русским текстом); фильтр «Без перевода» |
| `TranslationBadges` `status` | «KZ ✓ ENG 1/2» или «нет перевода» в строке списка |
| `LangTabs` `value, onChange, items: { lang, progress?, error? }[], tabs?` | только вкладки (свои формы, например настройки); `const tabs = useLangTabs(lang, setLang)` → `<LangTabs … tabs={tabs} />` и содержимое в `<div {...tabs.panelProps}>` |
| `useTabs` / `TabList` (Tabs.tsx) | вкладки WAI-ARIA: tablist/tab/tabpanel, aria-controls, бегающий tabIndex, ←/→/Home/End; `activation: 'manual'`, если смена вкладки спрашивает подтверждение |
| `TranslationInput` `label, lang, value, original, onChange, error?, max?, rows?…` | одно поле перевода с оригиналом |
| `useErrorTab(errors, tab, setTab, prefix)` | переключить вкладку на ту, где появились ошибки, и поставить фокус |

```tsx
const TR = [{ key: 'question', label: 'Вопрос', max: 300, rows: 2 }, { key: 'answer', label: 'Ответ', max: 3000, rows: 8 }];
const form = useForm(faqInput, { ...item, translations: withAllFields(item.translations, TR) });
<TranslatableForm fields={TR} original={form.values} value={form.values.translations} onChange={t => form.set('translations', t)} errors={form.errors}>
  …русские поля…
</TranslatableForm>
```
