/** Раздел настроек «Цифры». */
import { z } from 'zod';
import { statsSetting } from '@shared/schemas';
import { Field, FormGrid, Input, useForm } from '../../../ui';
import { ListEditor, SectionShell, clearErr, useSave, type SectionProps, type Stats } from './shared';

// ---------- Цифры ----------

const statsForm = z.object({ items: statsSetting });

export function StatsForm({ initial, onSaved, onDirty }: SectionProps<Stats>) {
  const form = useForm(statsForm, { items: initial });
  const { toast, save } = useSave<Stats>('stats', onSaved);
  return (
    <SectionShell title="Цифры" description="Блок с ключевыми показателями на главной: значение крупно и подпись под ним. До 12 штук." form={form} onDirty={onDirty} onSubmit={form.handleSubmit(d => save(d.items), toast.error)}>
      <ListEditor
        items={form.values.items}
        onChange={items => { form.set('items', items); clearErr(form, 'items'); }}
        max={12}
        noun="цифру"
        addLabel="Добавить цифру"
        error={form.error('items')}
        create={() => ({ value: '', label: '' })}
        render={(it, i, update) => (
          <FormGrid>
            <Field label="Значение" required error={form.error(`items.${i}.value`)} hint="Например: 15 000+">
              <Input value={it.value} onChange={e => update({ ...it, value: e.target.value })} maxLength={40} />
            </Field>
            <Field label="Подпись" required error={form.error(`items.${i}.label`)}>
              <Input value={it.label} onChange={e => update({ ...it, label: e.target.value })} maxLength={160} />
            </Field>
          </FormGrid>
        )}
      />
    </SectionShell>
  );
}
