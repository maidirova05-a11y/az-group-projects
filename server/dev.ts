/** Локальный API-сервер: `npm run dev:api` (порт 8787). Vite проксирует на него /api. */
import { serve } from '@hono/node-server';
import { app } from './app.js';

const port = Number(process.env.API_PORT) || 8787;
serve({ fetch: app.fetch, port }, () => console.log(`API: http://localhost:${port}/api/health`));
