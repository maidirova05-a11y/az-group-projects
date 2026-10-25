/**
 * Страница проекта /projects/<slug>: описание, ближайшие даты связанных программ календаря,
 * регистрация и ссылка на сайт проекта. Отдельный адрес у каждого проекта — чтобы запросы
 * «олимпиада Фибоначчи», «ITECX», «Astana Tech Cup регистрация» вели на свою страницу, а не на общий список.
 * Title, description, canonical и JSON-LD ставит App (useSeo).
 */
import { useMemo, useState } from 'react';
import { ArrowUpRight, CalendarDays, MapPin, Send } from 'lucide-react';
import type { ProjectDTO } from '@shared/schemas';
import { projectPath } from '@shared/routes';
import { EmptyState, PageTitle, Panel } from '../components/ui';
import { useContent, useContentStatus } from '../content/useContent';
import { toISODate, upcomingEvents } from '../content/calendar';
import { safeHrefOrNull, safeImgSrc } from '../content/safe-url';
import { anchorProps, registerHref } from '../content/links';
import { useI18n } from '../i18n';
import { linkProps } from '../router';
import { DateBox } from './events/DateBox';
import { programVars } from './events/color';

/** Проект по слагу среди опубликованных. */
export const findProject = (projects: ProjectDTO[], slug: string | null) => (slug ? projects.find(p => p.slug === slug) : undefined);

export default function ProjectPage({ slug }: { slug: string }) {
  const { projects, programs, settings: { links } } = useContent();
  const { settled } = useContentStatus();
  const { t, dates, price } = useI18n();
  const T = t.projects.page;
  const [today] = useState(() => toISODate(new Date()));
  const project = findProject(projects, slug);
  const linked = useMemo(() => programs.filter(p => p.projectSlug === slug), [programs, slug]);
  const upcoming = useMemo(() => upcomingEvents(linked, today), [linked, today]);
  const others = projects.filter(p => p.slug !== slug).slice(0, 8);

  if (!project) {
    // Проект мог появиться только в живых данных — ждём ответа API, а не показываем «не найдено».
    if (!settled) return <section className="panel" aria-busy="true"><span className="skeleton skeleton-tile" /></section>;
    return (
      <>
        <PageTitle title={T.notFound} parent={{ to: '/projects', label: t.nav.projects.label }} />
        <Panel className="empty">
          <EmptyState title={T.notFound}>
            <p>{T.notFoundText}</p>
            <a className="btn btn-primary" {...linkProps('/projects')}>{T.allProjects}</a>
          </EmptyState>
        </Panel>
      </>
    );
  }

  const site = safeHrefOrNull(project.url);
  const logo = safeImgSrc(project.logo);
  const color = linked[0]?.color;
  const calendarLink = linked.length ? `/events?programs=${linked.map(p => p.slug).join(',')}` : '/events';

  return (
    <>
      <PageTitle title={project.name} lead={project.tagline || undefined} parent={{ to: '/projects', label: t.nav.projects.label }}>
        <div className="title-actions">
          <a className="btn btn-primary" {...linkProps('/contacts#request')}><Send size={17} aria-hidden="true" />{T.request}</a>
          {site && <a className="btn btn-ghost" href={site} target="_blank" rel="noreferrer">{T.site}<ArrowUpRight size={17} aria-hidden="true" /></a>}
        </div>
      </PageTitle>

      <Panel title={T.about} className="project-about acc" >
        <div className="project-about-body" style={color ? programVars(color) : undefined}>
          {logo && <span className="project-logo"><img src={logo} alt={project.name} loading="eager" style={{ maxHeight: `${Math.min(110, 64 * project.logoScale)}px` }} /></span>}
          <div>
            <span className="badge">{project.category}</span>
            {project.description && <p>{project.description}</p>}
            {site && <p className="project-site"><a href={site} target="_blank" rel="noreferrer">{project.domain || site.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}<ArrowUpRight size={14} aria-hidden="true" /></a></p>}
          </div>
        </div>
      </Panel>

      <Panel title={T.dates} action={<a className="more-link" {...linkProps(calendarLink)}>{T.allDates}</a>}>
        {upcoming.length ? (
          <ul className="upcoming">
            {upcoming.slice(0, 8).map(({ program, event }) => {
              const reg = registerHref(event, program);
              return (
                <li key={event.id}>
                  <a {...anchorProps(reg)}>
                    <DateBox event={event} />
                    <div>
                      <strong>{program.name}: {event.label}</strong>
                      <span>
                        {event.startDate && dates.full(event.startDate)}
                        {event.price != null && ` · ${event.price ? price(event.price) : t.events.free}`}
                      </span>
                    </div>
                    <span className="upcoming-meta"><MapPin size={12} aria-hidden="true" />{event.place}</span>
                    <span className="dot acc" style={programVars(program.color)} aria-hidden="true" />
                  </a>
                </li>
              );
            })}
          </ul>
        ) : <EmptyState compact art="events" title={T.noDates} />}
        <div className="title-actions project-cta">
          <a className="btn btn-primary" {...anchorProps(linked[0] ? registerHref(null, linked[0]) : links.registration)}><CalendarDays size={17} aria-hidden="true" />{T.register}</a>
          <a className="btn btn-ghost" {...linkProps('/contacts#request')}>{T.request}</a>
        </div>
      </Panel>

      {others.length > 0 && (
        <Panel title={T.others}>
          <ul className="project-links">
            {others.map(p => <li key={p.id}><a {...linkProps(projectPath(p.slug))}><strong>{p.name}</strong>{p.tagline && <span>{p.tagline}</span>}</a></li>)}
          </ul>
        </Panel>
      )}
    </>
  );
}
