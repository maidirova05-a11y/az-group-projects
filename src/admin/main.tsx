/** Точка входа админки (/admin): admin.html → src/admin/main.tsx. */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import '../fonts.css';
import './admin.css';

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
