/** Раздел настроек «Контакты». */
import { z } from 'zod';
import { contactsSetting } from '@shared/schemas';
import { Field, FormGrid, Input, useForm } from '../../../ui';
import { telHref } from '../format';
import { SectionShell, useSave, type Contacts, type SectionProps } from './shared';

// ---------- Контакты ----------

/** Та же схема, но с русским текстом ошибки e-mail (в общей схеме — стандартный английский). */
const contactsForm = contactsSetting.extend({ email: z.email('Введите корректный e-mail') });
const CONTACT_MAX: Partial<Record<keyof Contacts, number>> = { address: 200, mapUrl: 2000, phone: 40, whatsapp: 300, instagram: 300, taplink: 300, offer: 300 };

export function ContactsForm({ initial, onSaved, onDirty }: SectionProps<Contacts>) {
  const form = useForm(contactsForm, initial);
  const { toast, save } = useSave<Contacts>('contacts', onSaved);
  const v = form.values;
  const text = (k: keyof Contacts, label: string, opts: { hint?: string; placeholder?: string; wide?: boolean; type?: string; required?: boolean } = {}) => (
    <Field label={label} error={form.error(k)} hint={opts.hint} wide={opts.wide} required={opts.required}>
      <Input type={opts.type ?? 'text'} maxLength={CONTACT_MAX[k]} value={v[k] ?? ''} placeholder={opts.placeholder} onChange={e => form.set(k, e.target.value)} />
    </Field>
  );
  return (
    <SectionShell title="Контакты" description="Показываются в шапке, подвале и на странице «Контакты»." form={form} onDirty={onDirty} onSubmit={form.handleSubmit(save, toast.error)}>
      <FormGrid>
        {text('address', 'Адрес', { wide: true, placeholder: 'Например: Астана, ул. Токпанова, 8' })}
        {text('mapUrl', 'Ссылка на карту', { wide: true, type: 'url', hint: 'Яндекс или 2ГИС: откройте место на карте и скопируйте адрес страницы' })}
        <Field label="Телефон" error={form.error('phone') ?? form.error('phoneHref')} hint={v.phoneHref ? `Ссылка для звонка: ${v.phoneHref}` : 'Например: +7 (777) 088-88-44'}>
          <Input type="tel" maxLength={40} value={v.phone ?? ''} onChange={e => { form.set('phone', e.target.value); form.set('phoneHref', telHref(e.target.value)); }} />
        </Field>
        {text('email', 'E-mail', { type: 'email', required: true })}
        {text('whatsapp', 'WhatsApp', { type: 'url', hint: 'Ссылка вида https://wa.me/77770888844' })}
        {text('instagram', 'Instagram', { type: 'url' })}
        {text('taplink', 'Taplink', { type: 'url' })}
        {text('offer', 'Публичная оферта', { type: 'url', hint: 'Ссылка на документ оферты' })}
      </FormGrid>
    </SectionShell>
  );
}
