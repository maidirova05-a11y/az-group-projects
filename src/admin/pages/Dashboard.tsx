/** Обзор: сводка, график заявок за 30 дней, последние действия, быстрые действия. */
import { useMemo, useState } from 'react';
import {
  Activity, CalendarDays, CalendarPlus, Handshake, Inbox, LayoutGrid, Newspaper, RefreshCw, type LucideIcon,
} from 'lucide-react';
import { linkProps } from '../router';
import { useAuth } from '../auth';
import { useAdminStats, type AdminStats } from '../stats';
import { Badge, EmptyState, ErrorState, IconButton, PageHeader, Panel, Skeleton, fmt } from '../ui';

interface Tile { key: keyof AdminStats['counts']; label: string; Icon: LucideIcon; to: string; hint?: (c: AdminStats['counts']) => string }
const TILES: Tile[] = [
  { key: 'programs', label: 'Программы', Icon: CalendarDays, to: '/admin/programs', hint: c => `мероприятий всего: ${c.events}` },
  { key: 'upcomingEvents', label: 'Предстоящие мероприятия', Icon: CalendarPlus, to: '/admin/programs' },
  { key: 'projects', label: 'Проекты', Icon: LayoutGrid, to: '/admin/projects' },
  { key: 'news', label: 'Новости', Icon: Newspaper, to: '/admin/news' },
  { key: 'partners', label: 'Партнёры', Icon: Handshake, to: '/admin/partners' },
  { key: 'leadsNew', label: 'Новые заявки', Icon: Inbox, to: '/admin/leads?status=new', hint: c => `всего заявок: ${c.leadsTotal}` },
];

// Ровно то, что пишет бэкенд (server/routes/auth.ts, server/routes/admin/*.ts → audit()).
// Неизвестные action/entity не показываются как есть — для них общая русская фраза.
const ACTION_LABELS: Record<string, string> = {
  create: 'создал(а)', update: 'изменил(а)', delete: 'удалил(а)', reorder: 'изменил(а) порядок:',
  login: 'вошёл(ла) в админку', logout: 'вышел(ла) из админки', login_failed: 'неудачная попытка входа', password_change: 'сменил(а) свой пароль',
};
/** Винительный падеж: «изменил(а) программу №3». */
const ENTITY_LABELS: Record<string, string> = {
  program: 'программу', event: 'мероприятие', project: 'проект', news: 'новость', partner: 'партнёра', faq: 'вопрос',
  setting: 'настройки', setting_translations: 'переводы настроек', lead: 'заявку', admin: 'администратора',
};
/** Для перестановки (entity — ресурс без «s»): «изменил(а) порядок: программы». */
const REORDER_LABELS: Record<string, string> = { program: 'программы', project: 'проекты', partner: 'партнёры', faq: 'вопросы' };
/** entityId для setting / setting_translations — ключ раздела настроек. */
const SETTING_LABELS: Record<string, string> = { contacts: '«Контакты»', links: '«Ссылки»', stats: '«Цифры»', about: '«О компании»' };
const SETTING_TABS: Record<string, string> = { links: 'links', stats: 'stats', about: 'about' };
const SETTING_ENTITIES = ['setting', 'setting_translations'];
const ENTITY_LINKS: Record<string, string> = {
  program: '/admin/programs', event: '/admin/programs', project: '/admin/projects', news: '/admin/news', partner: '/admin/partners',
  faq: '/admin/faqs', lead: '/admin/leads', setting: '/admin/settings', setting_translations: '/admin/settings', admin: '/admin/admins',
};
const AUTH_ACTIONS = ['login', 'logout', 'login_failed', 'password_change'];

type AuditRow = AdminStats['recentAudit'][number];

function describe(a: AuditRow): string {
  const verb = ACTION_LABELS[a.action];
  if (!verb) return 'выполнил(а) действие в админке';
  if (AUTH_ACTIONS.includes(a.action)) return verb;
  if (a.action === 'reorder') return REORDER_LABELS[a.entity] ? `${verb} ${REORDER_LABELS[a.entity]}` : 'изменил(а) порядок элементов';
  const ent = ENTITY_LABELS[a.entity];
  if (!ent) return `${verb} запись`;
  if (SETTING_ENTITIES.includes(a.entity)) {
    const section = a.entityId ? SETTING_LABELS[String(a.entityId)] : undefined;
    return section ? `${verb} ${ent} ${section}` : `${verb} ${ent}`;
  }
  return `${verb} ${ent}${a.entityId ? ` №${a.entityId}` : ''}`;
}

function linkFor(a: AuditRow): string | undefined {
  if (a.action === 'delete' || AUTH_ACTIONS.includes(a.action)) return undefined;
  if (SETTING_ENTITIES.includes(a.entity)) {
    const tab = SETTING_TABS[String(a.entityId)];
    return tab ? `/admin/settings?tab=${tab}` : '/admin/settings';
  }
  return ENTITY_LINKS[a.entity];
}

function LeadsChart({ data }: { data: AdminStats['leadsByDay'] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...data.map(d => d.count));
  const total = data.reduce((s, d) => s + d.count, 0);
  const W = 600; const H = 180; const pad = 24; const bw = (W - pad) / Math.max(1, data.length);
  const ticks = [0, Math.ceil(max / 2), max].filter((v, i, a) => a.indexOf(v) === i);
  const shown = hover !== null ? data[hover] : null;
  if (total === 0) return <EmptyState icon={Inbox} compact title="За 30 дней заявок не было" text="Как только кто-нибудь оставит заявку на сайте, она появится здесь." />;
  return (
    <figure className="chart">
      <figcaption className="chart-caption">
        <span><strong>{total}</strong> за 30 дней</span>
        <span className="chart-hover" aria-live="polite">{shown ? `${fmt.date(shown.date)}: ${shown.count}` : ' '}</span>
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H + 22}`} role="img" aria-label={`Заявки по дням за 30 дней, всего ${total}`} onMouseLeave={() => setHover(null)}>
        {ticks.map(t => {
          const y = H - (t / max) * (H - 10);
          return (
            <g key={t}>
              <line x1={pad} x2={W} y1={y} y2={y} className="chart-grid" />
              <text x={pad - 6} y={y + 4} textAnchor="end" className="chart-axis">{t}</text>
            </g>
          );
        })}
        {data.map((d, i) => {
          const h = (d.count / max) * (H - 10);
          const x = pad + i * bw;
          return (
            <g key={d.date} onMouseEnter={() => setHover(i)}>
              <rect x={x} y={0} width={bw} height={H} fill="transparent" />
              <rect x={x + bw * 0.18} y={H - Math.max(h, d.count ? 2 : 0)} width={bw * 0.64} height={Math.max(h, d.count ? 2 : 0)} rx={Math.min(4, bw * 0.3)} className={`chart-bar${hover === i ? ' active' : ''}`}>
                <title>{`${fmt.date(d.date)}: ${d.count}`}</title>
              </rect>
              {(data.length - 1 - i) % 7 === 0 && (
                <text x={x + bw / 2} y={H + 16} textAnchor="middle" className="chart-axis">{d.date.slice(8, 10)}.{d.date.slice(5, 7)}</text>
              )}
            </g>
          );
        })}
      </svg>
      <table className="sr-only">
        <caption>Заявки по дням</caption>
        <tbody>{data.map(d => <tr key={d.date}><th scope="row">{d.date}</th><td>{d.count}</td></tr>)}</tbody>
      </table>
    </figure>
  );
}

export default function Dashboard() {
  const { stats, loading, error, reload } = useAdminStats();
  const { admin } = useAuth();
  const greeting = useMemo(() => {
    const h = new Date().getHours();
    return h < 5 ? 'Доброй ночи' : h < 12 ? 'Доброе утро' : h < 18 ? 'Добрый день' : 'Добрый вечер';
  }, []);

  return (
    <>
      <PageHeader
        title="Обзор"
        description={admin ? `${greeting}, ${admin.name}!` : undefined}
        actions={<IconButton icon={RefreshCw} label="Обновить данные" variant="ghost" onClick={() => void reload()} loading={loading && !!stats} />}
      />

      {error && !stats ? (
        <Panel><ErrorState message={error} onRetry={() => void reload()} /></Panel>
      ) : (
        <div className="stat-grid">
          {TILES.map(t => (
            <a key={t.key} className={`stat-tile${t.key === 'leadsNew' && (stats?.counts.leadsNew ?? 0) > 0 ? ' accent' : ''}`} {...linkProps(t.to)}>
              <span className="stat-icon"><t.Icon size={20} aria-hidden="true" /></span>
              <span className="stat-label">{t.label}</span>
              {stats ? <strong className="stat-value">{stats.counts[t.key]}</strong> : <Skeleton width={56} height={30} />}
              {stats && t.hint && <span className="stat-hint">{t.hint(stats.counts)}</span>}
            </a>
          ))}
        </div>
      )}

      <div className="dash-grid">
        <Panel title="Заявки по дням" description="Последние 30 дней" actions={<a className="more-link" {...linkProps('/admin/leads')}>Все заявки</a>}>
          {stats ? <LeadsChart data={stats.leadsByDay} /> : error ? <ErrorState message={error} onRetry={() => void reload()} /> : <Skeleton height={180} radius={12} />}
        </Panel>

        <Panel title="Быстрые действия">
          <div className="quick-grid">
            <a className="quick-tile" {...linkProps('/admin/programs')}><span className="tile-icon"><CalendarPlus size={20} aria-hidden="true" /></span>Добавить мероприятие</a>
            <a className="quick-tile" {...linkProps('/admin/news?new=1')}><span className="tile-icon"><Newspaper size={20} aria-hidden="true" /></span>Добавить новость</a>
            <a className="quick-tile" {...linkProps('/admin/leads')}>
              <span className="tile-icon"><Inbox size={20} aria-hidden="true" /></span>Открыть заявки
              {!!stats?.counts.leadsNew && <Badge tone="brand">{stats.counts.leadsNew} новых</Badge>}
            </a>
          </div>
        </Panel>
      </div>

      <Panel title="Последние действия" description="Журнал изменений администраторов">
        {!stats ? (
          error ? <ErrorState message={error} onRetry={() => void reload()} /> : (
            <div className="activity-skeleton">{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} height={40} radius={12} />)}</div>
          )
        ) : stats.recentAudit.length === 0 ? (
          <EmptyState icon={Activity} compact title="Пока нет действий" text="Здесь появятся изменения, сделанные в админке." />
        ) : (
          <ul className="activity">
            {stats.recentAudit.map(a => {
              const link = linkFor(a);
              const body = (
                <>
                  <span className={`activity-dot${a.action === 'delete' || a.action === 'login_failed' ? ' danger' : ''}`} aria-hidden="true" />
                  <span className="activity-text">{a.action === 'login_failed' && !a.adminName ? 'Неудачная попытка входа' : <><strong>{a.adminName ?? 'Система'}</strong> {describe(a)}</>}</span>
                  <time dateTime={a.createdAt} title={fmt.dateTime(a.createdAt)}>{fmt.relative(a.createdAt)}</time>
                </>
              );
              return <li key={a.id}>{link ? <a {...linkProps(link)}>{body}</a> : <div>{body}</div>}</li>;
            })}
          </ul>
        )}
      </Panel>
    </>
  );
}
