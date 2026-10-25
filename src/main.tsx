import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { ContentProvider } from './content/ContentProvider';
import { LanguageProvider } from './i18n/LanguageProvider';
import { applyStoredLang } from './router';
import { rememberVisitSource } from './content/visit';
import './fonts.css';
import './index.css';
import './content/site-extra.css';

// Ранее выбранный kk/en на адресе без префикса → та же страница на этом языке (до первой отрисовки).
applyStoredLang();
// UTM-метки и источник перехода первого визита — уходят вместе с заявкой (откуда пришёл посетитель).
rememberVisitSource();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LanguageProvider>
      <ContentProvider>
        <App />
      </ContentProvider>
    </LanguageProvider>
  </StrictMode>,
);
