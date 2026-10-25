/** Один раз перед всеми тестами: миграции + сид (reset) на azgroup_test, чистые admins/leads/audit_log, тестовые админы. */
import bcrypt from 'bcryptjs';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { useTestDatabase } from './env';
import { EDITOR, OWNER } from './fixtures';
import { runMigrations } from '../server/db/migrate';
import { seed } from '../server/db/seed';
import * as schema from '../server/db/schema';

export default async function setup() {
  const url = useTestDatabase();
  await runMigrations(url);
  const client = postgres(url, { max: 1, onnotice: () => {} });
  try {
    const db = drizzle(client, { schema });
    await seed(db, { reset: true });
    await client`TRUNCATE audit_log, leads, registrations, admins RESTART IDENTITY CASCADE`;
    for (const a of [OWNER, EDITOR]) {
      await db.insert(schema.admins).values({ email: a.email, name: a.name, role: a.role, passwordHash: await bcrypt.hash(a.password, 4) });
    }
  } finally {
    await client.end();
  }
}
