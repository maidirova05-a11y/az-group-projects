/** Раздел настроек «Ссылки». */
import { linksSetting } from '@shared/schemas';
import { Field, FormGrid, Input, useForm } from '../../../ui';
import { SectionShell, useSave, type Links, type SectionProps } from './shared';

// ---------- Ссылки ----------

const LINK_MAX: Record<keyof Links, number> = { registration: 500, cabinet: 500, fibonacciResults: 1000, posterPdf: 500, ifo: 500, ifoCertificate: 1000 };
const LINK_FIELDS: { key: keyof Links; label: string; hint?: string }[] = [
  { key: 'registration', label: 'Регистрация на мероприятия', hint: 'Куда ведут кнопки «Зарегистрироваться»' },
  { key: 'cabinet', label: 'Личный кабинет' },
  { key: 'fibonacciResults', label: 'Результаты олимпиады Фибоначчи' },
  { key: 'posterPdf', label: 'Афиша (PDF)', hint: 'Файл на сайте (/calendar.pdf) или полная ссылка' },
  { key: 'ifo', label: 'Сайт IFO' },
  { key: 'ifoCertificate', label: 'Сертификат IFO' },
];

export function LinksForm({ initial, onSaved, onDirty }: SectionProps<Links>) {
  const form = useForm(linksSetting, initial);
  const { toast, save } = useSave<Links>('links', onSaved);
  return (
    <SectionShell title="Ссылки" description="Внешние ссылки, на которые ведут кнопки сайта." form={form} onDirty={onDirty} onSubmit={form.handleSubmit(save, toast.error)}>
      <FormGrid cols={1}>
        {LINK_FIELDS.map(f => (
          <Field key={f.key} label={f.label} hint={f.hint} error={form.error(f.key)}>
            <Input inputMode="url" maxLength={LINK_MAX[f.key]} value={form.values[f.key] ?? ''} onChange={e => form.set(f.key, e.target.value)} placeholder="https://…" />
          </Field>
        ))}
      </FormGrid>
    </SectionShell>
  );
}
