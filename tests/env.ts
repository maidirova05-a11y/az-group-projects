/** Загружает .env.local и направляет приложение на тестовую БД. Никогда не трогает DATABASE_URL дев-базы. */
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export function useTestDatabase(): string {
  const file = fileURLToPath(new URL('../.env.local', import.meta.url));
  if (existsSync(file) && !process.env.TEST_DATABASE_URL) process.loadEnvFile(file);
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error('TEST_DATABASE_URL не задан (.env.local)');
  if (!/\/azgroup_test(\?|$)/.test(url)) throw new Error(`Тесты запускаются только на azgroup_test, получено: ${url}`);
  process.env.DATABASE_URL = url;
  process.env.JWT_SECRET ??= 'test-secret-test-secret-test-secret-123';
  process.env.NODE_ENV = 'test';
  // Тесты задают IP клиента через X-Forwarded-For (см. helpers.ts) — как за доверенным прокси.
  process.env.TRUST_PROXY = '1';
  delete process.env.VERCEL;
  return url;
}
