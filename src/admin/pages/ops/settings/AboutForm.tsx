/** Раздел настроек «О компании». */
import { aboutSetting } from '@shared/schemas';
import { Field, FormGrid, ImageUrlInput, Input, Textarea, useForm } from '../../../ui';
import { ListEditor, SectionShell, clearErr, useSave, type About, type SectionProps } from './shared';

// ---------- О компании ----------

export function AboutForm({ initial, onSaved, onDirty }: SectionProps<About>) {
  const form = useForm(aboutSetting, initial);
  const { toast, save } = useSave<About>('about', onSaved);
  const v = form.values;
  const sub = (title: string, count: number, max: number) => (
    <div className="ops-subhead"><h3>{title}</h3><span>{count} из {max}</span></div>
  );
  return (
    <SectionShell title="О компании" description="Раздел «О нас»: заголовок, карточки с картинками, направления и достижения." form={form} onDirty={onDirty} onSubmit={form.handleSubmit(save, toast.error)}>
      <Field label="Заголовок" required error={form.error('title')}>
        <Textarea rows={2} value={v.title} onChange={e => form.set('title', e.target.value)} maxLength={300} />
      </Field>

      {sub('Карточки', v.pillars.length, 6)}
      <ListEditor
        items={v.pillars}
        onChange={p => { form.set('pillars', p); clearErr(form, 'pillars'); }}
        max={6}
        noun="карточку"
        addLabel="Добавить карточку"
        error={form.error('pillars')}
        create={() => ({ title: '', text: '', image: null })}
        render={(p, i, update) => (
          <>
            <Field label="Заголовок" required error={form.error(`pillars.${i}.title`)}>
              <Input value={p.title} onChange={e => update({ ...p, title: e.target.value })} maxLength={80} />
            </Field>
            <Field label="Текст" required error={form.error(`pillars.${i}.text`)}>
              <Textarea rows={3} value={p.text} onChange={e => update({ ...p, text: e.target.value })} maxLength={1000} />
            </Field>
            <Field label="Картинка" error={form.error(`pillars.${i}.image`)}>
              <ImageUrlInput value={p.image} onChange={img => update({ ...p, image: img })} fit="cover" />
            </Field>
          </>
        )}
      />

      {sub('Направления', v.directions.length, 12)}
      <ListEditor
        items={v.directions}
        onChange={d => { form.set('directions', d); clearErr(form, 'directions'); }}
        max={12}
        noun="направление"
        addLabel="Добавить направление"
        error={form.error('directions')}
        create={() => ''}
        render={(d, i, update) => (
          <Field label={`Направление ${i + 1}`} required error={form.error(`directions.${i}`)}>
            <Input value={d} onChange={e => update(e.target.value)} maxLength={120} />
          </Field>
        )}
      />

      {sub('Достижения', v.achievements.length, 12)}
      <ListEditor
        items={v.achievements}
        onChange={a => { form.set('achievements', a); clearErr(form, 'achievements'); }}
        max={12}
        noun="достижение"
        addLabel="Добавить достижение"
        error={form.error('achievements')}
        create={() => ({ value: '', label: '' })}
        render={(a, i, update) => (
          <FormGrid>
            <Field label="Значение" required error={form.error(`achievements.${i}.value`)}>
              <Input value={a.value} onChange={e => update({ ...a, value: e.target.value })} maxLength={60} />
            </Field>
            <Field label="Подпись" required error={form.error(`achievements.${i}.label`)}>
              <Input value={a.label} onChange={e => update({ ...a, label: e.target.value })} maxLength={300} />
            </Field>
          </FormGrid>
        )}
      />
    </SectionShell>
  );
}
