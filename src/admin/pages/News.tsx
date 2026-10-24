/** Новости: список по дате, поиск, форма с живым предпросмотром. ?new=1 — сразу открыть создание. */
import { useState } from 'react';
import { Eye, EyeOff, ExternalLink, FileText, Link2, Newspaper, Pencil, Plus, SearchX, Trash2 } from 'lucide-react';
import { newsInput, type NewsDTO, type NewsInput } from '@shared/schemas';
import { api } from '../api';
import {
  Badge, Button, Checkbox, DataTable, DateInput, EmptyState, Field, FormGrid, IconButton, ImageUrlInput, Input, PageHeader, Panel,
  SearchInput, Segmented, Switch, Textarea, Toolbar, TranslatableForm, TranslationBadges, fmt, isIncomplete, translationStatus,
  useConfirm, useForm, useResource, withAllFields, type TrFieldDef,
} from '../ui';
import { safeImgSrc } from '../../content/safe-url';
import { NEWS_TR } from './content/trFields';
import { EditorDrawer, HintWithCount, Thumb, matches, orNull, useContentToast, useEditorRoute } from './content/shared';

type Filter = 'all' | 'published' | 'hidden';

/** Как новость откроется на сайте (как в src/content/links.ts). */
function newsKind(n: Pick<NewsDTO, 'body' | 'externalUrl'>): 'site' | 'external' | 'none' {
  if (n.body.trim()) return 'site';
  if (n.externalUrl) return 'external';
  return 'none';
}

function KindBadge({ n }: { n: Pick<NewsDTO, 'body' | 'externalUrl'> }) {
  const k = newsKind(n);
  if (k === 'site') return <Badge tone="info"><FileText size={13} aria-hidden="true" />На сайте</Badge>;
  if (k === 'external') return <Badge tone="warning"><Link2 size={13} aria-hidden="true" />Внешняя ссылка</Badge>;
  return <Badge tone="neutral" title="Нет текста и ссылки — карточка не открывается">Без ссылки</Badge>;
}

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export default function NewsPage() {
  const list = useResource<NewsDTO[]>('/admin/news');
  const editor = useEditorRoute(list.data, list.loading, 'Новость не найдена — возможно, её уже удалили');
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [onlyMissing, setOnlyMissing] = useState(false);
  const toast = useContentToast();
  const confirm = useConfirm();

  const all = list.data ?? [];
  const rows = all
    .filter(n => filter === 'all' || (filter === 'published' ? n.published : !n.published))
    .filter(n => !onlyMissing || isIncomplete(translationStatus(n.translations, NEWS_TR, n)))
    .filter(n => matches(q, n.title, n.body, n.externalUrl));
  const missingCount = all.filter(n => isIncomplete(translationStatus(n.translations, NEWS_TR, n))).length;

  const remove = async (n: NewsDTO) => {
    if (!(await confirm({ title: 'Удалить новость?', message: <>«{n.title}» исчезнет с сайта. Действие нельзя отменить.</> }))) return false;
    try {
      await api.del(`/admin/news/${n.id}`);
      list.setData(d => d?.filter(x => x.id !== n.id) ?? d);
      toast.saved('Новость удалена');
      return true;
    } catch (e) { toast.error(e); return false; }
  };

  const togglePublished = async (n: NewsDTO) => {
    try {
      const row = await api.patch<NewsDTO>(`/admin/news/${n.id}`, { published: !n.published });
      list.setData(d => d?.map(x => (x.id === n.id ? row : x)) ?? d);
      toast.saved(row.published ? 'Новость опубликована' : 'Новость скрыта');
    } catch (e) { toast.error(e); }
  };

  const sortByDate = (d: NewsDTO[]) => [...d].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
  const counts = { all: all.length, published: all.filter(n => n.published).length, hidden: all.filter(n => !n.published).length };

  return (
    <>
      <PageHeader
        title="Новости"
        description="Новости на главной и на странице «Новости». Сортируются по дате — сначала свежие."
        actions={<Button icon={Plus} onClick={editor.openNew}>Добавить новость</Button>}
      />
      <Panel>
        <Toolbar>
          <SearchInput value={q} onChange={setQ} placeholder="Заголовок или текст…" label="Поиск новостей" />
          <Segmented<Filter>
            label="Статус"
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all', label: 'Все', count: list.data ? counts.all : undefined },
              { value: 'published', label: 'На сайте', count: list.data ? counts.published : undefined },
              { value: 'hidden', label: 'Скрытые', count: list.data ? counts.hidden : undefined },
            ]}
          />
          <Checkbox label={`Без перевода${list.data ? ` (${missingCount})` : ''}`} checked={onlyMissing} onChange={setOnlyMissing} />
        </Toolbar>
        <DataTable
          caption="Новости"
          rows={rows}
          loading={list.loading && !list.data}
          error={list.data ? null : list.error}
          onRetry={() => void list.reload()}
          rowKey={n => n.id}
          onRowClick={n => editor.openEdit(n.id)}
          rowClassName={n => (n.published ? undefined : 'ct-row-hidden')}
          columns={[
            {
              key: 'title', header: 'Заголовок', primary: true, sortable: true,
              render: n => (
                <span className="ct-news-title">
                  <Thumb src={n.image} fit="cover" />
                  <span>{n.title} {!n.published && <Badge tone="neutral" dot>Скрыто</Badge>}</span>
                </span>
              ),
            },
            { key: 'date', header: 'Дата', sortable: true, render: n => <time dateTime={n.date} style={{ whiteSpace: 'nowrap' }}>{fmt.date(n.date)}</time> },
            { key: 'kind', header: 'Открывается', render: n => <KindBadge n={n} /> },
            { key: 'tr', header: 'Перевод', render: n => <TranslationBadges status={translationStatus(n.translations, NEWS_TR, n)} /> },
          ]}
          actions={n => (
            <>
              <IconButton icon={n.published ? EyeOff : Eye} label={n.published ? `Скрыть «${n.title}»` : `Опубликовать «${n.title}»`} onClick={() => void togglePublished(n)} />
              <IconButton icon={Pencil} label={`Изменить «${n.title}»`} onClick={() => editor.openEdit(n.id)} />
              <IconButton icon={Trash2} label={`Удалить «${n.title}»`} variant="danger" onClick={() => void remove(n)} />
            </>
          )}
          empty={all.length === 0
            ? <EmptyState icon={Newspaper} title="Новостей пока нет" text="Расскажите об итогах олимпиады или анонсируйте мероприятие." action={<Button icon={Plus} onClick={editor.openNew}>Добавить новость</Button>} />
            : <EmptyState icon={SearchX} compact title="Ничего не найдено" text="Попробуйте другой запрос или фильтр." action={<Button variant="ghost" onClick={() => { setQ(''); setFilter('all'); setOnlyMissing(false); }}>Сбросить</Button>} />}
        />
      </Panel>

      {editor.open && (
        <NewsForm
          key={editor.editing?.id ?? 'new'}
          item={editor.editing}
          onClose={editor.close}
          onSaved={row => {
            list.setData(d => (d ? sortByDate(d.some(x => x.id === row.id) ? d.map(x => (x.id === row.id ? row : x)) : [...d, row]) : d));
            editor.close();
          }}
          onDelete={async n => { if (await remove(n)) editor.close(); }}
        />
      )}
    </>
  );
}

/** Абзацы как на сайте: пустая строка — новый абзац, перенос строки внутри абзаца сохраняется. */
function Paragraphs({ text }: { text: string }) {
  const paragraphs = text.replace(/\r\n?/g, '\n').split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
  if (!paragraphs.length) return <p className="ct-preview-empty">Текста нет — новость будет открываться по внешней ссылке (если она указана).</p>;
  return <>{paragraphs.map((p, i) => <p key={i}>{p.split('\n').map((line, j) => <span key={j}>{j > 0 && <br />}{line}</span>)}</p>)}</>;
}

/** Предпросмотр абзацев перевода — так же, как у русского текста. */
function TrBodyPreview({ value }: { value: string }) {
  const [open, setOpen] = useState(false);
  const count = value.replace(/\r\n?/g, '\n').split(/\n\s*\n/).filter(p => p.trim()).length;
  return (
    <div className="ct-section">
      <div className="ct-preview-head">
        <p className="ct-section-title">Предпросмотр перевода{count ? ` · абзацев: ${count}` : ''}</p>
        <Button size="sm" variant="ghost" icon={open ? EyeOff : Eye} onClick={() => setOpen(o => !o)} aria-expanded={open}>{open ? 'Скрыть' : 'Показать'}</Button>
      </div>
      {open && (
        <article className="ct-preview" aria-label="Предпросмотр перевода">
          {value.trim() ? <Paragraphs text={value} /> : <p className="ct-preview-empty">Перевода нет — на сайте будет русский текст.</p>}
        </article>
      )}
    </div>
  );
}

const NEWS_FIELDS: readonly TrFieldDef[] = NEWS_TR.map(f => (f.key === 'body' ? { ...f, extra: (val: string) => <TrBodyPreview value={val} /> } : f));

function NewsForm({ item, onClose, onSaved, onDelete }: { item?: NewsDTO; onClose: () => void; onSaved: (row: NewsDTO) => void; onDelete: (n: NewsDTO) => Promise<void> }) {
  const toast = useContentToast();
  const initial: NewsInput = item
    ? { title: item.title, date: item.date, image: item.image, body: item.body, externalUrl: item.externalUrl, published: item.published, translations: withAllFields(item.translations, NEWS_TR) }
    : { title: '', date: today(), image: null, body: '', externalUrl: null, published: true, translations: withAllFields(undefined, NEWS_TR) };
  const form = useForm(newsInput, initial);
  const v = form.values;
  const [preview, setPreview] = useState(false);

  const submit = form.handleSubmit(async data => {
    const payload = { ...data, image: orNull(data.image), externalUrl: orNull(data.externalUrl) };
    const row = item ? await api.patch<NewsDTO>(`/admin/news/${item.id}`, payload) : await api.post<NewsDTO>('/admin/news', payload);
    toast.saved(item ? 'Новость сохранена' : 'Новость добавлена');
    onSaved(row);
  }, toast.formError);

  const kind = newsKind({ body: v.body ?? '', externalUrl: v.externalUrl ?? null });
  const paragraphs = (v.body ?? '').replace(/\r\n?/g, '\n').split(/\n\s*\n/).filter(p => p.trim()).length;

  return (
    <EditorDrawer
      title={item ? 'Редактирование новости' : 'Новая новость'}
      dirty={form.dirty}
      submitting={form.submitting}
      onSubmit={submit}
      onClose={onClose}
      onDelete={item ? () => onDelete(item) : undefined}
      error={form.errors._}
    >
      <TranslatableForm fields={NEWS_FIELDS} original={v} value={v.translations} onChange={t => form.set('translations', t)} errors={form.errors}>
      <FormGrid>
        <Field label="Заголовок" error={form.error('title')} required wide hint={<HintWithCount value={v.title} max={300} />}>
          <Input value={v.title} onChange={e => form.set('title', e.target.value)} data-autofocus />
        </Field>
        <Field label="Дата" error={form.error('date')} required hint="По дате новости сортируются на сайте.">
          <DateInput value={v.date} onChange={d => form.set('date', d ?? '')} clearable={false} />
        </Field>
        <Field label="Внешняя ссылка" error={form.error('externalUrl')} hint="Источник: Instagram, сайт олимпиады… Необязательно.">
          <Input type="url" inputMode="url" placeholder="https://" value={v.externalUrl ?? ''} onChange={e => form.set('externalUrl', e.target.value.trim() ? e.target.value : null)} />
        </Field>
        <Field label="Картинка" error={form.error('image')} wide hint="Горизонтальное фото, лучше 1200×675. Путь /images/… или https://…">
          <ImageUrlInput value={v.image} onChange={val => form.set('image', val)} fit="cover" />
        </Field>
        <Field
          label="Текст новости"
          error={form.error('body')}
          wide
          hint={<HintWithCount hint="Обычный текст без оформления. Абзацы разделяйте пустой строкой (дважды Enter); одиночный Enter — перенос строки внутри абзаца." value={v.body} max={20000} />}
        >
          <Textarea rows={10} value={v.body ?? ''} onChange={e => form.set('body', e.target.value)} />
        </Field>
      </FormGrid>

      <p className={`notice ${kind === 'none' ? 'notice-warn' : 'notice-info'}`}>
        {kind === 'site' && <><FileText size={16} aria-hidden="true" />Новость откроется отдельной страницей на сайте{v.externalUrl ? ' со ссылкой «Читать на сайте источника»' : ''}. Абзацев: {paragraphs}.</>}
        {kind === 'external' && <><ExternalLink size={16} aria-hidden="true" />Текста нет — по клику карточка откроет внешнюю ссылку.</>}
        {kind === 'none' && <><Link2 size={16} aria-hidden="true" />Нет ни текста, ни ссылки — карточка будет видна, но не откроется.</>}
      </p>

      <div className="ct-section">
        <div className="ct-preview-head">
          <p className="ct-section-title">Предпросмотр</p>
          <Button size="sm" variant="ghost" icon={preview ? EyeOff : Eye} onClick={() => setPreview(p => !p)} aria-expanded={preview}>
            {preview ? 'Скрыть' : 'Показать'}
          </Button>
        </div>
        {preview && (
          <article className="ct-preview" aria-label="Предпросмотр новости">
            <time dateTime={v.date}>{fmt.date(v.date)}</time>
            <h3>{v.title || 'Заголовок новости'}</h3>
            {safeImgSrc(v.image) && <img src={safeImgSrc(v.image)} alt="" />}
            <Paragraphs text={v.body ?? ''} />
          </article>
        )}
      </div>

      <Switch label="Показывать на сайте" hint="Скрытая новость видна только в админке." checked={!!v.published} onChange={val => form.set('published', val)} />
      </TranslatableForm>
    </EditorDrawer>
  );
}
