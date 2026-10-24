/** Настройки сайта: контакты, ссылки, цифры, о компании — каждый раздел сохраняется отдельно. */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { SettingKey } from '@shared/schemas';
import { navigate, setPopstateBlocker, useAdminRoute } from '../router';
import { useAuth } from '../auth';
import { ErrorState, PageHeader, Panel, Skeleton, TabList, useConfirm, useResource, useTabs } from '../ui';
import {
  AboutForm, ContactsForm, LinksForm, StatsForm, TranslatedSection, normalize, type About, type Contacts, type Links, type RawTr, type Stats,
} from './ops/settings';
import './ops/ops.css';

const TABS: { value: SettingKey; label: string }[] = [
  { value: 'contacts', label: 'Контакты' },
  { value: 'links', label: 'Ссылки' },
  { value: 'stats', label: 'Цифры' },
  { value: 'about', label: 'О компании' },
];
/** Контакты и ссылки меняет только владелец — редактору эти разделы не показываем (сервер тоже проверяет). */
const OWNER_ONLY: SettingKey[] = ['contacts', 'links'];

const LEAVE = { title: 'Есть несохранённые изменения', message: 'Если уйти сейчас, изменения в этом разделе пропадут.', confirmLabel: 'Уйти без сохранения', cancelLabel: 'Остаться', danger: true };

export default function SettingsPage() {
  const { query, setQuery } = useAdminRoute();
  const confirm = useConfirm();
  const res = useResource<Partial<Record<SettingKey, unknown>>>('/admin/settings');
  const trRes = useResource<Partial<Record<SettingKey, RawTr>>>('/admin/settings/translations');
  const { isOwner } = useAuth();
  const tabsList = isOwner ? TABS : TABS.filter(t => !OWNER_ONLY.includes(t.value));
  const firstTab = tabsList[0].value;
  const raw = query.get('tab');
  const tab: SettingKey = tabsList.some(t => t.value === raw) ? raw as SettingKey : firstTab;
  const [dirty, setDirty] = useState(false);
  const dirtyRef = useRef(false);
  dirtyRef.current = dirty;
  const onDirty = useCallback((d: boolean) => setDirty(d), []);

  // Предупреждение при закрытии вкладки браузера.
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirty]);

  // Предупреждение при переходе по ссылкам админки (меню, крошки).
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (!dirtyRef.current || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!a || a.target === '_blank') return;
      const href = a.getAttribute('href') ?? '';
      if (!href.startsWith('/admin')) return;
      e.preventDefault();
      e.stopPropagation();
      void confirm(LEAVE).then(ok => {
        if (!ok) return;
        dirtyRef.current = false;
        setDirty(false);
        navigate(href);
      });
    };
    document.addEventListener('click', h, true);
    return () => document.removeEventListener('click', h, true);
  }, [confirm]);

  // Кнопка «Назад»/«Вперёд» браузера: popstate приходит, когда адрес уже сменился. Роутер даёт блокировщик,
  // который срабатывает раньше перерисовки; при отказе возвращаем адрес настроек в историю.
  const hereRef = useRef(window.location.pathname + window.location.search);
  useEffect(() => { hereRef.current = window.location.pathname + window.location.search; });
  useEffect(() => {
    setPopstateBlocker(() => {
      if (!dirtyRef.current) return false;
      const here = hereRef.current;
      void confirm(LEAVE).then(ok => {
        if (ok) {
          dirtyRef.current = false;
          setDirty(false);
          navigate(window.location.pathname + window.location.search + window.location.hash, { replace: true });
        } else {
          window.history.pushState(null, '', here);
        }
      });
      return true;
    });
    return () => setPopstateBlocker(null);
  }, [confirm]);

  const switchTab = async (next: SettingKey) => {
    if (next === tab) return;
    if (dirty && !(await confirm(LEAVE))) return;
    setDirty(false);
    setQuery({ tab: next === firstTab ? null : next });
  };

  const tabs = useTabs<SettingKey>({ keys: tabsList.map(t => t.value), value: tab, onChange: v => void switchTab(v), label: 'Раздел настроек', activation: 'manual' });

  const onSaved = (key: SettingKey) => (value: unknown) => res.setData(d => ({ ...(d ?? {}), [key]: value }));
  const onTrSaved = (key: SettingKey) => (tr: RawTr) => trRes.setData(d => ({ ...(d ?? {}), [key]: tr }));

  let body;
  if (res.error && !res.data) body = <Panel><ErrorState message={res.error} onRetry={() => void res.reload()} /></Panel>;
  else if (trRes.error && !trRes.data) body = <Panel><ErrorState message={trRes.error} onRetry={() => void trRes.reload()} /></Panel>;
  else if (!res.data || !trRes.data) {
    body = (
      <Panel>
        <div role="status" aria-label="Загрузка настроек" style={{ display: 'grid', gap: 16 }}>
          <Skeleton width="30%" height={22} />
          {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} height={44} radius={12} />)}
        </div>
      </Panel>
    );
  } else {
    const d = res.data;
    const tr = trRes.data;
    if (tab === 'links') {
      body = <LinksForm key={tab} onDirty={onDirty} initial={normalize('links', d.links)} onSaved={onSaved('links') as (v: Links) => void} />;
    } else {
      // Контакты, цифры и «О компании» — с вкладками RU · KZ · ENG (ссылки не переводятся).
      const ru = normalize(tab, d[tab]);
      body = (
        <TranslatedSection
          key={tab}
          settingKey={tab}
          ru={ru}
          translations={tr[tab]}
          onTranslationsSaved={onTrSaved(tab)}
          onDirty={onDirty}
          renderRu={ruDirty => (tab === 'contacts'
            ? <ContactsForm onDirty={ruDirty} initial={ru as Contacts} onSaved={onSaved('contacts') as (v: Contacts) => void} />
            : tab === 'stats'
              ? <StatsForm onDirty={ruDirty} initial={ru as Stats} onSaved={onSaved('stats') as (v: Stats) => void} />
              : <AboutForm onDirty={ruDirty} initial={ru as About} onSaved={onSaved('about') as (v: About) => void} />)}
        />
      );
    }
  }

  return (
    <>
      <PageHeader title="Настройки сайта" description="Контакты, ссылки и тексты, которые показываются на сайте. Каждый раздел сохраняется своей кнопкой." />
      <div className="ops-tabs">
        <TabList tabs={tabs} options={tabsList.map(t => ({ value: t.value, label: t.value === tab && dirty ? `${t.label} •` : t.label }))} />
      </div>
      <div {...tabs.panelProps}>{body}</div>
    </>
  );
}
