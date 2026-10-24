/** Партнёры: группы (школы / организации / государственные), поиск, перестановка, массовая публикация. */
import { useEffect, useState } from 'react';
import { Eye, EyeOff, Handshake, Pencil, Plus, SearchX, Trash2, X } from 'lucide-react';
import { PARTNER_GROUPS, partnerInput, type PartnerDTO, type PartnerInput } from '@shared/schemas';
import { api } from '../api';
import { useAdminRoute } from '../router';
import {
  Button, Checkbox, EmptyState, ErrorState, Field, IconButton, ImageUrlInput, PageHeader, Panel, SearchInput, Segmented,
  SortableList, Switch, Textarea, Toolbar, TranslatableForm, TranslationBadges, isIncomplete, translationStatus, useConfirm, useForm,
  useResource, withAllFields,
} from '../ui';
import { PARTNER_TR } from './content/trFields';
import {
  EditorDrawer, HiddenBadge, HintWithCount, ListSkeleton, PublishToggle, Thumb, applyOrder, initials, matches, orNull, plural,
  spliceOrder, useContentToast, useEditorRoute,
} from './content/shared';

type Group = (typeof PARTNER_GROUPS)[number];
const GROUP_LABELS: Record<Group, string> = { schools: 'Школы', org: 'Организации', gov: 'Государственные' };
const isGroup = (v: string | null): v is Group => !!v && (PARTNER_GROUPS as readonly string[]).includes(v);

export default function PartnersPage() {
  const list = useResource<PartnerDTO[]>('/admin/partners');
  const { query, setQuery } = useAdminRoute();
  const editor = useEditorRoute(list.data, list.loading, 'Партнёр не найден — возможно, его уже удалили');
  const g = query.get('group');
  const group: Group = isGroup(g) ? g : 'schools';
  const [q, setQ] = useState('');
  const [onlyMissing, setOnlyMissing] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const toast = useContentToast();
  const confirm = useConfirm();

  const all = list.data ?? [];
  const inGroup = all.filter(p => p.group === group);
  const missing = (p: PartnerDTO) => isIncomplete(translationStatus(p.translations, PARTNER_TR, p));
  const shown = inGroup.filter(p => (!onlyMissing || missing(p)) && matches(q, p.name));
  const filtering = !!q.trim() || onlyMissing;

  // Выделение — только в пределах видимого списка.
  useEffect(() => { setSelected(new Set()); }, [group, q, onlyMissing]);
  const selectedRows = shown.filter(p => selected.has(p.id));
  const allChecked = shown.length > 0 && selectedRows.length === shown.length;
  const toggle = (id: number, on: boolean) => setSelected(s => { const n = new Set(s); if (on) n.add(id); else n.delete(id); return n; });

  const replaceRow = (row: PartnerDTO) => list.setData(d => d?.map(x => (x.id === row.id ? row : x)) ?? d);

  const remove = async (p: PartnerDTO) => {
    if (!(await confirm({ title: 'Удалить партнёра?', message: <>«{p.name}» исчезнет с сайта. Действие нельзя отменить.</> }))) return false;
    try {
      await api.del(`/admin/partners/${p.id}`);
      list.setData(d => d?.filter(x => x.id !== p.id) ?? d);
      toast.saved('Партнёр удалён');
      return true;
    } catch (e) { toast.error(e); return false; }
  };

  const setPublished = async (p: PartnerDTO, published: boolean) => {
    try {
      replaceRow(await api.patch<PartnerDTO>(`/admin/partners/${p.id}`, { published }));
      toast.saved(published ? 'Партнёр опубликован' : 'Партнёр скрыт');
    } catch (e) { toast.error(e); }
  };

  const bulkPublish = async (published: boolean) => {
    const targets = selectedRows.filter(p => p.published !== published);
    if (!targets.length) { toast.info(published ? 'Выбранные уже опубликованы' : 'Выбранные уже скрыты'); return; }
    setBulkBusy(true);
    const results = await Promise.allSettled(targets.map(p => api.patch<PartnerDTO>(`/admin/partners/${p.id}`, { published })));
    setBulkBusy(false);
    const ok = results.filter((r): r is PromiseFulfilledResult<PartnerDTO> => r.status === 'fulfilled').map(r => r.value);
    list.setData(d => d?.map(x => ok.find(o => o.id === x.id) ?? x) ?? d);
    const failed = results.length - ok.length;
    if (ok.length) toast.saved(`${published ? 'Опубликовано' : 'Скрыто'}: ${ok.length} ${plural(ok.length, ['партнёр', 'партнёра', 'партнёров'])}`);
    if (failed) toast.error(`Не удалось изменить: ${failed}. Попробуйте ещё раз.`);
    setSelected(new Set());
  };

  const reorder = async (ids: number[]) => {
    const full = spliceOrder(all.map(p => p.id), ids);
    try {
      await api.put('/admin/reorder/partners', { ids: full });
      list.setData(d => (d ? applyOrder(d, full) : d));
      toast.saved('Порядок сохранён');
    } catch (e) { toast.error(e); throw e; }
  };

  const nextSort = all.reduce((m, p) => Math.max(m, p.sort), -1) + 1;

  return (
    <>
      <PageHeader
        title="Партнёры"
        description="Логотипы на странице «Партнёры». Порядок внутри группы — порядок на сайте."
        actions={<Button icon={Plus} onClick={editor.openNew}>Добавить партнёра</Button>}
      />
      <Panel>
        <Toolbar>
          <Segmented<Group>
            label="Группа партнёров"
            value={group}
            onChange={v => setQuery({ group: v === 'schools' ? null : v })}
            options={PARTNER_GROUPS.map(id => ({ value: id, label: GROUP_LABELS[id], count: list.data ? all.filter(p => p.group === id).length : undefined }))}
          />
          <SearchInput value={q} onChange={setQ} placeholder="Название партнёра…" label="Поиск партнёров" />
          <Checkbox label={`Без перевода${list.data ? ` (${inGroup.filter(missing).length})` : ''}`} checked={onlyMissing} onChange={setOnlyMissing} />
        </Toolbar>

        {list.error && !list.data ? (
          <ErrorState message={list.error} onRetry={() => void list.reload()} />
        ) : !list.data ? (
          <ListSkeleton rows={6} />
        ) : inGroup.length === 0 ? (
          <EmptyState icon={Handshake} title={`В группе «${GROUP_LABELS[group]}» пока никого`} text="Добавьте партнёра — его логотип появится на сайте." action={<Button icon={Plus} onClick={editor.openNew}>Добавить партнёра</Button>} />
        ) : shown.length === 0 ? (
          <EmptyState icon={SearchX} compact title="Ничего не найдено" text={onlyMissing && !q.trim() ? 'Все партнёры этой группы переведены.' : `По запросу «${q}» в этой группе никого нет.`} action={<Button variant="ghost" onClick={() => { setQ(''); setOnlyMissing(false); }}>Сбросить фильтры</Button>} />
        ) : (
          <>
            {selectedRows.length > 0 ? (
              <div className="ct-bulk" role="region" aria-label="Действия с выбранными">
                <span>Выбрано: {selectedRows.length}</span>
                <div className="ct-bulk-actions">
                  <Button size="sm" variant="ghost" icon={Eye} loading={bulkBusy} onClick={() => void bulkPublish(true)}>Опубликовать</Button>
                  <Button size="sm" variant="ghost" icon={EyeOff} disabled={bulkBusy} onClick={() => void bulkPublish(false)}>Скрыть</Button>
                  <Button size="sm" variant="ghost" icon={X} disabled={bulkBusy} onClick={() => setSelected(new Set())}>Снять выбор</Button>
                </div>
              </div>
            ) : null}
            <div className="ct-selectall">
              <Checkbox
                label={allChecked ? 'Снять выбор со всех' : `Выбрать все (${shown.length})`}
                checked={allChecked}
                onChange={on => setSelected(on ? new Set(shown.map(p => p.id)) : new Set())}
              />
            </div>
            <SortableList
              items={shown}
              getId={p => p.id}
              itemLabel={p => p.name}
              label={`${GROUP_LABELS[group]}: порядок на сайте`}
              disabled={filtering}
              onReorder={reorder}
              renderItem={p => (
                <div className={`ct-row has-check${p.published ? '' : ' is-hidden'}`}>
                  <Thumb src={p.image} fallback={initials(p.name)} />
                  <div className="ct-row-main">
                    <div className="ct-row-title">
                      <button type="button" className="ct-row-name" onClick={() => editor.openEdit(p.id)}>{p.name}</button>
                      <HiddenBadge published={p.published} />
                      <TranslationBadges status={translationStatus(p.translations, PARTNER_TR, p)} />
                    </div>
                  </div>
                  <div className="ct-row-side">
                    <Checkbox className="ct-check" label={<span className="sr-only">Выбрать «{p.name}»</span>} checked={selected.has(p.id)} onChange={on => toggle(p.id, on)} />
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <PublishToggle published={p.published} name={p.name} onChange={v => setPublished(p, v)} />
                      <IconButton icon={Pencil} label={`Изменить «${p.name}»`} onClick={() => editor.openEdit(p.id)} />
                      <IconButton icon={Trash2} label={`Удалить «${p.name}»`} variant="danger" onClick={() => void remove(p)} />
                    </span>
                  </div>
                </div>
              )}
            />
            <p className="ct-list-foot">
              {filtering
                ? 'Чтобы менять порядок, сбросьте поиск и фильтр.'
                : `${inGroup.length} ${plural(inGroup.length, ['партнёр', 'партнёра', 'партнёров'])}. Перетащите за ручку слева или используйте стрелки — порядок сохранится сразу.`}
            </p>
          </>
        )}
      </Panel>

      {editor.open && (
        <PartnerForm
          key={editor.editing?.id ?? 'new'}
          item={editor.editing}
          defaultGroup={group}
          nextSort={nextSort}
          onClose={editor.close}
          onSaved={row => {
            list.setData(d => (d ? (d.some(x => x.id === row.id) ? d.map(x => (x.id === row.id ? row : x)) : [...d, row]) : d));
            if (row.group !== group) setQuery({ group: row.group === 'schools' ? null : row.group, edit: null, new: null });
            else editor.close();
          }}
          onDelete={async p => { if (await remove(p)) editor.close(); }}
        />
      )}
    </>
  );
}

function PartnerForm({ item, defaultGroup, nextSort, onClose, onSaved, onDelete }: {
  item?: PartnerDTO; defaultGroup: Group; nextSort: number; onClose: () => void; onSaved: (row: PartnerDTO) => void; onDelete: (p: PartnerDTO) => Promise<void>;
}) {
  const toast = useContentToast();
  const initial: PartnerInput = item
    ? { name: item.name, group: item.group, image: item.image, sort: item.sort, published: item.published, translations: withAllFields(item.translations, PARTNER_TR) }
    : { name: '', group: defaultGroup, image: null, sort: nextSort, published: true, translations: withAllFields(undefined, PARTNER_TR) };
  const form = useForm(partnerInput, initial);
  const v = form.values;

  const submit = form.handleSubmit(async data => {
    const { sort: _sort, ...rest } = { ...data, image: orNull(data.image) };
    const row = item
      ? await api.patch<PartnerDTO>(`/admin/partners/${item.id}`, rest)
      : await api.post<PartnerDTO>('/admin/partners', { ...rest, sort: nextSort });
    toast.saved(item ? 'Партнёр сохранён' : 'Партнёр добавлен');
    onSaved(row);
  }, toast.formError);

  return (
    <EditorDrawer
      title={item ? 'Редактирование партнёра' : 'Новый партнёр'}
      dirty={form.dirty}
      submitting={form.submitting}
      onSubmit={submit}
      onClose={onClose}
      onDelete={item ? () => onDelete(item) : undefined}
      error={form.errors._}
    >
      <TranslatableForm fields={PARTNER_TR} original={v} value={v.translations} onChange={t => form.set('translations', t)} errors={form.errors}>
      <Field label="Название" error={form.error('name')} required hint={<HintWithCount hint="Полное название с городом, например: Школа-лицей № 1, Астана." value={v.name} max={300} />}>
        <Textarea rows={2} value={v.name} onChange={e => form.set('name', e.target.value.replace(/\n/g, ' '))} data-autofocus />
      </Field>
      <Field label="Группа" error={form.error('group')}>
        <Segmented<Group> label="Группа" value={(v.group ?? 'schools') as Group} onChange={val => form.set('group', val)} options={PARTNER_GROUPS.map(id => ({ value: id, label: GROUP_LABELS[id] }))} />
      </Field>
      <Field label="Логотип или фото" error={form.error('image')} hint="Путь /images/… или https://… Без картинки на сайте будут инициалы.">
        <ImageUrlInput value={v.image} onChange={val => form.set('image', val)} fit="contain" />
      </Field>
      <div className="ct-row" aria-label="Как будет на сайте">
        <Thumb src={v.image} fallback={initials(v.name || 'AZ')} size="lg" />
        <span className="muted" style={{ fontSize: 13 }}>Так логотип выглядит в списке партнёров.</span>
      </div>
      <Switch label="Показывать на сайте" hint="Скрытый партнёр виден только в админке." checked={!!v.published} onChange={val => form.set('published', val)} />
      </TranslatableForm>
    </EditorDrawer>
  );
}
