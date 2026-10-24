import { defineConfig } from 'vitest/config';

/**
 * Интеграционные тесты API: реальное Hono-приложение в процессе (app.request) + тестовая БД azgroup_test.
 * globalSetup — миграции, сид с reset и тестовые админы; setup — DATABASE_URL := TEST_DATABASE_URL до загрузки app/db.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    globalSetup: ['tests/global-setup.ts'],
    setupFiles: ['tests/setup.ts'],
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
