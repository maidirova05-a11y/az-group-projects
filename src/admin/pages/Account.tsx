/** Мой аккаунт: данные профиля и смена пароля (POST /api/auth/password). */
import { useState } from 'react';
import { Eye, EyeOff, KeyRound } from 'lucide-react';
import { z } from 'zod';
import { passwordChange } from '@shared/schemas';
import { api } from '../api';
import { useAuth, ROLE_LABELS } from '../auth';
import { Badge, Button, Field, FormActions, Input, PageHeader, Panel, fmt, useForm, useToast } from '../ui';

const schema = passwordChange
  .extend({ current: z.string().min(1, 'Введите текущий пароль'), confirm: z.string().min(1, 'Повторите новый пароль') })
  .refine(v => v.next === v.confirm, { message: 'Пароли не совпадают', path: ['confirm'] })
  .refine(v => v.next !== v.current, { message: 'Новый пароль совпадает с текущим', path: ['next'] });

export default function Account() {
  const { admin } = useAuth();
  const toast = useToast();
  const [show, setShow] = useState(false);
  const form = useForm(schema, { current: '', next: '', confirm: '' });

  const onSubmit = form.handleSubmit(async ({ current, next }) => {
    await api.post('/auth/password', { current, next });
    toast.success('Пароль изменён');
    form.reset({ current: '', next: '', confirm: '' });
  }, e => toast.error(e));

  const type = show ? 'text' : 'password';
  return (
    <>
      <PageHeader title="Мой аккаунт" />
      {admin && (
        <Panel title="Профиль">
          <dl className="profile">
            <div><dt>Имя</dt><dd>{admin.name}</dd></div>
            <div><dt>E-mail</dt><dd>{admin.email}</dd></div>
            <div><dt>Роль</dt><dd><Badge tone={admin.role === 'owner' ? 'brand' : 'info'}>{ROLE_LABELS[admin.role]}</Badge></dd></div>
            <div><dt>Последний вход</dt><dd>{fmt.dateTime(admin.lastLoginAt)}</dd></div>
          </dl>
        </Panel>
      )}
      <Panel title="Смена пароля" description="Новый пароль — не короче 10 символов. После смены текущая сессия сохранится.">
        <form className="narrow-form" onSubmit={onSubmit} noValidate>
          <Field label="Текущий пароль" error={form.error('current')} required>
            <Input type={type} autoComplete="current-password" value={form.values.current} onChange={e => form.set('current', e.target.value)} />
          </Field>
          <Field label="Новый пароль" error={form.error('next')} hint="Минимум 10 символов" required>
            <Input type={type} autoComplete="new-password" value={form.values.next} onChange={e => form.set('next', e.target.value)} />
          </Field>
          <Field label="Повторите новый пароль" error={form.error('confirm')} required>
            <Input type={type} autoComplete="new-password" value={form.values.confirm} onChange={e => form.set('confirm', e.target.value)} />
          </Field>
          <FormActions>
            <Button type="submit" icon={KeyRound} loading={form.submitting}>Сменить пароль</Button>
            <Button variant="ghost" icon={show ? EyeOff : Eye} onClick={() => setShow(s => !s)} aria-pressed={show}>{show ? 'Скрыть пароли' : 'Показать пароли'}</Button>
          </FormActions>
        </form>
      </Panel>
    </>
  );
}
