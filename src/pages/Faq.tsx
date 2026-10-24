import { ChevronDown, MessageCircle } from 'lucide-react';
import { EmptyState, PageTitle, Panel } from '../components/ui';
import { useContent } from '../content/useContent';
import { safeHref } from '../content/safe-url';
import { useT } from '../i18n';
import { useHash, useScrollToHash } from '../router';

export default function Faq() {
  const { faqs, settings: { contacts } } = useContent();
  const { nav, faq: t } = useT();
  // Ссылка вида /faq#faq-7 открывает и показывает нужный вопрос (иначе раскрыт первый).
  const hash = useHash();
  const target = faqs.some(f => `faq-${f.id}` === hash) ? hash : '';
  useScrollToHash(target);
  return (
    <>
      <PageTitle title={nav.faq.title} lead={t.lead} />
      <Panel>
        {faqs.length ? (
          <div className="faq">
            {faqs.map((f, i) => (
              <details key={`${f.id}-${target}`} id={`faq-${f.id}`} open={target ? `faq-${f.id}` === target : i === 0}>
                <summary>{f.question}<ChevronDown size={20} aria-hidden="true" /></summary>
                <p>{f.answer}</p>
              </details>
            ))}
          </div>
        ) : <EmptyState title={t.emptyTitle}>{t.emptyText}</EmptyState>}
      </Panel>
      <Panel className="cta">
        <div><h2>{t.ctaTitle}</h2><p>{t.ctaText}</p></div>
        <a className="btn btn-primary" href={safeHref(contacts.whatsapp)} target="_blank" rel="noreferrer"><MessageCircle size={17} aria-hidden="true" />{t.whatsapp}</a>
      </Panel>
    </>
  );
}
