/** Каркас админки в стиле egov.kz: шапка, боковое меню (узкая колонка < 1200px), нижняя панель на телефоне. */
import { useEffect, useLayoutEffect, useState, type ReactNode } from 'react';
import { Ellipsis, ExternalLink, LogOut, UserRound } from 'lucide-react';
import { ADMIN_NAV, linkProps, navItem, type AdminNavItem, type AdminSection } from './router';
import { useAuth, ROLE_LABELS } from './auth';
import { useAdminStats } from './stats';
import { useConfirm } from './ui/Modal';
import ThemeToggle from '../components/ThemeToggle';
import { THEME_TEXT } from '../content/theme';

function NavBadge({ item }: { item: AdminNavItem }) {
  const { stats } = useAdminStats();
  const n = item.section === 'leads' ? stats?.counts.leadsNew ?? 0 : item.section === 'registrations' ? stats?.counts.registrationsNew ?? 0 : 0;
  if (!n) return null;
  return <span className="nav-badge"><span aria-hidden="true">{n > 99 ? '99+' : n}</span><span className="sr-only">, новых: {n}</span></span>;
}

function useVisibleNav() {
  const { isOwner } = useAuth();
  return ADMIN_NAV.filter(n => !n.hidden && (!n.ownerOnly || isOwner));
}

function TopBar() {
  const { admin, logout } = useAuth();
  const confirm = useConfirm();
  const onLogout = async () => {
    if (await confirm({ title: 'Выйти из админки?', confirmLabel: 'Выйти', danger: false })) await logout();
  };
  return (
    <header className="topbar">
      <a className="brand" {...linkProps('/admin')} aria-label="AZ Group — обзор админки">
        <img src="/logos/azgroup.png" alt="AZ Group" width="140" height="18" />
        <span className="brand-tag">Админка</span>
      </a>
      <div className="topbar-actions">
        {/* Настройки отображения: тема; сюда же встаёт переключатель языка. */}
        <div className="topbar-prefs">
          <ThemeToggle />
        </div>
        <a className="topbar-link" href="/" target="_blank" rel="noreferrer">
          <ExternalLink size={16} aria-hidden="true" /><span>Открыть сайт</span>
        </a>
        {admin && (
          <a className="user-chip" {...linkProps('/admin/account')} title="Мой аккаунт">
            <span className="user-avatar" aria-hidden="true">{admin.name.trim().charAt(0).toUpperCase() || <UserRound size={16} />}</span>
            <span className="user-meta">
              <span className="user-name">{admin.name}</span>
              <span className="user-role">{ROLE_LABELS[admin.role]}</span>
            </span>
          </a>
        )}
        <button type="button" className="icon-btn icon-btn-plain" onClick={() => void onLogout()} aria-label="Выйти" title="Выйти">
          <LogOut size={18} aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}

function Sidebar({ section }: { section: AdminSection }) {
  const items = useVisibleNav();
  return (
    <aside className="sidebar">
      <nav aria-label="Разделы админки">
        <ul>
          {items.map(item => {
            const active = item.section === section;
            return (
              <li key={item.path}>
                <a {...linkProps(item.path)} className={active ? 'active' : ''} aria-current={active ? 'page' : undefined} title={item.label}>
                  <span className="nav-icon"><item.Icon size={20} strokeWidth={1.8} aria-hidden="true" /><NavBadge item={item} /></span>
                  <span className="label-full">{item.label}</span>
                  <span className="label-short" aria-hidden="true">{item.short}</span>
                </a>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="sidebar-bottom">
        <a {...linkProps('/admin/account')} className={`sidebar-account${section === 'account' ? ' active' : ''}`} aria-current={section === 'account' ? 'page' : undefined} title="Мой аккаунт">
          <UserRound size={18} aria-hidden="true" /><span className="label-full">Мой аккаунт</span><span className="label-short" aria-hidden="true">Аккаунт</span>
        </a>
        <p className="sidebar-copy">© {new Date().getFullYear()} AZ Group</p>
      </div>
    </aside>
  );
}

const TABS: AdminSection[] = ['dashboard', 'programs', 'registrations', 'leads'];

function MobileTabs({ section }: { section: AdminSection }) {
  const [more, setMore] = useState(false);
  const items = useVisibleNav();
  useEffect(() => setMore(false), [section]);
  useEffect(() => {
    if (!more) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMore(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [more]);
  const inMore = !TABS.includes(section);
  return (
    <>
      {more && (
        <div className="sheet-backdrop" onClick={() => setMore(false)}>
          <nav className="sheet" id="admin-more" aria-label="Все разделы" onClick={e => e.stopPropagation()}>
            <div className="sheet-handle" aria-hidden="true" />
            <ul>
              {[...items, navItem('account')!].map(item => (
                <li key={item.path}>
                  <a {...linkProps(item.path)} className={item.section === section ? 'active' : ''} aria-current={item.section === section ? 'page' : undefined}>
                    <span className="tile-icon"><item.Icon size={18} aria-hidden="true" /></span>{item.label}<NavBadge item={item} />
                  </a>
                </li>
              ))}
            </ul>
            <div className="sheet-prefs">
              <span className="sheet-prefs-title" aria-hidden="true">{THEME_TEXT.menuLabel}</span>
              <ThemeToggle variant="segmented" />
            </div>
          </nav>
        </div>
      )}
      <nav className="tabbar" aria-label="Быстрая навигация">
        {items.filter(n => TABS.includes(n.section)).map(item => (
          <a key={item.path} {...linkProps(item.path)} className={item.section === section ? 'active' : ''} aria-current={item.section === section ? 'page' : undefined}>
            <span className="nav-icon"><item.Icon size={22} strokeWidth={1.8} aria-hidden="true" /><NavBadge item={item} /></span><span>{item.short}</span>
          </a>
        ))}
        <button type="button" className={inMore || more ? 'active' : ''} aria-expanded={more} aria-controls="admin-more" onClick={() => setMore(m => !m)}>
          <Ellipsis size={22} aria-hidden="true" /><span>Ещё</span>
        </button>
      </nav>
    </>
  );
}

export default function Layout({ section, children }: { section: AdminSection; children: ReactNode }) {
  // useLayoutEffect: срабатывает раньше useEffect в PageHeader, поэтому заголовок страницы его не перебивает.
  useLayoutEffect(() => {
    const item = navItem(section);
    document.title = `${item?.title ?? 'Страница не найдена'} — Админка AZ Group`;
    document.getElementById('content')?.focus({ preventScroll: true });
  }, [section]);
  return (
    <div className="shell">
      <a href="#content" className="skip-link">Перейти к содержимому</a>
      <TopBar />
      <Sidebar section={section} />
      <main id="content" className="content" tabIndex={-1}>{children}</main>
      <MobileTabs section={section} />
    </div>
  );
}
