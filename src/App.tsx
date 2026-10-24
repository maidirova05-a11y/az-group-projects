import { lazy, Suspense, useMemo, useState } from 'react';
import Layout from './components/Layout';
import { SITE_ORIGIN, useSeo } from './components/Seo';
import * as ld from './components/jsonld';
import { toISODate } from './content/calendar';
import { useContent } from './content/useContent';
import { useI18n } from './i18n';
import { localizeHref, useRoute } from './router';
import Home from './pages/Home';
import About from './pages/About';
import News from './pages/News';
import Partners from './pages/Partners';
import Faq from './pages/Faq';
import Contacts from './pages/Contacts';

// Тяжёлые разделы (календарь, экосистема проектов) — отдельными чанками, грузятся при первом заходе.
const Events = lazy(() => import('./pages/Events'));
const Projects = lazy(() => import('./pages/Projects'));

/** Заглушка на время загрузки раздела: заголовок и пара карточек-скелетонов. */
function PageSkeleton() {
  return (
    <div className="page-skeleton" aria-busy="true">
      <div className="page-title"><span className="skeleton skeleton-text" style={{ width: '22%' }} /><span className="skeleton skeleton-text page-skeleton-title" /></div>
      <section className="panel"><span className="skeleton skeleton-tile" /></section>
      <section className="panel"><span className="skeleton skeleton-tile" /></section>
    </div>
  );
}

const clip = (s: string, n = 160) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

export default function App() {
  const { path, query } = useRoute();
  const { lang, t } = useI18n();
  const content = useContent();
  const { news, faqs, programs, projects, settings } = content;
  const [today] = useState(() => toISODate(new Date()));
  const articleId = path === '/news' ? query.get('id') : null;
  const article = articleId ? news.find(n => String(n.id) === articleId && n.body.trim()) : undefined;

  // Структурированные данные раздела (schema.org). Организация и сайт — на каждой странице.
  const jsonLd = useMemo(() => {
    const url = (p: string) => `${SITE_ORIGIN}${localizeHref(p, lang)}`;
    const graph: (object | null)[] = [ld.organization(settings, t, lang), ld.website(lang, t)];
    if (article) {
      const articleUrl = `${url('/news')}?id=${article.id}`;
      graph.push(ld.breadcrumbs('/news', lang, t, { name: article.title, url: articleUrl }));
      graph.push(ld.webPage('/news', lang, t, { name: article.title, url: articleUrl, description: clip(article.body.replace(/\s+/g, ' ').trim()) }));
      graph.push(ld.newsArticle(article, lang));
      return graph.filter((x): x is object => !!x);
    }
    graph.push(ld.breadcrumbs(path, lang, t), ld.webPage(path, lang, t));
    switch (path) {
      case '/':
        graph.push(...ld.events(programs, today, lang, projects, 10));
        break;
      case '/events':
        graph.push(...ld.events(programs, today, lang, projects));
        break;
      case '/faq':
        graph.push(ld.faqPage(faqs));
        break;
      case '/news':
        graph.push(ld.itemList(t.nav.news.title, news.filter(n => n.body.trim()).slice(0, 30).map(n => ({ name: n.title, url: `${url('/news')}?id=${n.id}` }))));
        break;
      case '/projects':
        graph.push(...ld.projectBrands(projects, lang));
        break;
    }
    return graph.filter((x): x is object => !!x);
  }, [article, path, lang, t, settings, programs, projects, faqs, news, today]);

  useSeo({
    path,
    title: article?.title,
    description: article ? clip(article.body.replace(/\s+/g, ' ').trim()) : undefined,
    search: article ? `?id=${article.id}` : '',
    image: article?.image,
    article: article ? { published: article.date } : null,
    jsonLd,
  });

  return (
    <Layout path={path}>
      {path === '/' && <Home />}
      <Suspense fallback={<PageSkeleton />}>
      {path === '/events' && <Events key={`${query.get('q') ?? ''}|${query.get('programs') ?? ''}`} query={query} />}
      {path === '/projects' && <Projects />}
      </Suspense>
      {path === '/about' && <About />}
      {path === '/news' && <News key={articleId ?? ''} query={query} />}
      {path === '/partners' && <Partners />}
      {path === '/faq' && <Faq />}
      {path === '/contacts' && <Contacts />}
    </Layout>
  );
}
