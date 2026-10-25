import { useMemo, useState } from 'react';
import {
  Atom, Award, BadgeCheck, Bot, BookOpen, CalendarDays, Download, FileText, Globe2, GraduationCap, Handshake, Lightbulb,
  MapPin, Medal, Palette, Plane, Presentation, School, Send, Trophy, Users, Wallet, type LucideIcon,
} from 'lucide-react';
import Search from '../components/Search';
import { EmptyState, MoreLink, Panel, Segmented, Tile } from '../components/ui';
import { useContent } from '../content/useContent';
import { toISODate, upcomingEvents } from '../content/calendar';
import { NewsCard } from './News';
import { linkProps } from '../router';
import { DateBox } from './events/DateBox';
import { programVars } from './events/color';
import { useT, type Dict } from '../i18n';

type Audience = 'students' | 'teachers' | 'schools';
type AudKey = keyof Dict['home']['aud'];
type AudTile = { key: AudKey; to?: string; href?: string; Icon: LucideIcon };

/** Плитки по аудиториям; подписи — в словаре (home.aud.*). */
const AUDIENCE: Record<Audience, AudTile[]> = {
  students: [
    { key: 'fibonacci', to: '/events?q=Fibonacci', Icon: Trophy },
    { key: 'atlantia', to: '/events?q=Atlantia', Icon: Atom },
    { key: 'itecx', to: '/events?q=ITECX', Icon: Lightbulb },
    { key: 'techCup', to: '/events?q=Astana Tech Cup', Icon: Bot },
    { key: 'camps', to: '/projects#international-camp', Icon: Plane },
    { key: 'onerlab', href: 'https://onerlab.kz', Icon: Palette },
  ],
  teachers: [
    { key: 'rcAcademy', to: '/events?q=RoboCoach Academy', Icon: GraduationCap },
    { key: 'rcCup', to: '/events?q=RoboCoach Cup', Icon: Medal },
    { key: 'bilimTalks', to: '/projects#bilim-talks', Icon: Presentation },
    { key: 'attestation', to: '/faq', Icon: BadgeCheck },
  ],
  schools: [
    { key: 'memorandum', to: '/contacts#request', Icon: Handshake },
    { key: 'partnerSchools', to: '/partners', Icon: School },
    { key: 'ascoraFest', to: '/events?q=Ascora Fest', Icon: Users },
    { key: 'edtech', to: '/projects#global-edtech-festival', Icon: BookOpen },
  ],
};

/** Программы с мировыми финалами (Анталья, Рим, Барселона) — фильтр календаря для плитки «Мировые финалы». */
const FINALS_PROGRAMS = ['fibonacci-math', 'atlantia-science', 'atlantia-stem', 'fibonacci-robot'];

/** Вопрос FAQ про программы для учителей (реестр «Астана дарыны») — для плитки «Аттестация педагогов». */
const isTeachersFaq = (text: string) => /дарын|daryn/i.test(text);

/** Иллюстрация к выбранной аудитории — справа от плиток (декоративная: смысл несут плитки). */
const AUDIENCE_ART: Record<Audience, string> = {
  students: '/illustrations/dir-science.svg',
  teachers: '/illustrations/dir-teachers.svg',
  schools: '/illustrations/dir-schools.svg',
};

export default function Home() {
  const { programs, news, faqs, settings: { links, stats } } = useContent();
  const t = useT().home;
  const [audience, setAudience] = useState<Audience>('students');
  const [today] = useState(() => toISODate(new Date()));
  const teachersFaq = faqs.find(f => isTeachersFaq(f.answer) || isTeachersFaq(f.question));
  const audTo = (key: AudKey, to?: string) => (key === 'attestation' && teachersFaq ? `/faq#faq-${teachersFaq.id}` : to);
  const upcoming = useMemo(() => upcomingEvents(programs, today).slice(0, 5), [programs, today]);

  return (
    <>
      <Panel className="hero">
        {/* Подпись над баннером — не заголовок: первым заголовком страницы должен быть h1. */}
        <div className="panel-head"><p className="hero-kicker">{t.heroPanel}</p></div>
        <div className="hero-banner hero-illustrated">
          <div className="hero-copy">
            <h1>{t.heroTitle}</h1>
            <p>{t.heroLead}</p>
            <Search />
          </div>
          {/* Талисман AZ Group — декоративный, в своей колонке: никогда не перекрывает заголовок и поиск. */}
          <div className="hero-mascot" aria-hidden="true">
            <img src="/images/az-explorer.webp" alt="" width="720" height="720" loading="eager" decoding="async" />
          </div>
        </div>
      </Panel>

      <Panel title={t.popular}>
        <div className="tile-grid">
          <Tile href={links.registration} Icon={FileText} label={t.tiles.registration} />
          <Tile to="/events" Icon={CalendarDays} label={t.tiles.calendar} />
          <Tile href={links.fibonacciResults} Icon={Award} label={t.tiles.results} />
          <Tile href={links.posterPdf} Icon={Download} label={t.tiles.poster} />
          <Tile to="/faq" Icon={Wallet} label={t.tiles.price} />
          <Tile to={`/events?programs=${FINALS_PROGRAMS.join(',')}`} Icon={Globe2} label={t.tiles.finals} />
          <Tile href={links.ifo} Icon={Handshake} label={t.tiles.ifo} />
          <Tile to="/contacts#request" Icon={Send} label={t.tiles.request} />
        </div>
      </Panel>

      <Panel
        title={t.opportunities}
        action={<Segmented label={t.forWhom} value={audience} onChange={setAudience} options={[{ id: 'students', label: t.audiences.students }, { id: 'teachers', label: t.audiences.teachers }, { id: 'schools', label: t.audiences.schools }]} />}
      >
        <div className="audience">
          <div className="tile-grid">{AUDIENCE[audience].map(({ key, to, ...tile }) => <Tile key={key} {...tile} to={audTo(key, to)} label={t.aud[key].label} note={t.aud[key].note} />)}</div>
          <img className="audience-art illus" src={AUDIENCE_ART[audience]} alt="" width="240" height="240" loading="lazy" />
        </div>
      </Panel>

      <div className="split">
        <Panel title={t.upcoming} action={<MoreLink to="/events">{t.allCalendar}</MoreLink>}>
          {!upcoming.length && <EmptyState compact art="events" title={t.upcomingEmpty} />}
          <ul className="upcoming">
            {upcoming.map(({ program, event }) => (
              <li key={event.id}>
                <a {...linkProps(`/events?q=${encodeURIComponent(program.name)}`)}>
                  <DateBox event={event} />
                  <div>
                    <strong>{program.name}</strong>
                    <span>{program.subtitle}</span>
                  </div>
                  <span className="upcoming-meta"><MapPin size={12} aria-hidden="true" />{event.place}</span>
                  {/* Точка — цвет самой программы (как в календаре), а не направления. */}
                  <span className="dot acc" style={programVars(program.color)} aria-hidden="true" />
                </a>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel className="stats-panel" title={t.statsTitle}>
          <dl className="stats">
            {stats.map(s => <div key={s.label}><dt>{s.label}</dt><dd>{s.value}</dd></div>)}
          </dl>
          <MoreLink to="/about">{t.aboutLink}</MoreLink>
        </Panel>
      </div>

      <Panel title={t.news} action={<MoreLink to="/news">{t.allNews}</MoreLink>}>
        <div className="news-grid">
          {news.slice(0, 3).map(n => <NewsCard key={n.id} item={n} />)}
        </div>
      </Panel>
    </>
  );
}
