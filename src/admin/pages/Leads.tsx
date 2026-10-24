/** Заявки с сайта: вкладки статусов, поиск, таблица, карточка заявки, выгрузка в Excel, массовые действия. */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCheck, Copy, Download, Inbox, MessageCircle, RefreshCw, X } from 'lucide-react';
import { LEAD_STATUSES, type LeadDTO } from '@shared/schemas';
import { api } from '../api';
import { useAdminRoute } from '../router';
import { useAuth } from '../auth';
import {
  Button, Checkbox, DataTable, IconButton, PageHeader, Pagination, Panel, SearchInput, Segmented, StatusPill, Toolbar,
  useAdminStats, useToast, type Column,
} from '../ui';
import { LeadDrawer } from './ops/LeadDrawer';
import { almatyExact, almatyRelative, copyText, telHref, whatsappHref } from './ops/format';
import './ops/ops.css';

type Tab = LeadDTO['status'] | 'all';
const TABS: { value: Tab; label: string }[] = [
  { value: 'new', label: 'Новые' },
  { value: 'in_progress', label: 'В работе' },
  { value: 'done', label: 'Обработаны' },
  { value: 'spam', label: 'Спам' },
  { value: 'all', label: 'Все' },
];
const LIMIT = 30;

const isTab = (v: string | null): v is Tab => v === 'all' || (LEAD_STATUSES as readonly string[]).includes(v ?? '');

function leadsQuery(tab: Tab, q: string, extra: Record<string, string | number> = {}) {
  const p = new URLSearchParams();
  if (tab !== 'all') p.set('status', tab);
  if (q.trim()) p.set('q', q.trim());
  for (const [k, v] of Object.entries(extra)) p.set(k, String(v));
  const s = p.toString();
  return s ? `?${s}` : '';
}

export default function LeadsPage() {
  const { query, setQuery } = useAdminRoute();
  const toast = useToast();
  const stats = useAdminStats();

  const rawTab = query.get('status');
  const tab: Tab = isTab(rawTab) ? rawTab : 'new';
  const q = query.get('q') ?? '';
  const page = Math.max(1, Number(query.get('page')) || 1);

  const [rows, setRows] = useState<LeadDTO[] | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [counts, setCounts] = useState<Partial<Record<Tab, number>>>({});
  const [open, setOpen] = useState<LeadDTO | null>(null);
  const [changed, setChanged] = useState(false);
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  const listUrl = `/admin/leads${leadsQuery(tab, q, { page, limit: LIMIT })}`;

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<{ items: LeadDTO[]; total: number }>(listUrl, { signal });
      setRows(res.items);
      setTotal(res.total);
      // Страница опустела (например, после удаления) — шаг назад.
      if (res.items.length === 0 && res.total > 0 && page > 1) setQuery({ page: Math.max(1, Math.ceil(res.total / LIMIT)) });
    } catch (e) {
      if (signal?.aborted) return;
      setError(e instanceof Error ? e.message : 'Не удалось загрузить заявки');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [listUrl, page, setQuery]);

  const loadCounts = useCallback(async () => {
    try {
      const res = await Promise.all(TABS.map(t => api.get<{ total: number }>(`/admin/leads${leadsQuery(t.value, q, { limit: 1 })}`)));
      setCounts(Object.fromEntries(TABS.map((t, i) => [t.value, res[i].total])));
    } catch { /* счётчики — не критично */ }
  }, [q]);

  useEffect(() => {
    const c = new AbortController();
    void load(c.signal);
    setChecked(new Set());
    return () => c.abort();
  }, [load]);
  useEffect(() => { void loadCounts(); }, [loadCounts]);

  const refreshAll = () => { void load(); void loadCounts(); void stats.reload(); };

  const onUpdated = (l: LeadDTO) => {
    setRows(r => r?.map(x => (x.id === l.id ? l : x)) ?? r);
    setOpen(o => (o?.id === l.id ? l : o));
    setChanged(true);
    void loadCounts();
    void stats.reload();
  };

  const closeDrawer = () => {
    setOpen(null);
    if (changed) { setChanged(false); void load(); }
  };

  const bulk = async (status: LeadDTO['status']) => {
    const ids = [...checked];
    if (!ids.length) return;
    setBulkBusy(true);
    const res = await Promise.allSettled(ids.map(id => api.patch(`/admin/leads/${id}`, { status })));
    const failed = res.filter(r => r.status === 'rejected').length;
    setBulkBusy(false);
    if (failed) toast.error(`Не удалось изменить ${failed} из ${ids.length}`);
    else toast.success(status === 'done' ? `Отмечено обработанными: ${ids.length}` : `Изменено: ${ids.length}`);
    setChecked(new Set());
    refreshAll();
  };

  const pageIds = useMemo(() => rows?.map(r => r.id) ?? [], [rows]);
  const allChecked = pageIds.length > 0 && pageIds.every(id => checked.has(id));
  const toggle = (id: number, on: boolean) => setChecked(s => {
    const n = new Set(s);
    if (on) n.add(id); else n.delete(id);
    return n;
  });

  const copy = async (phone: string) => {
    if (await copyText(phone)) toast.success('Номер скопирован'); else toast.error('Не удалось скопировать');
  };

  const columns: Column<LeadDTO>[] = [
    {
      key: 'check',
      header: <Checkbox label={<span className="sr-only">Выбрать все на странице</span>} checked={allChecked} onChange={on => setChecked(on ? new Set(pageIds) : new Set())} />,
      width: 36,
      render: l => <span className="ops-rowcheck"><Checkbox label={<span className="sr-only">Выбрать заявку {l.name}</span>} checked={checked.has(l.id)} onChange={on => toggle(l.id, on)} /></span>,
    },
    {
      key: 'name', header: 'Имя', primary: true,
      render: l => <span className="ops-name">{l.name}<small>{l.topic}</small></span>,
    },
    {
      key: 'createdAt', header: 'Дата',
      render: l => <time className="ops-date" dateTime={l.createdAt} title={`${almatyExact(l.createdAt)} (Алматы)`}>{almatyRelative(l.createdAt)}<small>{almatyExact(l.createdAt)}</small></time>,
    },
    {
      key: 'phone', header: 'Телефон',
      render: l => (
        <span className="ops-phone">
          <a className="ops-tel mono" href={telHref(l.phone)}>{l.phone}</a>
          <IconButton icon={Copy} label="Копировать номер" size="sm" onClick={() => void copy(l.phone)} />
          <a className="icon-btn icon-btn-plain icon-btn-sm ops-wa" href={whatsappHref(l.phone)} target="_blank" rel="noreferrer" aria-label={`Написать в WhatsApp: ${l.name}`} title="Написать в WhatsApp">
            <MessageCircle size={16} aria-hidden="true" />
          </a>
        </span>
      ),
    },
    { key: 'message', header: 'Сообщение', render: l => (l.message ? <span className="ops-preview">{l.message}</span> : <span className="muted">—</span>) },
    { key: 'page', header: 'Страница', hideOnMobile: true, render: l => (l.page ? <span className="ops-page mono" title={l.page}>{l.page}</span> : <span className="muted">—</span>) },
    { key: 'status', header: 'Статус', render: l => <StatusPill status={l.status} /> },
  ];

  // Выгрузка и удаление заявок — только у владельца (сервер тоже проверяет).
  const { isOwner } = useAuth();
  const exportHref = `/api/admin/leads/export.csv${leadsQuery(tab, q)}`;
  const tabLabel = TABS.find(t => t.value === tab)?.label ?? '';

  return (
    <>
      <PageHeader
        title="Заявки"
        description="Заявки с форм сайта. Нажмите на строку, чтобы открыть заявку, сменить статус и оставить заметку."
        actions={(
          <>
            <IconButton icon={RefreshCw} label="Обновить" variant="ghost" onClick={refreshAll} loading={loading && !!rows} />
            {isOwner && <a className="btn btn-ghost" href={exportHref} download>
              <Download size={18} aria-hidden="true" />Экспорт в Excel
            </a>}
          </>
        )}
      />
      <Panel>
        <Toolbar>
          <SearchInput value={q} onChange={v => setQuery({ q: v, page: null })} placeholder="Имя, телефон, тема или текст" label="Поиск по заявкам" />
          <Segmented
            label="Статус заявок"
            value={tab}
            onChange={v => setQuery({ status: v === 'new' ? null : v, page: null })}
            options={TABS.map(t => ({ ...t, count: counts[t.value] }))}
          />
        </Toolbar>

        {checked.size > 0 && (
          <div className="ops-bulk" role="region" aria-label="Действия с выбранными заявками">
            <span>Выбрано: {checked.size}</span>
            <Button size="sm" icon={CheckCheck} onClick={() => void bulk('done')} loading={bulkBusy}>Отметить обработанными</Button>
            {tab !== 'in_progress' && <Button size="sm" variant="outline" onClick={() => void bulk('in_progress')} disabled={bulkBusy}>В работу</Button>}
            {tab !== 'spam' && <Button size="sm" variant="outline" onClick={() => void bulk('spam')} disabled={bulkBusy}>В спам</Button>}
            <Button size="sm" variant="link" icon={X} onClick={() => setChecked(new Set())}>Снять выбор</Button>
          </div>
        )}

        <DataTable
          caption={`Заявки: ${tabLabel}`}
          columns={columns}
          rows={rows}
          rowKey={l => l.id}
          loading={loading}
          error={error}
          onRetry={() => void load()}
          onRowClick={l => setOpen(l)}
          rowClassName={l => (l.status === 'new' ? 'ops-unread' : undefined)}
          empty={{
            title: q ? 'Ничего не найдено' : tab === 'new' ? 'Новых заявок нет' : 'Заявок нет',
            text: q ? 'Попробуйте изменить запрос или выбрать вкладку «Все».' : tab === 'new' ? 'Все заявки разобраны. Новые появятся здесь автоматически.' : 'В этом разделе пока пусто.',
            action: q ? <Button variant="ghost" onClick={() => setQuery({ q: null, page: null })}>Сбросить поиск</Button> : tab !== 'all' ? <Button variant="ghost" icon={Inbox} onClick={() => setQuery({ status: 'all', page: null })}>Показать все</Button> : undefined,
          }}
        />
        <Pagination page={page} total={total} limit={LIMIT} onChange={p => { setQuery({ page: p > 1 ? p : null }); window.scrollTo({ top: 0 }); }} />
      </Panel>

      {open && (
        <LeadDrawer
          key={open.id}
          lead={open}
          onClose={closeDrawer}
          onUpdated={onUpdated}
          onDeleted={() => { setOpen(null); setChanged(false); refreshAll(); }}
        />
      )}
    </>
  );
}
