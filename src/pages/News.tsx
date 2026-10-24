import { ArrowLeft, ArrowUpRight, ChevronRight } from 'lucide-react';
import type { NewsDTO } from '@shared/schemas';
import { EmptyState, LoadingImage, PageTitle, Panel } from '../components/ui';
import { useI18n } from '../i18n';
import { useContent, useContentStatus } from '../content/useContent';
import { isExternal, newsHref } from '../content/links';
import { safeHref, safeHrefOrNull } from '../content/safe-url';
import { linkProps } from '../router';

/** Карточка новости: с текстом — открывается на сайте, без текста — по внешней ссылке. */
export function NewsCard({ item: n }: { item: NewsDTO }) {
  const { dates } = useI18n();
  const link = newsHref(n);
  const props = !link ? {} : 'to' in link ? linkProps(link.to) : { href: link.href, target: '_blank', rel: 'noreferrer' };
  const inner = (
    <>
      <LoadingImage src={n.image} />
      <time dateTime={n.date}>{dates.full(n.date)}</time>
      <h3>{n.title}</h3>
    </>
  );
  return link ? <a className="news-card" {...props}>{inner}</a> : <article className="news-card">{inner}</article>;
}

/** Текст новости: абзацы разделены пустой строкой, переносы внутри абзаца сохраняются. Только текст — без HTML. */
function Paragraphs({ text }: { text: string }) {
  const paragraphs = text.replace(/\r\n?/g, '\n').split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
  return (
    <div className="article-body">
      {paragraphs.map((p, i) => (
        <p key={i}>{p.split('\n').map((line, j) => <span key={j}>{j > 0 && <br />}{line}</span>)}</p>
      ))}
    </div>
  );
}

/** Заголовок вкладки, description и canonical статьи ставит App (useSeo). */
function Article({ item: n }: { item: NewsDTO }) {
  const { t, dates } = useI18n();
  const sourceUrl = safeHrefOrNull(n.externalUrl);
  return (
    <>
      <div className="page-title">
        <nav aria-label={t.layout.crumbs} className="crumbs">
          <a {...linkProps('/')}>{t.layout.home}</a>
          <ChevronRight size={14} aria-hidden="true" />
          <a {...linkProps('/news')}>{t.nav.news.label}</a>
        </nav>
      </div>
      <Panel className="article">
        <a className="more-link article-back" {...linkProps('/news')}><ArrowLeft size={16} aria-hidden="true" />{t.news.allNews}</a>
        <time dateTime={n.date}>{dates.full(n.date)}</time>
        <h1>{n.title}</h1>
        {n.image && <LoadingImage src={n.image} className="article-image" />}
        <Paragraphs text={n.body} />
        {sourceUrl && (
          <a className="btn btn-ghost article-source" href={sourceUrl} target={isExternal(sourceUrl) ? '_blank' : undefined} rel="noreferrer">
            {t.news.source}<ArrowUpRight size={16} aria-hidden="true" />
          </a>
        )}
      </Panel>
    </>
  );
}

export default function News({ query }: { query: URLSearchParams }) {
  const { news, settings: { contacts } } = useContent();
  const { settled } = useContentStatus();
  const { t } = useI18n();
  const title = t.nav.news.label;
  const id = Number(query.get('id'));
  const article = id ? news.find(n => n.id === id && n.body.trim()) : undefined;
  if (article) return <Article item={article} />;
  // Новость могла появиться только в живых данных — ждём ответа API, а не показываем «не найдено».
  if (id > 0 && !settled) {
    return (
      <>
        <PageTitle title={title} />
        <section className="panel article" aria-busy="true" aria-label={t.news.loading}>
          <span className="skeleton skeleton-text" style={{ width: '30%' }} />
          <span className="skeleton skeleton-text article-skeleton-title" />
          <span className="skeleton article-image" />
          <span className="skeleton skeleton-text" />
          <span className="skeleton skeleton-text" />
        </section>
      </>
    );
  }

  return (
    <>
      <PageTitle title={title} lead={<>{t.news.leadBefore}<a href={safeHref(contacts.instagram)} target="_blank" rel="noreferrer">Instagram @azgroup.kz</a>{t.news.leadAfter}</>} />
      <Panel>
        {/* Заголовок для порядка h1 → h2 → h3 (карточки новостей — h3); виден только экранным дикторам. */}
        <h2 className="sr-only">{t.news.listTitle}</h2>
        {id > 0 && <p className="note article-missing">{t.news.missing}</p>}
        {news.length
          ? <div className="news-grid">{news.map(n => <NewsCard key={n.id} item={n} />)}</div>
          : <EmptyState title={t.news.emptyTitle}>{t.news.emptyText}</EmptyState>}
      </Panel>
    </>
  );
}
