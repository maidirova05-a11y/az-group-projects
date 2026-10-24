import { useId, useMemo, useState } from 'react';
import { ArrowUpRight, Search as SearchIcon } from 'lucide-react';
import { NAV, navigate } from '../router';
import type { PublicContent } from '@shared/schemas';
import { useContent } from '../content/useContent';
import { newsHref } from '../content/links';
import { safeOpen } from '../content/safe-url';
import { EmptyState } from './ui';
import { useI18n, type Dict } from '../i18n';

interface Entry { title: string; kind: string; text: string; to?: string; href?: string }

/** Поисковый индекс по всему сайту на текущем языке: разделы, программы, проекты, вопросы, партнёры, новости. */
function buildIndex(c: PublicContent, t: Dict): Entry[] {
  const k = t.search.kinds;
  return [
    ...NAV.map(n => ({ title: t.nav[n.key].label, kind: k.section, text: t.nav[n.key].title, to: n.path })),
    ...c.programs.map(p => ({ title: p.name, kind: k.event, text: `${p.subtitle} ${p.events.map(e => `${e.label} ${e.place}`).join(' ')}`, to: `/events?q=${encodeURIComponent(p.name)}` })),
    ...c.projects.map(p => ({
      title: p.name, kind: p.kind === 'site' ? k.project : k.program, text: `${p.tagline} ${p.description} ${p.category}`,
      ...(p.kind === 'site' && p.url ? { href: p.url } : { to: '/projects' }),
    })),
    ...c.faqs.map(f => ({ title: f.question, kind: k.faq, text: f.answer, to: '/faq' })),
    ...c.partners.map(p => ({ title: p.name, kind: k.partner, text: '', to: '/partners' })),
    ...c.news.flatMap(n => {
      const link = newsHref(n);
      return link ? [{ title: n.title, kind: k.news, text: n.body.slice(0, 2000), ...link }] : [];
    }),
  ];
}

/**
 * Нормализация для поиска: NFC (казахские буквы, набранные с комбинирующими знаками), нижний регистр,
 * ё → е. Казахские ә ғ қ ң ө ұ ү һ і сохраняются как есть — у них свои слова («қала» ≠ «кала»).
 */
const norm = (s: string) => s.normalize('NFC').toLowerCase().replace(/ё/g, 'е');

export default function Search({ autoFocus, onDone, placeholder }: { autoFocus?: boolean; onDone?: () => void; placeholder?: string }) {
  const { t } = useI18n();
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const listId = useId();
  const content = useContent();
  const index = useMemo(() => buildIndex(content, t), [content, t]);
  const results = useMemo(() => {
    const words = norm(q).split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    return index
      .map(e => {
        const title = norm(e.title), body = norm(`${e.title} ${e.text} ${e.kind}`);
        if (!words.every(w => body.includes(w))) return null;
        return { e, score: words.filter(w => title.includes(w)).length };
      })
      .filter((x): x is { e: Entry; score: number } => !!x)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map(x => x.e);
  }, [q, index]);

  /** Сделать пункт активным и прокрутить к нему список (фокус остаётся в поле ввода). */
  const move = (i: number) => {
    if (i < 0) return;
    setActive(i);
    document.getElementById(`${listId}-${i}`)?.scrollIntoView({ block: 'nearest' });
  };

  const open = (e: Entry) => {
    if (e.href) safeOpen(e.href, '_blank', 'noopener');
    else if (e.to) navigate(e.to);
    setQ('');
    onDone?.();
  };

  return (
    <div className="search" role="search">
      <label className="search-field">
        <SearchIcon size={20} aria-hidden="true" />
        <span className="sr-only">{t.search.label}</span>
        <input
          type="search"
          value={q}
          autoFocus={autoFocus}
          placeholder={placeholder ?? t.search.placeholder}
          role="combobox"
          aria-expanded={results.length > 0}
          aria-autocomplete="list"
          aria-controls={listId}
          aria-activedescendant={results.length ? `${listId}-${active}` : undefined}
          onChange={e => { setQ(e.target.value); setActive(0); }}
          onKeyDown={e => {
            if (e.key === 'ArrowDown') { e.preventDefault(); move(Math.min(active + 1, results.length - 1)); }
            if (e.key === 'ArrowUp') { e.preventDefault(); move(Math.max(active - 1, 0)); }
            if (e.key === 'Enter' && results[active]) open(results[active]);
            if (e.key === 'Escape') { setQ(''); onDone?.(); }
          }}
        />
      </label>
      {q.trim() && results.length > 0 && (
        <ul className="search-results" id={listId} role="listbox" aria-label={t.search.label}>
          {results.map((e, i) => (
            // Сам пункт — option (не фокусируется, без вложенных кнопок): фокус остаётся в поле,
            // активный пункт объявляется через aria-activedescendant; мышь/касание — onClick.
            <li
              key={`${e.kind}-${e.title}`}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              className={`search-option ${i === active ? 'on' : ''}`}
              onMouseDown={ev => ev.preventDefault()}
              onMouseEnter={() => setActive(i)}
              onClick={() => open(e)}
            >
              <span className="search-kind">{e.kind}</span>
              <span className="search-title">{e.title}</span>
              {e.href && <ArrowUpRight size={15} aria-hidden="true" />}
            </li>
          ))}
        </ul>
      )}
      {q.trim() && !results.length && (
        <div className="search-results search-empty" role="status">
          <EmptyState compact art="search" title={t.search.emptyTitle}>{t.search.emptyHint}</EmptyState>
        </div>
      )}
    </div>
  );
}
