/**
 * Создаёт или обновляет владельца (owner) админки.
 *   npm run admin:create                       — из ADMIN_EMAIL / ADMIN_PASSWORD (.env.local)
 *   npm run admin:create -- email password [name]
 */
import { sql } from 'drizzle-orm';
import { db, schema, closeDb } from '../server/db/client.js';
import { hashPassword } from '../server/auth/password.js';

async function main() {
  const [argEmail, argPassword, ...nameParts] = process.argv.slice(2);
  const email = (argEmail ?? process.env.ADMIN_EMAIL ?? '').trim().toLowerCase();
  const password = argPassword ?? process.env.ADMIN_PASSWORD ?? '';
  const name = nameParts.join(' ').trim() || process.env.ADMIN_NAME?.trim() || 'Администратор';

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Укажите корректный e-mail: ADMIN_EMAIL или первый аргумент');
  }
  if (password.length < 10) throw new Error('Пароль должен быть не короче 10 символов (ADMIN_PASSWORD или второй аргумент)');
  if (password.length > 200) throw new Error('Пароль слишком длинный (максимум 200 символов)');

  const passwordHash = await hashPassword(password);
  const [existing] = await db().select({ id: schema.admins.id }).from(schema.admins)
    .where(sql`lower(${schema.admins.email}) = ${email}`).limit(1);

  if (existing) {
    await db().update(schema.admins)
      .set({ passwordHash, role: 'owner', active: true, ...(nameParts.length ? { name } : {}) })
      .where(sql`${schema.admins.id} = ${existing.id}`);
    console.log(`Обновлён владелец #${existing.id}: ${email} (пароль изменён, роль owner, активен)`);
  } else {
    const [row] = await db().insert(schema.admins)
      .values({ email, name, passwordHash, role: 'owner', active: true })
      .returning({ id: schema.admins.id });
    console.log(`Создан владелец #${row!.id}: ${email} (${name})`);
  }
}

main()
  .catch(e => { console.error('Ошибка:', e instanceof Error ? e.message : e); process.exitCode = 1; })
  .finally(() => closeDb());
