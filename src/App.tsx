import { lazy, Suspense, useMemo, useState } from 'react';
import Layout from './components/Layout';
import { SITE_ORIGIN, useSeo } from './components/Seo';
import * as ld from './components/jsonld';
import { toISODate } from './content/calendar';
import { useContent, useContentStatus } from './content/useContent';
import { projectPath } from '@shared/routes';
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
const ProjectPage = lazy(() => import('./pages/ProjectPage'));
const Register = lazy(() => import('./pages/Register'));
const Offer = lazy(() => import('./pages/Offer'));
const Privacy = lazy(() => import('./pages/Privacy'));

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
  const { path, query, slug } = useRoute();
  const { settled } = useContentStatus();
  const { lang, t } = useI18n();
  const content = useContent();
  const { news, faqs, programs, projects, settings } = content;
  const [today] = useState(() => toISODate(new Date()));
  const articleId = path === '/news' ? query.get('id') : null;
  const article = articleId ? news.find(n => String(n.id) === articleId && n.body.trim()) : undefined;
  const project = path === '/projects' && slug ? projects.find(p => p.slug === slug) : undefined;
  // Несуществующий проект (после загрузки живых данных) — страница «не найдено», не индексируем.
  const missingProject = !!slug && !project && settled;

  // Структурированные данные раздела (schema.org). Организация и сайт — на каждой странице.
  const jsonLd = useMemo(() => {
    const url = (p: string) => `${SITE_ORIGIN}${localizeHref(p, lang)}`;
    const graph: (object | null)[] = [ld.organization(settings, t, lang), ld.website(lang, t)];
    if (project) {
      const projectUrl = url(projectPath(project.slug));
      const linked = programs.filter(p => p.projectSlug === project.slug);
      graph.push(ld.breadcrumbs('/projects', lang, t, { name: project.name, url: projectUrl }));
      graph.push(ld.webPage('/projects', lang, t, { name: project.name, url: projectUrl, description: clip(project.description || project.tagline) }));
      graph.push(...ld.projectBrands([project], lang));
      graph.push(...ld.events(linked, today, lang, projects));
      return graph.filter((x): x is object => !!x);
    }
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
  }, [article, project, path, lang, t, settings, programs, projects, faqs, news, today]);

  const P = t.projects.page;
  useSeo({
    path,
    title: project ? P.seoTitle(project.name, project.tagline) : missingProject ? P.notFound : article?.title,
    description: project ? clip(project.description || project.tagline) : article ? clip(article.body.replace(/\s+/g, ' ').trim()) : undefined,
    keywords: project ? P.seoKeywords(project.name, project.category, project.tagline) : undefined,
    search: slug ? `/${slug}` : article ? `?id=${article.id}` : '',
    image: project?.logo ?? article?.image,
    article: article ? { published: article.date } : null,
    noindex: missingProject,
    jsonLd,
  });

  return (
    <Layout path={path}>
      {path === '/' && <Home />}
      <Suspense fallback={<PageSkeleton />}>
      {path === '/events' && <Events key={`${query.get('q') ?? ''}|${query.get('programs') ?? ''}`} query={query} />}
      {path === '/projects' && (slug ? <ProjectPage key={slug} slug={slug} /> : <Projects />)}
      {path === '/register' && <Register query={query} />}
      {path === '/offer' && <Offer />}
      {path === '/privacy' && <Privacy />}
      </Suspense>
      {path === '/about' && <About />}
      {path === '/news' && <News key={articleId ?? ''} query={query} />}
      {path === '/partners' && <Partners />}
      {path === '/faq' && <Faq />}
      {path === '/contacts' && <Contacts />}
    </Layout>
  );
}
