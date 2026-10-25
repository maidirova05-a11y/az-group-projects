/**
 * Регистрации на мероприятия с сайта (/register): вкладки статусов, фильтр по программе, поиск, таблица,
 * карточка регистрации (смена статуса, заметка, удаление), выгрузка в Excel.
 */
import { useCallback, useEffect, useState } from 'react';
import { Copy, Download, MessageCircle, Phone, RefreshCw, Save, Trash2 } from 'lucide-react';
import { REGISTRATION_STATUSES, registrationUpdate, type ProgramDTO, type RegistrationDTO } from '@shared/schemas';
import { api } from '../api';
import { useAdminRoute } from '../router';
import { useAuth } from '../auth';
import {
  Badge, Button, DataTable, Drawer, Field, IconButton, PageHeader, Pagination, Panel, SearchInput, Segmented, Select, Textarea, Toolbar,
  useAdminStats, useConfirm, useToast, type Column, type Tone,
} from '../ui';
import { almatyExact, almatyRelative, copyText, telHref, whatsappHref } from './ops/format';
import { leadSourceLabel } from './ops/LeadDrawer';
import './ops/ops.css';

type Status = RegistrationDTO['status'];
type Tab = Status | 'all';
export const REG_STATUS_LABELS: Record<Status, string> = { new: 'Новая', confirmed: 'Подтверждена', paid: 'Оплачена', cancelled: 'Отменена', spam: 'Спам' };
const REG_TONES: Record<Status, Tone> = { new: 'brand', confirmed: 'info', paid: 'success', cancelled: 'neutral', spam: 'neutral' };
const TABS: { value: Tab; label: string }[] = [
  ...REGISTRATION_STATUSES.map(s => ({ value: s as Tab, label: REG_STATUS_LABELS[s] })),
  { value: 'all', label: 'Все' },
];
const LIMIT = 30;
const isTab = (v: string | null): v is Tab => v === 'all' || (REGISTRATION_STATUSES as readonly string[]).includes(v ?? '');
const gradeLabel = (g: string) => (g === 'teacher' ? 'Педагог' : g === 'other' ? 'Другое' : `${g} класс`);
const money = (n: number | null) => (n == null ? '—' : n === 0 ? 'Бесплатно' : `${new Intl.NumberFormat('ru-RU').format(n)} ₸`);

function RegPill({ status }: { status: Status }) {
  return <Badge tone={REG_TONES[status]} dot>{REG_STATUS_LABELS[status]}</Badge>;
}

function query(tab: Tab, q: string, program: string, extra: Record<string, string | number> = {}) {
  const p = new URLSearchParams();
  if (tab !== 'all') p.set('status', tab);
  if (q.trim()) p.set('q', q.trim());
  if (program) p.set('program', program);
  for (const [k, v] of Object.entries(extra)) p.set(k, String(v));
  const s = p.toString();
  return s ? `?${s}` : '';
}

function RegistrationDrawer({ reg, onClose, onUpdated, onDeleted }: { reg: RegistrationDTO; onClose: () => void; onUpdated: (r: RegistrationDTO) => void; onDeleted: () => void }) {
  const toast = useToast();
  const confirm = useConfirm();
  const { isOwner } = useAuth();
  const [note, setNote] = useState(reg.note);
  const [busy, setBusy] = useState<string | null>(null);

  const patch = async (b: { status?: Status; note?: string }, ok: string) => {
    const parsed = registrationUpdate.safeParse(b);
    if (!parsed.success) { toast.error(parsed.error.issues[0]?.message ?? 'Проверьте данные'); return; }
    setBusy(b.status ?? 'note');
    try {
      onUpdated(await api.patch<RegistrationDTO>(`/admin/registrations/${reg.id}`, parsed.data));
      toast.success(ok);
    } catch (e) { toast.error(e); } finally { setBusy(null); }
  };
  const remove = async () => {
    if (!(await confirm({ title: 'Удалить регистрацию?', message: `${reg.participantName}, ${reg.phone}. Действие нельзя отменить.` }))) return;
    setBusy('delete');
    try { await api.del(`/admin/registrations/${reg.id}`); toast.success('Регистрация удалена'); onDeleted(); } catch (e) { toast.error(e); setBusy(null); }
  };
  const tel = telHref(reg.phone);
  const src = leadSourceLabel(reg);

  return (
    <Drawer
      open
      onClose={onClose}
      busy={busy === 'delete'}
      title={reg.participantName}
      description={<>Регистрация №{reg.id} · {almatyRelative(reg.createdAt)} · <RegPill status={reg.status} /></>}
      footer={(
        <>
          {isOwner ? <Button variant="danger" icon={Trash2} onClick={() => void remove()} loading={busy === 'delete'} style={{ marginRight: 'auto' }}>Удалить</Button> : <span style={{ marginRight: 'auto' }} />}
          <Button variant="ghost" onClick={onClose}>Закрыть</Button>
        </>
      )}
    >
      <div className="ops-contact-actions">
        {tel && <a className="btn btn-primary" href={tel}><Phone size={18} aria-hidden="true" />Позвонить</a>}
        <a className="btn btn-ghost" href={whatsappHref(reg.phone)} target="_blank" rel="noreferrer"><MessageCircle size={18} aria-hidden="true" className="ops-wa" />WhatsApp</a>
        <Button variant="ghost" icon={Copy} onClick={async () => { if (await copyText(reg.phone)) toast.success('Номер скопирован'); }}>Копировать номер</Button>
      </div>
      <dl className="ops-lead-meta">
        <dt>Мероприятие</dt><dd>{reg.programName}</dd>
        <dt>Дата и место</dt><dd>{[reg.eventLabel, reg.place].filter(Boolean).join(' · ') || 'дату уточнить'}</dd>
        <dt>Стоимость</dt><dd>{money(reg.amount)}</dd>
        <dt>Класс</dt><dd>{gradeLabel(reg.grade)}</dd>
        <dt>Школа</dt><dd>{reg.school || '—'}</dd>
        <dt>Город</dt><dd>{reg.city}</dd>
        {reg.subjects && <><dt>Предметы</dt><dd>{reg.subjects}</dd></>}
        <dt>Контактное лицо</dt><dd>{reg.contactName || '—'}</dd>
        <dt>Телефон</dt><dd>{tel ? <a href={tel} className="mono">{reg.phone}</a> : reg.phone}</dd>
        <dt>E-mail</dt><dd>{reg.email ? <a href={`mailto:${reg.email}`}>{reg.email}</a> : '—'}</dd>
        <dt>Получена</dt><dd>{almatyExact(reg.createdAt)} <span className="muted">(Алматы)</span></dd>
        <dt>Источник</dt><dd>{src ?? <span className="muted">прямой заход</span>}{reg.lang && <span className="muted"> · {reg.lang}</span>}</dd>
      </dl>
      {reg.comment && <><p className="ops-section-label">Комментарий</p><p className="ops-message">{reg.comment}</p></>}
      <p className="ops-section-label" id={`rs-${reg.id}`}>Статус</p>
      <div className="ops-status-row" role="group" aria-labelledby={`rs-${reg.id}`}>
        {REGISTRATION_STATUSES.map(s => (
          <button key={s} type="button" className="ops-status-btn" aria-pressed={reg.status === s} disabled={!!busy}
            onClick={() => s !== reg.status && void patch({ status: s }, `Статус: ${REG_STATUS_LABELS[s].toLowerCase()}`)}>
            {REG_STATUS_LABELS[s]}{busy === s && '…'}
          </button>
        ))}
      </div>
      <Field label="Заметка менеджера" hint="Видна только в админке. Например: оплатил 20.10, чек в WhatsApp.">
        <Textarea rows={3} value={note} maxLength={2000} onChange={e => setNote(e.target.value)} />
      </Field>
      <div className="ops-note-actions">
        <span />
        <Button size="sm" variant="outline" icon={Save} disabled={note === reg.note} loading={busy === 'note'} onClick={() => void patch({ note }, 'Заметка сохранена')}>Сохранить заметку</Button>
      </div>
    </Drawer>
  );
}

export default function RegistrationsPage() {
  const { query: qs, setQuery } = useAdminRoute();
  const stats = useAdminStats();
  const { isOwner } = useAuth();
  const rawTab = qs.get('status');
  const tab: Tab = isTab(rawTab) ? rawTab : 'new';
  const q = qs.get('q') ?? '';
  const program = qs.get('program') ?? '';
  const page = Math.max(1, Number(qs.get('page')) || 1);

  const [rows, setRows] = useState<RegistrationDTO[] | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<RegistrationDTO | null>(null);
  const [programs, setPrograms] = useState<ProgramDTO[]>([]);

  useEffect(() => { api.get<ProgramDTO[]>('/admin/programs').then(setPrograms).catch(() => {}); }, []);

  const listUrl = `/admin/registrations${query(tab, q, program, { page, limit: LIMIT })}`;
  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true); setError(null);
    try {
      const res = await api.get<{ items: RegistrationDTO[]; total: number }>(listUrl, { signal });
      setRows(res.items); setTotal(res.total);
    } catch (e) {
      if (!signal?.aborted) setError(e instanceof Error ? e.message : 'Не удалось загрузить регистрации');
    } finally { if (!signal?.aborted) setLoading(false); }
  }, [listUrl]);
  useEffect(() => { const c = new AbortController(); void load(c.signal); return () => c.abort(); }, [load]);

  const refresh = () => { void load(); void stats.reload(); };

  const columns: Column<RegistrationDTO>[] = [
    { key: 'participantName', header: 'Участник', primary: true, render: x => <span className="ops-name">{x.participantName}<small>{gradeLabel(x.grade)}{x.school && ` · ${x.school}`}</small></span> },
    { key: 'programName', header: 'Мероприятие', render: x => <span className="ops-name">{x.programName}<small>{[x.eventLabel, x.place].filter(Boolean).join(' · ') || 'дату уточнить'}</small></span> },
    { key: 'createdAt', header: 'Дата', render: x => <time className="ops-date" dateTime={x.createdAt} title={`${almatyExact(x.createdAt)} (Алматы)`}>{almatyRelative(x.createdAt)}<small>{almatyExact(x.createdAt)}</small></time> },
    { key: 'phone', header: 'Телефон', render: x => <a className="ops-tel mono" href={telHref(x.phone)} onClick={e => e.stopPropagation()}>{x.phone}</a> },
    { key: 'amount', header: 'Сумма', hideOnMobile: true, render: x => money(x.amount) },
    { key: 'status', header: 'Статус', render: x => <RegPill status={x.status} /> },
  ];
  const programOptions = programs.map(p => ({ value: String(p.id), label: [p.name, p.subtitle].filter(Boolean).join(' — ') }));

  return (
    <>
      <PageHeader
        title="Регистрации"
        description="Регистрации на олимпиады и мероприятия с сайта. Подтвердите участие по телефону и отметьте оплату."
        actions={(
          <>
            <IconButton icon={RefreshCw} label="Обновить" variant="ghost" onClick={refresh} loading={loading && !!rows} />
            {isOwner && <a className="btn btn-ghost" href={`/api/admin/registrations/export.csv${query(tab, q, program)}`} download><Download size={18} aria-hidden="true" />Экспорт в Excel</a>}
          </>
        )}
      />
      <Panel>
        <Toolbar>
          <SearchInput value={q} onChange={v => setQuery({ q: v, page: null })} placeholder="ФИО, телефон, школа, город" label="Поиск по регистрациям" />
          <Select value={program} placeholder="Все программы" options={programOptions} onChange={e => setQuery({ program: e.target.value || null, page: null })} aria-label="Программа" />
          <Segmented label="Статус" value={tab} onChange={v => setQuery({ status: v === 'new' ? null : v, page: null })} options={TABS} />
        </Toolbar>
        <DataTable
          caption="Регистрации"
          columns={columns}
          rows={rows}
          rowKey={x => x.id}
          loading={loading}
          error={error}
          onRetry={() => void load()}
          onRowClick={x => setOpen(x)}
          rowClassName={x => (x.status === 'new' ? 'ops-unread' : undefined)}
          empty={{ title: q || program ? 'Ничего не найдено' : tab === 'new' ? 'Новых регистраций нет' : 'Регистраций нет', text: 'Регистрации с сайта появятся здесь автоматически.' }}
        />
        <Pagination page={page} total={total} limit={LIMIT} onChange={p => { setQuery({ page: p > 1 ? p : null }); window.scrollTo({ top: 0 }); }} />
      </Panel>
      {open && (
        <RegistrationDrawer
          key={open.id}
          reg={open}
          onClose={() => { setOpen(null); refresh(); }}
          onUpdated={x => { setOpen(x); setRows(r => r?.map(y => (y.id === x.id ? x : y)) ?? r); }}
          onDeleted={() => { setOpen(null); refresh(); }}
        />
      )}
    </>
  );
}
