/**
 * Регистрация на мероприятия — на основном сайте (раньше — личный кабинет az-group.kz).
 * Участник выбирает программу и дату (город), заполняет анкету и принимает оферту; регистрация уходит
 * в POST /api/registrations и появляется в админке («Регистрации»). Для платных программ со ссылкой на оплату
 * сразу показывается кнопка «Оплатить через Kaspi».
 * Предвыбор: /register?event=<id события> или /register?program=<slug программы>.
 */
import { useId, useMemo, useState, type FormEvent } from 'react';
import { CircleCheck, CreditCard, Loader2, MessageCircle, Send, UserPlus } from 'lucide-react';
import { GRADES, type ApiError, type EventDTO, type ProgramDTO, type RegistrationCreated } from '@shared/schemas';
import { PageTitle, Panel } from '../components/ui';
import { useContent, useContentStatus } from '../content/useContent';
import { eventStatus, toISODate } from '../content/calendar';
import { safeHref, safeHrefOrNull } from '../content/safe-url';
import { visitSource } from '../content/visit';
import { useI18n } from '../i18n';
import { localizeHref } from '../router';

type Field = 'programId' | 'eventId' | 'participantName' | 'grade' | 'school' | 'city' | 'subjects' | 'contactName' | 'phone' | 'email' | 'comment';
type Values = Record<Field, string>;
const PHONE_RE = /^[0-9\s()+-]{10,20}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMPTY: Values = { programId: '', eventId: '', participantName: '', grade: '', school: '', city: '', subjects: '', contactName: '', phone: '', email: '', comment: '' };
type Status = { kind: 'idle' } | { kind: 'sending' } | { kind: 'done'; res: RegistrationCreated; program: string; event: string } | { kind: 'error'; message: string };

/** Даты, на которые ещё можно зарегистрироваться: будущие и текущие, а также «в течение сезона». */
const openEvents = (p: ProgramDTO, today: string) => p.events.filter(e => eventStatus(e, today) !== 'past');

export default function Register({ query }: { query: URLSearchParams }) {
  const { programs, settings: { contacts } } = useContent();
  const { settled } = useContentStatus();
  const { t, price } = useI18n();
  const T = t.register;
  const uid = useId();
  const [today] = useState(() => toISODate(new Date()));

  // Программы, на которые открыта регистрация (есть будущие даты или «в течение сезона»).
  const open = useMemo(() => programs.filter(p => openEvents(p, today).length > 0), [programs, today]);

  // Предвыбор из адреса: ?event=N → программа и дата, ?program=slug → программа.
  const preset = useMemo((): Pick<Values, 'programId' | 'eventId'> => {
    const ev = Number(query.get('event'));
    if (ev) for (const p of open) if (openEvents(p, today).some(e => e.id === ev)) return { programId: String(p.id), eventId: String(ev) };
    const slug = query.get('program');
    const p = slug ? open.find(x => x.slug === slug) : undefined;
    return { programId: p ? String(p.id) : '', eventId: '' };
  }, [open, query, today]);

  const [values, setValues] = useState<Values>(() => ({ ...EMPTY, ...preset }));
  // Живые данные API пришли позже статических — применяем предвыбор, пока посетитель ничего не выбрал сам.
  const [presetKey, setPresetKey] = useState(`${preset.programId}|${preset.eventId}`);
  if (`${preset.programId}|${preset.eventId}` !== presetKey && !values.participantName) {
    setPresetKey(`${preset.programId}|${preset.eventId}`);
    setValues(v => ({ ...v, ...preset }));
  }
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState('');
  const [errors, setErrors] = useState<Partial<Record<Field | 'consent', string>>>({});
  const [status, setStatus] = useState<Status>({ kind: 'idle' });

  const program = open.find(p => String(p.id) === values.programId);
  const events: EventDTO[] = program ? openEvents(program, today) : [];
  const event = events.find(e => String(e.id) === values.eventId);
  const amount = event?.price ?? null;

  const set = (f: Field) => (e: { target: { value: string } }) => {
    const value = e.target.value;
    setValues(v => ({ ...v, [f]: value, ...(f === 'programId' ? { eventId: '' } : {}) }));
    if (errors[f]) setErrors(({ [f]: _, ...rest }) => rest);
  };

  const validate = () => {
    const out: Partial<Record<Field | 'consent', string>> = {};
    if (!program) out.programId = T.errors.programId;
    if (program && events.some(e => e.startDate) && !values.eventId) out.eventId = T.errors.eventId;
    if (!values.participantName.trim()) out.participantName = T.errors.participantName;
    if (!values.grade) out.grade = T.errors.grade;
    if (!values.city.trim()) out.city = T.errors.city;
    const phone = values.phone.trim();
    if (!PHONE_RE.test(phone) || phone.replace(/\D/g, '').length < 10) out.phone = T.errors.phone;
    if (values.email.trim() && !EMAIL_RE.test(values.email.trim())) out.email = T.errors.email;
    if (!consent) out.consent = T.errors.consent;
    return out;
  };
  const ORDER: (Field | 'consent')[] = ['programId', 'eventId', 'participantName', 'grade', 'school', 'city', 'subjects', 'contactName', 'phone', 'email', 'comment', 'consent'];
  const focusFirst = (f: Partial<Record<Field | 'consent', string>>) => {
    const first = ORDER.find(k => f[k]);
    if (first) document.getElementById(`${uid}-${first}`)?.focus();
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (status.kind === 'sending') return;
    const invalid = validate();
    if (Object.keys(invalid).length) { setErrors(invalid); setStatus({ kind: 'error', message: T.checkFields }); focusFirst(invalid); return; }
    setStatus({ kind: 'sending' });
    setErrors({});
    try {
      const res = await fetch('/api/registrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          programId: Number(values.programId), eventId: values.eventId ? Number(values.eventId) : null,
          participantName: values.participantName, grade: values.grade, school: values.school, city: values.city,
          subjects: values.subjects, contactName: values.contactName, phone: values.phone, email: values.email,
          comment: values.comment, consent, website, ...visitSource(),
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as RegistrationCreated;
        setStatus({
          kind: 'done', res: data,
          program: program ? [program.name, program.subtitle].filter(Boolean).join(' — ') : '',
          event: event ? `${event.label} · ${event.place}` : '',
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      const data = (await res.json().catch(() => null)) as ApiError | null;
      if (res.status === 422 && data?.error.fields) {
        const fields: Partial<Record<Field | 'consent', string>> = {};
        for (const k of Object.keys(data.error.fields)) if ((ORDER as string[]).includes(k)) fields[k as Field] = T.errors[k] ?? T.checkFields;
        setErrors(fields); setStatus({ kind: 'error', message: T.checkFields }); focusFirst(fields);
        return;
      }
      setStatus({ kind: 'error', message: res.status === 429 ? T.tooMany : T.failed });
    } catch {
      setStatus({ kind: 'error', message: T.failed });
    }
  };

  const whatsapp = safeHrefOrNull(contacts.whatsapp);
  const title = <PageTitle title={t.nav.register.title} lead={T.lead} />;

  if (status.kind === 'done') {
    const { res } = status;
    const pay = safeHrefOrNull(res.paymentUrl);
    return (
      <>
        {title}
        <Panel>
          <div className="form-success reg-success" role="status">
            <CircleCheck size={44} aria-hidden="true" />
            <h2 tabIndex={-1} ref={el => el?.focus()}>{T.doneTitle}</h2>
            {res.id > 0 && <p className="reg-number">{T.doneNumber(res.id)}</p>}
            <p><strong>{status.program}</strong>{status.event && <><br />{status.event}</>}</p>
            {res.amount != null && res.amount > 0 && <p>{T.price}: <strong>{price(res.amount)}</strong></p>}
            <p>{pay ? T.donePay : res.amount === 0 ? T.doneFree : T.doneCall}</p>
            <div className="title-actions reg-actions">
              {pay && <a className="btn btn-primary" href={pay} target="_blank" rel="noreferrer"><CreditCard size={17} aria-hidden="true" />{T.pay}</a>}
              <button type="button" className="btn btn-ghost" onClick={() => { setValues(v => ({ ...v, participantName: '', grade: '', subjects: '', comment: '' })); setConsent(false); setStatus({ kind: 'idle' }); }}>
                <UserPlus size={17} aria-hidden="true" />{T.another}
              </button>
            </div>
          </div>
        </Panel>
      </>
    );
  }

  const fieldProps = (f: Field) => ({
    id: `${uid}-${f}`,
    value: values[f],
    onChange: set(f),
    'aria-invalid': errors[f] ? true : undefined,
    'aria-describedby': errors[f] ? `${uid}-${f}-err` : undefined,
  });
  const err = (f: Field | 'consent') => errors[f] && <small className="field-error" id={`${uid}-${f}-err`}>{errors[f]}</small>;
  const label = (f: Field, text: string, optional = false) => (
    <label htmlFor={`${uid}-${f}`}><span>{text}{optional && <> <em className="optional">{T.optional}</em></>}</span></label>
  );
  const sending = status.kind === 'sending';
  const gradeName = (g: string) => (g === 'teacher' ? T.gradeTeacher : g === 'other' ? T.gradeOther : T.gradeN(g));
  const eventName = (e: EventDTO) => `${e.label} · ${e.place}${e.price != null ? ` · ${e.price ? price(e.price) : t.events.free}` : ''}`;

  return (
    <>
      {title}
      <Panel title={T.formTitle}>
        <form className="request-form reg-form" onSubmit={submit} noValidate aria-busy={sending || undefined}>
          <fieldset className="reg-group">
            <legend>{T.event}</legend>
            <div className="field">
              {label('programId', T.event)}
              <select {...fieldProps('programId')} required aria-required="true" disabled={!open.length && !settled}>
                <option value="">{T.eventPlaceholder}</option>
                {open.map(p => <option key={p.id} value={p.id}>{[p.name, p.subtitle].filter(Boolean).join(' — ')}</option>)}
              </select>
              {err('programId')}
            </div>
            {program && (
              <div className="field">
                {label('eventId', T.date)}
                <select {...fieldProps('eventId')}>
                  <option value="">{T.dateUnknown}</option>
                  {events.map(e => <option key={e.id} value={e.id}>{eventName(e)}</option>)}
                </select>
                {!events.some(e => e.startDate) && <small className="form-note">{T.noDates}</small>}
                {err('eventId')}
              </div>
            )}
            {amount != null && amount > 0 && <p className="reg-price">{T.price}: <strong>{price(amount)}</strong></p>}
          </fieldset>

          <fieldset className="reg-group">
            <legend>{T.participant}</legend>
            <div className="field">
              {label('participantName', T.participantName)}
              <input {...fieldProps('participantName')} required aria-required="true" maxLength={160} autoComplete="name" placeholder={T.participantPlaceholder} />
              {err('participantName')}
            </div>
            <div className="reg-row">
              <div className="field">
                {label('grade', T.grade)}
                <select {...fieldProps('grade')} required aria-required="true">
                  <option value="">{T.gradePlaceholder}</option>
                  {GRADES.map(g => <option key={g} value={g}>{gradeName(g)}</option>)}
                </select>
                {err('grade')}
              </div>
              <div className="field">
                {label('city', T.city)}
                <input {...fieldProps('city')} required aria-required="true" maxLength={80} autoComplete="address-level2" />
                {err('city')}
              </div>
            </div>
            <div className="field">
              {label('school', T.school, true)}
              <input {...fieldProps('school')} maxLength={200} autoComplete="organization" placeholder={T.schoolPlaceholder} />
            </div>
            <div className="field">
              {label('subjects', T.subjects, true)}
              <input {...fieldProps('subjects')} maxLength={300} placeholder={T.subjectsPlaceholder} />
            </div>
          </fieldset>

          <fieldset className="reg-group">
            <legend>{T.contact}</legend>
            <div className="field">
              {label('contactName', T.contactName, true)}
              <input {...fieldProps('contactName')} maxLength={160} placeholder={T.contactNamePlaceholder} />
            </div>
            <div className="reg-row">
              <div className="field">
                {label('phone', T.phone)}
                <input {...fieldProps('phone')} required aria-required="true" type="tel" maxLength={20} autoComplete="tel" inputMode="tel" placeholder={t.contacts.form.phonePlaceholder} />
                {err('phone')}
              </div>
              <div className="field">
                {label('email', T.email, true)}
                <input {...fieldProps('email')} type="email" maxLength={200} autoComplete="email" inputMode="email" />
                {err('email')}
              </div>
            </div>
            <div className="field">
              {label('comment', T.comment, true)}
              <textarea {...fieldProps('comment')} maxLength={1000} rows={3} placeholder={T.commentPlaceholder} />
            </div>
          </fieldset>

          <label className="reg-consent" htmlFor={`${uid}-consent`}>
            <input
              id={`${uid}-consent`} type="checkbox" checked={consent}
              onChange={e => { setConsent(e.target.checked); if (errors.consent) setErrors(({ consent: _, ...rest }) => rest); }}
              aria-invalid={errors.consent ? true : undefined} aria-describedby={errors.consent ? `${uid}-consent-err` : undefined}
            />
            <span>{T.consentBefore}<a href={localizeHref('/offer')} target="_blank" rel="noreferrer">{T.consentLink}</a>{T.consentAfter}</span>
          </label>
          {err('consent')}

          <div className="hp-field" aria-hidden="true">
            <label htmlFor={`${uid}-website`}>{t.contacts.form.honeypot}</label>
            <input id={`${uid}-website`} name="website" type="text" tabIndex={-1} autoComplete="off" value={website} onChange={e => setWebsite(e.target.value)} />
          </div>

          <button type="submit" className="btn btn-primary" disabled={sending}>
            {sending ? <Loader2 size={17} className="spin" aria-hidden="true" /> : <Send size={17} aria-hidden="true" />}
            {sending ? T.sending : T.submit}
          </button>
          {status.kind === 'error' && <p className="form-error" role="alert">{status.message}</p>}
          {whatsapp && (
            <p className="form-alt">{T.questions} <a href={safeHref(whatsapp)} target="_blank" rel="noreferrer"><MessageCircle size={15} aria-hidden="true" />{T.whatsapp}</a></p>
          )}
        </form>
      </Panel>
    </>
  );
}
