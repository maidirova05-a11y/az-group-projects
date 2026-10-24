/** Карточка заявки: полный текст, контакты, быстрая смена статуса, заметка, удаление. */
import { useEffect, useRef, useState } from 'react';
import { Copy, MessageCircle, Phone, Save, Trash2 } from 'lucide-react';
import { LEAD_STATUSES, leadUpdate, type LeadDTO } from '@shared/schemas';
import { api } from '../../api';
import { useAuth } from '../../auth';
import { Button, Drawer, Field, LEAD_STATUS_LABELS, StatusPill, Textarea, useConfirm, useToast } from '../../ui';
import { almatyExact, almatyRelative, copyText, telHref, whatsappHref } from './format';

export interface LeadDrawerProps {
  lead: LeadDTO;
  onClose: () => void;
  /** Заявка изменена на сервере (статус/заметка). */
  onUpdated: (lead: LeadDTO) => void;
  /** Заявка удалена. */
  onDeleted: (id: number) => void;
}

export function LeadDrawer({ lead, onClose, onUpdated, onDeleted }: LeadDrawerProps) {
  const toast = useToast();
  const { isOwner } = useAuth();
  const confirm = useConfirm();
  const [note, setNote] = useState(lead.note);
  const [noteError, setNoteError] = useState<string | undefined>();
  const [savingNote, setSavingNote] = useState(false);
  const [statusBusy, setStatusBusy] = useState<LeadDTO['status'] | null>(null);
  const [deleting, setDeleting] = useState(false);
  const savedNote = useRef(lead.note);

  // Другая заявка — сбросить черновик заметки.
  useEffect(() => { setNote(lead.note); savedNote.current = lead.note; setNoteError(undefined); }, [lead.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const noteDirty = note !== savedNote.current;

  const patch = async (body: { status?: LeadDTO['status']; note?: string }) => {
    const parsed = leadUpdate.safeParse(body);
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? 'Проверьте данные';
      if ('note' in body) setNoteError(msg);
      throw new Error(msg);
    }
    const updated = await api.patch<LeadDTO>(`/admin/leads/${lead.id}`, parsed.data);
    onUpdated(updated);
    return updated;
  };

  const setStatus = async (status: LeadDTO['status']) => {
    if (status === lead.status || statusBusy) return;
    setStatusBusy(status);
    try {
      await patch({ status });
      toast.success(`Статус: ${LEAD_STATUS_LABELS[status].toLowerCase()}`);
    } catch (e) { toast.error(e); } finally { setStatusBusy(null); }
  };

  const saveNote = async (silent = false) => {
    if (!noteDirty || savingNote) return;
    setSavingNote(true);
    setNoteError(undefined);
    try {
      const updated = await patch({ note });
      savedNote.current = updated.note;
      setNote(updated.note);
      if (!silent) toast.success('Заметка сохранена');
    } catch (e) {
      toast.error(e);
    } finally { setSavingNote(false); }
  };

  const remove = async () => {
    if (!(await confirm({ title: 'Удалить заявку?', message: `${lead.name}, ${lead.phone}. Действие нельзя отменить.` }))) return;
    setDeleting(true);
    try {
      await api.del(`/admin/leads/${lead.id}`);
      toast.success('Заявка удалена');
      onDeleted(lead.id);
    } catch (e) { toast.error(e); setDeleting(false); }
  };

  const close = async () => {
    if (noteDirty) await saveNote(true);
    onClose();
  };

  const tel = telHref(lead.phone);

  return (
    <Drawer
      open
      onClose={() => void close()}
      busy={deleting}
      title={lead.name}
      description={<>Заявка №{lead.id} · {almatyRelative(lead.createdAt)} · <StatusPill status={lead.status} /></>}
      footer={(
        <>
          {isOwner
            ? <Button variant="danger" icon={Trash2} onClick={() => void remove()} loading={deleting} style={{ marginRight: 'auto' }}>Удалить</Button>
            : <span style={{ marginRight: 'auto' }} />}
          <Button variant="ghost" onClick={() => void close()}>Закрыть</Button>
        </>
      )}
    >
      <div className="ops-contact-actions">
        {tel && <a className="btn btn-primary" href={tel}><Phone size={18} aria-hidden="true" />Позвонить</a>}
        <a className="btn btn-ghost" href={whatsappHref(lead.phone)} target="_blank" rel="noreferrer"><MessageCircle size={18} aria-hidden="true" className="ops-wa" />WhatsApp</a>
        <Button variant="ghost" icon={Copy} onClick={async () => { if (await copyText(lead.phone)) toast.success('Номер скопирован'); else toast.error('Не удалось скопировать'); }}>Копировать номер</Button>
      </div>

      <dl className="ops-lead-meta">
        <dt>Телефон</dt><dd>{tel ? <a href={tel} className="mono">{lead.phone}</a> : lead.phone}</dd>
        <dt>Тема</dt><dd>{lead.topic}</dd>
        <dt>Получена</dt><dd>{almatyExact(lead.createdAt)} <span className="muted">(Алматы)</span></dd>
        <dt>Страница</dt><dd>{lead.page ? <span className="mono">{lead.page}</span> : '—'}</dd>
        {lead.updatedAt !== lead.createdAt && <><dt>Изменена</dt><dd>{almatyExact(lead.updatedAt)}</dd></>}
      </dl>

      <p className="ops-section-label">Сообщение</p>
      <p className={`ops-message${lead.message ? '' : ' empty'}`}>{lead.message || 'Без сообщения'}</p>

      <p className="ops-section-label" id={`st-${lead.id}`}>Статус</p>
      <div className="ops-status-row" role="group" aria-labelledby={`st-${lead.id}`}>
        {LEAD_STATUSES.map(s => (
          <button
            key={s}
            type="button"
            className="ops-status-btn"
            aria-pressed={lead.status === s}
            disabled={!!statusBusy}
            onClick={() => void setStatus(s)}
          >
            {LEAD_STATUS_LABELS[s]}{statusBusy === s && '…'}
          </button>
        ))}
      </div>

      <Field label="Заметка менеджера" error={noteError} hint="Видна только в админке. Сохраняется автоматически, когда вы уходите из поля.">
        <Textarea
          rows={4}
          value={note}
          maxLength={2000}
          placeholder="Например: перезвонить в понедельник, интересует олимпиада по математике"
          onChange={e => { setNote(e.target.value); setNoteError(undefined); }}
          onBlur={() => void saveNote(true)}
        />
      </Field>
      <div className="ops-note-actions">
        <span aria-live="polite">{savingNote ? 'Сохраняем…' : noteDirty ? 'Есть несохранённые изменения' : note ? 'Сохранено' : ''}</span>
        <Button size="sm" variant="outline" icon={Save} onClick={() => void saveNote()} disabled={!noteDirty} loading={savingNote}>Сохранить заметку</Button>
      </div>
    </Drawer>
  );
}
