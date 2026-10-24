/** Форма создания/редактирования администратора (в Drawer). */
import { useState } from 'react';
import { Eye, EyeOff, Wand2 } from 'lucide-react';
import { z } from 'zod';
import { ADMIN_ROLES, adminInput, type AdminDTO } from '@shared/schemas';
import { api } from '../../api';
import { ROLE_LABELS } from '../../auth';
import { Button, Drawer, Field, FormGrid, IconButton, Input, Select, Switch, useConfirm, useForm, useToast } from '../../ui';
import { copyText, generatePassword, passwordStrength } from './format';

const PASS_MSG = 'Пароль не короче 10 символов';
const base = adminInput.extend({ email: z.email('Введите корректный e-mail').max(200) });
const createSchema = base.extend({ password: z.string().min(10, PASS_MSG).max(200) });
const editSchema = base.extend({ password: z.string().max(200).refine(v => v === '' || v.length >= 10, PASS_MSG) });

export interface AdminFormProps {
  item?: AdminDTO;
  me: AdminDTO | null;
  /** Сколько активных владельцев (чтобы не дать снять последнего). */
  activeOwners: number;
  onClose: () => void;
  onSaved: (a: AdminDTO, isSelf: boolean) => void;
}

export function AdminForm({ item, me, activeOwners, onClose, onSaved }: AdminFormProps) {
  const toast = useToast();
  const confirm = useConfirm();
  const isNew = !item;
  const isSelf = !!item && item.id === me?.id;
  const lastOwner = !!item && item.role === 'owner' && item.active && activeOwners <= 1;
  const form = useForm((isNew ? createSchema : editSchema) as typeof createSchema, {
    name: item?.name ?? '', email: item?.email ?? '', role: item?.role ?? 'editor', active: item?.active ?? true, password: '',
  });
  const [show, setShow] = useState(isNew);
  const v = form.values;
  const strength = passwordStrength(v.password ?? '');

  const submit = form.handleSubmit(async data => {
    const { password, ...rest } = data;
    const payload = { ...rest, email: rest.email.trim().toLowerCase(), ...(password ? { password } : {}) };
    const saved = item
      ? await api.patch<AdminDTO>(`/admin/admins/${item.id}`, payload)
      : await api.post<AdminDTO>('/admin/admins', payload);
    toast.success(isNew ? 'Администратор добавлен' : password ? 'Сохранено, пароль изменён' : 'Сохранено');
    if (password && isNew) toast.info('Передайте пароль администратору лично — повторно его не увидеть');
    onSaved(saved, isSelf);
    onClose();
  }, toast.error);

  const close = async () => {
    if (form.dirty && !(await confirm({ title: 'Закрыть без сохранения?', message: 'Внесённые изменения пропадут.', confirmLabel: 'Закрыть', danger: true }))) return;
    onClose();
  };

  const gen = async () => {
    const p = generatePassword();
    form.set('password', p);
    setShow(true);
    if (await copyText(p)) toast.info('Пароль сгенерирован и скопирован');
  };

  return (
    <Drawer
      open
      onClose={() => void close()}
      busy={form.submitting}
      size="md"
      title={isNew ? 'Новый администратор' : `Администратор: ${item.name}`}
      description={isSelf ? 'Это ваша учётная запись' : undefined}
      onSubmit={submit}
      footer={<><Button variant="ghost" onClick={() => void close()}>Отмена</Button><Button type="submit" loading={form.submitting}>{isNew ? 'Добавить' : 'Сохранить'}</Button></>}
    >
      {form.errors._ && <p className="notice notice-error" role="alert" style={{ marginBottom: 16 }}>{form.errors._}</p>}
      <FormGrid cols={1}>
        <Field label="Имя" required error={form.error('name')}>
          <Input value={v.name} onChange={e => form.set('name', e.target.value)} autoComplete="off" data-autofocus />
        </Field>
        <Field label="E-mail (логин)" required error={form.error('email')}>
          <Input type="email" value={v.email} onChange={e => form.set('email', e.target.value)} autoComplete="off" />
        </Field>
        <Field
          label="Роль"
          error={form.error('role')}
          hint={isSelf ? 'Свою роль изменить нельзя' : lastOwner ? 'Это единственный владелец — понизить нельзя' : 'Редактор управляет контентом и заявками. Владелец — ещё и администраторами.'}
        >
          <Select
            value={v.role}
            disabled={isSelf || lastOwner}
            onChange={e => form.set('role', e.target.value as AdminDTO['role'])}
            options={ADMIN_ROLES.map(r => ({ value: r, label: ROLE_LABELS[r] }))}
          />
        </Field>
        <Field
          label={isNew ? 'Пароль' : 'Новый пароль'}
          required={isNew}
          error={form.error('password')}
          hint={strength.label || (isNew ? 'Не короче 10 символов. Нажмите на волшебную палочку, чтобы придумать пароль.' : 'Оставьте пустым, чтобы не менять пароль')}
        >
          <div className="ops-pass">
            <Input
              type={show ? 'text' : 'password'}
              value={v.password}
              onChange={e => form.set('password', e.target.value)}
              autoComplete="new-password"
              className="mono"
            />
            <IconButton icon={show ? EyeOff : Eye} label={show ? 'Скрыть пароль' : 'Показать пароль'} variant="ghost" onClick={() => setShow(s => !s)} />
            <IconButton icon={Wand2} label="Сгенерировать пароль" variant="ghost" onClick={() => void gen()} />
          </div>
        </Field>
        {!!v.password && <div className="ops-meter" data-level={strength.level} aria-hidden="true"><span /><span /><span /></div>}
      </FormGrid>
      <div className="ops-switches">
        <Switch
          label="Активен"
          hint={isSelf ? 'Себя отключить нельзя' : lastOwner ? 'Единственного владельца отключить нельзя' : 'Отключённый администратор не сможет войти'}
          checked={!!v.active}
          disabled={isSelf || lastOwner}
          onChange={val => form.set('active', val)}
        />
      </div>
    </Drawer>
  );
}
