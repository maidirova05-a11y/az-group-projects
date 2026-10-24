import { useState } from 'react';
import { Search as SearchIcon } from 'lucide-react';
import type { PartnerDTO } from '@shared/schemas';
import { EmptyState, PageTitle, Panel, Segmented } from '../components/ui';
import { useContent } from '../content/useContent';
import { safeImgSrc } from '../content/safe-url';
import { partnerGroups, type PartnerGroup } from '../data/site';
import { useT } from '../i18n';
import { linkProps } from '../router';

function Logo({ p }: { p: PartnerDTO }) {
  const [broken, setBroken] = useState(false);
  const src = safeImgSrc(p.image);
  if (!src || broken) {
    const initials = p.name.replace(/[«»"№]/g, '').split(/\s+/).filter(w => /^[A-ZА-ЯӘҒҚҢӨҰҮҺІ0-9]/.test(w)).slice(0, 2).map(w => w[0]).join('');
    return <span className="partner-logo initials" aria-hidden="true">{initials || 'AZ'}</span>;
  }
  return <span className="partner-logo"><img src={src} alt="" loading="lazy" onError={() => setBroken(true)} /></span>;
}

export default function Partners() {
  const { partners } = useContent();
  const { nav, partners: t } = useT();
  const [group, setGroup] = useState<PartnerGroup>('schools');
  const [q, setQ] = useState('');
  const needle = q.trim().normalize('NFC').toLowerCase();
  const list = partners.filter(p => p.group === group && p.name.normalize('NFC').toLowerCase().includes(needle));
  return (
    <>
      <PageTitle title={nav.partners.title} lead={t.lead} />
      <Panel className="filters">
        <div className="filters-row">
          <Segmented label={t.type} value={group} onChange={setGroup} options={partnerGroups.map(g => ({ id: g.id, label: t.groups[g.id], count: partners.filter(p => p.group === g.id).length }))} />
          <label className="search-field small">
            <SearchIcon size={18} aria-hidden="true" />
            <span className="sr-only">{t.find}</span>
            <input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder={t.placeholder} />
          </label>
        </div>
      </Panel>
      <Panel>
        {list.length ? (
          <ul className="partner-grid">
            {list.map(p => (
              <li key={p.id} className="partner">
                <Logo key={p.image ?? ''} p={p} />
                <div><strong>{p.name}</strong><span className="badge">{t.badge}</span></div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState art="search" title={q.trim() ? t.notFound : t.emptyGroup}>
            <p className="empty-text">{q.trim() ? t.notFoundHint : t.emptyGroupHint}</p>
            {q.trim() && <button type="button" className="btn btn-ghost" onClick={() => setQ('')}>{t.clear}</button>}
          </EmptyState>
        )}
      </Panel>
      <Panel className="cta">
        <div><h2>{t.ctaTitle}</h2><p>{t.ctaText}</p></div>
        <a className="btn btn-primary" {...linkProps('/contacts#request')}>{t.request}</a>
      </Panel>
    </>
  );
}
