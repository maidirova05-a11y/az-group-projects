/** Администраторы (только владелец): список, добавление, редактирование, удаление. */
import { useCallback, useEffect, useState } from 'react';
import { Pencil, Plus, ShieldAlert, Trash2, Users } from 'lucide-react';
import type { AdminDTO } from '@shared/schemas';
import { api, ApiError, errorMessage } from '../api';
import { ROLE_LABELS, useAuth } from '../auth';
import { Badge, Button, DataTable, EmptyState, IconButton, LinkButton, PageHeader, Panel, useConfirm, useToast } from '../ui';
import { AdminForm } from './ops/AdminForm';
import { almatyExact, almatyRelative } from './ops/format';
import './ops/ops.css';

type Editing = { mode: 'new' } | { mode: 'edit'; item: AdminDTO } | null;

export default function AdminsPage() {
  const { admin: me, isOwner, refresh } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const [rows, setRows] = useState<AdminDTO[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [editing, setEditing] = useState<Editing>(null);
  const [deleting, setDeleting] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await api.get<AdminDTO[]>('/admin/admins'));
      setForbidden(false);
    } catch (e) {
      if (e instanceof ApiError && e.status === 403) setForbidden(true);
      else setError(errorMessage(e));
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const activeOwners = rows?.filter(a => a.role === 'owner' && a.active).length ?? 0;

  const remove = async (a: AdminDTO) => {
    if (!(await confirm({ title: 'Удалить администратора?', message: `${a.name} (${a.email}) больше не сможет войти в админку. Действие нельзя отменить.` }))) return;
    setDeleting(a.id);
    try {
      await api.del(`/admin/admins/${a.id}`);
      toast.success('Администратор удалён');
      setRows(r => r?.filter(x => x.id !== a.id) ?? r);
    } catch (e) {
      toast.error(e);
      if (e instanceof ApiError && e.status === 403) setForbidden(true);
    } finally { setDeleting(null); }
  };

  const onSaved = (a: AdminDTO, isSelf: boolean) => {
    setRows(r => {
      if (!r) return [a];
      return r.some(x => x.id === a.id) ? r.map(x => (x.id === a.id ? a : x)) : [...r, a];
    });
    if (isSelf) void refresh();
  };

  if (forbidden || !isOwner) {
    return (
      <>
        <PageHeader title="Администраторы" />
        <Panel>
          <EmptyState icon={ShieldAlert} title="Нет доступа" text="Управлять администраторами может только владелец." action={<LinkButton to="/admin" variant="primary">К обзору</LinkButton>} />
        </Panel>
      </>
    );
  }

  const canDelete = (a: AdminDTO) => a.id !== me?.id && !(a.role === 'owner' && a.active && activeOwners <= 1);

  return (
    <>
      <PageHeader
        title="Администраторы"
        description="Кто может входить в админку. Владелец управляет всем, редактор — контентом, заявками и настройками."
        actions={<Button icon={Plus} onClick={() => setEditing({ mode: 'new' })}>Добавить</Button>}
      />
      <Panel>
        <DataTable
          caption="Администраторы"
          rows={rows}
          loading={loading}
          error={error}
          onRetry={() => void load()}
          rowKey={a => a.id}
          onRowClick={a => setEditing({ mode: 'edit', item: a })}
          columns={[
            {
              key: 'name', header: 'Имя', primary: true, sortable: true,
              render: a => <span className="ops-admin-name"><span>{a.name}{a.id === me?.id && <> <Badge tone="info">Это вы</Badge></>}</span><small>{a.email}</small></span>,
            },
            { key: 'role', header: 'Роль', sortable: true, render: a => <Badge tone={a.role === 'owner' ? 'brand' : 'neutral'}>{ROLE_LABELS[a.role]}</Badge> },
            { key: 'active', header: 'Доступ', render: a => <Badge tone={a.active ? 'success' : 'neutral'} dot>{a.active ? 'Активен' : 'Отключён'}</Badge> },
            {
              key: 'lastLoginAt', header: 'Последний вход', sortable: true, sortValue: a => a.lastLoginAt ?? '',
              render: a => (a.lastLoginAt ? <time dateTime={a.lastLoginAt} title={`${almatyExact(a.lastLoginAt)} (Алматы)`}>{almatyRelative(a.lastLoginAt)}</time> : <span className="muted">ещё не входил(а)</span>),
            },
          ]}
          actions={a => (
            <>
              <IconButton icon={Pencil} label={`Изменить: ${a.name}`} onClick={() => setEditing({ mode: 'edit', item: a })} />
              {canDelete(a) && <IconButton icon={Trash2} label={`Удалить: ${a.name}`} variant="danger" loading={deleting === a.id} onClick={() => void remove(a)} />}
            </>
          )}
          empty={<EmptyState icon={Users} title="Администраторов нет" />}
        />
      </Panel>
      {editing && (
        <AdminForm
          key={editing.mode === 'edit' ? editing.item.id : 'new'}
          item={editing.mode === 'edit' ? editing.item : undefined}
          me={me}
          activeOwners={activeOwners}
          onClose={() => setEditing(null)}
          onSaved={onSaved}
        />
      )}
    </>
  );
}
