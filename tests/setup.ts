import { afterAll } from 'vitest';
import { useTestDatabase } from './env';

useTestDatabase();

afterAll(async () => {
  const { closeDb } = await import('../server/db/client');
  await closeDb();
});
