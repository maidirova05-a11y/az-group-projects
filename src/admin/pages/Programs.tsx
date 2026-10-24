/** «Программы и мероприятия»: календарь программ, их порядок и даты. */
import { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, Pencil, Plus, SearchX, Trash2 } from 'lucide-react';
import type { ProgramDTO, ProjectDTO } from '@shared/schemas';
import { api } from '../api';
import { useAdminRoute } from '../router';
import {
  Badge, Button, Checkbox, EmptyState, ErrorState, IconButton, PageHeader, Panel, SearchInput, Segmented, Skeleton, SortableList,
  StatusPill, Toolbar, TranslationBadges, isIncomplete, translationStatus, useConfirm, useResource, useToast,
} from '../ui';
import { EVENT_TR, PROGRAM_TR } from './content/trFields';
import { ProgramDrawer } from './programs/ProgramDrawer';
import { CATEGORY_LABELS, CATEGORY_OPTIONS, nearestEvent, plural, todayISO, type Category } from './programs/utils';
import './programs/programs.css';

type Filter = 'all' | Category;

/** Программы, где не переведена сама программа или хотя бы одно её мероприятие. */
const eventsMissing = (p: ProgramDTO) => p.events.filter(e => isIncomplete(translationStatus(e.translations, EVENT_TR, e))).length;
const programIncomplete = (p: ProgramDTO) => isIncomplete(translationStatus(p.translations, PROGRAM_TR, p)) || eventsMissing(p) > 0;

export default function ProgramsPage() {
  const list = useResource<ProgramDTO[]>('/admin/programs');
  const projects = useResource<ProjectDTO[]>('/admin/projects');
  const { query, setQuery } = useAdminRoute();
  const toast = useToast();
  const confirm = useConfirm();
  const [q, setQ] = useState('');
  const [onlyMissing, setOnlyMissing] = useState(false);
  const cat = query.get('cat');
  const filter: Filter = cat && cat in CATEGORY_LABELS ? (cat as Category) : 'all';
  const editId = query.get('edit');
  const isNew = query.get('new') === '1';
  const programs = list.data;
  const editing = editId && programs ? programs.find(p => p.id === Number(editId)) : undefined;
  const today = todayISO();
  /** Окно открыто нами через pushState — закрываем «Назад», чтобы история не копилась. */
  const pushed = useRef(false);
  /** Только что удалили программу из панели — не ругаться «не найдена», пока закрывается окно. */
  const justDeleted = useRef<number | null>(null);

  // Ссылка ?edit=ID на удалённую/несуществующую программу.
  useEffect(() => {
    if (editId && programs && !editing && !list.loading) {
      if (justDeleted.current === Number(editId)) return;
      toast.error('Программа не найдена');
      setQuery({ edit: null });
    }
  }, [editId, programs, editing, list.loading, toast, setQuery]);

  const open = (patch: { edit?: number; new?: 1 }) => {
    pushed.current = true;
    setQuery({ edit: null, new: null, ...patch }, { replace: false });
  };
  const closeDrawer = () => {
    if (pushed.current) { pushed.current = false; window.history.back(); }
    else setQuery({ edit: null, new: null });
  };

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: 0, science: 0, robotics: 0, international: 0 };
    programs?.forEach(p => { c.all++; c[p.category]++; });
    return c;
  }, [programs]);

  const stats = useMemo(() => {
    const evs = programs?.flatMap(p => p.events) ?? [];
    return { events: evs.length, upcoming: evs.filter(e => e.startDate && (e.endDate ?? e.startDate) >= today).length };
  }, [programs, today]);

  const needle = q.trim().toLowerCase();
  const visible = useMemo(() => (programs ?? []).filter(p =>
    (filter === 'all' || p.category === filter)
    && (!onlyMissing || programIncomplete(p))
    && (!needle || `${p.name} ${p.subtitle} ${p.slug}`.toLowerCase().includes(needle))), [programs, filter, needle, onlyMissing]);
  const missingCount = useMemo(() => (programs ?? []).filter(programIncomplete).length, [programs]);

  /** Новый порядок видимой части вставляем на их же места в общем списке. */
  const reorder = async (ids: number[]) => {
    if (!programs) return;
    const visibleSet = new Set(ids);
    const queue = [...ids];
    const full = programs.map(p => (visibleSet.has(p.id) ? queue.shift()! : p.id));
    try {
      await api.put('/admin/reorder/programs', { ids: full });
      const byId = new Map(programs.map(p => [p.id, p]));
      list.setData(full.map((id, i) => ({ ...byId.get(id)!, sort: i })));
      toast.success('Порядок сохранён');
    } catch (e) {
      toast.error(e);
      throw e;
    }
  };

  const remove = async (p: ProgramDTO) => {
    const n = p.events.length;
    const ok = await confirm({
      title: 'Удалить программу?',
      message: <>«{p.name}» исчезнет с сайта.{n > 0 && <> Вместе с ней будут удалены <b>{n} {plural(n, ['мероприятие', 'мероприятия', 'мероприятий'])}</b>.</>} Действие нельзя отменить.</>,
    });
    if (!ok) return;
    try { await api.del(`/admin/programs/${p.id}`); toast.success('Программа удалена'); void list.reload(); } catch (e) { toast.error(e); }
  };

  const filterOptions = [
    { value: 'all' as Filter, label: 'Все', count: counts.all },
    ...CATEGORY_OPTIONS.map(o => ({ value: o.value as Filter, label: o.label, count: counts[o.value] })),
  ];

  const description = programs
    ? `${programs.length} ${plural(programs.length, ['программа', 'программы', 'программ'])}, ${stats.events} ${plural(stats.events, ['мероприятие', 'мероприятия', 'мероприятий'])}, предстоит ${stats.upcoming}`
    : 'Календарь олимпиад, турниров и поездок на сайте';

  return (
    <>
      <PageHeader
        title="Программы и мероприятия"
        description={description}
        actions={<Button icon={Plus} onClick={() => open({ new: 1 })}>Добавить программу</Button>}
      />
      <Panel>
        <Toolbar>
          <SearchInput value={q} onChange={setQ} placeholder="Поиск по названию" label="Поиск программ" />
          <Segmented label="Категория" value={filter} options={filterOptions} onChange={f => setQuery({ cat: f === 'all' ? null : f })} />
          <Checkbox label={`Без перевода${programs ? ` (${missingCount})` : ''}`} checked={onlyMissing} onChange={setOnlyMissing} />
        </Toolbar>

        {list.error && !list.loading ? (
          <ErrorState message={list.error} onRetry={() => void list.reload()} />
        ) : !programs ? (
          <div className="pg-skeleton" aria-busy="true" aria-label="Загрузка программ">
            {Array.from({ length: 6 }, (_, i) => <Skeleton key={i} height={64} radius={14} />)}
          </div>
        ) : programs.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="Программ пока нет"
            text="Добавьте первую программу — например, олимпиаду — и её даты появятся в календаре на сайте."
            action={<Button icon={Plus} onClick={() => open({ new: 1 })}>Добавить программу</Button>}
          />
        ) : visible.length === 0 ? (
          <EmptyState
            compact
            icon={SearchX}
            title="Ничего не найдено"
            text={needle ? `По запросу «${q.trim()}» программ нет` : onlyMissing ? 'Все программы и мероприятия переведены' : 'В этой категории пока нет программ'}
            action={<Button variant="ghost" onClick={() => { setQ(''); setOnlyMissing(false); setQuery({ cat: null }); }}>Сбросить фильтры</Button>}
          />
        ) : (
          <>
            <p className="pg-hint muted">
              {needle
                ? 'Во время поиска порядок менять нельзя — очистите поиск.'
                : 'Порядок на сайте — как в списке. Перетащите за ручку слева или используйте стрелки.'}
            </p>
            <SortableList
              items={visible}
              getId={p => p.id}
              itemLabel={p => p.name}
              label="Порядок программ"
              disabled={!!needle || onlyMissing}
              onReorder={reorder}
              renderItem={p => {
                const next = nearestEvent(p, today);
                return (
                  <div className={`pg-row${p.published ? '' : ' pg-hidden'}`}>
                    <span className="pg-dot" style={{ background: p.color }} aria-hidden="true" />
                    <button type="button" className="pg-main" onClick={() => open({ edit: p.id })}>
                      <span className="pg-name">{p.name}</span>
                      {p.subtitle && <span className="pg-sub">{p.subtitle}</span>}
                    </button>
                    <div className="pg-meta">
                      {filter === 'all' && <Badge>{CATEGORY_LABELS[p.category]}</Badge>}
                      <Badge tone={p.events.length ? 'info' : 'warning'}>
                        {p.events.length ? `${p.events.length} ${plural(p.events.length, ['мероприятие', 'мероприятия', 'мероприятий'])}` : 'Нет мероприятий'}
                      </Badge>
                      <span className="pg-next" title="Ближайшее мероприятие">
                        {next ? <>Ближайшее: <b>{next.label}</b></> : <span className="muted">Нет предстоящих</span>}
                      </span>
                      <TranslationBadges status={translationStatus(p.translations, PROGRAM_TR, p)} />
                      {eventsMissing(p) > 0 && <Badge tone="warning" title="Мероприятия без полного перевода на KZ/ENG">мероприятий без перевода: {eventsMissing(p)}</Badge>}
                      <StatusPill published={p.published} />
                    </div>
                    <div className="pg-actions">
                      <IconButton icon={Pencil} label={`Изменить «${p.name}»`} onClick={() => open({ edit: p.id })} />
                      <IconButton icon={Trash2} label={`Удалить «${p.name}»`} variant="danger" onClick={() => void remove(p)} />
                    </div>
                  </div>
                );
              }}
            />
          </>
        )}
      </Panel>

      {programs && (isNew || editing) && (
        <ProgramDrawer
          key={editing?.id ?? 'new'}
          program={editing}
          programs={programs}
          projects={projects.data}
          defaultCategory={filter === 'all' ? undefined : filter}
          onClose={closeDrawer}
          onSaved={async created => {
            await list.reload();
            if (created) setQuery({ new: null, edit: created.id });
          }}
          onEventsChanged={() => list.reload()}
          onDeleted={() => { justDeleted.current = editing?.id ?? null; closeDrawer(); void list.reload(); }}
        />
      )}
    </>
  );
}
