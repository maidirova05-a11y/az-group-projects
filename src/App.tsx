import { lazy, Suspense } from 'react';
import Layout from './components/Layout';
import { useSeo } from './components/Seo';
import { useContent } from './content/useContent';
import { useT } from './i18n';
import { useRoute, type Route } from './router';
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
  const t = useT();
  const { news, settings } = useContent();
  const articleId = path === '/news' ? query.get('id') : null;
  const article = articleId ? news.find(n => String(n.id) === articleId && n.body.trim()) : undefined;

  const descriptions: Record<Route, string> = {
    '/': t.seo.description,
    '/events': t.events.pageLead,
    '/projects': t.projects.lead,
    '/about': settings.about.title,
    '/news': `${t.news.leadBefore}Instagram @azgroup.kz${t.news.leadAfter}`,
    '/partners': t.partners.lead,
    '/faq': t.faq.lead,
    '/contacts': t.contacts.lead,
  };
  useSeo({
    path,
    title: article?.title,
    description: article ? clip(article.body.replace(/\s+/g, ' ').trim()) : descriptions[path],
    search: article ? `?id=${article.id}` : '',
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
