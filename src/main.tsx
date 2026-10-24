import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { ContentProvider } from './content/ContentProvider';
import { LanguageProvider } from './i18n/LanguageProvider';
import { applyStoredLang } from './router';
import './index.css';
import './content/site-extra.css';

// Ранее выбранный kk/en на адресе без префикса → та же страница на этом языке (до первой отрисовки).
applyStoredLang();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LanguageProvider>
      <ContentProvider>
        <App />
      </ContentProvider>
    </LanguageProvider>
  </StrictMode>,
);
