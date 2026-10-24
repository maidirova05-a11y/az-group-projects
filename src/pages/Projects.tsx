import { useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import type { ProgramDTO, ProjectDTO } from '@shared/schemas';
import { PROGRAM_COLORS_EXTRA } from '@shared/calendar-utils';
import { EmptyState, PageTitle, Panel, Segmented } from '../components/ui';
import NeuralHub from '../components/NeuralHub';
import { useContent } from '../content/useContent';
import { safeHref, safeHrefOrNull, safeImgSrc } from '../content/safe-url';
import { categories } from '../data/projects';
import { partnership } from '../data/site';
import { useT, type Dict } from '../i18n';
import { useHash, useScrollToHash } from '../router';
import { programVars } from './events/color';

/** Служебный id фильтра «Все» (не совпадает ни с одной категорией). */
const ALL = '__all';

/** Иллюстрация направления для программ без собственного логотипа — по русскому названию категории. */
const CATEGORY_ART: Record<string, string> = {
  'Олимпиады': '/illustrations/dir-science.svg',
  'Наука': '/illustrations/dir-science.svg',
  'Робототехника': '/illustrations/dir-robotics.svg',
  'Зарубежные лагеря': '/illustrations/dir-international.svg',
  'Творчество': '/illustrations/dir-creative.svg',
  'Фестивали': '/illustrations/dir-schools.svg',
};

/** Категория в контенте уже на языке страницы — находим иллюстрацию и по русскому, и по переведённому названию. */
function categoryArt(category: string, names: Dict['projects']['categories']): string | undefined {
  if (CATEGORY_ART[category]) return CATEGORY_ART[category];
  const ru = Object.keys(names).find(k => names[k] === category);
  return ru ? CATEGORY_ART[ru] : undefined;
}

/** Порядок категорий: сначала привычные (в переводе), затем новые из CMS — в порядке появления. */
function categoryOrder(list: ProjectDTO[], names: Dict['projects']['categories']): string[] {
  const known: string[] = [...categories, 'Фестивали'].map(c => names[c] ?? c);
  const present = new Set(list.map(p => p.category));
  return [...known.filter(c => present.has(c)), ...[...present].filter(c => !known.includes(c))];
}

/**
 * Цвет проекта. Если у проекта есть программы в календаре — берём цвет первой из них,
 * чтобы проект и его мероприятия совпадали по цвету. Иначе — закреплённый цвет по slug,
 * а для новых проектов из админки — стабильный цвет из запасной палитры.
 */
const OWN_COLORS: Record<string, string> = {
  smarthub: '#3949ab',
  onerlab: '#bf7405',
  'global-edtech-festival': '#00838f',
  'international-camp': '#2e7d32',
  'fibonacci-exchange-program': '#ad1457',
  'robocoach-international': '#208239',
  'bilim-talks': '#6a1b9a',
};
function projectColor(p: ProjectDTO, programs: ProgramDTO[]): string {
  const linked = programs.find(pr => pr.projectSlug === p.slug);
  if (linked) return linked.color;
  if (OWN_COLORS[p.slug]) return OWN_COLORS[p.slug];
  let h = 0;
  for (const ch of p.slug) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return PROGRAM_COLORS_EXTRA[h % PROGRAM_COLORS_EXTRA.length];
}

function ProjectCard({ p, color }: { p: ProjectDTO; color: string }) {
  const url = safeHrefOrNull(p.url), logo = safeImgSrc(p.logo);
  const body = (
    <>
      {logo && <span className="project-logo"><img src={logo} alt="" loading="lazy" style={{ maxHeight: `${Math.min(76, 46 * p.logoScale)}px` }} /></span>}
      <span className="badge">{p.category}</span>
      <h3>{p.name}</h3>
      {p.tagline && <p className="project-tag">{p.tagline}</p>}
      {p.description && <p>{p.description}</p>}
      {url && <span className="project-foot">{p.domain || url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}<ArrowUpRight size={16} aria-hidden="true" /></span>}
    </>
  );
  const style = programVars(color);
  return url
    ? <a className="project acc" style={style} id={p.slug} href={url} target="_blank" rel="noreferrer">{body}</a>
    : <article className="project acc" style={style} id={p.slug}>{body}</article>;
}

export default function Projects() {
  const { projects: all, programs: calendar, settings: { links } } = useContent();
  const { nav, projects: t } = useT();
  const [filter, setFilter] = useState<string>(ALL);
  // Ссылка вида /projects#bilim-talks (плитки главной) — прокрутка к карточке после отрисовки.
  const hash = useHash();
  useScrollToHash(all.some(p => p.slug === hash) ? hash : '');
  const order = categoryOrder(all, t.categories);
  // Смена языка меняет названия категорий — выбранный фильтр, которого больше нет, сбрасываем.
  const active = filter === ALL || order.includes(filter) ? filter : ALL;
  const options = [ALL, ...order].map(c => ({
    id: c,
    label: c === ALL ? t.all : c,
    count: c === ALL ? all.length : all.filter(p => p.category === c).length,
  }));
  const shown = all.filter(p => active === ALL || p.category === active);
  const sites = shown.filter(p => p.kind === 'site');
  const programs = shown.filter(p => p.kind === 'program');

  return (
    <>
      <PageTitle title={nav.projects.label} lead={t.lead} />

      <Panel className="filters">
        <Segmented label={t.category} value={active} onChange={setFilter} options={options} />
      </Panel>

      {sites.length > 0 && (
        <Panel title={t.sites}>
          <div className="project-grid">
            {sites.map(p => <ProjectCard key={p.id} p={p} color={projectColor(p, calendar)} />)}
          </div>
        </Panel>
      )}

      {programs.length > 0 && (
        <Panel title={t.programs}>
          <div className="program-list">
            {programs.map(p => (
              <article key={p.id} className="program-item acc" style={programVars(projectColor(p, calendar))} id={p.slug}>
                <img className="program-art illus" src={categoryArt(p.category, t.categories) ?? '/illustrations/empty-generic.svg'} alt="" width="64" height="64" loading="lazy" />
                <div>
                  <h3>{safeHrefOrNull(p.url) ? <a href={safeHref(p.url)} target="_blank" rel="noreferrer">{p.name}</a> : p.name}</h3>
                  {p.tagline && <p className="project-tag">{p.tagline}</p>}
                  {p.description && <p>{p.description}</p>}
                </div>
              </article>
            ))}
          </div>
        </Panel>
      )}

      {!sites.length && !programs.length && (
        <Panel className="empty"><EmptyState title={t.empty}><button type="button" className="btn btn-primary" onClick={() => setFilter(ALL)}>{t.showAll}</button></EmptyState></Panel>
      )}

      <Panel title={t.partnership} className="partnership">
        <div className="partnership-body">
          <img src={partnership.image} alt={partnership.name} loading="lazy" />
          <div>
            <h3>{partnership.name}</h3>
            <p>{t.partnershipText}</p>
            <div className="title-actions">
              <a className="btn btn-primary" href={safeHref(links.ifo)} target="_blank" rel="noreferrer">{t.goToSite}<ArrowUpRight size={17} aria-hidden="true" /></a>
              <a className="btn btn-ghost" href={safeHref(links.ifoCertificate)} target="_blank" rel="noreferrer">{t.certificate}</a>
            </div>
          </div>
        </div>
      </Panel>

      {active === ALL && (
        <Panel title={t.ecosystem}>
          <NeuralHub />
        </Panel>
      )}
    </>
  );
}
