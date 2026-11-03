import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { anchorProps } from '../content/links';
import { Ellipsis, Mail, MessageCircle, Phone, Search as SearchIcon, Send, X } from 'lucide-react';
import { NAV, linkProps, type Route } from '../router';
import { useContent } from '../content/useContent';
import { safeHref } from '../content/safe-url';
import Search from './Search';
import ThemeToggle from './ThemeToggle';
import LangSwitch from './LangSwitch';
import { useT } from '../i18n';

/** Instagram нет в lucide-react v1 — простой контурный знак. */
function InstagramIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function SearchDialog({ onClose }: { onClose: () => void }) {
  const t = useT().layout;
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
    d?.querySelector('input')?.focus();
  }, []);
  return (
    <dialog ref={ref} className="search-dialog" aria-label={t.search} onClose={onClose} onClick={e => { if (e.target === ref.current) ref.current?.close(); }}>
      <div className="search-dialog-body">
        <div className="search-dialog-head"><strong>{t.search}</strong><button type="button" className="icon-btn" aria-label={t.closeSearch} onClick={() => ref.current?.close()}><X size={20} /></button></div>
        <Search autoFocus onDone={() => ref.current?.close()} />
      </div>
    </dialog>
  );
}

function Header({ onSearch }: { onSearch: () => void }) {
  const { contacts, links } = useContent().settings;
  const { layout: t, theme } = useT();
  return (
    <header className="topbar">
      <a className="brand" {...linkProps('/')} aria-label={t.brandHome}>
        <img src="/logos/azgroup.png" alt="AZ Group" width="150" height="19" />
        <span className="brand-sep" aria-hidden="true" />
        <span className="brand-note">{t.brandNote1}<br />{t.brandNote2}</span>
      </a>
      <div className="topbar-actions">
        {/* Настройки отображения: язык (RU/KZ/ENG) и тема. */}
        <div className="topbar-prefs">
          <LangSwitch />
          <ThemeToggle text={theme} />
        </div>
        <button type="button" className="icon-btn" onClick={onSearch} aria-label={t.search}><SearchIcon size={20} /></button>
        <a className="topbar-phone" href={safeHref(contacts.phoneHref)}><Phone size={16} aria-hidden="true" />{contacts.phone}</a>
        <a className="btn btn-primary btn-sm" {...anchorProps(links.registration)}>{t.registration}</a>
      </div>
    </header>
  );
}

function Sidebar({ path }: { path: Route }) {
  const { contacts } = useContent().settings;
  const { layout: t, nav } = useT();
  return (
    <aside className="sidebar">
      <nav aria-label={t.sections}>
        <ul>
          {NAV.map(({ path: p, key, Icon }) => { const { label, short } = nav[key]; return (
            <li key={p}>
              <a {...linkProps(p)} className={path === p ? 'active' : ''} aria-current={path === p ? 'page' : undefined} title={label} aria-label={label}>
                <Icon size={20} strokeWidth={1.8} aria-hidden="true" />
                <span className="label-full">{label}</span>
                <span className="label-short" aria-hidden="true">{short}</span>
              </a>
            </li>
          ); })}
        </ul>
      </nav>
      <div className="sidebar-bottom">
        <div className="sidebar-social">
          <a href={safeHref(contacts.instagram)} target="_blank" rel="noreferrer" aria-label={t.instagram} title="Instagram"><InstagramIcon /></a>
          <a href={safeHref(contacts.whatsapp)} target="_blank" rel="noreferrer" aria-label={t.whatsapp} title="WhatsApp"><MessageCircle size={18} /></a>
          <a href={safeHref(`mailto:${contacts.email}`)} aria-label={t.mail} title={contacts.email}><Mail size={18} /></a>
        </div>
        <a className="btn btn-primary sidebar-cta" {...linkProps('/contacts#request')} title={t.leaveRequest}>
          <Send size={16} aria-hidden="true" /><span>{t.leaveRequest}</span>
        </a>
        <p className="sidebar-copy">© {new Date().getFullYear()} AZ Group</p>
      </div>
    </aside>
  );
}

const TABS: Route[] = ['/', '/events', '/projects', '/contacts'];

function MobileTabs({ path }: { path: Route }) {
  const { layout: t, nav, theme, lang } = useT();
  const [more, setMore] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const moreBtnRef = useRef<HTMLButtonElement>(null);
  // Закрытие из-за перехода в другой раздел: фокус не возвращаем на «Ещё» (новая страница важнее).
  const navigatedRef = useRef(false);
  const sheetId = useId();
  const inMore = !TABS.includes(path);

  useEffect(() => {
    const d = dialogRef.current;
    if (d?.open) { navigatedRef.current = true; d.close(); }
  }, [path]);

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (more && !d.open) {
      d.showModal();
      d.querySelector<HTMLElement>('nav a')?.focus();
    } else if (!more && d.open) d.close();
  }, [more]);

  const onClose = () => {
    setMore(false);
    if (!navigatedRef.current) moreBtnRef.current?.focus();
    navigatedRef.current = false;
  };

  return (
    <>
      {/* Лист «Ещё»: нативный модальный <dialog> — фокус внутри, Esc и клик по фону закрывают. */}
      <dialog
        ref={dialogRef}
        id={sheetId}
        className="sheet-dialog"
        aria-label={t.allSections}
        onClose={onClose}
        onClick={e => { if (e.target === dialogRef.current) dialogRef.current?.close(); }}
      >
        <div className="sheet">
          <div className="sheet-top">
            <div className="sheet-handle" aria-hidden="true" />
            <button type="button" className="icon-btn sheet-close" aria-label={t.closeMenu} onClick={() => dialogRef.current?.close()}><X size={20} /></button>
          </div>
          <nav aria-label={t.allSections}>
            <ul>
              {NAV.map(({ path: p, key, Icon }) => (
                <li key={p}><a {...linkProps(p)} className={path === p ? 'active' : ''} aria-current={path === p ? 'page' : undefined}><span className="tile-icon"><Icon size={20} aria-hidden="true" /></span>{nav[key].label}</a></li>
              ))}
            </ul>
          </nav>
          {/* Дубль настроек шапки для телефона: язык и тема. */}
          <div className="sheet-prefs">
            <span className="sheet-prefs-title" aria-hidden="true">{lang.label}</span>
            <LangSwitch variant="sheet" />
            <span className="sheet-prefs-title" aria-hidden="true">{theme.menuLabel}</span>
            <ThemeToggle variant="segmented" text={theme} />
          </div>
        </div>
      </dialog>
      <nav className="tabbar" aria-label={t.quickNav}>
        {NAV.filter(n => TABS.includes(n.path)).map(({ path: p, key, Icon }) => (
          <a key={p} {...linkProps(p)} className={path === p ? 'active' : ''} aria-current={path === p ? 'page' : undefined}><Icon size={22} strokeWidth={1.8} aria-hidden="true" /><span>{nav[key].short}</span></a>
        ))}
        <button
          ref={moreBtnRef}
          type="button"
          className={inMore || more ? 'active' : ''}
          aria-haspopup="dialog"
          aria-expanded={more}
          aria-controls={sheetId}
          onClick={() => setMore(m => !m)}
        ><Ellipsis size={22} aria-hidden="true" /><span>{t.more}</span></button>
      </nav>
    </>
  );
}

export default function Layout({ path, children }: { path: Route; children: ReactNode }) {
  const [searching, setSearching] = useState(false);
  const { contacts } = useContent().settings;
  const t = useT().layout;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setSearching(true); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  return (
    <div className="shell">
      <a href="#content" className="skip-link">{t.skipLink}</a>
      <Header onSearch={() => setSearching(true)} />
      <Sidebar path={path} />
      <main id="content" className="content" tabIndex={-1}>
        {children}
        <footer className="site-footer">
          <div>
            <img src="/logos/azgroup.png" alt="AZ Group" width="120" height="15" />
            <p>{t.footerAbout}</p>
          </div>
          <ul>
            <li><a href={safeHref(contacts.mapUrl)} target="_blank" rel="noreferrer">{contacts.address}</a></li>
            <li><a href={safeHref(contacts.phoneHref)}>{contacts.phone}</a></li>
            <li><a href={safeHref(`mailto:${contacts.email}`)}>{contacts.email}</a></li>
            <li><a {...anchorProps(contacts.offer)}>{t.offer}</a></li>
            <li><a {...anchorProps('/privacy')}>{t.privacy}</a></li>
          </ul>
          <button type="button" className="footer-top" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>{t.toTop}</button>
        </footer>
      </main>
      <MobileTabs path={path} />
      {searching && <SearchDialog onClose={() => setSearching(false)} />}
    </div>
  );
}
