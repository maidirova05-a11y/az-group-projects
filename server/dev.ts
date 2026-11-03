/** Локальный API-сервер: `npm run dev:api` (порт 8787). Vite проксирует на него /api. */
import { serve } from '@hono/node-server';
import { envProblems } from './env.js';
import { log } from './lib/logger.js';
import { app } from './app.js';

const problems = envProblems();
if (problems.length) {
  for (const p of problems) log.error(p);
  process.exit(1);
}
const port = Number(process.env.API_PORT) || 8787;
serve({ fetch: app.fetch, port }, () => log.info('API started', { url: `http://localhost:${port}/api/health` }));
