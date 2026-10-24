import { useId, useState, type FormEvent } from 'react';
import { CircleCheck, Link2, Loader2, Mail, MapPin, MessageCircle, Phone, Send } from 'lucide-react';
import type { ApiError } from '@shared/schemas';
import { PageTitle, Panel } from '../components/ui';
import { useContent } from '../content/useContent';
import { safeHref, safeHrefOrNull } from '../content/safe-url';
import { useT } from '../i18n';

/**
 * Темы заявки. В заявку (и в админку) всегда уходит русское значение — менеджерам так проще;
 * язык посетителя виден по полю page (/kk/contacts, /en/contacts). Подписи — t.contacts.form.topics.
 */
const TOPICS = ['Участие в олимпиаде', 'Робототехника', 'Зарубежные лагеря', 'Сотрудничество со школой', 'Другое'];

type Field = 'name' | 'phone' | 'topic' | 'message';

/** Телефон: 10–20 символов из цифр, пробелов, скобок, «+» и «-» (как проверяет сервер), минимум 10 цифр. */
const PHONE_RE = /^[0-9\s()+-]{10,20}$/;
type Status = { kind: 'idle' } | { kind: 'sending' } | { kind: 'sent' } | { kind: 'error'; message: string };

/**
 * Заявка уходит на сервер (POST /api/leads) и попадает в админку, где её обрабатывают менеджеры.
 * Если отправить не получилось, форма предлагает написать в WhatsApp готовым сообщением.
 */
function RequestForm() {
  const { contacts } = useContent().settings;
  const t = useT().contacts.form;
  const topicLabel = (v: string) => t.topics[TOPICS.indexOf(v)] ?? v;
  const uid = useId();
  const [values, setValues] = useState<Record<Field, string>>({ name: '', phone: '', topic: TOPICS[0], message: '' });
  const [website, setWebsite] = useState(''); // ловушка для ботов: человек это поле не видит
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [status, setStatus] = useState<Status>({ kind: 'idle' });

  const set = (f: Field) => (e: { target: { value: string } }) => {
    setValues(v => ({ ...v, [f]: e.target.value }));
    if (errors[f]) setErrors(({ [f]: _, ...rest }) => rest);
  };

  const whatsappText = t.whatsappText({ name: values.name, phone: values.phone, topic: topicLabel(values.topic), message: values.message.trim() });
  const whatsappBase = safeHrefOrNull(contacts.whatsapp);
  const whatsappHref = whatsappBase ? `${whatsappBase}?text=${encodeURIComponent(whatsappText)}` : '#';

  /** Проверка до отправки — сообщения из словаря, на языке страницы (встроенные подсказки браузера отключены: noValidate). */
  const validate = (): Partial<Record<Field, string>> => {
    const out: Partial<Record<Field, string>> = {};
    if (!values.name.trim()) out.name = t.errors.name;
    const phone = values.phone.trim();
    if (!phone) out.phone = t.phoneRequired;
    else if (!PHONE_RE.test(phone) || phone.replace(/\D/g, '').length < 10) out.phone = t.errors.phone;
    return out;
  };

  const focusFirst = (fields: Partial<Record<Field, string>>) => {
    // Фокус на первое поле с ошибкой — так её сразу слышит и экранный диктор.
    const first = (['name', 'phone', 'topic', 'message'] as Field[]).find(f => fields[f]);
    if (first) document.getElementById(`${uid}-${first}`)?.focus();
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (status.kind === 'sending') return;
    const invalid = validate();
    if (Object.keys(invalid).length) {
      setErrors(invalid);
      setStatus({ kind: 'error', message: t.checkFields });
      focusFirst(invalid);
      return;
    }
    setStatus({ kind: 'sending' });
    setErrors({});
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ ...values, page: window.location.pathname.slice(0, 200), website }),
      });
      if (res.ok) {
        setStatus({ kind: 'sent' });
        setValues(v => ({ ...v, name: '', phone: '', message: '' }));
        return;
      }
      const data = (await res.json().catch(() => null)) as ApiError | null;
      if (res.status === 422 && data?.error.fields) {
        // Тексты ошибок сервера — русские; показываем свои, на языке страницы, по имени поля.
        const fields: Partial<Record<Field, string>> = {};
        for (const k of Object.keys(data.error.fields)) if (k in values) fields[k as Field] = t.errors[k as Field];
        setErrors(fields);
        setStatus({ kind: 'error', message: t.checkFields });
        focusFirst(fields);
        return;
      }
      if (res.status === 429) {
        setStatus({ kind: 'error', message: t.tooMany });
        return;
      }
      throw new Error(data?.error.message || `HTTP ${res.status}`);
    } catch {
      setStatus({ kind: 'error', message: t.failed });
    }
  };

  if (status.kind === 'sent') {
    return (
      <div className="form-success" role="status">
        <CircleCheck size={40} aria-hidden="true" />
        <h3 tabIndex={-1} ref={el => el?.focus()}>{t.sentTitle}</h3>
        <p>{t.sentText} <a href={safeHref(contacts.phoneHref)}>{contacts.phone}</a>.</p>
        <button type="button" className="btn btn-ghost" onClick={() => setStatus({ kind: 'idle' })}>{t.sentAgain}</button>
      </div>
    );
  }

  const fieldProps = (f: Field) => ({
    id: `${uid}-${f}`,
    value: values[f],
    onChange: set(f),
    'aria-invalid': errors[f] ? true : undefined,
    'aria-describedby': errors[f] ? `${uid}-${f}-err` : undefined,
  });
  const err = (f: Field) => errors[f] && <small className="field-error" id={`${uid}-${f}-err`}>{errors[f]}</small>;
  const sending = status.kind === 'sending';

  return (
    <form className="request-form" onSubmit={submit} noValidate aria-busy={sending || undefined}>
      <div className="field">
        <label htmlFor={`${uid}-name`}><span>{t.name}</span></label>
        <input {...fieldProps('name')} required aria-required="true" maxLength={120} autoComplete="name" />
        {err('name')}
      </div>
      <div className="field">
        <label htmlFor={`${uid}-phone`}><span>{t.phone}</span></label>
        <input {...fieldProps('phone')} required aria-required="true" type="tel" maxLength={20} autoComplete="tel" placeholder={t.phonePlaceholder} inputMode="tel" />
        {err('phone')}
      </div>
      <div className="field">
        <label htmlFor={`${uid}-topic`}><span>{t.topic}</span></label>
        <select {...fieldProps('topic')}>{TOPICS.map(v => <option key={v} value={v}>{topicLabel(v)}</option>)}</select>
        {err('topic')}
      </div>
      <div className="field">
        <label htmlFor={`${uid}-message`}><span>{t.message} <em className="optional">{t.optional}</em></span></label>
        <textarea {...fieldProps('message')} maxLength={2000} rows={3} placeholder={t.messagePlaceholder} />
        {err('message')}
      </div>
      {/* Ловушка для ботов: скрыта от людей и экранных дикторов, не попадает в порядок табуляции. */}
      <div className="hp-field" aria-hidden="true">
        <label htmlFor={`${uid}-website`}>{t.honeypot}</label>
        <input id={`${uid}-website`} name="website" type="text" tabIndex={-1} autoComplete="off" value={website} onChange={e => setWebsite(e.target.value)} />
      </div>
      <button type="submit" className="btn btn-primary" disabled={sending}>
        {sending ? <Loader2 size={17} className="spin" aria-hidden="true" /> : <Send size={17} aria-hidden="true" />}
        {sending ? t.sending : t.submit}
      </button>
      {status.kind === 'error' && <p className="form-error" role="alert">{status.message}</p>}
      <p className="form-note">{t.note}</p>
      <p className="form-alt">
        {t.or} <a href={whatsappHref} target="_blank" rel="noreferrer"><MessageCircle size={15} aria-hidden="true" />{t.whatsapp}</a>
      </p>
    </form>
  );
}

export default function Contacts() {
  const { contacts } = useContent().settings;
  const { nav, contacts: t } = useT();
  const items = [
    { Icon: MapPin, label: t.address, value: contacts.address, href: safeHrefOrNull(contacts.mapUrl) },
    { Icon: Phone, label: t.phone, value: contacts.phone, href: safeHrefOrNull(contacts.phoneHref) },
    { Icon: Mail, label: t.email, value: contacts.email, href: safeHrefOrNull(`mailto:${contacts.email}`) },
    { Icon: MessageCircle, label: 'WhatsApp', value: t.whatsappValue, href: safeHrefOrNull(contacts.whatsapp) },
    { Icon: Link2, label: 'Instagram', value: '@azgroup.kz', href: safeHrefOrNull(contacts.instagram) },
    { Icon: Link2, label: 'Taplink', value: t.taplinkValue, href: safeHrefOrNull(contacts.taplink) },
  ].filter((i): i is typeof i & { href: string } => !!(i.value && i.href));
  return (
    <>
      <PageTitle title={nav.contacts.title} lead={t.lead} />
      <div className="split">
        <Panel title={t.how}>
          <ul className="contact-list">
            {items.map(({ Icon, label, value, href }) => (
              <li key={label}>
                <a href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noreferrer">
                  <span className="tile-icon"><Icon size={20} aria-hidden="true" /></span>
                  <span><small>{label}</small>{value}</span>
                </a>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title={t.requestTitle} id="request">
          <p className="panel-lead">{t.requestLead}</p>
          <RequestForm />
        </Panel>
      </div>
    </>
  );
}
