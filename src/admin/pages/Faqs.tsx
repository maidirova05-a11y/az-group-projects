/** Частые вопросы: перестановка, публикация прямо в списке, форма в Drawer. */
import { useState } from 'react';
import { CircleHelp, Pencil, Plus, SearchX, Trash2 } from 'lucide-react';
import { faqInput, type FaqDTO, type FaqInput } from '@shared/schemas';
import { api } from '../api';
import {
  Button, Checkbox, EmptyState, ErrorState, Field, IconButton, PageHeader, Panel, SearchInput, SortableList, Switch, Textarea, Toolbar,
  TranslatableForm, TranslationBadges, isIncomplete, translationStatus, useConfirm, useForm, useResource, withAllFields,
} from '../ui';
import { FAQ_TR } from './content/trFields';
import {
  EditorDrawer, HiddenBadge, HintWithCount, ListSkeleton, PublishToggle, applyOrder, matches, plural, useContentToast, useEditorRoute,
} from './content/shared';

export default function FaqsPage() {
  const list = useResource<FaqDTO[]>('/admin/faqs');
  const editor = useEditorRoute(list.data, list.loading, 'Вопрос не найден — возможно, его уже удалили');
  const [q, setQ] = useState('');
  const [onlyMissing, setOnlyMissing] = useState(false);
  const toast = useContentToast();
  const confirm = useConfirm();

  const all = list.data ?? [];
  const missing = (f: FaqDTO) => isIncomplete(translationStatus(f.translations, FAQ_TR, f));
  const shown = all.filter(f => (!onlyMissing || missing(f)) && matches(q, f.question, f.answer));
  const filtering = !!q.trim() || onlyMissing;

  const remove = async (f: FaqDTO) => {
    if (!(await confirm({ title: 'Удалить вопрос?', message: <>«{f.question}» исчезнет с сайта. Действие нельзя отменить.</> }))) return false;
    try {
      await api.del(`/admin/faqs/${f.id}`);
      list.setData(d => d?.filter(x => x.id !== f.id) ?? d);
      toast.saved('Вопрос удалён');
      return true;
    } catch (e) { toast.error(e); return false; }
  };

  const setPublished = async (f: FaqDTO, published: boolean) => {
    try {
      const row = await api.patch<FaqDTO>(`/admin/faqs/${f.id}`, { published });
      list.setData(d => d?.map(x => (x.id === f.id ? row : x)) ?? d);
      toast.saved(published ? 'Вопрос опубликован' : 'Вопрос скрыт');
    } catch (e) { toast.error(e); }
  };

  const reorder = async (ids: number[]) => {
    try {
      await api.put('/admin/reorder/faqs', { ids });
      list.setData(d => (d ? applyOrder(d, ids) : d));
      toast.saved('Порядок сохранён');
    } catch (e) { toast.error(e); throw e; }
  };

  const nextSort = all.reduce((m, f) => Math.max(m, f.sort), -1) + 1;

  return (
    <>
      <PageHeader
        title="Частые вопросы"
        description="Раздел «Частые вопросы» на сайте. Первый вопрос показывается раскрытым."
        actions={<Button icon={Plus} onClick={editor.openNew}>Добавить вопрос</Button>}
      />
      <Panel>
        {all.length > 0 && (
          <Toolbar>
            {all.length > 3 && <SearchInput value={q} onChange={setQ} placeholder="Вопрос или ответ…" label="Поиск по вопросам" />}
            <Checkbox label={`Без перевода (${all.filter(missing).length})`} checked={onlyMissing} onChange={setOnlyMissing} />
          </Toolbar>
        )}
        {list.error && !list.data ? (
          <ErrorState message={list.error} onRetry={() => void list.reload()} />
        ) : !list.data ? (
          <ListSkeleton rows={6} height={72} />
        ) : all.length === 0 ? (
          <EmptyState icon={CircleHelp} title="Вопросов пока нет" text="Добавьте ответы на то, что чаще всего спрашивают родители и учителя." action={<Button icon={Plus} onClick={editor.openNew}>Добавить вопрос</Button>} />
        ) : shown.length === 0 ? (
          <EmptyState icon={SearchX} compact title="Ничего не найдено" text={onlyMissing && !q.trim() ? 'Все вопросы переведены.' : `По запросу «${q}» вопросов нет.`} action={<Button variant="ghost" onClick={() => { setQ(''); setOnlyMissing(false); }}>Сбросить фильтры</Button>} />
        ) : (
          <>
            <SortableList
              items={shown}
              getId={f => f.id}
              itemLabel={f => f.question}
              label="Вопросы: порядок на сайте"
              disabled={filtering}
              onReorder={reorder}
              renderItem={f => (
                <div className={`ct-row${f.published ? '' : ' is-hidden'}`}>
                  <div className="ct-row-main">
                    <div className="ct-row-title">
                      <button type="button" className="ct-row-name" onClick={() => editor.openEdit(f.id)}>{f.question}</button>
                      <HiddenBadge published={f.published} />
                      <TranslationBadges status={translationStatus(f.translations, FAQ_TR, f)} />
                    </div>
                    <p className="ct-row-sub">{f.answer}</p>
                  </div>
                  <div className="ct-row-side">
                    <PublishToggle published={f.published} name={f.question} onChange={v => setPublished(f, v)} />
                    <IconButton icon={Pencil} label={`Изменить «${f.question}»`} onClick={() => editor.openEdit(f.id)} />
                    <IconButton icon={Trash2} label={`Удалить «${f.question}»`} variant="danger" onClick={() => void remove(f)} />
                  </div>
                </div>
              )}
            />
            <p className="ct-list-foot">
              {filtering
                ? 'Чтобы менять порядок, сбросьте поиск и фильтр.'
                : `${all.length} ${plural(all.length, ['вопрос', 'вопроса', 'вопросов'])}. Перетащите за ручку слева или используйте стрелки — порядок сохранится сразу.`}
            </p>
          </>
        )}
      </Panel>

      {editor.open && (
        <FaqForm
          key={editor.editing?.id ?? 'new'}
          item={editor.editing}
          nextSort={nextSort}
          onClose={editor.close}
          onSaved={row => {
            list.setData(d => (d ? (d.some(x => x.id === row.id) ? d.map(x => (x.id === row.id ? row : x)) : [...d, row]) : d));
            editor.close();
          }}
          onDelete={async f => { if (await remove(f)) editor.close(); }}
        />
      )}
    </>
  );
}

function FaqForm({ item, nextSort, onClose, onSaved, onDelete }: {
  item?: FaqDTO; nextSort: number; onClose: () => void; onSaved: (row: FaqDTO) => void; onDelete: (f: FaqDTO) => Promise<void>;
}) {
  const toast = useContentToast();
  const initial: FaqInput = item
    ? { question: item.question, answer: item.answer, sort: item.sort, published: item.published, translations: withAllFields(item.translations, FAQ_TR) }
    : { question: '', answer: '', sort: nextSort, published: true, translations: withAllFields(undefined, FAQ_TR) };
  const form = useForm(faqInput, initial);
  const v = form.values;

  const submit = form.handleSubmit(async data => {
    const { sort: _sort, ...rest } = data;
    const row = item ? await api.patch<FaqDTO>(`/admin/faqs/${item.id}`, rest) : await api.post<FaqDTO>('/admin/faqs', { ...rest, sort: nextSort });
    toast.saved(item ? 'Вопрос сохранён' : 'Вопрос добавлен');
    onSaved(row);
  }, toast.formError);

  return (
    <EditorDrawer
      title={item ? 'Редактирование вопроса' : 'Новый вопрос'}
      dirty={form.dirty}
      submitting={form.submitting}
      onSubmit={submit}
      onClose={onClose}
      onDelete={item ? () => onDelete(item) : undefined}
      error={form.errors._}
    >
      <TranslatableForm fields={FAQ_TR} original={v} value={v.translations} onChange={t => form.set('translations', t)} errors={form.errors}>
      <Field label="Вопрос" error={form.error('question')} required hint={<HintWithCount hint="Как его задал бы родитель или учитель." value={v.question} max={300} />}>
        <Textarea rows={2} value={v.question} onChange={e => form.set('question', e.target.value)} data-autofocus />
      </Field>
      <Field label="Ответ" error={form.error('answer')} required hint={<HintWithCount hint="Обычный текст. Коротко и по делу." value={v.answer} max={3000} />}>
        <Textarea rows={8} value={v.answer} onChange={e => form.set('answer', e.target.value)} />
      </Field>
      <Switch label="Показывать на сайте" hint="Скрытый вопрос виден только в админке." checked={!!v.published} onChange={val => form.set('published', val)} />
      </TranslatableForm>
    </EditorDrawer>
  );
}
