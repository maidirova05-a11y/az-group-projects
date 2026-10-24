import { useState } from 'react';
import { Globe2, GraduationCap, Plane, Sparkles, TrendingUp } from 'lucide-react';
import { MoreLink, PageTitle, Panel } from '../components/ui';
import { useContent } from '../content/useContent';
import { safeImgSrc } from '../content/safe-url';
import { useT } from '../i18n';

const DIRECTION_ICONS = [TrendingUp, GraduationCap, Globe2, Plane];
/** Иллюстрации к блокам «Миссия», «Чем мы занимаемся», «Цели» — по порядку блоков. */
const PILLAR_ART = ['/illustrations/about-mission.svg', '/illustrations/about-work.svg', '/illustrations/about-goals.svg'];

/** Фото из CMS; если его нет или оно не загрузилось — фирменная иллюстрация. Картинка декоративная: смысл в заголовке. */
function PillarImage({ src: rawSrc, index }: { src: string | null; index: number }) {
  const [broken, setBroken] = useState(false);
  const src = safeImgSrc(rawSrc);
  const art = PILLAR_ART[index % PILLAR_ART.length];
  if (!src || broken) return <img className="pillar-art" src={art} alt="" width="320" height="200" loading="lazy" />;
  return <img src={src} alt="" loading="lazy" onError={() => setBroken(true)} />;
}

export default function About() {
  const { about, stats } = useContent().settings;
  const { nav, about: t } = useT();
  return (
    <>
      <PageTitle title={nav.about.title} lead={about.title} />

      <div className="pillars">
        {about.pillars.map((p, i) => (
          <Panel key={`${i}-${p.title}`} className="pillar">
            <PillarImage key={p.image ?? ''} src={p.image} index={i} />
            <h2>{p.title}</h2>
            <p>{p.text}</p>
          </Panel>
        ))}
      </div>

      {about.directions.length > 0 && (
        <Panel title={t.directions}>
          <div className="tile-grid">
            {about.directions.map((d, i) => {
              const Icon = DIRECTION_ICONS[i] ?? Sparkles;
              return <div key={`${i}-${d}`} className="tile static"><span className="tile-icon"><Icon size={22} aria-hidden="true" /></span><span className="tile-label">{d}</span></div>;
            })}
          </div>
        </Panel>
      )}

      {about.achievements.length > 0 && (
        <Panel title={t.achievements}>
          <ul className="achievements">
            {about.achievements.map((a, i) => <li key={`${i}-${a.value}`}><strong>{a.value}</strong><span>{a.label}</span></li>)}
          </ul>
        </Panel>
      )}

      <Panel title={t.inNumbers} action={<MoreLink to="/partners">{t.partnersLink}</MoreLink>}>
        <dl className="stats wide">
          {stats.map((s, i) => <div key={`${i}-${s.label}`}><dt>{s.label}</dt><dd>{s.value}</dd></div>)}
        </dl>
      </Panel>
    </>
  );
}
