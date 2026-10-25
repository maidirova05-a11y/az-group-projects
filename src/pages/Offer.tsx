/** Публичная оферта (/offer) — текст перенесён со старого сайта az-group.kz/public-offer, на трёх языках. */
import { ArrowLeft } from 'lucide-react';
import { PageTitle, Panel } from '../components/ui';
import { offer } from '../data/offer';
import { useI18n } from '../i18n';
import { linkProps } from '../router';

export default function Offer() {
  const { lang, t } = useI18n();
  const doc = offer[lang];
  return (
    <>
      <PageTitle title={doc.title} lead={doc.updated} />
      <Panel className="offer">
        <div className="offer-body">
          {doc.blocks.map((b, i) => (b.t === 'h'
            ? <h2 key={i}>{b.x}</h2>
            : <p key={i} className={b.t === 'li' ? 'offer-li' : undefined}>{b.x.split('\n').map((line, j) => <span key={j}>{j > 0 && <br />}{line}</span>)}</p>
          ))}
        </div>
        <a className="more-link offer-back" {...linkProps('/register')}><ArrowLeft size={16} aria-hidden="true" />{t.offer.back}</a>
      </Panel>
    </>
  );
}
