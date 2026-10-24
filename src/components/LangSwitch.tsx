/**
 * Переключатель языка «RU · KZ · ENG», как в шапке az-group.kz.
 * Каждый пункт — настоящая ссылка на ту же страницу на другом языке (работает и без JS,
 * открывается в новой вкладке по Ctrl/⌘-клику); обычный клик меняет язык без перезагрузки,
 * сохраняя раздел, запрос и якорь, и запоминает выбор в localStorage['az-lang'].
 * variant="compact" — шапка; variant="sheet" — сегменты на всю ширину в листе «Ещё».
 */
import { LANGS, LANG_LABELS, type Lang } from '@shared/i18n';
import { LANG_NAMES, useI18n } from '../i18n';
import { hrefForLang, switchLang } from '../router';

export default function LangSwitch({ variant = 'compact' }: { variant?: 'compact' | 'sheet' }) {
  const { lang: current, t } = useI18n();
  const onClick = (lang: Lang) => (e: React.MouseEvent) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    if (lang !== current) switchLang(lang);
  };
  return (
    <nav className={`lang-switch ${variant === 'sheet' ? 'lang-switch-sheet' : ''}`} aria-label={t.lang.label}>
      {LANGS.map(lang => (
        <a
          key={lang}
          href={hrefForLang(lang)}
          hrefLang={lang}
          lang={lang}
          className={lang === current ? 'on' : ''}
          aria-current={lang === current ? 'true' : undefined}
          aria-label={LANG_NAMES[lang]}
          title={LANG_NAMES[lang]}
          onClick={onClick(lang)}
        >
          {LANG_LABELS[lang]}
        </a>
      ))}
    </nav>
  );
}
