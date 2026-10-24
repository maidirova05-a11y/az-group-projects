import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '../env.js';
import * as schema from './schema.js';

/**
 * Одно подключение на процесс. На Vercel функции живут недолго, поэтому пул маленький;
 * для Neon/Supabase используйте pooled-строку подключения (pgbouncer) и prepare: false.
 */
let client: ReturnType<typeof postgres> | undefined;
let instance: ReturnType<typeof drizzle<typeof schema>> | undefined;

export function db() {
  if (!instance) {
    client = postgres(env.databaseUrl, { max: process.env.VERCEL ? 1 : 10, prepare: false, onnotice: () => {} });
    instance = drizzle(client, { schema });
  }
  return instance;
}

export async function closeDb() {
  await client?.end();
  client = undefined;
  instance = undefined;
}

export type DB = ReturnType<typeof db>;
export { schema };
