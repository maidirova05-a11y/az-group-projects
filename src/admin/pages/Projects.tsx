/** Проекты: «Проекты с сайтами» (kind=site) и «Программы AZ Group» (kind=program), форма в Drawer, перестановка. */
import { useEffect, useMemo, useState } from 'react';
import { ExternalLink, LayoutGrid, Pencil, Plus, SearchX, Trash2 } from 'lucide-react';
import { projectInput, type ProjectDTO, type ProjectInput } from '@shared/schemas';
import { api } from '../api';
import { useAdminRoute } from '../router';
import {
  Badge, Button, Checkbox, EmptyState, ErrorState, Field, FormGrid, IconButton, ImageUrlInput, Input, PageHeader, Panel, SearchInput,
  Segmented, SortableList, Switch, Textarea, Toolbar, TranslatableForm, TranslationBadges, isIncomplete, translationStatus, useConfirm, useForm,
  SafeLink, UnsafeLinkBadge, isUnsafeImgSrc, useResource, withAllFields,
} from '../ui';
import { safeImgSrc } from '../../content/safe-url';
import { PROJECT_TR } from './content/trFields';
import {
  EditorDrawer, HiddenBadge, HintWithCount, ListSkeleton, PublishToggle, Thumb, applyOrder, domainFromUrl, matches, orNull, plural,
  slugConflict, slugify, spliceOrder, useContentToast, useEditorRoute,
} from './content/shared';

type Kind = ProjectDTO['kind'];
const KINDS: { value: Kind; label: string; one: string }[] = [
  { value: 'site', label: 'Проекты с сайтами', one: 'проект с сайтом' },
  { value: 'program', label: 'Программы AZ Group', one: 'программу' },
];
/** Категории, которые уже используются на сайте (для подсказок в форме). */
const KNOWN_CATEGORIES = ['Олимпиады', 'Наука', 'Робототехника', 'Зарубежные лагеря', 'Творчество', 'Фестивали'];

export default function ProjectsPage() {
  const list = useResource<ProjectDTO[]>('/admin/projects');
  const { query, setQuery } = useAdminRoute();
  const editor = useEditorRoute(list.data, list.loading, 'Проект не найден — возможно, его уже удалили');
  const kind: Kind = query.get('kind') === 'program' ? 'program' : 'site';
  const [q, setQ] = useState('');
  const [onlyMissing, setOnlyMissing] = useState(false);
  const toast = useContentToast();
  const confirm = useConfirm();

  const all = list.data ?? [];
  const inKind = all.filter(p => p.kind === kind);
  const missing = (p: ProjectDTO) => isIncomplete(translationStatus(p.translations, PROJECT_TR, p));
  const shown = inKind.filter(p => (!onlyMissing || missing(p)) && matches(q, p.name, p.category, p.domain, p.tagline, p.slug));
  const filtering = !!q.trim() || onlyMissing;
  const categories = useMemo(() => {
    const used = (list.data ?? []).map(p => p.category).filter(Boolean);
    return [...new Set([...KNOWN_CATEGORIES.filter(c => used.includes(c)), ...used, ...KNOWN_CATEGORIES])];
  }, [list.data]);

  const remove = async (p: ProjectDTO) => {
    if (!(await confirm({ title: 'Удалить проект?', message: <>«{p.name}» исчезнет с сайта. Действие нельзя отменить.</> }))) return false;
    try {
      await api.del(`/admin/projects/${p.id}`);
      list.setData(d => d?.filter(x => x.id !== p.id) ?? d);
      toast.saved('Проект удалён');
      return true;
    } catch (e) { toast.error(e); return false; }
  };

  const setPublished = async (p: ProjectDTO, published: boolean) => {
    try {
      const row = await api.patch<ProjectDTO>(`/admin/projects/${p.id}`, { published });
      list.setData(d => d?.map(x => (x.id === p.id ? row : x)) ?? d);
      toast.saved(published ? 'Проект опубликован' : 'Проект скрыт');
    } catch (e) { toast.error(e); }
  };

  const reorder = async (ids: number[]) => {
    const full = spliceOrder(all.map(p => p.id), ids);
    try {
      await api.put('/admin/reorder/projects', { ids: full });
      list.setData(d => (d ? applyOrder(d, full) : d));
      toast.saved('Порядок сохранён');
    } catch (e) { toast.error(e); throw e; }
  };

  const nextSort = all.reduce((m, p) => Math.max(m, p.sort), -1) + 1;
  const kindInfo = KINDS.find(k => k.value === kind)!;

  return (
    <>
      <PageHeader
        title="Проекты"
        description="Карточки на странице «Проекты»: проекты с отдельными сайтами и программы AZ Group. Порядок здесь — порядок на сайте."
        actions={<Button icon={Plus} onClick={editor.openNew}>Добавить {kindInfo.one}</Button>}
      />
      <Panel>
        <Toolbar>
          <Segmented
            label="Вид проекта"
            value={kind}
            onChange={v => { setQuery({ kind: v === 'site' ? null : v }); }}
            options={KINDS.map(k => ({ value: k.value, label: k.label, count: list.data ? all.filter(p => p.kind === k.value).length : undefined }))}
          />
          <SearchInput value={q} onChange={setQ} placeholder="Название, категория, домен…" label="Поиск проектов" />
          <Checkbox label={`Без перевода${list.data ? ` (${inKind.filter(missing).length})` : ''}`} checked={onlyMissing} onChange={setOnlyMissing} />
        </Toolbar>

        {list.error && !list.data ? (
          <ErrorState message={list.error} onRetry={() => void list.reload()} />
        ) : !list.data ? (
          <ListSkeleton />
        ) : inKind.length === 0 ? (
          <EmptyState
            icon={LayoutGrid}
            title={kind === 'site' ? 'Проектов с сайтами пока нет' : 'Программ пока нет'}
            text="Добавьте первую запись — она появится на странице «Проекты»."
            action={<Button icon={Plus} onClick={editor.openNew}>Добавить {kindInfo.one}</Button>}
          />
        ) : shown.length === 0 ? (
          <EmptyState icon={SearchX} compact title="Ничего не найдено" text={onlyMissing && !q.trim() ? 'Все проекты этого вида переведены.' : `По запросу «${q}» проектов нет.`} action={<Button variant="ghost" onClick={() => { setQ(''); setOnlyMissing(false); }}>Сбросить фильтры</Button>} />
        ) : (
          <>
            <SortableList
              items={shown}
              getId={p => p.id}
              itemLabel={p => p.name}
              label={`${kindInfo.label}: порядок на сайте`}
              disabled={filtering}
              onReorder={reorder}
              renderItem={p => (
                <div className={`ct-row${p.published ? '' : ' is-hidden'}`}>
                  {kind === 'site' && <Thumb src={p.logo} fallback={p.logo ? undefined : '—'} />}
                  <div className="ct-row-main">
                    <div className="ct-row-title">
                      <button type="button" className="ct-row-name" onClick={() => editor.openEdit(p.id)}>{p.name}</button>
                      <HiddenBadge published={p.published} />
                    </div>
                    <div className="ct-row-meta">
                      <Badge tone="info">{p.category}</Badge>
                      {(p.domain || p.url) && <span>{p.domain || domainFromUrl(p.url) || p.url}</span>}
                      <TranslationBadges status={translationStatus(p.translations, PROJECT_TR, p)} />
                      {p.tagline && <span className="hide-mobile">{p.tagline}</span>}
                    </div>
                  </div>
                  <div className="ct-row-side">
                    <PublishToggle published={p.published} name={p.name} onChange={v => setPublished(p, v)} />
                    {p.url && <SafeLink className="icon-btn icon-btn-plain" href={p.url} target="_blank" rel="noreferrer" aria-label={`Открыть сайт «${p.name}»`} title="Открыть сайт"><ExternalLink size={18} aria-hidden="true" /></SafeLink>}
                    <IconButton icon={Pencil} label={`Изменить «${p.name}»`} onClick={() => editor.openEdit(p.id)} />
                    <IconButton icon={Trash2} label={`Удалить «${p.name}»`} variant="danger" onClick={() => void remove(p)} />
                  </div>
                </div>
              )}
            />
            <p className="ct-list-foot">
              {filtering
                ? 'Чтобы менять порядок, сбросьте поиск и фильтр.'
                : `${inKind.length} ${plural(inKind.length, ['запись', 'записи', 'записей'])}. Перетащите за ручку слева или используйте стрелки — порядок сохранится сразу.`}
            </p>
          </>
        )}
      </Panel>

      {editor.open && (
        <ProjectForm
          key={editor.editing?.id ?? 'new'}
          item={editor.editing}
          defaultKind={kind}
          nextSort={nextSort}
          categories={categories}
          onClose={editor.close}
          onSaved={row => {
            list.setData(d => (d ? (d.some(x => x.id === row.id) ? d.map(x => (x.id === row.id ? row : x)) : [...d, row]) : d));
            if (row.kind !== kind) setQuery({ kind: row.kind === 'site' ? null : row.kind, edit: null, new: null });
            else editor.close();
          }}
          onDelete={async p => { if (await remove(p)) editor.close(); }}
        />
      )}
    </>
  );
}

function toInput(p: ProjectDTO): ProjectInput {
  const { id: _id, ...rest } = p;
  return { ...rest, translations: withAllFields(p.translations, PROJECT_TR) };
}

interface FormProps {
  item?: ProjectDTO;
  defaultKind: Kind;
  nextSort: number;
  categories: string[];
  onClose: () => void;
  onSaved: (row: ProjectDTO) => void;
  onDelete: (p: ProjectDTO) => Promise<void>;
}

function ProjectForm({ item, defaultKind, nextSort, categories, onClose, onSaved, onDelete }: FormProps) {
  const toast = useContentToast();
  const form = useForm(projectInput, item ? toInput(item) : {
    slug: '', kind: defaultKind, name: '', tagline: '', description: '', category: '', url: null, domain: null, logo: null, logoScale: 1, sort: nextSort, published: true,
    translations: withAllFields(undefined, PROJECT_TR),
  });
  const v = form.values;
  // Слаг и домен заполняются сами, пока их не поменяли руками.
  const [slugTouched, setSlugTouched] = useState(!!item);
  const [domainTouched, setDomainTouched] = useState(!!item?.domain && item.domain !== domainFromUrl(item.url));

  const submit = form.handleSubmit(async data => {
    const payload = { ...data, url: orNull(data.url), domain: orNull(data.domain), logo: orNull(data.logo) };
    let row: ProjectDTO;
    try {
      if (item) {
        const { sort: _sort, ...patch } = payload; // порядок меняется только перестановкой
        row = await api.patch<ProjectDTO>(`/admin/projects/${item.id}`, patch);
      } else {
        row = await api.post<ProjectDTO>('/admin/projects', { ...payload, sort: nextSort }); // в конец списка
      }
    } catch (e) { slugConflict(e); }
    toast.saved(item ? 'Проект сохранён' : 'Проект добавлен');
    onSaved(row);
  }, toast.formError);

  const scale = Number(v.logoScale ?? 1);
  const isSite = v.kind !== 'program';

  return (
    <EditorDrawer
      title={item ? `Проект: ${item.name}` : 'Новый проект'}
      dirty={form.dirty}
      submitting={form.submitting}
      onSubmit={submit}
      onClose={onClose}
      onDelete={item ? () => onDelete(item) : undefined}
      error={form.errors._}
    >
      <TranslatableForm fields={PROJECT_TR} original={v} value={v.translations} onChange={t => form.set('translations', t)} errors={form.errors}>
      <Field label="Вид" hint={isSite ? 'Карточка с логотипом в блоке «Проекты с отдельными сайтами».' : 'Строка с иллюстрацией категории в блоке «Программы AZ Group».'}>
        <Segmented label="Вид проекта" value={(v.kind ?? 'site') as Kind} onChange={k => form.set('kind', k)} options={KINDS.map(k => ({ value: k.value, label: k.label }))} />
      </Field>
      <FormGrid>
        <Field label="Название" error={form.error('name')} required wide hint={<HintWithCount value={v.name} max={160} />}>
          <Input
            value={v.name}
            data-autofocus
            onChange={e => {
              const name = e.target.value;
              form.set('name', name);
              if (!slugTouched) form.set('slug', slugify(name));
            }}
          />
        </Field>
        <Field label="Слаг (адрес)" error={form.error('slug')} required hint={item ? 'Латиница, цифры и дефис. Меняйте осторожно: на слаг могут ссылаться программы.' : 'Заполняется сам из названия; можно поправить.'}>
          <Input className="mono" value={v.slug} onChange={e => { setSlugTouched(true); form.set('slug', e.target.value.toLowerCase()); }} maxLength={60} spellCheck={false} />
        </Field>
        <Field label="Категория" error={form.error('category')} required hint="Выберите из списка или впишите новую — она появится в фильтре на сайте.">
          <Input value={v.category} onChange={e => form.set('category', e.target.value)} list="ct-project-categories" maxLength={60} />
        </Field>
        <div className="ct-chips field-wide" role="group" aria-label="Готовые категории">
          {categories.map(c => (
            <button key={c} type="button" className="ct-chip" aria-pressed={v.category === c} onClick={() => form.set('category', c)}>{c}</button>
          ))}
        </div>
        <datalist id="ct-project-categories">{categories.map(c => <option key={c} value={c} />)}</datalist>
        <Field label="Подзаголовок" error={form.error('tagline')} wide hint={<HintWithCount hint="Одна строка под названием." value={v.tagline} max={200} />}>
          <Input value={v.tagline ?? ''} onChange={e => form.set('tagline', e.target.value)} />
        </Field>
        <Field label="Описание" error={form.error('description')} wide hint={<HintWithCount hint="Короткий абзац о проекте." value={v.description} max={2000} />}>
          <Textarea rows={5} value={v.description ?? ''} onChange={e => form.set('description', e.target.value)} />
        </Field>
        <Field label="Ссылка на сайт" error={form.error('url')} hint="https://… — карточка станет ссылкой.">
          <Input
            type="url"
            inputMode="url"
            placeholder="https://"
            value={v.url ?? ''}
            onChange={e => {
              const url = e.target.value;
              form.set('url', url.trim() ? url : null);
              if (!domainTouched) form.set('domain', domainFromUrl(url) || null);
            }}
          />
        </Field>
        <Field label="Домен (подпись)" error={form.error('domain')} hint="Подставляется из ссылки; показывается внизу карточки.">
          <Input value={v.domain ?? ''} onChange={e => { setDomainTouched(true); form.set('domain', e.target.value || null); }} maxLength={120} placeholder="Например: example.kz" />
        </Field>
      </FormGrid>

      {isSite ? (
        <div className="ct-section">
          <p className="ct-section-title">Логотип</p>
          <Field label="Картинка логотипа" error={form.error('logo')} hint="Путь /logos/… или https://… Лучше PNG/SVG с прозрачным фоном.">
            <ImageUrlInput value={v.logo} onChange={val => form.set('logo', val)} fit="contain" />
          </Field>
          <Field label="Размер логотипа на сайте" error={form.error('logoScale')} hint="1 — обычный размер. Узкие логотипы увеличьте, крупные — уменьшите.">
            <div className="ct-scale">
              <input
                type="range" min={0.3} max={3} step={0.05} value={scale}
                onChange={e => form.set('logoScale', Number(e.target.value))}
                aria-label="Размер логотипа, ползунок"
              />
              <Input type="number" min={0.3} max={3} step={0.05} value={String(v.logoScale ?? 1)} onChange={e => form.set('logoScale', e.target.value === '' ? 1 : Number(e.target.value))} />
            </div>
          </Field>
          <div className="ct-scale-presets" role="group" aria-label="Готовые размеры">
            {[0.6, 0.8, 1, 1.3, 1.6].map(s => (
              <button key={s} type="button" className="ct-chip" aria-pressed={scale === s} onClick={() => form.set('logoScale', s)}>×{s}</button>
            ))}
          </div>
          <div>
            <div className="ct-logo-stage" aria-label="Предпросмотр логотипа">
              <LogoPreview src={v.logo} scale={scale} />
              <div className="ct-logo-card" style={{ alignContent: 'center', justifyItems: 'start', padding: '0 16px' }}>
                <strong style={{ overflowWrap: 'anywhere' }}>{v.name || 'Название проекта'}</strong>
                <span className="muted" style={{ fontSize: 12.5 }}>{v.category || 'Категория'}{v.domain ? ` · ${v.domain}` : ''}</span>
              </div>
            </div>
            <p className="ct-logo-caption">Так логотип выглядит в карточке на сайте (высота до {Math.round(Math.min(76, 46 * scale))} px)</p>
          </div>
        </div>
      ) : (
        <p className="notice notice-info">У программ на сайте нет логотипа — показывается иллюстрация по категории.</p>
      )}

      <Switch label="Показывать на сайте" hint="Скрытый проект виден только в админке." checked={!!v.published} onChange={val => form.set('published', val)} />
      </TranslatableForm>
    </EditorDrawer>
  );
}

/** Логотип как в карточке на сайте: высота до min(76, 46 × размер) px. */
function LogoPreview({ src, scale }: { src: string | null | undefined; scale: number }) {
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [src]);
  const safe = safeImgSrc(src);
  return (
    <div className="ct-logo-card">
      {safe && !broken
        ? <img src={safe} alt="" onError={() => setBroken(true)} style={{ maxHeight: `${Math.min(76, 46 * scale)}px` }} />
        : isUnsafeImgSrc(src)
          ? <UnsafeLinkBadge url={src} />
          : <span className="muted">{src ? 'Картинка не загрузилась' : 'Нет логотипа'}</span>}
    </div>
  );
}
