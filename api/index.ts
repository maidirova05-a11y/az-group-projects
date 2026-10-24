/** Точка входа Vercel Functions: все запросы /api/* переписываются сюда (vercel.json). */
import { handle } from 'hono/vercel';
import { app } from '../server/app.js';

const h = handle(app);
export const GET = h;
export const POST = h;
export const PUT = h;
export const PATCH = h;
export const DELETE = h;
export const OPTIONS = h;
