import type { AdminDTO } from '../shared/schemas.js';

/** Переменные контекста Hono: после requireAdmin в c.get('admin') — текущий администратор. */
export type AppEnv = { Variables: { admin: AdminDTO; requestId: string } };
