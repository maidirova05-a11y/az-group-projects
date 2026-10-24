/** Панель создания / изменения программы и её мероприятий. */
import { useMemo, useState } from 'react';
import { CalendarPlus, Copy, ExternalLink, Pencil, Trash2 } from 'lucide-react';
import { programInput, type EventDTO, type ProgramDTO, type ProgramInput, type ProjectDTO } from '@shared/schemas';
import { api, ApiError } from '../../api';
import {
  Badge, Button, ColorInput, DataTable, Drawer, EmptyState, Field, FormGrid, IconButton, Input, Select, Switch,
  SafeLink, TranslatableForm, TranslationBadges, translationStatus, useConfirm, useForm, useToast, withAllFields,
} from '../../ui';
import { EVENT_TR, PROGRAM_TR } from '../content/trFields';
import { EventForm } from './EventForm';
import {
  CATEGORY_OPTIONS, EVENT_STATUS, PROGRAM_COLORS, cleanSlugInput, eventStatus, formatPrice, pickProgramColor, plural, shortDates, slugify, todayISO, type Category,
} from './utils';

export interface ProgramDrawerProps {
  /** Изменяемая программа; нет — создание новой. */
  program?: ProgramDTO;
  /** Все программы (для подсказок мест и порядка новой). */
  programs: ProgramDTO[];
  projects: ProjectDTO[] | null;
  /** Категория по умолчанию для новой программы. */
  defaultCategory?: Category;
  onClose: () => void;
  /** После сохранения программы (id — для только что созданной). */
  onSaved: (created?: ProgramDTO) => void | Promise<void>;
  /** После изменения мероприятий. */
  onEventsChanged: () => void | Promise<unknown>;
  onDeleted: () => void;
}

const SWATCHES = [...PROGRAM_COLORS];

const emptyProgram = (category: Category, sort: number, color: string): ProgramInput => ({
  name: '', slug: '', subtitle: '', category, color, projectSlug: null, sort, published: true,
  translations: withAllFields(undefined, PROGRAM_TR),
});

export function ProgramDrawer({ program, programs, projects, defaultCategory = 'science', onClose, onSaved, onEventsChanged, onDeleted }: ProgramDrawerProps) {
  const toast = useToast();
  const confirm = useConfirm();
  const initial = useMemo<ProgramInput>(() => program
    ? { name: program.name, slug: program.slug, subtitle: program.subtitle, category: program.category, color: program.color, projectSlug: program.projectSlug ?? null, sort: program.sort, published: program.published, translations: withAllFields(program.translations, PROGRAM_TR) }
    : emptyProgram(defaultCategory, programs.reduce((m, p) => Math.max(m, p.sort + 1), 0),
      pickProgramColor(programs.map(p => p.color))),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [program?.id]);
  const form = useForm(programInput, initial);
  const v = form.values;
  // На создании слаг строится из названия, пока его не поменяли вручную.
  const [slugAuto, setSlugAuto] = useState(!program);
  const [eventEdit, setEventEdit] = useState<{ event?: EventDTO; copyOf?: EventDTO } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const today = todayISO();

  const places = useMemo(() => {
    const s = new Set<string>();
    programs.forEach(p => p.events.forEach(e => e.place && s.add(e.place)));
    return [...s].sort((a, b) => a.localeCompare(b, 'ru'));
  }, [programs]);

  const colorTakenBy = useMemo(() => {
    const c = (v.color ?? '').toLowerCase();
    return programs.filter(p => p.id !== program?.id && p.color.toLowerCase() === c).map(p => p.name);
  }, [programs, program?.id, v.color]);

  const projectOptions = useMemo(() => {
    const opts = (projects ?? []).map(p => ({ value: p.slug, label: `${p.name}${p.published ? '' : ' (скрыт)'}` }));
    if (v.projectSlug && !opts.some(o => o.value === v.projectSlug)) opts.push({ value: v.projectSlug, label: `${v.projectSlug} (не найден)` });
    return opts;
  }, [projects, v.projectSlug]);

  const close = async () => {
    if (form.dirty && !(await confirm({ title: 'Закрыть без сохранения?', message: 'Изменения программы будут потеряны.', confirmLabel: 'Закрыть' }))) return;
    onClose();
  };

  const submit = form.handleSubmit(async data => {
    try {
      if (program) {
        const { sort: _sort, ...patch } = data; // порядок меняется перетаскиванием, не затираем
        await api.patch(`/admin/programs/${program.id}`, patch);
        toast.success('Программа сохранена');
        await onSaved();
      } else {
        const created = await api.post<ProgramDTO>('/admin/programs', data);
        toast.success('Программа создана — теперь добавьте мероприятия');
        await onSaved(created);
      }
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) throw new ApiError(422, 'validation', e.message, { slug: e.message });
      throw e;
    }
  }, toast.error);

  const removeProgram = async () => {
    if (!program) return;
    const n = program.events.length;
    const ok = await confirm({
      title: 'Удалить программу?',
      message: <>«{program.name}» исчезнет с сайта.{n > 0 && <> Вместе с ней будут удалены <b>{n} {plural(n, ['мероприятие', 'мероприятия', 'мероприятий'])}</b>.</>} Действие нельзя отменить.</>,
    });
    if (!ok) return;
    setDeleting(true);
    try {
      await api.del(`/admin/programs/${program.id}`);
      toast.success('Программа удалена');
      onDeleted();
    } catch (e) { toast.error(e); } finally { setDeleting(false); }
  };

  const removeEvent = async (e: EventDTO) => {
    if (!(await confirm({ title: 'Удалить мероприятие?', message: `${e.label} · ${e.place}` }))) return;
    try {
      await api.del(`/admin/events/${e.id}`);
      toast.success('Мероприятие удалено');
      await onEventsChanged();
    } catch (err) { toast.error(err); }
  };

  const busy = form.submitting || deleting;

  return (
    <>
      <Drawer
        open
        onClose={() => void close()}
        busy={busy}
        title={program ? program.name : 'Новая программа'}
        description={program ? 'Название, категория и мероприятия календаря' : 'После сохранения можно будет добавить мероприятия'}
        onSubmit={submit}
        footer={<>
          {program && <Button variant="danger" icon={Trash2} onClick={removeProgram} loading={deleting} disabled={form.submitting} className="pg-foot-delete">Удалить</Button>}
          <Button variant="ghost" onClick={() => void close()} disabled={busy}>{program && !form.dirty ? 'Закрыть' : 'Отмена'}</Button>
          <Button type="submit" loading={form.submitting} disabled={deleting}>{program ? 'Сохранить' : 'Создать программу'}</Button>
        </>}
      >
        <TranslatableForm
          fields={PROGRAM_TR}
          original={v}
          value={v.translations}
          onChange={t => form.set('translations', t)}
          errors={form.errors}
        >
        <FormGrid>
          <Field label="Название" required error={form.error('name')}>
            <Input
              value={v.name}
              maxLength={120}
              placeholder="Например: Fibonacci"
              data-autofocus
              onChange={e => {
                form.set('name', e.target.value);
                if (slugAuto) form.setValues({ slug: slugify(e.target.value) });
              }}
            />
          </Field>
          <Field label="Подзаголовок" error={form.error('subtitle')}>
            <Input value={v.subtitle ?? ''} maxLength={200} placeholder="Например: International Math Olympiad" onChange={e => form.set('subtitle', e.target.value)} />
          </Field>
          <Field label="Категория" required error={form.error('category')}>
            <Select value={v.category} options={CATEGORY_OPTIONS} onChange={e => form.set('category', e.target.value as Category)} />
          </Field>
          <Field label="Связанный проект" error={form.error('projectSlug')} hint="Кнопка «Подробнее» в календаре ведёт на проект">
            <Select value={v.projectSlug ?? ''} placeholder="— не связана —" options={projectOptions} onChange={e => form.set('projectSlug', e.target.value || null)} />
          </Field>
          <Field
            label="Адрес (слаг)"
            required
            error={form.error('slug')}
            hint={slugAuto ? 'Заполняется из названия автоматически' : 'Латиница, цифры и дефис'}
          >
            <Input
              className="mono"
              value={v.slug}
              maxLength={60}
              autoCapitalize="off"
              spellCheck={false}
              placeholder="Например: fibonacci-math"
              onChange={e => { setSlugAuto(false); form.set('slug', cleanSlugInput(e.target.value)); }}
              onBlur={() => { if (v.slug !== slugify(v.slug)) form.set('slug', slugify(v.slug)); }}
            />
          </Field>
          <Field
            label="Цвет"
            error={form.error('color')}
            hint={colorTakenBy.length > 0
              ? <span className="field-hint warn">Этот цвет уже у: {colorTakenBy.join(', ')} — в календаре программы будет сложно различить</span>
              : 'Цвет полоски и точки в календаре'}
          >
            <ColorInput value={v.color ?? '#e10926'} onChange={c => form.set('color', c)} swatches={SWATCHES} />
          </Field>
        </FormGrid>
        <Switch
          label="Показывать на сайте"
          hint={v.published ? 'Программа видна в календаре' : 'Скрыта — посетители её не видят'}
          checked={!!v.published}
          onChange={b => form.set('published', b)}
        />
        </TranslatableForm>
        {form.errors._ && !Object.entries(form.errors).some(([k, m]) => k !== '_' && m === form.errors._) && <p className="notice notice-error" role="alert">{form.errors._}</p>}

        <section className="pg-events" aria-labelledby="pg-events-title">
          <div className="pg-events-head">
            <h3 id="pg-events-title">
              Мероприятия {program && <span className="muted">· {program.events.length}</span>}
            </h3>
            {program && <Button size="sm" icon={CalendarPlus} onClick={() => setEventEdit({})}>Добавить мероприятие</Button>}
          </div>
          {!program ? (
            <p className="notice notice-info">Сначала сохраните программу — затем здесь появятся её даты.</p>
          ) : program.events.length === 0 ? (
            <EmptyState
              compact
              icon={CalendarPlus}
              title="Мероприятий пока нет"
              text="Добавьте даты — они появятся в календаре на сайте."
              action={<Button size="sm" icon={CalendarPlus} onClick={() => setEventEdit({})}>Добавить мероприятие</Button>}
            />
          ) : (
            <DataTable
              rows={program.events}
              rowKey={e => e.id}
              caption={`Мероприятия программы ${program.name}`}
              onRowClick={e => setEventEdit({ event: e })}
              rowClassName={e => (eventStatus(e, today) === 'past' ? 'pg-past' : undefined)}
              columns={[
                { key: 'label', header: 'Дата', primary: true, render: e => <span className="pg-ev-label">{e.label}</span> },
                { key: 'dates', header: 'Период', render: e => <span className="mono pg-nowrap">{shortDates(e)}</span>, hideOnMobile: true },
                { key: 'place', header: 'Место' },
                { key: 'price', header: 'Цена', render: e => <span className="pg-nowrap">{formatPrice(e.price)}</span> },
                { key: 'tr', header: 'Перевод', render: e => <TranslationBadges status={translationStatus(e.translations, EVENT_TR, e)} />, hideOnMobile: true },
                {
                  key: 'status', header: 'Статус', render: e => {
                    const s = EVENT_STATUS[eventStatus(e, today)];
                    return <Badge tone={s.tone} dot>{s.label}</Badge>;
                  },
                },
              ]}
              actions={e => <>
                {e.registrationUrl && (
                  <SafeLink className="icon-btn icon-btn-plain icon-btn-sm" href={e.registrationUrl} target="_blank" rel="noreferrer" aria-label="Открыть ссылку на регистрацию" title="Регистрация">
                    <ExternalLink size={16} aria-hidden="true" />
                  </SafeLink>
                )}
                <IconButton size="sm" icon={Copy} label="Дублировать" onClick={() => setEventEdit({ copyOf: e })} />
                <IconButton size="sm" icon={Pencil} label="Изменить" onClick={() => setEventEdit({ event: e })} />
                <IconButton size="sm" icon={Trash2} label="Удалить мероприятие" variant="danger" onClick={() => void removeEvent(e)} />
              </>}
            />
          )}
        </section>
      </Drawer>
      {/* Окно мероприятия — вне Drawer, чтобы его submit не всплывал в форму программы. */}
      {program && eventEdit && (
        <EventForm
          key={eventEdit.event?.id ?? `new-${eventEdit.copyOf?.id ?? 0}`}
          programId={program.id}
          programName={program.name}
          event={eventEdit.event}
          copyOf={eventEdit.copyOf}
          places={places}
          onClose={() => setEventEdit(null)}
          onSaved={() => void onEventsChanged()}
        />
      )}
    </>
  );
}
