/** Корень админки: проверка сессии → экран входа или каркас с ленивыми разделами. */
import { Component, lazy, Suspense, type ComponentType, type ReactNode } from 'react';
import { ShieldAlert, SearchX } from 'lucide-react';
import { AuthProvider, useAuth } from './auth';
import { StatsProvider } from './stats';
import { useAdminRoute, navItem, type AdminSection } from './router';
import Layout from './Layout';
import Login from './pages/Login';
import { ConfirmProvider } from './ui/Modal';
import { ToastProvider } from './ui/Toast';
import { EmptyState, PageHeader, PageSkeleton, Panel } from './ui/Panel';
import { LinkButton } from './ui/Button';
import { Spinner } from './ui/Button';

const PAGES: Record<Exclude<AdminSection, 'not-found'>, ComponentType> = {
  dashboard: lazy(() => import('./pages/Dashboard')),
  programs: lazy(() => import('./pages/Programs')),
  projects: lazy(() => import('./pages/Projects')),
  news: lazy(() => import('./pages/News')),
  partners: lazy(() => import('./pages/Partners')),
  faqs: lazy(() => import('./pages/Faqs')),
  leads: lazy(() => import('./pages/Leads')),
  settings: lazy(() => import('./pages/Settings')),
  admins: lazy(() => import('./pages/Admins')),
  account: lazy(() => import('./pages/Account')),
};

/** Ловит ошибки отрисовки раздела (в том числе сбой загрузки чанка). */
class PageBoundary extends Component<{ children: ReactNode; resetKey: string }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidUpdate(prev: { resetKey: string }) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null });
  }
  componentDidCatch(error: Error) { console.error(error); }
  render() {
    if (!this.state.error) return this.props.children;
    const chunk = /dynamically imported module|Failed to fetch|Loading chunk/i.test(this.state.error.message);
    return (
      <Panel>
        <EmptyState
          icon={ShieldAlert}
          title={chunk ? 'Не удалось загрузить раздел' : 'В разделе произошла ошибка'}
          text={chunk ? 'Возможно, вышла новая версия админки. Обновите страницу.' : this.state.error.message}
          action={<button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>Обновить страницу</button>}
        />
      </Panel>
    );
  }
}

function NotFound() {
  return (
    <>
      <PageHeader title="Страница не найдена" />
      <Panel><EmptyState icon={SearchX} title="Такого раздела нет" text="Проверьте адрес или вернитесь к обзору." action={<LinkButton to="/admin" variant="primary">К обзору</LinkButton>} /></Panel>
    </>
  );
}

function Forbidden() {
  return (
    <>
      <PageHeader title={navItem('admins')?.title ?? 'Нет доступа'} />
      <Panel><EmptyState icon={ShieldAlert} title="Нет доступа" text="Этот раздел доступен только владельцу." action={<LinkButton to="/admin" variant="primary">К обзору</LinkButton>} /></Panel>
    </>
  );
}

function Shell() {
  const { status, isOwner } = useAuth();
  const { section, path } = useAdminRoute();

  if (status === 'loading') {
    return <div className="boot" role="status" aria-label="Загрузка админки"><img src="/logos/azgroup.png" alt="" width="140" height="18" /><Spinner size={24} /></div>;
  }
  if (status !== 'authed') return <Login />;

  let page: ReactNode;
  if (section === 'not-found') page = <NotFound />;
  else if (navItem(section)?.ownerOnly && !isOwner) page = <Forbidden />;
  else {
    const Page = PAGES[section];
    page = <Page />;
  }

  return (
    <StatsProvider>
      <Layout section={section}>
        <PageBoundary resetKey={path}>
          <Suspense fallback={<PageSkeleton />}>{page}</Suspense>
        </PageBoundary>
      </Layout>
    </StatsProvider>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <ConfirmProvider>
        <AuthProvider>
          <Shell />
        </AuthProvider>
      </ConfirmProvider>
    </ToastProvider>
  );
}
