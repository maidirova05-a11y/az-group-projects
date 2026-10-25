/** Окно добавления / изменения / копирования мероприятия программы. */
import { useMemo, useState } from 'react';
import { Wand2 } from 'lucide-react';
import { eventInput, type EventDTO, type EventInput } from '@shared/schemas';
import { api } from '../../api';
import { Button, Checkbox, DateInput, Field, FormGrid, Input, Modal, TranslatableForm, useForm, useToast, withAllFields } from '../../ui';
import { EVENT_TR } from '../content/trFields';
import { firstDayOfMonth, formatPrice, lastDayOfMonth, suggestLabel } from './utils';

/** zod-union отдаёт «Invalid input» — показываем понятный текст. */
const urlError = (e?: string) => (e && /invalid input/i.test(e) ? 'Ссылка должна начинаться с https:// или с /' : e);

type Values = Partial<EventInput> & { label: string; place: string };

export interface EventFormProps {
  programId: number;
  programName: string;
  /** Изменяемое мероприятие. */
  event?: EventDTO;
  /** Мероприятие-образец для копии (создаётся новое). */
  copyOf?: EventDTO;
  /** Места из других мероприятий — для подсказок. */
  places: string[];
  onClose: () => void;
  onSaved: () => void;
}

function initialValues(src?: EventDTO, copy = false): Values {
  if (!src) return { label: '', place: '', startDate: null, endDate: null, monthOnly: false, registrationUrl: null, price: null, sort: 0, translations: withAllFields(undefined, EVENT_TR) };
  const translations = withAllFields(src.translations, EVENT_TR);
  // В копии даты другие — перевод подписи даты не переносим, место оставляем.
  if (copy) { translations.kk.label = ''; translations.en.label = ''; }
  return {
    label: src.label, place: src.place, startDate: src.startDate, endDate: src.endDate, monthOnly: src.monthOnly,
    registrationUrl: src.registrationUrl, price: src.price, sort: src.sort, translations,
  };
}

export function EventForm({ programId, programName, event, copyOf, places, onClose, onSaved }: EventFormProps) {
  const toast = useToast();
  const init = useMemo(() => initialValues(event ?? copyOf, !event && !!copyOf), [event, copyOf]);
  const form = useForm(eventInput, init as EventInput);
  const v = form.values as Values;
  const monthOnly = !!v.monthOnly;
  const suggestion = suggestLabel(v.startDate, v.endDate, monthOnly);
  // Подпись обновляется по датам, пока менеджер не написал свою.
  const [labelAuto, setLabelAuto] = useState(() => !init.label || init.label === suggestLabel(init.startDate, init.endDate, !!init.monthOnly));

  const setDates = (patch: Pick<Values, 'startDate' | 'endDate' | 'monthOnly'>) => {
    const next = { ...v, ...patch };
    const label = labelAuto ? suggestLabel(next.startDate, next.endDate, !!next.monthOnly) || v.label : v.label;
    form.setValues({ ...patch, label });
    const { startDate: _s, endDate: _e, label: _l, _: _g, ...rest } = form.errors;
    form.setErrors(rest);
  };

  const toggleMonthOnly = (on: boolean) => {
    if (on) {
      setDates({
        monthOnly: true,
        startDate: v.startDate ? firstDayOfMonth(v.startDate) : null,
        endDate: v.endDate ? lastDayOfMonth(v.endDate) : v.startDate ? lastDayOfMonth(v.startDate) : null,
      });
    } else {
      setDates({ monthOnly: false, startDate: v.startDate ?? null, endDate: v.endDate && v.endDate !== v.startDate ? v.endDate : null });
    }
  };

  const save = form.handleSubmit(async data => {
    const body: EventInput = { ...data };
    if (body.monthOnly && body.startDate && !body.endDate) body.endDate = lastDayOfMonth(body.startDate);
    if (event) await api.patch(`/admin/events/${event.id}`, body);
    else await api.post(`/admin/programs/${programId}/events`, body);
    toast.success(event ? 'Мероприятие сохранено' : 'Мероприятие добавлено');
    onSaved();
    onClose();
  }, toast.error);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (v.endDate && !v.startDate) {
      form.setErrors({ startDate: 'Укажите дату начала' });
      return;
    }
    void save();
  };

  const title = event ? 'Изменить мероприятие' : copyOf ? 'Копия мероприятия' : 'Новое мероприятие';
  const listId = `places-${programId}`;

  return (
    <Modal
      open
      onClose={onClose}
      busy={form.submitting}
      closeOnBackdrop={false}
      title={title}
      description={programName}
      onSubmit={onSubmit}
      footer={<>
        <Button variant="ghost" onClick={onClose} disabled={form.submitting}>Отмена</Button>
        <Button type="submit" loading={form.submitting}>{event ? 'Сохранить' : 'Добавить'}</Button>
      </>}
    >
      {copyOf && <p className="notice notice-info">Это копия мероприятия «{copyOf.label}». Поменяйте даты и место и сохраните.</p>}
      <TranslatableForm fields={EVENT_TR} original={v} value={v.translations} onChange={t => form.set('translations', t)} errors={form.errors}>
      <Checkbox
        label="Известен только месяц"
        hint="Например, «Апрель 2027» — точные дни ещё не объявлены"
        checked={monthOnly}
        onChange={toggleMonthOnly}
      />
      <FormGrid>
        <Field label={monthOnly ? 'Месяц начала' : 'Дата начала'} error={form.error('startDate')} hint="Пусто — мероприятие без даты">
          <DateInput
            mode={monthOnly ? 'month' : 'date'}
            value={v.startDate}
            onChange={d => setDates({ startDate: d, endDate: v.endDate && d && v.endDate < d ? null : v.endDate })}
            data-autofocus
          />
        </Field>
        <Field label={monthOnly ? 'Месяц окончания' : 'Дата окончания'} error={form.error('endDate')} hint={monthOnly ? 'Если несколько месяцев' : 'Если мероприятие длится несколько дней'}>
          <DateInput
            mode={monthOnly ? 'month' : 'date'}
            value={v.endDate}
            min={v.startDate ? (monthOnly ? v.startDate.slice(0, 7) : v.startDate) : undefined}
            disabled={!v.startDate}
            onChange={d => setDates({ endDate: d ? (monthOnly ? lastDayOfMonth(d) : d) : null })}
          />
        </Field>
        <Field
          label="Подпись даты на сайте"
          required
          wide
          error={form.error('label')}
          hint={labelAuto && suggestion ? 'Подставлено из дат — можно изменить' : !v.startDate ? 'Например: «В каникулы», «В течение учебного года»' : undefined}
        >
          <div className="pg-label-row">
            <Input
              value={v.label}
              maxLength={120}
              placeholder={suggestion || 'В каникулы'}
              onChange={e => {
                form.set('label', e.target.value);
                setLabelAuto(e.target.value === '' || e.target.value === suggestion);
              }}
            />
            {suggestion && v.label !== suggestion && (
              <Button variant="outline" size="sm" icon={Wand2} onClick={() => { form.set('label', suggestion); setLabelAuto(true); }} title={`Подставить «${suggestion}»`}>
                {suggestion}
              </Button>
            )}
          </div>
        </Field>
        <Field label="Место" required error={form.error('place')} hint="Город или «Онлайн»">
          <Input value={v.place} maxLength={160} list={listId} onChange={e => form.set('place', e.target.value)} placeholder="Например: Астана" />
        </Field>
        <Field label="Стоимость, ₸" error={form.error('price')} hint={v.price === null || v.price === undefined ? 'Пусто — не показывать; 0 — бесплатно' : formatPrice(v.price)}>
          <Input
            inputMode="numeric"
            value={v.price ?? ''}
            placeholder="Например: 15000"
            onChange={e => {
              const digits = e.target.value.replace(/\D/g, '').slice(0, 9);
              form.set('price', digits === '' ? null : Number(digits));
            }}
          />
        </Field>
        <Field label="Ссылка на регистрацию" wide error={urlError(form.error('registrationUrl'))} hint="Оставьте пустым — участники зарегистрируются на этом сайте (/register). Заполняйте, только если регистрация идёт на сайте партнёра.">
          <Input
            type="url"
            inputMode="url"
            value={v.registrationUrl ?? ''}
            placeholder="https://"
            onChange={e => form.set('registrationUrl', e.target.value.trim() ? e.target.value.trim() : null)}
          />
        </Field>
      </FormGrid>
      <datalist id={listId}>
        {places.map(p => <option key={p} value={p} />)}
      </datalist>
      </TranslatableForm>
      {form.errors._ && <p className="notice notice-error" role="alert">{form.errors._}</p>}
    </Modal>
  );
}
