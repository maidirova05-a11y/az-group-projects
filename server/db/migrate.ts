/**
 * Применение миграций из server/db/migrations.
 * Скрипт: `npm run db:migrate` (DATABASE_URL) или `tsx server/db/migrate.ts <url>`.
 * Тесты импортируют runMigrations(url).
 */
import { fileURLToPath, pathToFileURL } from 'node:url';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

const migrationsFolder = fileURLToPath(new URL('./migrations', import.meta.url));

/** Применяет все новые миграции к базе по url и закрывает подключение. */
export async function runMigrations(url: string): Promise<void> {
  const client = postgres(url, { max: 1, onnotice: () => {} });
  try {
    await migrate(drizzle(client), { migrationsFolder });
  } finally {
    await client.end();
  }
}

/** Запуск как скрипта (а не импорт из тестов). */
const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  const url = process.argv[2] ?? process.env.DATABASE_URL;
  if (!url) {
    console.error('Не задан DATABASE_URL (или передайте URL первым аргументом)');
    process.exit(1);
  }
  runMigrations(url)
    .then(() => console.log(`Миграции применены: ${url.replace(/\/\/[^@]*@/, '//***@')}`))
    .catch(err => { console.error('Ошибка миграции:', err); process.exitCode = 1; });
}
